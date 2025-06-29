import { FC, memo, PropsWithChildren, useEffect } from 'react'
import { useLocalEmbeddingState } from 'src/services/local-embedding'
import { useLocalLLMState } from 'src/services/local-llm'

export const SessionLocalServiceProvider: FC<PropsWithChildren> = memo(({ children }) => {
  const destroyLocalLLMState = useLocalLLMState((state) => state.destroy)
  const destroyLocalEmbeddingState = useLocalEmbeddingState((state) => state.destroy)
  const initLocalLLM = useLocalLLMState((state) => state.init)
  const initLocalEmbedding = useLocalEmbeddingState((state) => state.init)

  useEffect(() => {
    initLocalLLM()
    initLocalEmbedding()
    return () => {
      destroyLocalLLMState()
      destroyLocalEmbeddingState()
    }
  }, [destroyLocalLLMState, destroyLocalEmbeddingState, initLocalLLM, initLocalEmbedding])

  return children
})
