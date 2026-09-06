import { DEFAULT_SYSTEM_PROMPT } from '../../../constants'
import { SettingMigration } from '../setting.types'

const LEGACY_DEFAULT_EMBEDDING_MODEL_IDS = new Set([
  'openai/text-embedding-3-small',
  'openai/text-embedding-3-large',
  'gemini/text-embedding-004',
  'ollama/nomic-embed-text',
  'ollama/mxbai-embed-large',
  'ollama/bge-m3',
  'bge-m3',
])

const DEFAULT_EMBEDDING_MODEL_V17 = {
  providerType: 'siliconflow',
  providerId: 'siliconflow',
  id: 'BAAI/bge-m3',
  model: 'BAAI/bge-m3',
  dimension: 1024,
  enable: true,
}

const DEFAULT_CHAT_MODEL_V17 = {
  providerType: 'siliconflow',
  providerId: 'siliconflow',
  id: 'Qwen/Qwen3.5-4B',
  model: 'Qwen/Qwen3.5-4B',
  enable: true,
}

export const migrateFrom16To17: SettingMigration['migrate'] = (data) => {
  const newData = { ...data }
  newData.version = 17

  // 1. 默认系统提示词深度清洗与恢复
  if (
    !newData.systemPrompt ||
    typeof newData.systemPrompt !== 'string' ||
    !newData.systemPrompt.trim()
  ) {
    newData.systemPrompt = DEFAULT_SYSTEM_PROMPT
  }

  // 2. 清理遗留预设的嵌入模型，务必仅保留 SiliconFlow 的 BAAI/bge-m3
  const existingEmbeddingModels = Array.isArray(newData.embeddingModels)
    ? (newData.embeddingModels as Array<{ id: string; [key: string]: unknown }>)
    : []

  const cleanedEmbeddingModels = existingEmbeddingModels.filter(
    (m) => !LEGACY_DEFAULT_EMBEDDING_MODEL_IDS.has(m.id),
  )

  const hasBgeM3 = cleanedEmbeddingModels.some(
    (m) => m.id === DEFAULT_EMBEDDING_MODEL_V17.id,
  )
  if (!hasBgeM3) {
    cleanedEmbeddingModels.unshift({ ...DEFAULT_EMBEDDING_MODEL_V17 })
  } else {
    const existing = cleanedEmbeddingModels.find(
      (m) => m.id === DEFAULT_EMBEDDING_MODEL_V17.id,
    )
    if (existing) {
      existing.enable = true
    }
  }
  newData.embeddingModels = cleanedEmbeddingModels

  // 3. 当前活动嵌入模型重置
  if (
    !newData.embeddingModelId ||
    typeof newData.embeddingModelId !== 'string' ||
    LEGACY_DEFAULT_EMBEDDING_MODEL_IDS.has(newData.embeddingModelId) ||
    !cleanedEmbeddingModels.some((m) => m.id === newData.embeddingModelId)
  ) {
    newData.embeddingModelId = ''
  }

  // 4. 清理对话模型：仅保留 Qwen/Qwen3.5-4B 以及用户已配置 API Key 的模型，其它默认模型不要添加
  const providers = Array.isArray(newData.providers)
    ? (newData.providers as Array<{ type: string; id: string; apiKey?: string; [key: string]: unknown }>)
    : []
  const hasAnthropicKey = providers.some(
    (p) => p.type === 'anthropic' && Boolean(p.apiKey && p.apiKey.trim() !== ''),
  )

  const configuredProviderIds = new Set(
    providers
      .filter((p) => Boolean(p.apiKey && p.apiKey.trim() !== ''))
      .map((p) => p.id),
  )
  const configuredProviderTypes = new Set(
    providers
      .filter((p) => Boolean(p.apiKey && p.apiKey.trim() !== ''))
      .map((p) => p.type),
  )

  const existingChatModels = Array.isArray(newData.chatModels)
    ? (newData.chatModels as Array<{
        id: string
        providerType: string
        providerId: string
        model: string
        enable?: boolean
        [key: string]: unknown
      }>)
    : []

  const cleanedChatModels = existingChatModels.filter((m) => {
    // 始终保留默认推荐模型
    if (m.id === DEFAULT_CHAT_MODEL_V17.id) return true

    // 移除所有旧版 plan 模型
    if (
      m.providerType === 'anthropic-plan' ||
      m.providerType === 'openai-plan' ||
      m.providerType === 'gemini-plan'
    ) {
      return false
    }
    // 移除废弃的 groq 与 DeepSeek-V4-Flash
    if (m.providerType === 'groq' && m.id === 'qwen/qwen3.8-27b') return false
    if (m.id === 'deepseek-ai/DeepSeek-V4-Flash') return false

    // 仅保留用户已填写 API Key 的服务商关联模型
    return (
      configuredProviderIds.has(m.providerId) ||
      configuredProviderTypes.has(m.providerType)
    )
  })

  // 确保 SiliconFlow Qwen/Qwen3.5-4B 存在并启用
  const hasQwen = cleanedChatModels.some((m) => m.id === DEFAULT_CHAT_MODEL_V17.id)
  if (!hasQwen) {
    cleanedChatModels.unshift({ ...DEFAULT_CHAT_MODEL_V17 })
  } else {
    const existing = cleanedChatModels.find(
      (m) => m.id === DEFAULT_CHAT_MODEL_V17.id,
    )
    if (existing) {
      existing.enable = true
    }
  }
  newData.chatModels = cleanedChatModels

  // 5. 对话模型选择与快速应用模型兜底
  if (
    !newData.chatModelId ||
    typeof newData.chatModelId !== 'string' ||
    (!hasAnthropicKey && (newData.chatModelId as string).toLowerCase().includes('claude')) ||
    newData.chatModelId === 'deepseek-ai/DeepSeek-V4-Flash' ||
    !cleanedChatModels.some((m) => m.id === newData.chatModelId)
  ) {
    newData.chatModelId = DEFAULT_CHAT_MODEL_V17.id
  }

  if (
    !newData.applyModelId ||
    typeof newData.applyModelId !== 'string' ||
    newData.applyModelId === 'gpt-4o-mini' ||
    !cleanedChatModels.some((m) => m.id === newData.applyModelId)
  ) {
    newData.applyModelId = ''
  }

  // 6. RAG 配置兜底与 Obsidian 系统目录排除
  if (newData.ragOptions && typeof newData.ragOptions === 'object') {
    const rag = newData.ragOptions as Record<string, unknown>
    if (rag.enabled === undefined) {
      rag.enabled = false
    }
    const currentExcludes = Array.isArray(rag.excludePatterns)
      ? (rag.excludePatterns as string[])
      : []
    const defaultExcludes = [
      '.obsidian',
      '.trash',
      '.git',
      '.smart-env',
      '.smart-connections',
      '.obsidian-aider',
    ]
    const mergedExcludes = Array.from(
      new Set([...currentExcludes, ...defaultExcludes]),
    )
    rag.excludePatterns = mergedExcludes
  }

  return newData
}
