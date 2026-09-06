import { requestUrl } from 'obsidian'

import { SmartComposerSettings } from '../../settings/schema/setting.types'

export type RerankResult = {
  index: number
  relevanceScore: number
}

/**
 * Call Rerank model API (e.g. SiliconFlow, Cohere, or custom OpenAI-compatible rerank endpoints)
 * to re-order candidate documents by relevance score against the query.
 * Zero external dependencies.
 */
export async function rerankDocuments({
  query,
  documents,
  settings,
}: {
  query: string
  documents: string[]
  settings: SmartComposerSettings
}): Promise<RerankResult[]> {
  const rerankConfig = settings.ragOptions.rerank
  if (
    !rerankConfig ||
    !rerankConfig.enabled ||
    !rerankConfig.modelId ||
    rerankConfig.modelId.trim() === '' ||
    documents.length === 0
  ) {
    return documents.map((_, index) => ({ index, relevanceScore: 1 }))
  }

  const configuredModel = settings.rerankModels?.find(
    (m) => m.id === rerankConfig.modelId,
  )
  const targetProviderId = configuredModel?.providerId || rerankConfig.providerId || 'siliconflow'
  const targetModelName = configuredModel?.model || rerankConfig.model || 'BAAI/bge-reranker-v2-m3'

  const provider = settings.providers.find((p) => p.id === targetProviderId)
  let baseUrl = provider?.baseUrl?.trim()
  const apiKey = provider?.apiKey?.trim()

  if (!baseUrl) {
    if (provider?.type === 'siliconflow') {
      baseUrl = 'https://api.siliconflow.cn/v1'
    } else {
      baseUrl = 'https://api.siliconflow.cn/v1'
    }
  }

  if (!apiKey) {
    console.warn(`Rerank provider "${targetProviderId}" has no API Key configured. Skipping rerank.`)
    return documents.map((_, index) => ({ index, relevanceScore: 1 }))
  }

  const cleanBaseUrl = baseUrl.replace(/\/+$/, '')
  const rerankUrl = cleanBaseUrl.endsWith('/rerank') ? cleanBaseUrl : `${cleanBaseUrl}/rerank`

  try {
    const response = await requestUrl({
      url: rerankUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: targetModelName,
        query,
        documents,
        top_n: Math.min(rerankConfig.topN || 5, documents.length),
        return_documents: false,
      }),
    })

    const data = response.json as { results?: unknown[] } | undefined
    if (data && Array.isArray(data.results)) {
      return (
        data.results as Array<{
          index: number
          relevance_score?: number
          relevanceScore?: number
        }>
      ).map((item) => ({
        index: item.index,
        relevanceScore: item.relevance_score ?? item.relevanceScore ?? 0,
      }))
    }
  } catch (error) {
    console.error('Rerank API error, falling back to vector score order:', error)
  }

  // Fallback: return in original order
  return documents.slice(0, rerankConfig.topN || 5).map((_, index) => ({
    index,
    relevanceScore: 1,
  }))
}
