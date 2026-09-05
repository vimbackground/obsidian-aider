import clsx from 'clsx'
import { Check, ChevronDown, ChevronRight, Loader2, X } from 'lucide-react'
import { memo, useCallback, useMemo, useState } from 'react'

import { useMcp } from '../../contexts/mcp-context'
import { useSettings } from '../../contexts/settings-context'
import { parseToolName } from '../../core/mcp/tool-name-utils'
import { ChatToolMessage } from '../../types/chat'
import {
  ToolCallRequest,
  ToolCallResponse,
  ToolCallResponseStatus,
} from '../../types/tool-call.types'
import { SplitButton } from '../common/SplitButton'

import { ObsidianCodeBlock } from './ObsidianMarkdown'

const TOOL_INFO_MAP: Record<string, { zh: string; en: string }> = {
  builtin__bing_search: { zh: '必应网络搜索', en: 'Bing Search' },
  builtin__web_fetch: { zh: '网页正文抓取', en: 'Web Content' },
  builtin__weather_service: { zh: '全球实时天气', en: 'Weather' },
  builtin__arxiv_search: { zh: 'arXiv 学术检索', en: 'arXiv' },
  builtin__current_time: { zh: '系统当前时间', en: 'System Time' },
}

export function getFriendlyToolTitle(
  rawName: string,
  status: ToolCallResponseStatus,
  language = 'zh',
): string {
  const isZh = language === 'zh' || language === 'zh-CN'
  const info = TOOL_INFO_MAP[rawName]
  const toolDisplayName = info
    ? isZh
      ? info.zh
      : info.en
    : rawName.replace(/^(builtin__|mcp__)/, '')

  switch (status) {
    case ToolCallResponseStatus.PendingApproval:
      return isZh ? `请求调用：${toolDisplayName}` : `Tool request: ${toolDisplayName}`
    case ToolCallResponseStatus.Running:
      return isZh ? `正在通过${toolDisplayName}检索...` : `Running ${toolDisplayName}...`
    case ToolCallResponseStatus.Success:
      return isZh ? `已获取${toolDisplayName}结果` : `Completed ${toolDisplayName}`
    case ToolCallResponseStatus.Error:
      return isZh ? `${toolDisplayName}执行未成功` : `${toolDisplayName} failed`
    case ToolCallResponseStatus.Rejected:
      return isZh ? `已拒绝${toolDisplayName}` : `Rejected ${toolDisplayName}`
    case ToolCallResponseStatus.Aborted:
      return isZh ? `已中止${toolDisplayName}` : `Aborted ${toolDisplayName}`
    default:
      return toolDisplayName
  }
}

export const getToolMessageContent = (message: ChatToolMessage): string => {
  return message.toolCalls
    ?.map((toolCall) => {
      const friendlyTitle = getFriendlyToolTitle(
        toolCall.request.name,
        toolCall.response.status,
        'zh',
      )
      return [
        friendlyTitle,
        ...(toolCall.request.arguments
          ? [`Parameters: ${toolCall.request.arguments}`]
          : []),
      ].join('\n')
    })
    .join('\n')
}

const ToolMessage = memo(function ToolMessage({
  message,
  conversationId,
  onMessageUpdate,
}: {
  message: ChatToolMessage
  conversationId: string
  onMessageUpdate: (message: ChatToolMessage) => void
}) {
  return (
    <div className="aide-toolcall-container">
      {message.toolCalls.map((toolCall, index) => (
        <div
          key={toolCall.request.id}
          className={clsx(index > 0 && 'aide-toolcall-border-top')}
        >
          <ToolCallItem
            request={toolCall.request}
            response={toolCall.response}
            conversationId={conversationId}
            onResponseUpdate={(response) =>
              onMessageUpdate({
                ...message,
                toolCalls: message.toolCalls.map((t) =>
                  t.request.id === toolCall.request.id ? { ...t, response } : t,
                ),
              })
            }
          />
        </div>
      ))}
    </div>
  )
})

function ToolCallItem({
  request,
  response,
  conversationId,
  onResponseUpdate,
}: {
  request: ToolCallRequest
  response: ToolCallResponse
  conversationId: string
  onResponseUpdate: (response: ToolCallResponse) => void
}) {
  const {
    handleToolCall,
    handleAllowForConversation,
    handleAllowAutoExecution,
    handleReject,
    handleAbort,
  } = useToolCall(request, conversationId, onResponseUpdate)

  const [isOpen, setIsOpen] = useState(
    // Open by default if the tool call requires approval
    response.status === ToolCallResponseStatus.PendingApproval,
  )

  const parameters = useMemo(() => {
    if (!request.arguments) {
      return 'No parameters'
    }
    try {
      return JSON.stringify(JSON.parse(request.arguments), null, 2)
    } catch {
      return request.arguments
    }
  }, [request.arguments])

  const { settings } = useSettings()
  const language = settings.language ?? 'en'

  return (
    <div className="aide-toolcall">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="aide-toolcall-header"
      >
        <div className="aide-toolcall-header-icon">
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
        <div className="aide-toolcall-header-content">
          <span className="aide-toolcall-friendly-title">
            {getFriendlyToolTitle(request.name, response.status, language)}
          </span>
        </div>
        <div className="aide-toolcall-header-icon aide-toolcall-header-icon--status">
          <StatusIcon status={response.status} />
        </div>
      </div>
      {isOpen && (
        <div className="aide-toolcall-body">
          <div className="aide-toolcall-body-section">
            <div className="aide-toolcall-body-section-title">Parameters</div>
            <ObsidianCodeBlock content={parameters} />
          </div>
          {response.status === ToolCallResponseStatus.Success && (
            <div className="aide-toolcall-body-section">
              <div className="aide-toolcall-body-section-title">Result</div>
              <ObsidianCodeBlock
                content={
                  response.data.type === 'text'
                    ? response.data.text
                    : response.data.type === 'image'
                      ? 'Image'
                      : 'Resource'
                }
              />
            </div>
          )}
          {response.status === ToolCallResponseStatus.Error && (
            <div className="aide-toolcall-body-section">
              <div className="aide-toolcall-body-section-title">Error</div>
              <ObsidianCodeBlock content={response.error} />
            </div>
          )}
        </div>
      )}
      {(response.status === ToolCallResponseStatus.PendingApproval ||
        response.status === ToolCallResponseStatus.Running) && (
        <div className="aide-toolcall-footer">
          {response.status === ToolCallResponseStatus.PendingApproval && (
            <div className="aide-toolcall-footer-actions">
              <SplitButton
                primaryText="Allow"
                onPrimaryClick={() => {
                  void handleToolCall()
                  setIsOpen(false)
                }}
                menuOptions={[
                  {
                    label: 'Always allow this tool',
                    onClick: () => {
                      void handleToolCall()
                      void handleAllowAutoExecution()
                      setIsOpen(false)
                    },
                  },
                  {
                    label: 'Allow for this chat',
                    onClick: () => {
                      void handleToolCall()
                      void handleAllowForConversation()
                      setIsOpen(false)
                    },
                  },
                ]}
              />
              <button
                onClick={() => {
                  void handleReject()
                  setIsOpen(false)
                }}
              >
                Reject
              </button>
            </div>
          )}
          {response.status === ToolCallResponseStatus.Running && (
            <div className="aide-toolcall-footer-actions">
              <button
                onClick={() => {
                  void handleAbort()
                }}
              >
                Abort
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function useToolCall(
  request: ToolCallRequest,
  conversationId: string,
  onResponseUpdate: (response: ToolCallResponse) => void,
) {
  const { settings, setSettings } = useSettings()
  const { getMcpManager } = useMcp()

  const handleToolCall = useCallback(async () => {
    const mcpManager = await getMcpManager()
    onResponseUpdate({
      status: ToolCallResponseStatus.Running,
    })
    const toolCallResponse: ToolCallResponse = await mcpManager.callTool({
      name: request.name,
      args: request.arguments,
      id: request.id,
    })
    onResponseUpdate(toolCallResponse)
  }, [request, onResponseUpdate, getMcpManager])

  const handleAllowForConversation = useCallback(async () => {
    const mcpManager = await getMcpManager()
    mcpManager.allowToolForConversation(request.name, conversationId)
  }, [request, conversationId, getMcpManager])

  const handleAllowAutoExecution = useCallback(async () => {
    const { serverName, toolName } = parseToolName(request.name)
    const server = settings.mcp.servers.find((s) => s.id === serverName)
    if (!server) {
      throw new Error(`Server ${serverName} not found`)
    }
    const toolOptions = { ...server.toolOptions }
    if (!toolOptions[toolName]) {
      // If the tool is not in the toolOptions, add it with default values
      toolOptions[toolName] = {
        allowAutoExecution: false,
        disabled: false,
      }
    }
    toolOptions[toolName] = {
      ...toolOptions[toolName],
      allowAutoExecution: true,
    }

    setSettings({
      ...settings,
      mcp: {
        ...settings.mcp,
        servers: settings.mcp.servers.map((s) =>
          s.id === server.id
            ? {
                ...s,
                toolOptions: toolOptions,
              }
            : s,
        ),
      },
    })
  }, [request, settings, setSettings])

  const handleReject = useCallback(async () => {
    onResponseUpdate({
      status: ToolCallResponseStatus.Rejected,
    })
  }, [onResponseUpdate])

  const handleAbort = useCallback(async () => {
    const mcpManager = await getMcpManager()
    mcpManager.abortToolCall(request.id)
    onResponseUpdate({
      status: ToolCallResponseStatus.Aborted,
    })
  }, [request, onResponseUpdate, getMcpManager])

  return {
    handleToolCall,
    handleAllowForConversation,
    handleAllowAutoExecution,
    handleReject,
    handleAbort,
  }
}

function StatusIcon({ status }: { status: ToolCallResponseStatus }) {
  switch (status) {
    case ToolCallResponseStatus.PendingApproval:
      return null
    case ToolCallResponseStatus.Rejected:
    case ToolCallResponseStatus.Aborted:
    case ToolCallResponseStatus.Error:
      return <X size={16} style={{ color: 'var(--text-error)' }} />
    case ToolCallResponseStatus.Running:
      return <Loader2 size={16} className="spinner" />
    case ToolCallResponseStatus.Success:
      return <Check size={16} style={{ color: 'var(--text-success)' }} />
    default:
      return null
  }
}

export default ToolMessage
