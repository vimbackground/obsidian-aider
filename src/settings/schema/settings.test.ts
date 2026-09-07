import {
  DEFAULT_APPLY_MODEL_ID,
  DEFAULT_CHAT_MODELS,
  DEFAULT_CHAT_MODEL_ID,
  DEFAULT_EMBEDDING_MODELS,
  DEFAULT_PROVIDERS,
  DEFAULT_SYSTEM_EXCLUDES,
  DEFAULT_SYSTEM_PROMPT,
} from '../../constants'

import { SETTINGS_SCHEMA_VERSION } from './migrations'
import {
  DEFAULT_BUILTIN_TOOLS,
  DEFAULT_RERANK_MODELS,
} from './setting.types'
import { parseAiderSettings } from './settings'

describe('parseAiderSettings', () => {
  it('should return default values for empty input', () => {
    const result = parseAiderSettings({})
    expect(result).toEqual({
      version: SETTINGS_SCHEMA_VERSION,

      providers: [...DEFAULT_PROVIDERS],

      chatModels: [...DEFAULT_CHAT_MODELS],
      embeddingModels: [...DEFAULT_EMBEDDING_MODELS],
      rerankModels: [...DEFAULT_RERANK_MODELS],

      chatModelId: DEFAULT_CHAT_MODEL_ID,
      applyModelId: DEFAULT_APPLY_MODEL_ID,
      embeddingModelId: '',

      systemPrompt: DEFAULT_SYSTEM_PROMPT,

      ragOptions: {
        enabled: false,
        chunkSize: 1000,
        thresholdTokens: 8192,
        minSimilarity: 0.0,
        limit: 10,
        filterMode: 'blacklist',
        excludePatterns: [...DEFAULT_SYSTEM_EXCLUDES],
        includePatterns: [],
        backgroundIndexing: false,
        rerank: {
          enabled: false,
          modelId: '',
          providerId: 'siliconflow',
          model: 'BAAI/bge-reranker-v2-m3',
          topN: 5,
        },
      },

      mcp: {
        builtinTools: { ...DEFAULT_BUILTIN_TOOLS },
        servers: [],
      },

      chatOptions: {
        includeCurrentFileContent: true,
        enableTools: true,
        maxAutoIterations: 5,
        runtimeProfile: 'eco',
      },

      language: 'auto',
    })
  })
})
