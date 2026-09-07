import { App, TFile, htmlToMarkdown, requestUrl } from 'obsidian'

import { editorStateToPlainText } from '../../components/chat-view/chat-input/utils/editor-state-to-plain-text'
import { QueryProgressState } from '../../components/chat-view/QueryProgress'
import { RAGEngine } from '../../core/rag/ragEngine'
import { AiderSettings } from '../../settings/schema/setting.types'
import {
  ChatAssistantMessage,
  ChatMessage,
  ChatToolMessage,
  ChatUserMessage,
} from '../../types/chat'
import { ContentPart, RequestMessage } from '../../types/llm/request'
import {
  MentionableBlock,
  MentionableFile,
  MentionableFolder,
  MentionableImage,
  MentionableUrl,
  MentionableVault,
} from '../../types/mentionable'
import { PromptLevel } from '../../types/prompt-level.types'
import { ToolCallResponseStatus } from '../../types/tool-call.types'
import { SelectEmbedding } from '../../types/vector.types'
import { stripFrontmatter } from '../common/markdown-splitter'
import { tokenCount } from '../llm/token'
import {
  getNestedFiles,
  readMultipleTFiles,
  readTFileContent,
} from '../obsidian'

import { YoutubeTranscript, isYoutubeUrl } from './youtube-transcript'

function sanitizeMarkdownForLLM(content: string): string {
  if (!content) return ''
  // 1. 转义 Obsidian 嵌入式附件引用 ![[...]]，避免中转代理错误识别为 markdown 图片并尝试 base64 解码
  let sanitized = content.replace(/!\[\[(.*?)\]\]/g, '[$1]')
  // 2. 转义 Markdown 图片链接 ![alt](url) -> [图片: alt] (url)
  sanitized = sanitized.replace(/!\[(.*?)\]\((.*?)\)/g, '[图片: $1]($2)')
  // 3. 转义可能存在的 data:image 伪 base64 串
  sanitized = sanitized.replace(/data:image\/[a-zA-Z0-9+]+;base64,[^\s"')]+/g, '[嵌入图片数据]')
  return sanitized
}

export class PromptGenerator {
  private getRagEngine: () => Promise<RAGEngine>
  private app: App
  private settings: AiderSettings

  private getMaxContextMessages(): number {
    const isEco = (this.settings.chatOptions.runtimeProfile ?? 'eco') === 'eco'
    return isEco ? 6 : 20
  }

  constructor(
    getRagEngine: () => Promise<RAGEngine>,
    app: App,
    settings: AiderSettings,
  ) {
    this.getRagEngine = getRagEngine
    this.app = app
    this.settings = settings
  }

  public async generateRequestMessages({
    messages,
  }: {
    messages: ChatMessage[]
  }): Promise<RequestMessage[]> {
    if (messages.length === 0) {
      throw new Error('No messages provided')
    }

    // Ensure all user messages have prompt content
    // This is a fallback for cases where compilation was missed earlier in the process
    const compiledMessages = await Promise.all(
      messages.map(async (message) => {
        if (message.role === 'user' && !message.promptContent) {
          const { promptContent, similaritySearchResults } =
            await this.compileUserMessagePrompt({
              message,
            })
          return {
            ...message,
            promptContent,
            similaritySearchResults,
          }
        }
        return message
      }),
    )

    // find last user message
    let lastUserMessage: ChatUserMessage | undefined = undefined
    for (let i = compiledMessages.length - 1; i >= 0; --i) {
      if (compiledMessages[i].role === 'user') {
        lastUserMessage = compiledMessages[i] as ChatUserMessage
        break
      }
    }
    if (!lastUserMessage) {
      throw new Error('No user messages found')
    }
    const shouldUseRAG = lastUserMessage.similaritySearchResults !== undefined

    const systemMessage = this.getSystemMessage(shouldUseRAG)

    const customInstructionMessage = this.getCustomInstructionMessage()

    const currentFile = lastUserMessage.mentionables.find(
      (m) => m.type === 'current-file',
    )?.file
    const currentFileMessage =
      currentFile && this.settings.chatOptions.includeCurrentFileContent
        ? await this.getCurrentFileMessage(currentFile)
        : undefined

    const requestMessages: RequestMessage[] = [
      systemMessage,
      ...(customInstructionMessage ? [customInstructionMessage] : []),
      ...(currentFileMessage ? [currentFileMessage] : []),
      ...this.getChatHistoryMessages({ messages: compiledMessages }),
      ...(shouldUseRAG && this.getModelPromptLevel() == PromptLevel.Default
        ? [this.getRagInstructionMessage()]
        : []),
    ]

    return requestMessages
  }

  private getChatHistoryMessages({
    messages,
  }: {
    messages: ChatMessage[]
  }): RequestMessage[] {
    const maxContext = this.getMaxContextMessages()
    const requestMessages: RequestMessage[] = messages
      .slice(-maxContext)
      .flatMap((message): RequestMessage[] => {
        if (message.role === 'user') {
          // We assume that all user messages have been compiled
          return [
            {
              role: 'user',
              content: message.promptContent ?? '',
            },
          ]
        } else if (message.role === 'assistant') {
          return this.parseAssistantMessage({ message })
        } else {
          // message.role === 'tool'
          return this.parseToolMessage({ message })
        }
      })

    // TODO: Also verify that tool messages appear right after their corresponding assistant tool calls
    const filteredRequestMessages: RequestMessage[] = requestMessages
      .map((msg) => {
        switch (msg.role) {
          case 'user':
            return msg
          case 'assistant': {
            // Filter out tool calls that don't have a corresponding tool message
            const filteredToolCalls = msg.tool_calls?.filter((t) =>
              requestMessages.some(
                (rm) => rm.role === 'tool' && rm.tool_call.id === t.id,
              ),
            )
            return {
              ...msg,
              tool_calls:
                filteredToolCalls && filteredToolCalls.length > 0
                  ? filteredToolCalls
                  : undefined,
            }
          }
          case 'tool': {
            // Filter out tool messages that don't have a corresponding assistant message
            const assistantMessage = requestMessages.find(
              (rm) =>
                rm.role === 'assistant' &&
                rm.tool_calls?.some((t) => t.id === msg.tool_call.id),
            )
            if (!assistantMessage) {
              return null
            } else {
              return msg
            }
          }
          default:
            return msg
        }
      })
      .filter((m) => m !== null)

    return filteredRequestMessages
  }

  private parseAssistantMessage({
    message,
  }: {
    message: ChatAssistantMessage
  }): RequestMessage[] {
    let citationContent: string | null = null
    if (message.annotations && message.annotations.length > 0) {
      citationContent = `Citations:
${message.annotations
  .map((annotation, index) => {
    if (annotation.type === 'url_citation') {
      const { url, title } = annotation.url_citation
      return `[${index + 1}] ${title ? `${title}: ` : ''}${url}`
    }
  })
  .join('\n')}`
    }

    return [
      {
        role: 'assistant',
        content: [
          message.content,
          ...(citationContent ? [citationContent] : []),
        ].join('\n'),
        tool_calls: message.toolCallRequests,
        providerMetadata: message.providerMetadata,
      },
    ]
  }

  private parseToolMessage({
    message,
  }: {
    message: ChatToolMessage
  }): RequestMessage[] {
    return message.toolCalls.map((toolCall) => {
      switch (toolCall.response.status) {
        case ToolCallResponseStatus.PendingApproval:
        case ToolCallResponseStatus.Running:
        case ToolCallResponseStatus.Rejected:
        case ToolCallResponseStatus.Aborted:
          return {
            role: 'tool',
            tool_call: toolCall.request,
            content: `Tool call ${toolCall.request.id} is ${toolCall.response.status}`,
          }
        case ToolCallResponseStatus.Success:
          return {
            role: 'tool',
            tool_call: toolCall.request,
            content: toolCall.response.data.text,
          }
        case ToolCallResponseStatus.Error:
          return {
            role: 'tool',
            tool_call: toolCall.request,
            content: `Error: ${toolCall.response.error}`,
          }
      }
    })
  }

  public async compileUserMessagePrompt({
    message,
    useVaultSearch,
    onQueryProgressChange,
  }: {
    message: ChatUserMessage
    useVaultSearch?: boolean
    onQueryProgressChange?: (queryProgress: QueryProgressState) => void
  }): Promise<{
    promptContent: ChatUserMessage['promptContent']
    shouldUseRAG: boolean
    similaritySearchResults?: (Omit<SelectEmbedding, 'embedding'> & {
      similarity: number
    })[]
  }> {
    try {
      if (!message.content) {
        return {
          promptContent: '',
          shouldUseRAG: false,
        }
      }
      const query = editorStateToPlainText(message.content)
      let similaritySearchResults = undefined

      useVaultSearch =
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean boolean-or evaluation intended for vault search flag
        useVaultSearch ||
        message.mentionables.some(
          (m): m is MentionableVault => m.type === 'vault',
        )

      onQueryProgressChange?.({
        type: 'reading-mentionables',
      })
      const files = message.mentionables
        .filter((m): m is MentionableFile => m.type === 'file')
        .map((m) => m.file)
      const folders = message.mentionables
        .filter((m): m is MentionableFolder => m.type === 'folder')
        .map((m) => m.folder)
      const nestedFiles = folders.flatMap((folder) =>
        getNestedFiles(folder, this.app.vault),
      )
      const allFiles = [...files, ...nestedFiles]
      const fileContents = await readMultipleTFiles(allFiles, this.app.vault)

      // Count tokens incrementally to avoid long processing times on large content sets
      const exceedsTokenThreshold = async () => {
        let accTokenCount = 0
        for (const content of fileContents) {
          const count = await tokenCount(content)
          accTokenCount += count
          if (accTokenCount > this.settings.ragOptions.thresholdTokens) {
            return true
          }
        }
        return false
      }
      const shouldUseRAG = useVaultSearch || (await exceedsTokenThreshold())

      let filePrompt: string
      if (shouldUseRAG) {
        similaritySearchResults = useVaultSearch
          ? await (
              await this.getRagEngine()
            ).processQuery({
              query,
              onQueryProgressChange: onQueryProgressChange,
            }) // TODO: Add similarity boosting for mentioned files or folders
          : await (
              await this.getRagEngine()
            ).processQuery({
              query,
              scope: {
                files: files.map((f) => f.path),
                folders: folders.map((f) => f.path),
              },
              onQueryProgressChange: onQueryProgressChange,
            })
        filePrompt = `## Potentially Relevant Snippets from the current vault
${similaritySearchResults
  .map(({ path, content, metadata }) => {
    const newContent =
      this.getModelPromptLevel() == PromptLevel.Default
        ? this.addLineNumbersToContent({
            content,
            startLine: metadata.startLine,
          })
        : content
    return `\`\`\`${path}\n${newContent}\n\`\`\`\n`
  })
  .join('')}\n`
      } else {
        filePrompt = allFiles
          .map((file, index) => {
            const sanitized = sanitizeMarkdownForLLM(fileContents[index])
            return `\`\`\`${file.path}\n${sanitized}\n\`\`\`\n`
          })
          .join('')
      }

      const blocks = message.mentionables.filter(
        (m): m is MentionableBlock => m.type === 'block',
      )
      const blockPrompt = blocks
        .map(({ file, content }) => {
          const sanitized = sanitizeMarkdownForLLM(content)
          return `\`\`\`${file.path}\n${sanitized}\n\`\`\`\n`
        })
        .join('')

      const urls = message.mentionables.filter(
        (m): m is MentionableUrl => m.type === 'url',
      )

      const urlPrompt =
        urls.length > 0
          ? `## Potentially Relevant Websearch Results
${(
  await Promise.all(
    urls.map(
      async ({ url }) => `\`\`\`
Website URL: ${url}
Website Content:
${await this.getWebsiteContent(url)}
\`\`\``,
    ),
  )
).join('\n')}
`
          : ''

      const imageDataUrls = message.mentionables
        .filter((m): m is MentionableImage => m.type === 'image')
        .map(({ data }) => data)

      // Reset query progress
      onQueryProgressChange?.({
        type: 'idle',
      })

      const rawPromptText = `${filePrompt}${blockPrompt}${urlPrompt}\n\n${query}\n\n`.trim()
      const fullPromptText = sanitizeMarkdownForLLM(rawPromptText)

      return {
        promptContent:
          imageDataUrls.length > 0
            ? [
                ...imageDataUrls.map(
                  (data): ContentPart => ({
                    type: 'image_url',
                    image_url: {
                      url: data,
                    },
                  }),
                ),
                {
                  type: 'text',
                  text: fullPromptText,
                },
              ]
            : fullPromptText,
        shouldUseRAG,
        similaritySearchResults: similaritySearchResults,
      }
    } catch (error) {
      console.error('Failed to compile user message', error)
      onQueryProgressChange?.({
        type: 'idle',
      })
      throw error
    }
  }

  private getSystemMessage(shouldUseRAG: boolean): RequestMessage {
    const isEco = (this.settings.chatOptions.runtimeProfile ?? 'eco') === 'eco'
    const isZh = (this.settings.language ?? 'en') === 'zh' || (this.settings.language ?? 'en') === 'zh-CN'

    const toolConvergenceDirectiveZh = isEco
      ? `\n\n【工具使用规范与收敛纪律】：
1. 仅在回答用户提问确实需要实时事实（如最新资讯、天气、外部网页）时调用工具。
2. 原则上针对单次提问最多只允许进行 1 轮针对性检索（如必应搜索），严禁对搜索结果中出现的网址逐个递归发起抓取（禁止无节制 web_fetch）。
3. 获得工具返回数据后，必须立即停止调用任何工具，结合已有信息直接向用户输出客观、详尽、条理清晰的最终解答，严禁陷入多轮工具循环。
4. 【信息检索坦诚原则】：若针对某一特定统计数据检索 1 次未果，说明该数据公开渠道未直接披露，严禁连续盲目换词重试！应坦诚告知用户目前公开渠道暂无权威直接数据，并基于已有行业公认数据或宏观背景给出专业客观的推论与对比。
5. 【语法严禁】：严禁在回复正文中直接输出任何形如 <tool_call>、<|DSML|> 或 XML/函数代码块，工具调用必须且只能通过系统规范函数接口发起。`
      : `\n\n【工具使用指南】：
1. 在需要外部事实或深度调研时合理调用工具。
2. 获得关键信息后，综合各方材料向用户输出高质量的专业分析与回答。
3. 【信息检索坦诚原则】：若特定细节数据公开检索 1~2 次未果，应如实向用户说明，并结合已知行业发展概况给出对比，严禁无休止反复换词重试。
4. 【语法严禁】：严禁在回复正文中直接输出任何形如 <tool_call>、<|DSML|> 或 XML/函数代码块，工具调用必须且只能通过系统规范函数接口发起。`

    const toolConvergenceDirectiveEn = isEco
      ? `\n\n[Tool Usage Discipline & Rate Control]:
1. Only invoke tools when real-time facts (e.g., latest news, weather, external web pages) are genuinely needed.
2. Limit to at most 1 targeted search round (e.g., Bing search) per query. Do not recursively fetch each URL from search results.
3. Once tool data is obtained, immediately stop calling tools and deliver an objective, detailed, and structured final answer. Avoid multi-turn tool loops.
4. [Honesty in Search]: If a search for a specific statistic yields no direct result after 1 attempt, honestly explain that it is not directly available in public sources and provide an objective comparison based on industry benchmarks. Do not repeatedly retry with different keywords.
5. [Syntax Rules]: Never output raw tags like <tool_call>, <|DSML|>, or XML/function blocks directly in the response text; tool calls must only be executed through standard system function call interfaces.`
      : `\n\n[Tool Usage Guidelines]:
1. Reasonably invoke tools when external facts or in-depth research are needed.
2. After obtaining key information, synthesize all materials to provide a high-quality, professional response.
3. [Honesty in Search]: If specific data is not found after 1-2 attempts, explain truthfully instead of endlessly retrying.
4. [Syntax Rules]: Never output raw tags like <tool_call>, <|DSML|>, or XML/function blocks directly in the response text; tool calls must only be executed through standard system function call interfaces.`

    const toolConvergenceDirective = isZh ? toolConvergenceDirectiveZh : toolConvergenceDirectiveEn

    const basePrompt = `You are Aider, an intelligent AI assistant helping the user read, write, organize notes and solve problems in Obsidian.

1. Please keep your response objective, concise, and logically structured.
2. Format your response strictly in standard markdown (headings, lists, tables, code blocks). Do not invent false facts.
3. Always respond in the same language as the user's prompt (default to English).${toolConvergenceDirective}`

    const ragPrompt = `${basePrompt}
4. You may be provided with relevant contextual blocks from the user's vault. Reference the facts faithfully without inventing facts.`

    return {
      role: 'system',
      content: shouldUseRAG ? ragPrompt : basePrompt,
    }
  }

  private getCustomInstructionMessage(): RequestMessage | null {
    const customInstruction = this.settings.systemPrompt.trim()
    if (!customInstruction) {
      return null
    }
    return {
      role: 'user',
      content: `Here are additional instructions to follow in your responses when relevant. There's no need to explicitly acknowledge them:
<custom_instructions>
${customInstruction}
</custom_instructions>`,
    }
  }

  private async getCurrentFileMessage(
    currentFile: TFile,
  ): Promise<RequestMessage> {
    const rawContent = await readTFileContent(currentFile, this.app.vault)
    const contentWithoutFrontmatter = stripFrontmatter(rawContent)
    const safeContent = sanitizeMarkdownForLLM(contentWithoutFrontmatter)
    return {
      role: 'user',
      content: `# Inputs
## Current File
Here is the file I'm looking at.
\`\`\`${currentFile.path}
${safeContent}
\`\`\`\n\n`,
    }
  }

  private getRagInstructionMessage(): RequestMessage {
    return {
      role: 'user',
      content: `Please reference relevant vault knowledge when answering. Do not include line numbers in code blocks or quotes.`,
    }
  }

  private addLineNumbersToContent({
    content,
    startLine,
  }: {
    content: string
    startLine: number
  }): string {
    const lines = content.split('\n')
    const linesWithNumbers = lines.map((line, index) => {
      return `${startLine + index}|${line}`
    })
    return linesWithNumbers.join('\n')
  }

  /**
   * TODO: Improve markdown conversion logic
   * - filter visually hidden elements
   * ...
   */
  private async getWebsiteContent(url: string): Promise<string> {
    if (isYoutubeUrl(url)) {
      try {
        // TODO: pass language based on user preferences
        const { title, transcript } =
          await YoutubeTranscript.fetchTranscriptAndMetadata(url)

        return `Title: ${title}
Video Transcript:
${transcript.map((t) => `${t.offset}: ${t.text}`).join('\n')}`
      } catch (error) {
        console.error('Error fetching YouTube transcript', error)
      }
    }

    const response = await requestUrl({ url })
    return htmlToMarkdown(response.text)
  }

  private getModelPromptLevel(): PromptLevel {
    const chatModel = this.settings.chatModels.find(
      (model) => model.id === this.settings.chatModelId,
    )
    return chatModel?.promptLevel ?? PromptLevel.Default
  }
}
