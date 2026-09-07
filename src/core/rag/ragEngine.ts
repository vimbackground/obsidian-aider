import { App } from 'obsidian'

import { QueryProgressState } from '../../components/chat-view/QueryProgress'
import { VectorManager } from '../../database/modules/vector/VectorManager'
import { AiderSettings } from '../../settings/schema/setting.types'
import { EmbeddingModelClient } from '../../types/embedding'
import { SelectEmbedding } from '../../types/vector.types'

import { getEmbeddingModelClient } from './embedding'
import { rerankDocuments } from './rerank'

// TODO: do we really need this class? It seems like unnecessary abstraction.
export class RAGEngine {
  private app: App
  private settings: AiderSettings
  private vectorManager: VectorManager | null = null
  private embeddingModel: EmbeddingModelClient | null = null

  constructor(
    app: App,
    settings: AiderSettings,
    vectorManager: VectorManager,
  ) {
    this.app = app
    this.settings = settings
    this.vectorManager = vectorManager
    this.embeddingModel = getEmbeddingModelClient({
      settings,
      embeddingModelId: settings.embeddingModelId,
    })
  }

  cleanup() {
    this.embeddingModel = null
    this.vectorManager = null
  }

  // TODO: use addSettingsChangeListener
  setSettings(settings: AiderSettings) {
    this.settings = settings
    this.embeddingModel = getEmbeddingModelClient({
      settings,
      embeddingModelId: settings.embeddingModelId,
    })
  }

  // TODO: Implement automatic vault re-indexing when settings are changed.
  // Currently, users must manually re-index the vault.
  async updateVaultIndex(
    options: { reindexAll: boolean } = {
      reindexAll: false,
    },
    onQueryProgressChange?: (queryProgress: QueryProgressState) => void,
  ): Promise<void> {
    if (!this.embeddingModel) {
      throw new Error('Embedding model is not set')
    }
    await this.vectorManager?.updateVaultIndex(
      this.embeddingModel,
      {
        chunkSize: this.settings.ragOptions.chunkSize,
        excludePatterns:
          this.settings.ragOptions.filterMode === 'whitelist'
            ? []
            : this.settings.ragOptions.excludePatterns,
        includePatterns:
          this.settings.ragOptions.filterMode === 'whitelist'
            ? this.settings.ragOptions.includePatterns
            : [],
        reindexAll: options.reindexAll,
      },
      (indexProgress) => {
        onQueryProgressChange?.({
          type: 'indexing',
          indexProgress,
        })
      },
    )
  }

  async processQuery({
    query,
    scope,
    onQueryProgressChange,
  }: {
    query: string
    scope?: {
      files: string[]
      folders: string[]
    }
    onQueryProgressChange?: (queryProgress: QueryProgressState) => void
  }): Promise<
    (Omit<SelectEmbedding, 'embedding'> & {
      similarity: number
    })[]
  > {
    if (!this.embeddingModel) {
      throw new Error('Embedding model is not set')
    }
    // If background indexing is disabled, we update index on demand before query
    if (!this.settings.ragOptions.backgroundIndexing) {
      await this.updateVaultIndex({ reindexAll: false }, onQueryProgressChange)
    }
    const queryEmbedding = await this.getQueryEmbedding(query)
    onQueryProgressChange?.({
      type: 'querying',
    })
    const isRerankEnabled = this.settings.ragOptions.rerank?.enabled
    const candidateLimit = isRerankEnabled
      ? Math.max((this.settings.ragOptions.rerank?.topN || 5) * 3, 20)
      : this.settings.ragOptions.limit

    let queryResult =
      (await this.vectorManager?.performSimilaritySearch(
        queryEmbedding,
        this.embeddingModel,
        {
          minSimilarity: this.settings.ragOptions.minSimilarity,
          limit: candidateLimit,
          scope,
        },
      )) ?? []

    if (isRerankEnabled && queryResult.length > 0) {
      try {
        const rerankScores = await rerankDocuments({
          query,
          documents: queryResult.map((r) => r.content),
          settings: this.settings,
        })
        const reranked = rerankScores
          .map((scoreItem) => {
            const original = queryResult[scoreItem.index]
            return original
              ? {
                  ...original,
                  similarity: scoreItem.relevanceScore,
                }
              : null
          })
          .filter(Boolean) as (Omit<SelectEmbedding, 'embedding'> & { similarity: number })[]

        if (reranked.length > 0) {
          queryResult = reranked.slice(0, this.settings.ragOptions.rerank?.topN || 5)
        }
      } catch (rerankErr) {
        console.error('Rerank failed, using original similarity search results:', rerankErr)
        queryResult = queryResult.slice(0, this.settings.ragOptions.limit)
      }
    }

    onQueryProgressChange?.({
      type: 'querying-done',
      queryResult,
    })
    return queryResult
  }

  private async getQueryEmbedding(query: string): Promise<number[]> {
    if (!this.embeddingModel) {
      throw new Error('Embedding model is not set')
    }
    return this.embeddingModel.getEmbedding(query)
  }
}
