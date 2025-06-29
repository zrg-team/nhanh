import z from 'zod'
import { ChatWebLLM } from '@langchain/community/chat_models/webllm'
import { zodToJsonSchema } from 'zod-to-json-schema'
import {
  ChatCompletionRequest,
  ChatCompletionTool,
  MLCEngine,
  ResponseFormat,
} from '@mlc-ai/web-llm'
import { sendToMainThread } from 'src/utils/worker-base'
import { AIMessage, BaseMessage } from '@langchain/core/messages'
import { convertToJSON, convertToZodSchema } from 'src/utils/schema-format'
import { safeParseJSON } from 'src/utils/json'

import {
  convertToChatCompletionTool,
  manualFunctionCalling,
} from '../utils/manual-function-calling'
import { parseBridgeJSONToLLMInput, parseBridgeJSONToWebLLMInput } from '../utils/serialize'
import { manualStructuredResponse } from '../utils/manual-structured-response'
import { JSON_MODE, MessagePayload } from './type'

let model: ChatWebLLM | undefined
let engine: MLCEngine | undefined

export const SERVICE_NAME = 'LOCAL_LLM_WORKER'

export async function handleWebLLM(data: MessagePayload) {
  switch (data.type) {
    case 'unload': {
      if (engine) {
        await engine.unload()
      }
      engine = undefined
      model = undefined
      return
    }
    case 'load': {
      model = new ChatWebLLM(...data.payload)
      await model.initialize((progress) => {
        if (model && 'engine' in model) {
          // @ts-expect-error engine is protected in the model
          engine = model.engine as MLCEngine
        }
        sendToMainThread(SERVICE_NAME, data.messageId, 'inprogress', progress)
      })
      return
    }
    case 'get-current-model-info': {
      return {
        model: model?.model,
        chatOptions: model?.chatOptions,
        appConfig: model?.appConfig,
      }
    }
    case 'invoke': {
      const [input, ...rest] = data.payload
      return model?.invoke(parseBridgeJSONToLLMInput(input), ...rest)
    }
    case 'stream': {
      if (!model || !engine) {
        throw new Error('Model is not available')
      }
      let content = ''
      const [input, ...rest] = data.payload
      const stream = await model.stream(parseBridgeJSONToLLMInput(input), ...rest)

      for await (const chunk of stream) {
        if (chunk) {
          content += `${chunk.content}`
          sendToMainThread(SERVICE_NAME, data.messageId, 'inprogress', chunk)
        }
      }
      return content
    }
    case 'tools-calling-stream': {
      // Lanchain not yet supported tool call for WebLLM
      const [toolJSON, input] = data.payload
      if (!model || !engine) {
        throw new Error('Model is not available')
      }

      if (JSON_MODE.TOOLS_CALLING_STREAM) {
        let content = ''
        const toolcallSchema = z.object({
          tool_calls: z.array(
            z.object({
              parameters: z.record(z.any()),
              name: z.string(),
            }),
          ),
        })
        const toolcallSchemaString = JSON.stringify(
          zodToJsonSchema(toolcallSchema, 'my').definitions?.my,
        )
        const tools: Array<ChatCompletionTool> = toolJSON.map((item) => {
          const zodSchema = convertToZodSchema(item.schemaItems)
          const schema = zodToJsonSchema(zodSchema, 'my').definitions?.my
          return {
            type: 'function',
            function: {
              name: item.name,
              description: item.description,
              parameters: schema,
            },
          }
        })
        const messages = parseBridgeJSONToWebLLMInput(input)
        const systemMessage = messages.find((message) => message.role === 'system')
        if (!systemMessage) {
          messages.unshift({
            role: 'system',
            content: [
              `You are a function calling AI model. You are provided with function signatures within <tools></tools> XML tags. You may call one or more functions to assist with the user query. Don't make assumptions about what values to plug into functions. Here are the available tools: <tools> ${JSON.stringify(tools)} </tools>`,
            ].join(''),
          })
        } else if (systemMessage.content.includes('{{tools}}')) {
          systemMessage.content = systemMessage.content.replace('{{tools}}', JSON.stringify(tools))
        } else {
          const index = messages.indexOf(systemMessage)
          // Add assistant message after system message
          messages.splice(index + 1, 0, {
            role: 'assistant',
            content: [`<tools> ${JSON.stringify(tools)} </tools>`].join(''),
          })
        }
        const request: ChatCompletionRequest = {
          stream: true,
          messages: messages,
          response_format: {
            type: 'json_object',
            schema: toolcallSchemaString,
          } as ResponseFormat,
        }

        const asyncChunkGenerator = await engine.chatCompletion(request)

        for await (const chunk of asyncChunkGenerator) {
          const chunkContent = chunk.choices[0]?.delta?.content || ''
          content += chunkContent
          if (chunkContent) {
            sendToMainThread(
              SERVICE_NAME,
              data.messageId,
              'inprogress',
              new AIMessage(chunkContent),
            )
          }
        }
        const functionCalls = safeParseJSON(content)
        const toolCalls = functionCalls.tool_calls.map(
          (item: { name: string; parameters: Record<string, unknown> }) => ({
            name: item.name,
            args: item.parameters,
          }),
        )
        return new AIMessage({
          content: toolCalls?.length ? '' : content,
          tool_calls: toolCalls,
        })
      } else {
        const tools: Array<ChatCompletionTool> = toolJSON.map((item) => {
          return convertToChatCompletionTool(item.name, item.description, item.schemaItems)
        })

        const messages = parseBridgeJSONToWebLLMInput(input)

        const content = await manualFunctionCalling({
          engine,
          messages,
          tools,
          stream: true,
          onChunk: (chunk: BaseMessage) => {
            sendToMainThread(SERVICE_NAME, data.messageId, 'inprogress', chunk)
          },
        })
        return content
      }
    }
    case 'structured-stream': {
      if (!model || !engine) {
        throw new Error('Model is not available')
      }
      // Lanchain not yet supported structured response for WebLLM
      const [json, input] = data.payload
      if (JSON_MODE.STRUCTURED_STREAM) {
        let content = ''
        const zodSchema = convertToZodSchema(json)
        const schema = zodToJsonSchema(zodSchema, 'my').definitions?.my
        const request: ChatCompletionRequest = {
          stream: true,
          messages: parseBridgeJSONToWebLLMInput(input),
          response_format: {
            type: 'json_object',
            schema: JSON.stringify(schema),
          } as ResponseFormat,
        }

        const asyncChunkGenerator = await engine.chatCompletion(request)

        for await (const chunk of asyncChunkGenerator) {
          const chunkContent = chunk.choices[0]?.delta?.content || ''
          content += chunkContent
          if (chunkContent) {
            sendToMainThread(
              SERVICE_NAME,
              data.messageId,
              'inprogress',
              new AIMessage(chunkContent),
            )
          }
          // engine.interruptGenerate();  // works with interrupt as well
        }
        return new AIMessage(content)
      } else {
        const content = await manualStructuredResponse({
          engine,
          messages: parseBridgeJSONToWebLLMInput(input),
          format: convertToJSON(json),
          stream: true,
          onChunk: (chunk: BaseMessage) => {
            sendToMainThread(SERVICE_NAME, data.messageId, 'inprogress', chunk)
          },
        })
        return content
      }
    }
    default:
      throw new Error('Invalid operation')
  }
}
