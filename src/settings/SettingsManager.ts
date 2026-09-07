import { App, Notice } from 'obsidian'

import {
  DEFAULT_CHAT_MODELS,
  DEFAULT_CHAT_MODEL_ID,
  DEFAULT_EMBEDDING_MODELS,
  DEFAULT_PROVIDERS,
  DEFAULT_SYSTEM_PROMPT,
} from '../constants'

import { AiderSettings, aiderSettingsSchema } from './schema/setting.types'
import { parseAiderSettings } from './schema/settings'

export class SettingsManager {
  private app: App
  private plugin: {
    loadData: () => Promise<any>
    saveData: (data: any) => Promise<void>
  }
  private currentSettings: AiderSettings | null = null

  constructor(
    app: App,
    plugin: {
      loadData: () => Promise<any>
      saveData: (data: any) => Promise<void>
    },
  ) {
    this.app = app
    this.plugin = plugin
  }

  public async loadSettings(): Promise<AiderSettings> {
    const rawData = await this.plugin.loadData()
    const settings = parseAiderSettings(rawData)
    
    // Apply dynamic enforcements and legacy cleanup
    const hasChanges = this.enforceDynamicSettings(settings)
    
    if (hasChanges) {
      await this.plugin.saveData(settings)
    }
    
    this.currentSettings = settings
    return settings
  }

  public async setSettings(newSettings: AiderSettings): Promise<boolean> {
    const validationResult = aiderSettingsSchema.safeParse(newSettings)
    if (!validationResult.success) {
      new Notice(`Invalid settings:\n${validationResult.error.issues.map((v) => v.message).join('\n')}`)
      return false
    }

    await this.plugin.saveData(newSettings)
    this.currentSettings = newSettings
    return true
  }

  private enforceDynamicSettings(settings: AiderSettings): boolean {
    let hasChanges = false

    // 1. MCP Servers Deduplication and Cleanup
    const currentServers = settings.mcp?.servers || []
    const seenIds = new Set<string>()
    const deduplicatedServers = []

    for (const server of currentServers) {
      if (!server || !server.id) continue
      const lowerId = server.id.toLowerCase()
      // Filter out legacy injected fake external tools
      if (
        lowerId.includes('bing-cn-search') ||
        lowerId.includes('web-fetch') ||
        lowerId.includes('weather-service') ||
        lowerId.includes('arxiv-search') ||
        lowerId.includes('time-service')
      ) {
        hasChanges = true
        continue
      }
      if (!seenIds.has(server.id)) {
        seenIds.add(server.id)
        deduplicatedServers.push(server)
      } else {
        hasChanges = true
      }
    }

    if (hasChanges || deduplicatedServers.length !== currentServers.length) {
      settings.mcp.servers = deduplicatedServers
      hasChanges = true
    }

    // 2. Default System Prompt
    if (!settings.systemPrompt || !settings.systemPrompt.trim()) {
      settings.systemPrompt = DEFAULT_SYSTEM_PROMPT
      hasChanges = true
    }

    // 3. Provider Cleanup
    const allowedProviderTypes = new Set(['openai', 'deepseek', 'openrouter', 'siliconflow'])
    const existingProviders = settings.providers || []
    const filteredProviders = existingProviders.filter((p) => {
      if (allowedProviderTypes.has(p.type)) return true
      return Boolean(p.apiKey && p.apiKey.trim() !== '')
    })
    
    for (const defaultProvider of DEFAULT_PROVIDERS) {
      if (!filteredProviders.some((p) => p.type === defaultProvider.type)) {
        filteredProviders.push({ ...defaultProvider })
        hasChanges = true
      }
    }
    
    if (filteredProviders.length !== existingProviders.length) {
      settings.providers = filteredProviders
      hasChanges = true
    }

    // 4. Embedding Model Cleanup
    const legacyEmbeddingModelIds = new Set([
      'openai/text-embedding-3-small',
      'openai/text-embedding-3-large',
      'gemini/text-embedding-004',
      'ollama/nomic-embed-text',
      'ollama/mxbai-embed-large',
      'ollama/bge-m3',
      'bge-m3',
    ])
    const currentEmbeddingModels = (settings.embeddingModels || []).filter(
      (m) => !legacyEmbeddingModelIds.has(m.id),
    )
    for (const defaultModel of DEFAULT_EMBEDDING_MODELS) {
      const existing = currentEmbeddingModels.find(
        (m) => m.id === defaultModel.id || m.model === defaultModel.model,
      )
      if (!existing) {
        currentEmbeddingModels.push({ ...defaultModel })
        hasChanges = true
      } else if (!existing.enable) {
        existing.enable = true
        hasChanges = true
      }
    }
    
    if (settings.embeddingModels?.length !== currentEmbeddingModels.length) {
      settings.embeddingModels = currentEmbeddingModels
      hasChanges = true
    }

    if (
      !settings.embeddingModelId ||
      legacyEmbeddingModelIds.has(settings.embeddingModelId) ||
      !settings.embeddingModels.some((m) => m.id === settings.embeddingModelId)
    ) {
      settings.embeddingModelId = ''
      hasChanges = true
    }

    // 5. Chat Model Cleanup
    const hasAnthropicKey = filteredProviders.some(
      (p) => p.type === 'anthropic' && Boolean(p.apiKey && p.apiKey.trim() !== ''),
    )
    const configuredProviderIds = new Set(
      filteredProviders
        .filter((p) => Boolean(p.apiKey && p.apiKey.trim() !== ''))
        .map((p) => p.id),
    )
    const configuredProviderTypes = new Set(
      filteredProviders
        .filter((p) => Boolean(p.apiKey && p.apiKey.trim() !== ''))
        .map((p) => p.type),
    )
    const currentChatModels = (settings.chatModels || []).filter((m) => {
      if (m.id === DEFAULT_CHAT_MODEL_ID) return true
      const providerTypeStr = m.providerType as string
      if (
        providerTypeStr === 'anthropic-plan' ||
        providerTypeStr === 'openai-plan' ||
        providerTypeStr === 'gemini-plan'
      ) {
        return false
      }
      if (m.providerType === 'groq' && m.id === 'qwen/qwen3.8-27b') return false
      if (m.id === 'deepseek-ai/DeepSeek-V4-Flash') return false
      return (
        configuredProviderIds.has(m.providerId) ||
        configuredProviderTypes.has(m.providerType)
      )
    })
    for (const defaultModel of DEFAULT_CHAT_MODELS) {
      const existing = currentChatModels.find(
        (m) => m.id === defaultModel.id || m.model === defaultModel.model,
      )
      if (!existing) {
        currentChatModels.push({ ...defaultModel })
        hasChanges = true
      } else if (!existing.enable) {
        existing.enable = true
        hasChanges = true
      }
    }
    
    if (settings.chatModels?.length !== currentChatModels.length) {
      settings.chatModels = currentChatModels
      hasChanges = true
    }

    // Default chat model reset if invalid or missing auth
    if (
      !settings.chatModelId ||
      (!hasAnthropicKey && settings.chatModelId.toLowerCase().includes('claude')) ||
      settings.chatModelId === 'deepseek-ai/DeepSeek-V4-Flash' ||
      !currentChatModels.some((m) => m.id === settings.chatModelId)
    ) {
      settings.chatModelId = DEFAULT_CHAT_MODEL_ID
      hasChanges = true
    }

    // 6. Max Iterations and Profile
    if (
      !settings.chatOptions.maxAutoIterations ||
      settings.chatOptions.maxAutoIterations < 5
    ) {
      settings.chatOptions.maxAutoIterations = 5
      hasChanges = true
    }
    if (!settings.chatOptions.runtimeProfile) {
      settings.chatOptions.runtimeProfile = 'eco'
      hasChanges = true
    }

    return hasChanges
  }
}
