import { z } from 'zod'

import {
  DEFAULT_APPLY_MODEL_ID,
  DEFAULT_CHAT_MODELS,
  DEFAULT_CHAT_MODEL_ID,
  DEFAULT_EMBEDDING_MODELS,
  DEFAULT_PROVIDERS,
  DEFAULT_SYSTEM_PROMPT,
} from '../../constants'
import { chatModelSchema } from '../../types/chat-model.types'
import { embeddingModelSchema } from '../../types/embedding-model.types'
import { mcpServerConfigSchema } from '../../types/mcp.types'
import { llmProviderSchema } from '../../types/provider.types'

import { SETTINGS_SCHEMA_VERSION } from './migrations'

export const rerankModelSchema = z.object({
  id: z.string(),
  providerId: z.string(),
  providerType: z.string(),
  model: z.string(),
  enable: z.boolean().default(true).optional(),
})
export type RerankModel = z.infer<typeof rerankModelSchema>

export const DEFAULT_RERANK_MODELS: RerankModel[] = [
  {
    id: 'BAAI/bge-reranker-v2-m3',
    providerId: 'siliconflow',
    providerType: 'siliconflow',
    model: 'BAAI/bge-reranker-v2-m3',
    enable: true,
  },
]

export const DEFAULT_BUILTIN_TOOLS: Record<string, boolean> = {
  bing_search: true,
  web_fetch: true,
  weather_service: true,
  arxiv_search: true,
  current_time: true,
}

const rerankOptionsSchema = z.object({
  enabled: z.boolean().catch(false),
  modelId: z.string().catch(''),
  providerId: z.string().optional(),
  model: z.string().optional(),
  topN: z.number().catch(5),
})

const ragOptionsSchema = z.object({
  enabled: z.boolean().catch(false),
  chunkSize: z.number().catch(1000),
  thresholdTokens: z.number().catch(8192),
  minSimilarity: z.number().catch(0.0),
  limit: z.number().catch(10),
  filterMode: z.enum(['blacklist', 'whitelist']).catch('blacklist'),
  excludePatterns: z.array(z.string()).catch(['.obsidian', '.aider', '.aide', '.trash', '.git', '.smart-env']),
  includePatterns: z.array(z.string()).catch([]),
  backgroundIndexing: z.boolean().catch(false),
  rerank: rerankOptionsSchema.catch({
    enabled: false,
    modelId: '',
    providerId: 'siliconflow',
    model: 'BAAI/bge-reranker-v2-m3',
    topN: 5,
  }),
})

/**
 * Settings
 */

export const smartComposerSettingsSchema = z.object({
  // Version
  version: z.literal(SETTINGS_SCHEMA_VERSION).catch(SETTINGS_SCHEMA_VERSION),

  providers: z.array(llmProviderSchema).catch([...DEFAULT_PROVIDERS]),

  chatModels: z.array(chatModelSchema).catch([...DEFAULT_CHAT_MODELS]),

  embeddingModels: z
    .array(embeddingModelSchema)
    .catch([...DEFAULT_EMBEDDING_MODELS]),

  rerankModels: z
    .array(rerankModelSchema)
    .catch([...DEFAULT_RERANK_MODELS]),

  chatModelId: z.string().catch(DEFAULT_CHAT_MODEL_ID),
  applyModelId: z.string().catch(DEFAULT_APPLY_MODEL_ID),
  embeddingModelId: z.string().catch(''), // model for embedding

  // System Prompt
  systemPrompt: z.string().catch(DEFAULT_SYSTEM_PROMPT),

  // RAG Options
  ragOptions: ragOptionsSchema.catch({
    enabled: false,
    chunkSize: 1000,
    thresholdTokens: 8192,
    minSimilarity: 0.0,
    limit: 10,
    filterMode: 'blacklist',
    excludePatterns: ['.obsidian', '.aider', '.aide', '.trash', '.git', '.smart-env'],
    includePatterns: [],
    backgroundIndexing: false,
    rerank: {
      enabled: false,
      modelId: '',
      providerId: 'siliconflow',
      model: 'BAAI/bge-reranker-v2-m3',
      topN: 5,
    },
  }),

  // MCP configuration
  mcp: z
    .object({
      builtinTools: z
        .record(z.string(), z.boolean())
        .catch({ ...DEFAULT_BUILTIN_TOOLS }),
      servers: z.array(mcpServerConfigSchema).catch([]),
    })
    .catch({
      builtinTools: { ...DEFAULT_BUILTIN_TOOLS },
      servers: [],
    }),

  // Chat options
  chatOptions: z
    .object({
      includeCurrentFileContent: z.boolean(),
      enableTools: z.boolean(),
      maxAutoIterations: z.number(),
      runtimeProfile: z.enum(['eco', 'pro']).catch('eco'),
    })
    .catch({
      includeCurrentFileContent: true,
      enableTools: true,
      maxAutoIterations: 5,
      runtimeProfile: 'eco',
    }),

  language: z.enum(['en', 'zh', 'zh-CN', 'auto']).catch('auto'),
})
export type SmartComposerSettings = z.infer<typeof smartComposerSettingsSchema>

export type SettingMigration = {
  fromVersion: number
  toVersion: number
  migrate: (data: Record<string, unknown>) => Record<string, unknown>
}
