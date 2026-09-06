import { backOff } from 'exponential-backoff'
import { minimatch } from 'minimatch'
import { App, TFile, normalizePath } from 'obsidian'


import { IndexProgress } from '../../../components/chat-view/QueryProgress'
import {
  EmbeddingDbStats,
  EmbeddingModelClient,
} from '../../../types/embedding'
import { InsertEmbedding, SelectEmbedding } from '../../../types/vector.types'
import { chunkArray } from '../../../utils/common/chunk-array'
import { splitMarkdown } from '../../../utils/common/markdown-splitter'

const VECTOR_STORE_PATH = '.aider/vectors.json'

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export class VectorManager {
  private app: App
  private vectors: SelectEmbedding[] = []
  private loaded = false
  private saveTimeout: number | null = null

  constructor(app: App) {
    this.app = app
  }

  private async loadVectors() {
    if (this.loaded) return
    const path = normalizePath(VECTOR_STORE_PATH)
    if (await this.app.vault.adapter.exists(path)) {
      try {
        const content = await this.app.vault.adapter.read(path)
        this.vectors = JSON.parse(content)
      } catch (e) {
        console.error('Failed to load vector store', e)
        this.vectors = []
      }
    } else {
      this.vectors = []
    }
    this.loaded = true
  }

  private async requestSave() {
    if (this.saveTimeout) {
      window.clearTimeout(this.saveTimeout)
    }
    this.saveTimeout = window.setTimeout(async () => {
      try {
        const path = normalizePath(VECTOR_STORE_PATH)
        await this.app.vault.adapter.write(path, JSON.stringify(this.vectors))
      } catch (e) {
        console.error('Failed to save vector store', e)
      }
    }, 2000)
  }

  async performSimilaritySearch(
    queryVector: number[],
    embeddingModel: EmbeddingModelClient,
    options: {
      minSimilarity: number
      limit: number
      scope?: {
        files: string[]
        folders: string[]
      }
    },
  ): Promise<(Omit<SelectEmbedding, 'embedding'> & { similarity: number })[]> {
    await this.loadVectors()

    const results = []
    
    // Check scope sets for faster lookup if provided
    const fileScopeSet = options.scope?.files ? new Set(options.scope.files) : null
    const folderScopeSet = options.scope?.folders ? new Set(options.scope.folders) : null

    for (const vec of this.vectors) {
      if (vec.model !== embeddingModel.id) continue

      if (options.scope) {
        const inFiles = fileScopeSet ? fileScopeSet.has(vec.path) : false
        const inFolders = folderScopeSet
          ? Array.from(folderScopeSet).some(folder => vec.path.startsWith(folder + '/'))
          : false
        if (!inFiles && !inFolders) {
          continue
        }
      }

      const similarity = cosineSimilarity(queryVector, vec.embedding)
      if (similarity >= options.minSimilarity) {
        results.push({
          id: vec.id,
          path: vec.path,
          mtime: vec.mtime,
          content: vec.content,
          model: vec.model,
          dimension: vec.dimension,
          metadata: vec.metadata,
          similarity
        })
      }
    }

    results.sort((a, b) => b.similarity - a.similarity)
    return results.slice(0, options.limit)
  }

  async updateVaultIndex(
    embeddingModel: EmbeddingModelClient,
    options: {
      chunkSize: number
      excludePatterns: string[]
      includePatterns: string[]
      reindexAll?: boolean
    },
    updateProgress?: (indexProgress: IndexProgress) => void,
  ): Promise<void> {
    await this.loadVectors()

    let filesToIndex: TFile[]
    if (options.reindexAll) {
      filesToIndex = await this.getFilesToIndex({
        embeddingModel,
        excludePatterns: options.excludePatterns,
        includePatterns: options.includePatterns,
        reindexAll: true,
      })
      this.vectors = this.vectors.filter(v => v.model !== embeddingModel.id)
    } else {
      await this.deleteVectorsForDeletedFiles(embeddingModel)
      filesToIndex = await this.getFilesToIndex({
        embeddingModel,
        excludePatterns: options.excludePatterns,
        includePatterns: options.includePatterns,
      })
      const pathsToDelete = new Set(filesToIndex.map(f => f.path))
      this.vectors = this.vectors.filter(v => !(v.model === embeddingModel.id && pathsToDelete.has(v.path)))
    }

    if (filesToIndex.length === 0) {
      return
    }

    const failedFiles: { path: string; error: string }[] = []
    const contentChunks = (
      await Promise.all(
        filesToIndex.map(async (file) => {
          try {
            const fileContent = await this.app.vault.cachedRead(file)
            const sanitizedContent = fileContent.split('\0').join('')

            const fileDocuments = splitMarkdown(sanitizedContent, options.chunkSize)
            return fileDocuments.map((chunk): Omit<InsertEmbedding, 'model' | 'dimension' | 'embedding'> => ({
              path: file.path,
              mtime: file.stat.mtime,
              content: chunk.pageContent,
              metadata: {
                startLine: chunk.startLine,
                endLine: chunk.endLine,
              },
            }))
          } catch (error) {
            failedFiles.push({
              path: file.path,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
            return []
          }
        }),
      )
    ).flat()

    if (failedFiles.length > 0) {
      console.error('Failed to read files for indexing:', failedFiles)
    }

    if (contentChunks.length === 0) {
      return
    }

    updateProgress?.({
      completedChunks: 0,
      totalChunks: contentChunks.length,
      totalFiles: filesToIndex.length,
    })

    let completedChunks = 0
    const batchChunks = chunkArray(contentChunks, 10) // smaller batches for API calls
    const failedChunks: unknown[] = []

    try {
      let nextId = this.vectors.length > 0 ? Math.max(...this.vectors.map(v => v.id)) + 1 : 1

      for (const batchChunk of batchChunks) {
        const embeddingChunks = await Promise.all(
          batchChunk.map(async (chunk) => {
            try {
              return await backOff(
                async () => {
                  if (chunk.content.length === 0) throw new Error(`Empty content`)
                  const embedding = await embeddingModel.getEmbedding(chunk.content)
                  completedChunks += 1
                  updateProgress?.({
                    completedChunks,
                    totalChunks: contentChunks.length,
                    totalFiles: filesToIndex.length,
                  })
                  return {
                    id: nextId++,
                    path: chunk.path,
                    mtime: chunk.mtime,
                    content: chunk.content,
                    model: embeddingModel.id,
                    dimension: embeddingModel.dimension,
                    embedding,
                    metadata: chunk.metadata,
                  }
                },
                { numOfAttempts: 3, startingDelay: 2000 }
              )
            } catch (error) {
              failedChunks.push({ chunk, error })
              return null
            }
          }),
        )

        const validChunks = embeddingChunks.filter(c => c !== null) as SelectEmbedding[]
        this.vectors.push(...validChunks)
      }
    } finally {
      await this.requestSave()
    }
  }

  async clearAllVectors(embeddingModel: EmbeddingModelClient) {
    await this.loadVectors()
    this.vectors = this.vectors.filter(v => v.model !== embeddingModel.id)
    await this.requestSave()
  }

  private async deleteVectorsForDeletedFiles(embeddingModel: EmbeddingModelClient) {
    await this.loadVectors()
    const validPaths = new Set(this.app.vault.getMarkdownFiles().map(f => f.path))
    const oldLength = this.vectors.length
    this.vectors = this.vectors.filter(v => {
      if (v.model !== embeddingModel.id) return true
      return validPaths.has(v.path)
    })
    if (this.vectors.length !== oldLength) {
      await this.requestSave()
    }
  }

  private async getFilesToIndex({
    embeddingModel,
    excludePatterns,
    includePatterns,
    reindexAll,
  }: {
    embeddingModel: EmbeddingModelClient
    excludePatterns: string[]
    includePatterns: string[]
    reindexAll?: boolean
  }): Promise<TFile[]> {
    let filesToIndex = this.app.vault.getMarkdownFiles()

    // 1. 系统核心及非内容目录强制兜底排除
    const SYSTEM_EXCLUDE_PATHS = [this.app.vault.configDir, '.obsidian', '.aider', '.aide', '.trash', '.git', '.smart-env']
    filesToIndex = filesToIndex.filter((file) => {
      const p = file.path
      return !SYSTEM_EXCLUDE_PATHS.some(
        (sys) => p === sys || p.startsWith(sys + '/') || p.startsWith(sys + '\\'),
      )
    })

    // 2. 白名单模式与黑名单模式互斥执行
    if (includePatterns && includePatterns.length > 0) {
      filesToIndex = filesToIndex.filter((file) =>
        includePatterns.some((pattern) => {
          const cleanPattern = pattern.trim().replace(/^\/+/, '')
          if (!cleanPattern) return false
          return (
            file.path.startsWith(cleanPattern + '/') ||
            file.path === cleanPattern ||
            minimatch(file.path, cleanPattern) ||
            minimatch(file.path, `**/${cleanPattern}/**`)
          )
        }),
      )
    } else if (excludePatterns && excludePatterns.length > 0) {
      filesToIndex = filesToIndex.filter(
        (file) =>
          !excludePatterns.some((pattern) => {
            const cleanPattern = pattern.trim().replace(/^\/+/, '')
            if (!cleanPattern) return false
            return (
              file.path.startsWith(cleanPattern + '/') ||
              file.path === cleanPattern ||
              minimatch(file.path, cleanPattern) ||
              minimatch(file.path, `**/${cleanPattern}/**`)
            )
          }),
      )
    }

    if (reindexAll) return filesToIndex

    await this.loadVectors()
    
    // Get latest mtime for each file in our vector store
    const fileMtimes = new Map<string, number>()
    for (const vec of this.vectors) {
      if (vec.model === embeddingModel.id) {
        fileMtimes.set(vec.path, Math.max(fileMtimes.get(vec.path) || 0, vec.mtime))
      }
    }

    return filesToIndex.filter(file => {
      const storedMtime = fileMtimes.get(file.path)
      if (storedMtime === undefined) return true // new file
      return file.stat.mtime > storedMtime // updated file
    })
  }

  async getEmbeddingStats(): Promise<EmbeddingDbStats[]> {
    await this.loadVectors()
    const statsMap = new Map<string, { model: string; count: number; dimension: number }>()
    
    for (const vec of this.vectors) {
      if (!statsMap.has(vec.model)) {
        statsMap.set(vec.model, { model: vec.model, count: 0, dimension: vec.dimension })
      }
      statsMap.get(vec.model)!.count++
    }

    let actualFileBytes = 0
    try {
      if (await this.app.vault.adapter.exists(VECTOR_STORE_PATH)) {
        const stat = await this.app.vault.adapter.stat(VECTOR_STORE_PATH)
        if (stat) {
          actualFileBytes = stat.size
        }
      }
    } catch (e) {
      console.warn('[Aider] Failed to read vector store file size:', e)
    }

    const totalCount = this.vectors.length
    return Array.from(statsMap.values()).map(s => ({
      model: s.model,
      dimension: s.dimension,
      rowCount: s.count,
      totalDataBytes:
        totalCount > 0 ? Math.round(actualFileBytes * (s.count / totalCount)) : 0,
    }))
  }
}
