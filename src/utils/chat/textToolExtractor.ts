import { v4 as uuidv4 } from 'uuid'

import { ToolCallRequest } from '../../types/tool-call.types'

/**
 * 规范化工具名称，容错小模型可能出现的轻微拼写偏差
 * 例如：builtinbing_search -> builtin__bing_search
 */
export function normalizeToolName(toolName: string): string {
  if (!toolName) return ''
  const trimmed = toolName.trim()
  if (trimmed.startsWith('builtin__')) return trimmed
  if (trimmed.startsWith('builtin_')) return trimmed.replace('builtin_', 'builtin__')
  if (trimmed.startsWith('builtin')) return trimmed.replace('builtin', 'builtin__')
  return trimmed
}

/**
 * 净化大模型返回的正文内容，彻底剔除模型意外在文本中泄露的底层机器语法与标签
 * 包括：<tool_call>、<|DSML|>、< | DSML | > 及其内部结构
 */
export function sanitizeAssistantContent(text: string): string {
  if (!text) return ''

  let sanitized = text
  // 1. 剥离闭合及流式末尾未闭合的 <tool_call>...</tool_call>
  sanitized = sanitized.replace(/<tool_call>[\s\S]*?(?:<\/tool_call>|$)/gi, '')

  // 2. 剥离 DSML 块：<|DSML|...> 或 < | DSML | ...>
  sanitized = sanitized.replace(
    /<[\s]*\|[\s]*DSML[\s]*\|[\s\S]*?(?:<\/[\s]*\|[\s]*DSML[\s]*\|[\s\S]*?>|$)/gi,
    '',
  )

  // 3. 清理任何残留的孤立 DSML 或 tool_call 标签
  sanitized = sanitized.replace(/<[\s/]*\|[\s]*DSML[\s]*\|[^>]*>/gi, '')
  sanitized = sanitized.replace(/<\/?tool_call>/gi, '')

  // 4. 清理残留的孤立 <function=...> 与 <parameter=...> 结构
  sanitized = sanitized.replace(/<function=[^>]*>[\s\S]*?(?:<\/function>|$)/gi, '')
  sanitized = sanitized.replace(/<parameter=[^>]*>[\s\S]*?(?:<\/parameter>|$)/gi, '')

  return sanitized
}

/**
 * 从模型流式输出的正文中容错提取文本格式的工具调用（支持 DSML 与 XML <tool_call> 语法）
 */
export function extractTextToolCalls(content: string): {
  toolCalls: ToolCallRequest[]
  cleanedContent: string
} {
  const toolCalls: ToolCallRequest[] = []
  let cleaned = content

  // 1. 解析 DSML 格式：< | DSML | tool_calls> ... </ | DSML | tool_calls>
  const dsmlBlockRegex =
    /<[\s]*\|[\s]*DSML[\s]*\|[\s]*tool_calls>([\s\S]*?)<\/[\s]*\|[\s]*DSML[\s]*\|[\s]*tool_calls>/gi
  let dsmlMatch: RegExpExecArray | null
  while ((dsmlMatch = dsmlBlockRegex.exec(content)) !== null) {
    const inner = dsmlMatch[1]
    const invokeRegex =
      /<[\s]*\|[\s]*DSML[\s]*\|[\s]*invoke\s+name=["']([^"']+)["']>([\s\S]*?)<\/[\s]*\|[\s]*DSML[\s]*\|[\s]*invoke>/gi
    let invokeMatch: RegExpExecArray | null
    while ((invokeMatch = invokeRegex.exec(inner)) !== null) {
      const rawToolName = invokeMatch[1].trim()
      const invokeBody = invokeMatch[2]

      let args: string | undefined = undefined
      const paramMatch =
        /<[\s]*\|[\s]*DSML[\s]*\|[\s]*parameter\s+name=["']arguments["'][^>]*>([\s\S]*?)<\/[\s]*\|[\s]*DSML[\s]*\|[\s]*parameter>/i.exec(
          invokeBody,
        )
      if (paramMatch) {
        args = paramMatch[1].trim()
      } else {
        const genericParam =
          /<[\s]*\|[\s]*DSML[\s]*\|[\s]*parameter\s+name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/[\s]*\|[\s]*DSML[\s]*\|[\s]*parameter>/gi
        const paramsObj: Record<string, string> = {}
        let gp: RegExpExecArray | null
        while ((gp = genericParam.exec(invokeBody)) !== null) {
          paramsObj[gp[1].trim()] = gp[2].trim()
        }
        if (Object.keys(paramsObj).length > 0) {
          args = JSON.stringify(paramsObj)
        }
      }

      toolCalls.push({
        id: uuidv4(),
        name: normalizeToolName(rawToolName),
        arguments: args,
      })
    }
  }

  // 2. 解析 <tool_call> 格式
  const toolCallBlockRegex = /<tool_call>([\s\S]*?)(?:<\/tool_call>|$)/gi
  let tcMatch: RegExpExecArray | null
  while ((tcMatch = toolCallBlockRegex.exec(content)) !== null) {
    const inner = tcMatch[1].trim()
    if (!inner) continue

    if (inner.startsWith('{') && inner.endsWith('}')) {
      try {
        const parsed = JSON.parse(inner) as Record<string, unknown>
        if (typeof parsed.name === 'string') {
          toolCalls.push({
            id: uuidv4(),
            name: normalizeToolName(parsed.name),
            arguments:
              typeof parsed.arguments === 'string'
                ? parsed.arguments
                : JSON.stringify(parsed.arguments ?? {}),
          })
        }
      } catch {
        // Ignore malformed tool JSON
      }
    } else {
      const funcMatch =
        /<function=([^>]+)>([\s\S]*?)(?:<\/function>|$)/i.exec(inner)
      if (funcMatch) {
        const rawName = funcMatch[1].trim()
        const funcBody = funcMatch[2]
        const paramMatch =
          /<parameter=([^>]+)>([\s\S]*?)(?:<\/parameter>|$)/i.exec(funcBody)
        if (paramMatch) {
          const paramName = paramMatch[1].trim()
          const paramVal = paramMatch[2].trim()
          toolCalls.push({
            id: uuidv4(),
            name: normalizeToolName(rawName),
            arguments: JSON.stringify({ [paramName]: paramVal }),
          })
        } else {
          toolCalls.push({
            id: uuidv4(),
            name: normalizeToolName(rawName),
            arguments: JSON.stringify({ query: funcBody.trim() }),
          })
        }
      }
    }
  }

  cleaned = sanitizeAssistantContent(cleaned)
  return { toolCalls, cleanedContent: cleaned }
}
