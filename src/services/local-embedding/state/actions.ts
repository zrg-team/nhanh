import type { Document } from '@langchain/core/documents'
import {
  CharacterTextSplitter,
  RecursiveCharacterTextSplitter,
  TokenTextSplitter,
} from 'langchain/text_splitter'
import { EmbeddedResource, Voy } from 'voy-search'
import { SetState, GetState } from 'src/utils/zustand'
import { MemoryVectorStore, MemoryVectorStoreArgs } from 'langchain/vectorstores/memory'
import { VoyVectorStore } from '@langchain/community/vectorstores/voy'
import {
  getDatabaseId,
  getVectorDatabaseStorage,
  storeVectorDatabaseStorage,
} from 'src/utils/vector-storage'
import { getRepository } from 'src/services/database'
import {
  TABLE_NAMES,
  VectorDatabase,
  VectorDatabaseProviderEnum,
} from 'src/services/database/types'
import { DEFAULT_EMBEDDING_MODEL } from 'src/constants/embedding'
import { Embeddings } from '@langchain/core/embeddings'
import { logWarn } from 'src/utils/logger'

import { LocalEmbeddingState } from './state'
import { WorkerEmbeddings } from '../utils/worker-embeddings'
import { getLocalEmbeddingWorker } from '../worker'
import { PGLiteVectorStore } from 'src/lib/langchain-pglite-vector-store'
import { embeddingStorage } from '../embedding-storage'

export interface LocalEmbeddingStateActions {
  init: () => void
  destroy: () => void
  index: (
    info: {
      database: {
        databaseId: string
        dataSourceId?: string
      }
      embedding?: Embeddings
    },
    ...args: Parameters<VoyVectorStore['addDocuments'] | MemoryVectorStore['addDocuments']>
  ) => ReturnType<VoyVectorStore['addDocuments'] | MemoryVectorStore['addDocuments']>
  similaritySearch: (
    info: {
      database: {
        databaseId: string
        dataSourceId?: string
      }
      embedding?: Embeddings
    },
    ...args: Parameters<VoyVectorStore['similaritySearch'] | MemoryVectorStore['similaritySearch']>
  ) => ReturnType<VoyVectorStore['similaritySearch'] | MemoryVectorStore['similaritySearch']>
  similaritySearchWithScore: (
    info: {
      database: {
        databaseId: string
        dataSourceId?: string
      }
      embedding?: Embeddings
    },
    ...args: Parameters<
      VoyVectorStore['similaritySearchWithScore'] | MemoryVectorStore['similaritySearchWithScore']
    >
  ) => ReturnType<
    VoyVectorStore['similaritySearchWithScore'] | MemoryVectorStore['similaritySearchWithScore']
  >
  getVectorDatabase: (
    info: {
      database: {
        databaseId: string
        dataSourceId?: string
      }
      embedding?: Embeddings
    },
    args?: MemoryVectorStoreArgs,
  ) => Promise<MemoryVectorStore | VoyVectorStore | PGLiteVectorStore>
}

const splitterDocuments = (database: VectorDatabase, documents: Document[]) => {
  try {
    const metadata = JSON.parse(database.metadata || '{}') as {
      textSplitter?: {
        type: string
        chunkSize: number
        chunkOverlap: number
      }
    }
    if (!metadata?.textSplitter) {
      return documents
    }
    switch (metadata?.textSplitter?.type) {
      case 'TokenTextSplitter':
        return new TokenTextSplitter({
          chunkOverlap: +metadata.textSplitter.chunkOverlap,
          chunkSize: +metadata.textSplitter.chunkSize,
        }).splitDocuments(documents)
      case 'CharacterTextSplitter':
        return new CharacterTextSplitter({
          chunkOverlap: +metadata.textSplitter.chunkOverlap,
          chunkSize: +metadata.textSplitter.chunkSize,
        }).splitDocuments(documents)
      case 'RecursiveCharacterTextSplitter':
        return new RecursiveCharacterTextSplitter({
          chunkOverlap: +metadata.textSplitter.chunkOverlap,
          chunkSize: +metadata.textSplitter.chunkSize,
        }).splitDocuments(documents)
      default:
        throw new Error('Invalid text splitter')
    }
  } catch {
    return documents
  }
}

export const getLocalEmbeddingStateActions = (
  set: SetState<LocalEmbeddingState>,
  get: GetState<LocalEmbeddingState>,
): LocalEmbeddingStateActions => {
  return {
    destroy: () => {
      try {
        const worker = get().worker
        if (worker) {
          worker.terminate()
        }
        set({
          localEmbedding: undefined,
          worker: undefined,
        })
      } catch (error) {
        logWarn('Destroy Local Embedding Thread', error)
      }
    },
    init: async () => {
      try {
        const worker = get().worker
        if (worker) {
          worker.terminate()
        }
        const newWorker = getLocalEmbeddingWorker()
        const localEmbedding = new WorkerEmbeddings({
          modelName: DEFAULT_EMBEDDING_MODEL,
          worker: newWorker,
        })

        set({
          worker: newWorker,
          localEmbedding,
        })
      } catch (error) {
        logWarn('Init Local Embedding Thread', error)
      } finally {
        set({ ready: true })
      }
    },
    index: async (info, documents) => {
      const embedding = info?.embedding || get().localEmbedding
      if (!embedding) {
        throw new Error('Missing embedding model or storage.')
      }
      const database = await getRepository('VectorDatabase').findOne({
        where: { id: info.database.databaseId },
      })
      if (!database) {
        throw new Error('Database not found.')
      }
      if (!database.provider) {
        throw new Error('Database provider not found.')
      }

      const databaseName = getDatabaseId(database.id)
      const splittedDocuments = await splitterDocuments(database, documents)
      const data = await getVectorDatabaseStorage({
        databaseName,
        storageType: database.storage || 'IndexedDB',
        provider: database.provider,
        storageService: embeddingStorage,
        storageDataNode: database,
      })
      switch (database.provider) {
        case VectorDatabaseProviderEnum.PGVector:
          {
            const store = await PGLiteVectorStore.initialize(embedding, {
              tableName: TABLE_NAMES.VectorDatabaseData,
              collectionName: database.id,
            })
            store.addDocuments(splittedDocuments)
          }
          break
        case VectorDatabaseProviderEnum.Voy:
          {
            const voyClient = new Voy({
              embeddings: data as EmbeddedResource[],
            })
            const store = new VoyVectorStore(voyClient, embedding)
            await store.addDocuments(splittedDocuments)
            await storeVectorDatabaseStorage({
              databaseName,
              provider: database.provider,
              embeddingStorage,
              docstore: store.docstore,
              storageType: database.storage || 'IndexedDB',
              storageDataNode: database,
            })
          }
          break
        case VectorDatabaseProviderEnum.Memory:
          {
            const store = new MemoryVectorStore(embedding)
            store.memoryVectors = data as unknown as MemoryVectorStore['memoryVectors']
            await store.addDocuments(splittedDocuments)
            await storeVectorDatabaseStorage({
              databaseName,
              provider: database.provider,
              embeddingStorage,
              docstore: store.memoryVectors,
              storageType: database.storage || 'IndexedDB',
              storageDataNode: database,
            })
          }
          break
      }
    },
    getVectorDatabase: async (info, ...args) => {
      const embedding = info.embedding || get().localEmbedding
      if (!embedding || !embeddingStorage) {
        throw new Error('Missing embedding model or storage.')
      }
      const database = await getRepository('VectorDatabase').findOne({
        where: { id: info.database.databaseId },
      })
      if (!database) {
        throw new Error('Database not found.')
      }
      if (!database.provider) {
        throw new Error('Database provider not found.')
      }

      const databaseName = getDatabaseId(database.id)
      const data = await getVectorDatabaseStorage({
        databaseName,
        storageType: database.storage || 'IndexedDB',
        provider: database.provider,
        storageService: embeddingStorage,
        storageDataNode: database,
      })
      switch (database.provider) {
        case VectorDatabaseProviderEnum.PGVector: {
          const store = await PGLiteVectorStore.initialize(embedding, {
            tableName: TABLE_NAMES.VectorDatabaseData,
            collectionName: database.id,
          })
          return store
        }
        case VectorDatabaseProviderEnum.Voy: {
          const voyClient = new Voy({
            embeddings: data as EmbeddedResource[],
          })
          return new VoyVectorStore(voyClient, embedding)
        }
        case VectorDatabaseProviderEnum.Memory: {
          const store = new MemoryVectorStore(embedding, args as MemoryVectorStoreArgs)
          store.memoryVectors = data as unknown as MemoryVectorStore['memoryVectors']
          return store
        }
        default:
          throw new Error('Invalid provider')
      }
    },
    similaritySearch: async (info, ...args) => {
      const embedding = info.embedding || get().localEmbedding
      if (!embedding || !embeddingStorage) {
        throw new Error('Missing embedding model or storage.')
      }
      const database = await getRepository('VectorDatabase').findOne({
        where: { id: info.database.databaseId },
      })
      if (!database || !database.provider) {
        throw new Error('Database not found.')
      }
      if (!database.provider) {
        throw new Error('Database provider not found.')
      }

      const databaseName = getDatabaseId(database.id)
      const data = await getVectorDatabaseStorage({
        databaseName,
        storageDataNode: database,
        provider: database.provider,
        storageService: embeddingStorage,
        storageType: database.storage || 'IndexedDB',
      })
      switch (database.provider) {
        case VectorDatabaseProviderEnum.PGVector: {
          const store = await PGLiteVectorStore.initialize(embedding, {
            tableName: TABLE_NAMES.VectorDatabaseData,
            collectionName: database.id,
          })
          const documents = await store.similaritySearch(
            ...(args as Parameters<PGLiteVectorStore['similaritySearch']>),
          )
          return documents
        }
        case VectorDatabaseProviderEnum.Voy: {
          const voyClient = new Voy({
            embeddings: data as EmbeddedResource[],
          })
          const store = new VoyVectorStore(voyClient, embedding)
          const documents = await store.similaritySearch(
            ...(args as Parameters<VoyVectorStore['similaritySearch']>),
          )
          return documents
        }
        case VectorDatabaseProviderEnum.Memory: {
          const store = new MemoryVectorStore(embedding)
          store.memoryVectors = data as unknown as MemoryVectorStore['memoryVectors']
          const documents = await store.similaritySearch(
            ...(args as Parameters<MemoryVectorStore['similaritySearch']>),
          )
          return documents
        }
        default:
          throw new Error('Invalid provider')
      }
    },
    similaritySearchWithScore: async (info, ...args) => {
      const embedding = info.embedding || get().localEmbedding
      if (!embedding || !embeddingStorage) {
        throw new Error('Missing embedding model or storage.')
      }
      const database = await getRepository('VectorDatabase').findOne({
        where: { id: info.database.databaseId },
      })
      if (!database || !database.provider) {
        throw new Error('Database not found.')
      }
      if (!database.provider) {
        throw new Error('Database provider not found.')
      }

      const databaseName = getDatabaseId(database.id)
      const data = await getVectorDatabaseStorage({
        databaseName,
        provider: database.provider,
        storageDataNode: database,
        storageService: embeddingStorage,
        storageType: database.storage || 'IndexedDB',
      })
      switch (database.provider) {
        case VectorDatabaseProviderEnum.PGVector: {
          const store = await PGLiteVectorStore.initialize(embedding, {
            tableName: TABLE_NAMES.VectorDatabaseData,
            collectionName: database.id,
          })
          const documents = await store.similaritySearchWithScore(
            ...(args as Parameters<PGLiteVectorStore['similaritySearchWithScore']>),
          )
          return documents
        }
        case VectorDatabaseProviderEnum.Voy: {
          const voyClient = new Voy({
            embeddings: data as EmbeddedResource[],
          })
          const store = new VoyVectorStore(voyClient, embedding)
          const documents = await store.similaritySearchWithScore(
            ...(args as Parameters<VoyVectorStore['similaritySearchWithScore']>),
          )
          return documents
        }
        case VectorDatabaseProviderEnum.Memory: {
          const store = new MemoryVectorStore(embedding)
          store.memoryVectors = data as unknown as MemoryVectorStore['memoryVectors']
          const documents = await store.similaritySearchWithScore(
            ...(args as Parameters<MemoryVectorStore['similaritySearchWithScore']>),
          )
          return documents
        }
        default:
          throw new Error('Invalid provider')
      }
    },
  }
}
