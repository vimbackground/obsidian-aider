import { DEFAULT_SYSTEM_PROMPT } from '../../../constants'
import { migrateFrom16To17 } from './16_to_17'

describe('Migration from v16 to v17', () => {
  it('should increment version to 17', () => {
    const oldSettings = {
      version: 16,
    }
    const result = migrateFrom16To17(oldSettings)
    expect(result.version).toBe(17)
  })

  it('should restore default system prompt if empty or whitespace', () => {
    const emptySettings = {
      version: 16,
      systemPrompt: '',
    }
    const result = migrateFrom16To17(emptySettings)
    expect(result.systemPrompt).toBe(DEFAULT_SYSTEM_PROMPT)

    const whitespaceSettings = {
      version: 16,
      systemPrompt: '   \n  ',
    }
    const result2 = migrateFrom16To17(whitespaceSettings)
    expect(result2.systemPrompt).toBe(DEFAULT_SYSTEM_PROMPT)

    const userPrompt = 'Custom system prompt from user'
    const preservedSettings = {
      version: 16,
      systemPrompt: userPrompt,
    }
    const result3 = migrateFrom16To17(preservedSettings)
    expect(result3.systemPrompt).toBe(userPrompt)
  })

  it('should purge legacy embedding models and keep only BAAI/bge-m3', () => {
    const oldSettings = {
      version: 16,
      embeddingModels: [
        {
          providerType: 'openai',
          providerId: 'openai',
          id: 'openai/text-embedding-3-small',
          model: 'text-embedding-3-small',
          dimension: 1536,
        },
        {
          providerType: 'gemini',
          providerId: 'gemini',
          id: 'gemini/text-embedding-004',
          model: 'text-embedding-004',
          dimension: 768,
        },
        {
          providerType: 'ollama',
          providerId: 'ollama',
          id: 'ollama/nomic-embed-text',
          model: 'nomic-embed-text',
          dimension: 768,
        },
      ],
      embeddingModelId: 'openai/text-embedding-3-small',
    }

    const result = migrateFrom16To17(oldSettings)
    const embeddingModels = result.embeddingModels as Array<{ id: string }>
    expect(embeddingModels).toHaveLength(1)
    expect(embeddingModels[0].id).toBe('BAAI/bge-m3')
    expect(result.embeddingModelId).toBe('')
  })

  it('should purge legacy plan models and unconfigured Claude models and reset chatModelId', () => {
    const oldSettings = {
      version: 16,
      providers: [
        { type: 'openai', id: 'openai' },
        { type: 'siliconflow', id: 'siliconflow' },
      ],
      chatModels: [
        {
          id: 'claude-opus-4.5 (plan)',
          providerType: 'anthropic-plan',
          model: 'claude-opus-4-5',
        },
        {
          id: 'claude-sonnet-4.5 (plan)',
          providerType: 'anthropic-plan',
          model: 'claude-sonnet-4-5',
        },
        {
          id: 'gpt-5.2 (plan)',
          providerType: 'openai-plan',
          model: 'gpt-5.2',
        },
        {
          id: 'claude-3.5-sonnet',
          providerType: 'anthropic',
          model: 'claude-3-5-sonnet-latest',
        },
      ],
      chatModelId: 'claude-sonnet-4.5 (plan)',
    }

    const result = migrateFrom16To17(oldSettings)
    const chatModels = result.chatModels as Array<{ id: string }>
    expect(chatModels.some((m) => m.id.includes('plan'))).toBe(false)
    expect(chatModels.some((m) => m.id.includes('claude'))).toBe(false)
    expect(chatModels.some((m) => m.id === 'Qwen/Qwen3.5-4B')).toBe(true)
    expect(result.chatModelId).toBe('Qwen/Qwen3.5-4B')
  })
})
