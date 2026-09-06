import { Editor, MarkdownView, Notice, Plugin } from 'obsidian'

import { ChatView } from './ChatView'
import { ChatProps } from './components/chat-view/Chat'
import {
  CHAT_VIEW_TYPE,
  DEFAULT_CHAT_MODELS,
  DEFAULT_CHAT_MODEL_ID,
  DEFAULT_EMBEDDING_MODELS,
  DEFAULT_PROVIDERS,
  DEFAULT_SYSTEM_PROMPT,
} from './constants'
import { McpManager } from './core/mcp/mcpManager'
import { RAGEngine } from './core/rag/ragEngine'
import { DatabaseManager } from './database/DatabaseManager'
import {
  SmartComposerSettings,
  smartComposerSettingsSchema,
} from './settings/schema/setting.types'
import { parseSmartComposerSettings } from './settings/schema/settings'
import { SmartComposerSettingTab } from './settings/SettingTab'
import { getMentionableBlockData } from './utils/obsidian'

export default class SmartComposerPlugin extends Plugin {
  settings: SmartComposerSettings
  initialChatProps?: ChatProps
  settingsChangeListeners: ((newSettings: SmartComposerSettings) => void)[] = []
  mcpManager: McpManager | null = null
  dbManager: DatabaseManager | null = null
  ragEngine: RAGEngine | null = null
  private dbManagerInitPromise: Promise<DatabaseManager> | null = null
  private ragEngineInitPromise: Promise<RAGEngine> | null = null
  private timeoutIds: number[] = []

  async onload() {
    await this.loadSettings()
    await this.migrateLegacyDirectories()

    this.registerView(CHAT_VIEW_TYPE, (leaf) => new ChatView(leaf, this))
    // 兼容旧版视图标识，防止老用户标签页报错
    this.registerView('smtcmp-chat-view', (leaf) => new ChatView(leaf, this))

    // This creates an icon in the left ribbon.
    this.addRibbonIcon('wand-sparkles', '打开 Aider 助手', () =>
      this.openChatView(),
    )

    // This adds a simple command that can be triggered anywhere
    this.addCommand({
      id: 'open-new-chat',
      name: '打开对话 (Open chat)',
      callback: () => {
        void this.openChatView(true)
      },
    })

    this.addCommand({
      id: 'add-selection-to-chat',
      name: '将选中内容添加到对话 (Add selection to chat)',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        void this.addSelectionToChat(editor, view)
      },
    })

    this.addCommand({
      id: 'rebuild-vault-index',
      name: '重建整个知识库索引 (Rebuild entire vault index)',
      callback: async () => {
        const notice = new Notice('正在全量重建知识库索引...', 0)
        try {
          const ragEngine = await this.getRAGEngine()
          await ragEngine.updateVaultIndex(
            { reindexAll: true },
            (queryProgress) => {
              if (queryProgress.type === 'indexing') {
                const { completedChunks, totalChunks } =
                  queryProgress.indexProgress
                notice.setMessage(
                  `正在索引知识库文本块: ${completedChunks} / ${totalChunks}${
                    queryProgress.indexProgress.waitingForRateLimit
                      ? '\n(等待速率限制重置中...)'
                      : ''
                  }`,
                )
              }
            },
          )
          notice.setMessage('知识库索引全量重建完成')
        } catch (error) {
          console.error(error)
          notice.setMessage('知识库索引全量重建失败')
        } finally {
          this.registerTimeout(() => {
            notice.hide()
          }, 1000)
        }
      },
    })

    this.addCommand({
      id: 'update-vault-index',
      name: '更新修改文件的知识库索引 (Update index for modified files)',
      callback: async () => {
        const notice = new Notice('正在增量更新知识库索引...', 0)
        try {
          const ragEngine = await this.getRAGEngine()
          await ragEngine.updateVaultIndex(
            { reindexAll: false },
            (queryProgress) => {
              if (queryProgress.type === 'indexing') {
                const { completedChunks, totalChunks } =
                  queryProgress.indexProgress
                notice.setMessage(
                  `正在更新知识库文本块: ${completedChunks} / ${totalChunks}${
                    queryProgress.indexProgress.waitingForRateLimit
                      ? '\n(等待速率限制重置中...)'
                      : ''
                  }`,
                )
              }
            },
          )
          notice.setMessage('知识库索引更新完毕')
        } catch (error) {
          console.error(error)
          notice.setMessage('知识库索引更新失败')
        } finally {
          this.registerTimeout(() => {
            notice.hide()
          }, 1000)
        }
      },
    })
    
    this.addSettingTab(new SmartComposerSettingTab(this.app, this))

    // Set up background indexing listener
    this.app.workspace.onLayoutReady(() => {
      this.app.vault.on('modify', () => this.triggerBackgroundIndex())
      this.app.vault.on('delete', () => this.triggerBackgroundIndex())
      this.app.vault.on('rename', () => this.triggerBackgroundIndex())
    })
  }

  private indexTimeout: number | null = null

  private triggerBackgroundIndex() {
    if (!this.settings.ragOptions.backgroundIndexing) return
    
    if (this.indexTimeout) {
      window.clearTimeout(this.indexTimeout)
    }
    this.indexTimeout = window.setTimeout(() => {
      void (async () => {
        try {
          const ragEngine = await this.getRAGEngine()
          await ragEngine.updateVaultIndex({ reindexAll: false })
        } catch (e) {
          console.error('Background index failed', e)
        }
      })()
    }, 5000) // 5 second debounce
  }

  onunload() {
    // clear all timers
    this.timeoutIds.forEach((id) => window.clearTimeout(id))
    this.timeoutIds = []

    // RagEngine cleanup
    this.ragEngine?.cleanup()
    this.ragEngine = null

    // Promise cleanup
    this.dbManagerInitPromise = null
    this.ragEngineInitPromise = null

    // DatabaseManager cleanup
    this.dbManager?.cleanup()
    this.dbManager = null

    // McpManager cleanup
    this.mcpManager?.cleanup()
    this.mcpManager = null
  }

  async loadSettings() {
    this.settings = parseSmartComposerSettings(await this.loadData())

    // 清理历史残留的假外部内置工具配置，并对真实外部服务做严格去重
    const currentServers = this.settings.mcp?.servers || []
    const seenIds = new Set<string>()
    const deduplicatedServers = []
    let hasChanges = false

    for (const server of currentServers) {
      if (!server || !server.id) continue
      const lowerId = server.id.toLowerCase()
      // 过滤旧版写入外部列表中的内置工具假配置
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
      this.settings.mcp.servers = deduplicatedServers
    }

    // 1. 确保默认系统提示词非空
    if (!this.settings.systemPrompt || !this.settings.systemPrompt.trim()) {
      this.settings.systemPrompt = DEFAULT_SYSTEM_PROMPT
    }

    // 2. 服务商精简：仅保留 openai, deepseek, openrouter, siliconflow，过滤未填写 Key 的其余服务商
    const allowedProviderTypes = new Set(['openai', 'deepseek', 'openrouter', 'siliconflow'])
    const existingProviders = this.settings.providers || []
    const filteredProviders = existingProviders.filter((p) => {
      if (allowedProviderTypes.has(p.type)) return true
      return Boolean(p.apiKey && p.apiKey.trim() !== '')
    })
    for (const defaultProvider of DEFAULT_PROVIDERS) {
      if (!filteredProviders.some((p) => p.type === defaultProvider.type)) {
        filteredProviders.push({ ...defaultProvider })
      }
    }
    this.settings.providers = filteredProviders

    // 3. 嵌入模型清理：彻底过滤遗留内置嵌入模型，默认仅保留 SiliconFlow 的 BAAI/bge-m3
    const legacyEmbeddingModelIds = new Set([
      'openai/text-embedding-3-small',
      'openai/text-embedding-3-large',
      'gemini/text-embedding-004',
      'ollama/nomic-embed-text',
      'ollama/mxbai-embed-large',
      'ollama/bge-m3',
      'bge-m3',
    ])
    let currentEmbeddingModels = (this.settings.embeddingModels || []).filter(
      (m) => !legacyEmbeddingModelIds.has(m.id),
    )
    for (const defaultModel of DEFAULT_EMBEDDING_MODELS) {
      const existing = currentEmbeddingModels.find(
        (m) => m.id === defaultModel.id || m.model === defaultModel.model,
      )
      if (!existing) {
        currentEmbeddingModels.push({ ...defaultModel })
      } else {
        existing.enable = true
      }
    }
    this.settings.embeddingModels = currentEmbeddingModels

    if (
      !this.settings.embeddingModelId ||
      legacyEmbeddingModelIds.has(this.settings.embeddingModelId) ||
      !this.settings.embeddingModels.some((m) => m.id === this.settings.embeddingModelId)
    ) {
      this.settings.embeddingModelId = ''
    }

    // 4. 对话模型清理：仅保留 Qwen/Qwen3.5-4B 以及用户已配置 API Key 的模型，其它默认模型不要添加
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
    let currentChatModels = (this.settings.chatModels || []).filter((m) => {
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
      } else {
        existing.enable = true
      }
    }
    this.settings.chatModels = currentChatModels

    // 确保默认对话模型设置：若为 Claude 或不存在则重置为默认 Qwen/Qwen3.5-4B
    if (
      !this.settings.chatModelId ||
      (!hasAnthropicKey && this.settings.chatModelId.toLowerCase().includes('claude')) ||
      this.settings.chatModelId === 'deepseek-ai/DeepSeek-V4-Flash' ||
      !currentChatModels.some((m) => m.id === this.settings.chatModelId)
    ) {
      this.settings.chatModelId = DEFAULT_CHAT_MODEL_ID
    }

    // 3. 步数上限提至 5 步，服务层级默认为 eco (免费层模式)
    if (
      !this.settings.chatOptions.maxAutoIterations ||
      this.settings.chatOptions.maxAutoIterations < 5
    ) {
      this.settings.chatOptions.maxAutoIterations = 5
    }
    if (!this.settings.chatOptions.runtimeProfile) {
      this.settings.chatOptions.runtimeProfile = 'eco'
    }

    await this.saveData(this.settings) // Save updated settings

    // 4. 自动初始化 Obsidian 场景专属预设提示词模板（统一中英双语格式）
    try {
      const { TemplateManager } = await import(
        './database/json/template/TemplateManager'
      )
      const templateManager = new TemplateManager(this.app)
      await templateManager.ensurePresetTemplates()
    } catch (err) {
      console.warn('[Aider] Preset templates initialization error:', err)
    }
  }

  async setSettings(newSettings: SmartComposerSettings) {
    const validationResult = smartComposerSettingsSchema.safeParse(newSettings)

    if (!validationResult.success) {
      new Notice(`Invalid settings:
${validationResult.error.issues.map((v) => v.message).join('\n')}`)
      return
    }

    this.settings = newSettings
    await this.saveData(newSettings)
    this.ragEngine?.setSettings(newSettings)
    this.settingsChangeListeners.forEach((listener) => listener(newSettings))
  }

  addSettingsChangeListener(
    listener: (newSettings: SmartComposerSettings) => void,
  ) {
    this.settingsChangeListeners.push(listener)
    return () => {
      this.settingsChangeListeners = this.settingsChangeListeners.filter(
        (l) => l !== listener,
      )
    }
  }

  async openChatView(openNewChat = false) {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView)
    const editor = view?.editor
    if (!view || !editor) {
      await this.activateChatView(undefined, openNewChat)
      return
    }
    const selectedBlockData = await getMentionableBlockData(editor, view)
    await this.activateChatView(
      {
        selectedBlock: selectedBlockData ?? undefined,
      },
      openNewChat,
    )
  }

  async activateChatView(chatProps?: ChatProps, openNewChat = false) {
    // chatProps is consumed in ChatView.tsx
    this.initialChatProps = chatProps

    const leaf = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE)[0]

    await (leaf ?? this.app.workspace.getRightLeaf(false))?.setViewState({
      type: CHAT_VIEW_TYPE,
      active: true,
    })

    if (openNewChat && leaf && leaf.view instanceof ChatView) {
      leaf.view.openNewChat(chatProps?.selectedBlock)
    }

    void this.app.workspace.revealLeaf(
      this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE)[0],
    )
  }

  async addSelectionToChat(editor: Editor, view: MarkdownView) {
    const data = await getMentionableBlockData(editor, view)
    if (!data) return

    const leaves = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE)
    if (leaves.length === 0 || !(leaves[0].view instanceof ChatView)) {
      await this.activateChatView({
        selectedBlock: data,
      })
      return
    }

    // bring leaf to foreground (uncollapse sidebar if it's collapsed)
    await this.app.workspace.revealLeaf(leaves[0])

    const chatView = leaves[0].view
    chatView.addSelectionToChat(data)
    chatView.focusMessage()
  }

  async getDbManager(): Promise<DatabaseManager> {
    if (this.dbManager) {
      return this.dbManager
    }

    if (!this.dbManagerInitPromise) {
      this.dbManagerInitPromise = (async () => {
        try {
          this.dbManager = await DatabaseManager.create(this.app)
          return this.dbManager
        } catch (error) {
          this.dbManagerInitPromise = null
          throw error
        }
      })()
    }

    return this.dbManagerInitPromise
  }

  async getRAGEngine(): Promise<RAGEngine> {
    if (this.ragEngine) {
      return this.ragEngine
    }

    if (!this.ragEngineInitPromise) {
      this.ragEngineInitPromise = (async () => {
        try {
          const dbManager = await this.getDbManager()
          this.ragEngine = new RAGEngine(
            this.app,
            this.settings,
            dbManager.getVectorManager(),
          )
          return this.ragEngine
        } catch (error) {
          this.ragEngineInitPromise = null
          throw error
        }
      })()
    }

    return this.ragEngineInitPromise
  }

  async getMcpManager(): Promise<McpManager> {
    if (this.mcpManager) {
      return this.mcpManager
    }

    try {
      this.mcpManager = new McpManager({
        settings: this.settings,
        registerSettingsListener: (
          listener: (settings: SmartComposerSettings) => void,
        ) => this.addSettingsChangeListener(listener),
      })
      await this.mcpManager.initialize()
      return this.mcpManager
    } catch (error) {
      this.mcpManager = null
      throw error
    }
  }
  private registerTimeout(callback: () => void, timeout: number): void {
    const timeoutId = window.setTimeout(callback, timeout)
    this.timeoutIds.push(timeoutId)
  }

  private async migrateLegacyDirectories(): Promise<void> {
    try {
      const adapter = this.app.vault.adapter
      const legacyDir = '.smtcmp_json_db'
      const aideDir = '.aide'
      const newDir = '.aider'

      const renameSafe = async (fromPath: string, toPath: string) => {
        const adapterWithRename = adapter as unknown as {
          rename: (from: string, to: string) => Promise<void>
        }
        await adapterWithRename.rename(fromPath, toPath)
      }

      // 1. Migrate old .smtcmp_json_db
      if (await adapter.exists(legacyDir)) {
        if (!(await adapter.exists(newDir)) && !(await adapter.exists(aideDir))) {
          await renameSafe(legacyDir, newDir)
        }
      }

      // 2. Migrate .aide -> .aider
      if (await adapter.exists(aideDir)) {
        if (!(await adapter.exists(newDir))) {
          await renameSafe(aideDir, newDir)
        }
      }

      // 3. Ensure target directory structure exists
      if (!(await adapter.exists(newDir))) {
        await adapter.mkdir(newDir)
      }

      const chatsDir = `${newDir}/chats`
      if (!(await adapter.exists(chatsDir))) {
        await adapter.mkdir(chatsDir)
      }

      const templatesDir = `${newDir}/templates`
      if (!(await adapter.exists(templatesDir))) {
        await adapter.mkdir(templatesDir)
      }

      // 4. Migrate legacy vector files
      const legacyTars = ['.smtcmp_vector_db.tar.gz', '.aide/vector_db.tar.gz']
      const newTar = '.aider/vector_db.tar.gz'
      for (const oldTar of legacyTars) {
        if (await adapter.exists(oldTar)) {
          if (!(await adapter.exists(newTar))) {
            await renameSafe(oldTar, newTar)
          } else {
            await adapter.remove(oldTar)
          }
        }
      }

      const legacyJsons = ['.smtcmp_vectors.json', '.aide/vectors.json']
      const newJson = '.aider/vectors.json'
      for (const oldJson of legacyJsons) {
        if (await adapter.exists(oldJson)) {
          if (!(await adapter.exists(newJson))) {
            await renameSafe(oldJson, newJson)
          } else {
            await adapter.remove(oldJson)
          }
        }
      }
    } catch {
      // Ignored non-critical directory migration errors
    }
  }
}
