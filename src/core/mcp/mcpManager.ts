import { SmartComposerSettings } from '../../settings/schema/setting.types'
import {
  McpServerState,
  McpTool,
} from '../../types/mcp.types'
import {
  ToolCallResponse,
  ToolCallResponseStatus,
} from '../../types/tool-call.types'
import {
  executeBuiltinTool,
  getBuiltinToolsList,
  isBuiltinTool,
} from '../tools/builtinTools'

export class McpManager {
  static readonly TOOL_NAME_DELIMITER = '__' // Delimiter for tool name construction (serverName__toolName)

  // Zero Node.js runtime dependencies: Native tools are cross-platform and work on all devices (Desktop & Mobile)
  public readonly disabled = false

  private settings: SmartComposerSettings
  private unsubscribeFromSettings: () => void

  private servers: McpServerState[] = []
  private activeToolCalls: Map<string, AbortController> = new Map()
  private allowedToolsByConversation: Map<string, Set<string>> = new Map()
  private subscribers = new Set<(servers: McpServerState[]) => void>()

  constructor({
    settings,
    registerSettingsListener,
  }: {
    settings: SmartComposerSettings
    registerSettingsListener: (
      listener: (settings: SmartComposerSettings) => void,
    ) => () => void
  }) {
    this.settings = settings
    this.unsubscribeFromSettings = registerSettingsListener((newSettings) => {
      void this.handleSettingsUpdate(newSettings)
    })
  }

  public async initialize() {
    this.servers = []
    this.notifySubscribers()
  }

  public cleanup() {
    if (this.unsubscribeFromSettings) {
      this.unsubscribeFromSettings()
    }

    this.servers = []
    this.subscribers.clear()
    this.activeToolCalls.clear()
  }

  public getServers(): McpServerState[] {
    return this.servers
  }

  public subscribeServersChange(callback: (servers: McpServerState[]) => void) {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  public async handleSettingsUpdate(settings: SmartComposerSettings) {
    this.settings = settings
    this.notifySubscribers()
  }

  private notifySubscribers() {
    for (const cb of this.subscribers) cb(this.servers)
  }

  public async listAvailableTools(): Promise<McpTool[]> {
    const builtinConfig = this.settings.mcp?.builtinTools ?? {}
    const builtinTools = getBuiltinToolsList().filter((tool) => {
      const key = tool.name.replace('builtin__', '')
      return builtinConfig[key] ?? true
    })

    return builtinTools
  }

  public allowToolForConversation(
    requestToolName: string,
    conversationId: string,
  ): void {
    let allowedTools = this.allowedToolsByConversation.get(conversationId)
    if (!allowedTools) {
      allowedTools = new Set<string>()
      this.allowedToolsByConversation.set(conversationId, allowedTools)
    }
    allowedTools.add(requestToolName)
  }

  public isToolExecutionAllowed({
    requestToolName,
    conversationId,
  }: {
    requestToolName: string
    conversationId?: string
  }): boolean {
    // Built-in tools are native and always allowed to execute automatically
    if (isBuiltinTool(requestToolName)) {
      return true
    }

    if (conversationId) {
      if (
        this.allowedToolsByConversation
          .get(conversationId)
          ?.has(requestToolName)
      ) {
        return true
      }
    }

    return false
  }

  public async callTool({
    name,
    args,
    id: _id,
    signal: _signal,
  }: {
    name: string
    args?: Record<string, unknown> | string | undefined
    id?: string
    signal?: AbortSignal
  }): Promise<
    Extract<
      ToolCallResponse,
      {
        status:
          | ToolCallResponseStatus.Success
          | ToolCallResponseStatus.Error
          | ToolCallResponseStatus.Aborted
      }
    >
  > {
    // 1. Builtin native tool execution (Zero Node.js dependency, works on all platforms)
    if (isBuiltinTool(name)) {
      try {
        const parsedArgs: Record<string, unknown> =
          typeof args === 'string'
            ? args === ''
              ? {}
              : (JSON.parse(args) as Record<string, unknown>)
            : (args ?? {})
        const textResult = await executeBuiltinTool(name, parsedArgs)
        return {
          status: ToolCallResponseStatus.Success,
          data: {
            type: 'text',
            text: textResult,
          },
        }
      } catch (err) {
        return {
          status: ToolCallResponseStatus.Error,
          error: err instanceof Error ? err.message : String(err),
        }
      }
    }

    return {
      status: ToolCallResponseStatus.Error,
      error: `Tool "${name}" is not available or external command execution is disabled.`,
    }
  }

  public abortToolCall(id: string): boolean {
    const toolAbortController = this.activeToolCalls.get(id)
    if (toolAbortController) {
      toolAbortController.abort()
      this.activeToolCalls.delete(id)
      return true
    }
    return false
  }
}
