import { CircleStop, FileText, History, Sparkles } from 'lucide-react'
import { App, Notice } from 'obsidian'

import { useI18n } from '../../utils/i18n'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useApp } from '../../contexts/app-context'
import { useMcp } from '../../contexts/mcp-context'
import { useRAG } from '../../contexts/rag-context'
import { useSettings } from '../../contexts/settings-context'
import { getChatModelClient } from '../../core/llm/manager'
import {
  ChatMetadataWithArticle,
  useChatHistory,
} from '../../hooks/useChatHistory'
import {
  AssistantToolMessageGroup,
  ChatMessage,
  ChatToolMessage,
  ChatUserMessage,
} from '../../types/chat'
import {
  MentionableBlock,
  MentionableBlockData,
  MentionableCurrentFile,
} from '../../types/mentionable'
import { ToolCallResponseStatus } from '../../types/tool-call.types'
import {
  getMentionableKey,
  serializeMentionable,
} from '../../utils/chat/mentionable'
import { groupAssistantAndToolMessages } from '../../utils/chat/message-groups'
import { PromptGenerator } from '../../utils/chat/promptGenerator'

import AssistantToolMessageGroupItem from './AssistantToolMessageGroupItem'
import ChatUserInput, { ChatUserInputRef } from './chat-input/ChatUserInput'
import {
  editorStateToPlainText,
  plainTextToEditorState,
} from './chat-input/utils/editor-state-to-plain-text'
import { ChatListDropdown } from './ChatListDropdown'
import QueryProgress, { QueryProgressState } from './QueryProgress'
import { useAutoScroll } from './useAutoScroll'
import { useChatStreamManager } from './useChatStreamManager'
import UserMessageItem from './UserMessageItem'

// Add an empty line here
const getNewInputMessage = (app: App): ChatUserMessage => {
  return {
    role: 'user',
    content: null,
    promptContent: null,
    id: uuidv4(),
    mentionables: [
      {
        type: 'current-file',
        file: app.workspace.getActiveFile(),
      },
    ],
  }
}

export type ChatRef = {
  openNewChat: (selectedBlock?: MentionableBlockData) => void
  addSelectionToChat: (selectedBlock: MentionableBlockData) => void
  focusMessage: () => void
}

export type ChatProps = {
  selectedBlock?: MentionableBlockData
}

const Chat = forwardRef<ChatRef, ChatProps>((props, ref) => {
  const app = useApp()
  const { settings, setSettings } = useSettings()
  const { language } = useI18n()
  const { getRAGEngine } = useRAG()
  const { getMcpManager } = useMcp()

  const {
    createOrUpdateConversation,
    deleteConversation,
    getChatMessagesById,
    updateConversationTitle,
    chatList,
    getChatsForArticle,
  } = useChatHistory()
  const promptGenerator = useMemo(() => {
    return new PromptGenerator(getRAGEngine, app, settings)
  }, [getRAGEngine, app, settings])

  const [inputMessage, setInputMessage] = useState<ChatUserMessage>(() => {
    const newMessage = getNewInputMessage(app)
    if (props.selectedBlock) {
      newMessage.mentionables = [
        ...newMessage.mentionables,
        {
          type: 'block',
          ...props.selectedBlock,
        },
      ]
    }
    return newMessage
  })
  const [addedBlockKey, setAddedBlockKey] = useState<string | null>(
    props.selectedBlock
      ? getMentionableKey(
          serializeMentionable({
            type: 'block',
            ...props.selectedBlock,
          }),
        )
      : null,
  )
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [focusedMessageId, setFocusedMessageId] = useState<string | null>(null)
  const [currentConversationId, setCurrentConversationId] =
    useState<string>(uuidv4())
  const [queryProgress, setQueryProgress] = useState<QueryProgressState>({
    type: 'idle',
  })

  const groupedChatMessages: (ChatUserMessage | AssistantToolMessageGroup)[] =
    useMemo(() => {
      return groupAssistantAndToolMessages(chatMessages)
    }, [chatMessages])

  const chatUserInputRefs = useRef<Map<string, ChatUserInputRef>>(new Map())
  const chatMessagesRef = useRef<HTMLDivElement>(null)

  const { autoScrollToBottom, forceScrollToBottom } = useAutoScroll({
    scrollContainerRef: chatMessagesRef,
  })

  const { abortActiveStreams, submitChatMutation } = useChatStreamManager({
    setChatMessages,
    autoScrollToBottom,
    promptGenerator,
  })

  const registerChatUserInputRef = (
    id: string,
    ref: ChatUserInputRef | null,
  ) => {
    if (ref) {
      chatUserInputRefs.current.set(id, ref)
    } else {
      chatUserInputRefs.current.delete(id)
    }
  }

  const handleLoadConversation = async (conversationId: string) => {
    try {
      abortActiveStreams()
      const conversation = await getChatMessagesById(conversationId)
      if (!conversation) {
        throw new Error('Conversation not found')
      }
      setCurrentConversationId(conversationId)
      setChatMessages(conversation)
      const newInputMessage = getNewInputMessage(app)
      setInputMessage(newInputMessage)
      setFocusedMessageId(newInputMessage.id)
      setQueryProgress({
        type: 'idle',
      })
    } catch (error) {
      new Notice('Failed to load conversation')
      console.error('Failed to load conversation', error)
    }
  }

  const handleNewChat = (selectedBlock?: MentionableBlockData) => {
    setCurrentConversationId(uuidv4())
    setChatMessages([])
    const newInputMessage = getNewInputMessage(app)
    if (selectedBlock) {
      const mentionableBlock: MentionableBlock = {
        type: 'block',
        ...selectedBlock,
      }
      newInputMessage.mentionables = [
        ...newInputMessage.mentionables,
        mentionableBlock,
      ]
      setAddedBlockKey(
        getMentionableKey(serializeMentionable(mentionableBlock)),
      )
    }
    setInputMessage(newInputMessage)
    setFocusedMessageId(newInputMessage.id)
    setQueryProgress({
      type: 'idle',
    })
    abortActiveStreams()
  }

  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false)

  const handleGenerateTitle = async () => {
    if (isGeneratingTitle) return
    if (chatMessages.length === 0) {
      new Notice(
        language === 'zh'
          ? '当前会话没有消息，无法生成标题'
          : 'Current chat has no messages to generate a title',
      )
      return
    }

    if (!settings.chatModelId) {
      new Notice(
        language === 'zh'
          ? '请先配置并选择聊天模型'
          : 'Please configure and select a chat model first',
      )
      return
    }

    try {
      setIsGeneratingTitle(true)
      const { providerClient, model } = getChatModelClient({
        modelId: settings.chatModelId,
        settings,
        setSettings,
      })

      // Extract first 2 and last 2 messages (deduplicated by id)
      const selectedMsgs: ChatMessage[] = []
      const seenIds = new Set<string>()

      for (let i = 0; i < Math.min(2, chatMessages.length); i++) {
        const msg = chatMessages[i]
        if (!seenIds.has(msg.id)) {
          seenIds.add(msg.id)
          selectedMsgs.push(msg)
        }
      }

      const startIndex = Math.max(0, chatMessages.length - 2)
      for (let i = startIndex; i < chatMessages.length; i++) {
        const msg = chatMessages[i]
        if (!seenIds.has(msg.id)) {
          seenIds.add(msg.id)
          selectedMsgs.push(msg)
        }
      }

      const snippets = selectedMsgs.map((m) => {
        let text = ''
        if (m.role === 'user') {
          if (typeof m.promptContent === 'string' && m.promptContent.trim()) {
            text = m.promptContent
          } else if (m.content) {
            text = editorStateToPlainText(m.content)
          }
        } else if (m.role === 'assistant') {
          text = m.content || ''
        } else if (m.role === 'tool') {
          text = '[工具调用与返回数据]'
        }
        return `${m.role === 'user' ? '用户' : m.role === 'assistant' ? '助手' : '工具'}: ${text.slice(0, 300)}`
      }).join('\n\n')

      const prompt = `请根据以下对话片段，总结并生成一个非常简短、精准的对话标题（不超过12个字，直接输出纯文本标题，不要包含任何标点符号、引号或多余解释）：\n\n${snippets}`

      const response = await providerClient.generateResponse(model, {
        model: model.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })

      const rawContent = response.choices?.[0]?.message?.content || ''
      let generatedTitle = rawContent.trim()
      // Clean quotes, newlines, or extra markings
      generatedTitle = generatedTitle
        .replace(/^[「“"']+|[」”"']+$/g, '')
        .replace(/^(标题|Title)[：:\s]*/i, '')
        .split('\n')[0]
        .trim()
        .slice(0, 15)

      if (generatedTitle) {
        await updateConversationTitle(currentConversationId, generatedTitle)
        const path = app.workspace.getActiveFile()?.path
        if (path) void refreshArticleChats(path)
        new Notice(
          language === 'zh'
            ? `标题已更新为: ${generatedTitle}`
            : `Title updated: ${generatedTitle}`,
        )
      }
    } catch (err: unknown) {
      console.error('Failed to generate title:', err)
      const message = err instanceof Error ? err.message : String(err)
      new Notice(
        language === 'zh'
          ? `生成标题失败: ${message}`
          : `Failed to generate title: ${message}`,
      )
    } finally {
      setIsGeneratingTitle(false)
    }
  }

  const handleUserMessageSubmit = useCallback(
    async ({
      inputChatMessages,
      useVaultSearch,
    }: {
      inputChatMessages: ChatMessage[]
      useVaultSearch?: boolean
    }) => {
      abortActiveStreams()
      setQueryProgress({
        type: 'idle',
      })

      // Update the chat history to show the new user message
      setChatMessages(inputChatMessages)
      window.requestAnimationFrame(() => {
        forceScrollToBottom()
      })

      const lastMessage = inputChatMessages.at(-1)
      if (lastMessage?.role !== 'user') {
        throw new Error('Last message is not a user message')
      }

      const compiledMessages = await Promise.all(
        inputChatMessages.map(async (message) => {
          if (message.role === 'user' && message.id === lastMessage.id) {
            const { promptContent, similaritySearchResults } =
              await promptGenerator.compileUserMessagePrompt({
                message,
                useVaultSearch,
                onQueryProgressChange: setQueryProgress,
              })
            return {
              ...message,
              promptContent,
              similaritySearchResults,
            }
          } else if (message.role === 'user' && !message.promptContent) {
            // Ensure all user messages have prompt content
            // This is a fallback for cases where compilation was missed earlier in the process
            const { promptContent, similaritySearchResults } =
              await promptGenerator.compileUserMessagePrompt({
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

      setChatMessages(compiledMessages)
      submitChatMutation.mutate({
        chatMessages: compiledMessages,
        conversationId: currentConversationId,
      })
    },
    [
      submitChatMutation,
      currentConversationId,
      promptGenerator,
      abortActiveStreams,
      forceScrollToBottom,
    ],
  )

  const handleEditAndResubmit = useCallback(
    async (messageId: string, newText: string) => {
      const msgIndex = chatMessages.findIndex((m) => m.id === messageId)
      if (msgIndex === -1) return

      abortActiveStreams()

      const targetMsg = chatMessages[msgIndex]
      if (targetMsg.role !== 'user') return

      const updatedUserMsg: ChatUserMessage = {
        ...targetMsg,
        content: plainTextToEditorState(newText),
        promptContent: newText,
      }

      // 截断该消息之后的所有历史消息，以修改后的用户提示重新提问
      const truncatedMessages: ChatMessage[] = [
        ...chatMessages.slice(0, msgIndex),
        updatedUserMsg,
      ]

      setChatMessages(truncatedMessages)
      await handleUserMessageSubmit({
        inputChatMessages: truncatedMessages,
        useVaultSearch: false,
      })
    },
    [chatMessages, abortActiveStreams, handleUserMessageSubmit],
  )

  const handleToolMessageUpdate = useCallback(
    async (toolMessage: ChatToolMessage) => {
      const toolMessageIndex = chatMessages.findIndex(
        (message) => message.id === toolMessage.id,
      )
      if (toolMessageIndex === -1) {
        // The tool message no longer exists in the chat history.
        // This likely means a new message was submitted while this stream was running.
        // Abort the tool calls and keep the current chat history.
        void (async () => {
          const mcpManager = await getMcpManager()
          toolMessage.toolCalls.forEach((toolCall) => {
            mcpManager.abortToolCall(toolCall.request.id)
          })
        })()
        return
      }

      const updatedMessages = chatMessages.map((message) =>
        message.id === toolMessage.id ? toolMessage : message,
      )
      setChatMessages(updatedMessages)

      // Resume the chat automatically if this tool message is the last message
      // and all tool calls have completed.
      if (
        toolMessageIndex === chatMessages.length - 1 &&
        toolMessage.toolCalls.every((toolCall) =>
          [
            ToolCallResponseStatus.Success,
            ToolCallResponseStatus.Error,
          ].includes(toolCall.response.status),
        )
      ) {
        // Using updated toolMessage directly because chatMessages state
        // still contains the old values
        submitChatMutation.mutate({
          chatMessages: updatedMessages,
          conversationId: currentConversationId,
        })
        window.requestAnimationFrame(() => {
          forceScrollToBottom()
        })
      }
    },
    [
      chatMessages,
      currentConversationId,
      submitChatMutation,
      setChatMessages,
      getMcpManager,
      forceScrollToBottom,
    ],
  )

  const showContinueResponseButton = useMemo(() => {
    /**
     * Display the button to continue response when:
     * 1. There is no ongoing generation
     * 2. The most recent message is a tool message
     * 3. All tool calls within that message have completed
     */

    if (submitChatMutation.isPending) return false

    const lastMessage = chatMessages.at(-1)
    if (lastMessage?.role !== 'tool') return false

    return lastMessage.toolCalls.every((toolCall) =>
      [
        ToolCallResponseStatus.Aborted,
        ToolCallResponseStatus.Rejected,
        ToolCallResponseStatus.Error,
        ToolCallResponseStatus.Success,
      ].includes(toolCall.response.status),
    )
  }, [submitChatMutation.isPending, chatMessages])

  const handleContinueResponse = useCallback(() => {
    submitChatMutation.mutate({
      chatMessages: chatMessages,
      conversationId: currentConversationId,
    })
  }, [submitChatMutation, chatMessages, currentConversationId])

  useEffect(() => {
    setFocusedMessageId(inputMessage.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only set focus to input message on initial mount
  }, [])

  const lastArticlePathRef = useRef<string | null>(null)
  const [currentArticleChats, setCurrentArticleChats] = useState<
    ChatMetadataWithArticle[]
  >([])

  const refreshArticleChats = useCallback(
    async (filePath?: string) => {
      const path = filePath || app.workspace.getActiveFile()?.path
      if (path) {
        const chats = await getChatsForArticle(path)
        setCurrentArticleChats(chats)
        return chats
      }
      setCurrentArticleChats([])
      return []
    },
    [app.workspace, getChatsForArticle],
  )

  useEffect(() => {
    const activeFile = app.workspace.getActiveFile()
    if (activeFile) {
      lastArticlePathRef.current = activeFile.path
      void refreshArticleChats(activeFile.path)
    }
  }, [app.workspace, refreshArticleChats])

  useEffect(() => {
    const updateConversationAsync = async () => {
      try {
        if (chatMessages.length > 0) {
          const currentPath = app.workspace.getActiveFile()?.path
          await createOrUpdateConversation(
            currentConversationId,
            chatMessages,
            currentPath,
          )
          if (currentPath) {
            void refreshArticleChats(currentPath)
          }
        }
      } catch (error) {
        console.error('Failed to save chat history', error)
      }
    }
    updateConversationAsync()
  }, [
    currentConversationId,
    chatMessages,
    createOrUpdateConversation,
    app.workspace,
    refreshArticleChats,
  ])

  // Updates the currentFile and handles switching between articles
  const handleActiveLeafChange = useCallback(async () => {
    const activeFile = app.workspace.getActiveFile()
    if (!activeFile) return

    const mentionable: Omit<MentionableCurrentFile, 'id'> = {
      type: 'current-file',
      file: activeFile,
    }

    // Always update current-file mentionable in inputMessage
    setInputMessage((prevInputMessage) => ({
      ...prevInputMessage,
      mentionables: [
        mentionable,
        ...prevInputMessage.mentionables.filter(
          (m) => m.type !== 'current-file',
        ),
      ],
    }))

    // If user switched to a different article
    if (
      lastArticlePathRef.current &&
      lastArticlePathRef.current !== activeFile.path
    ) {
      lastArticlePathRef.current = activeFile.path
      const articleChats = await refreshArticleChats(activeFile.path)

      if (articleChats && articleChats.length > 0) {
        // Article has previous history: automatically switch to the most recent one
        await handleLoadConversation(articleChats[0].id)
      } else {
        // New article: reset chat panel without creating an empty conversation
        setCurrentConversationId(uuidv4())
        setChatMessages([])
        setQueryProgress({ type: 'idle' })
        abortActiveStreams()
      }
      return
    }

    lastArticlePathRef.current = activeFile.path
    void refreshArticleChats(activeFile.path)
  }, [
    app.workspace,
    handleLoadConversation,
    refreshArticleChats,
    abortActiveStreams,
  ])

  useEffect(() => {
    app.workspace.on('active-leaf-change', handleActiveLeafChange)
    return () => {
      app.workspace.off('active-leaf-change', handleActiveLeafChange)
    }
  }, [app.workspace, handleActiveLeafChange])

  useImperativeHandle(ref, () => ({
    openNewChat: (selectedBlock?: MentionableBlockData) =>
      handleNewChat(selectedBlock),
    addSelectionToChat: (selectedBlock: MentionableBlockData) => {
      const mentionable: Omit<MentionableBlock, 'id'> = {
        type: 'block',
        ...selectedBlock,
      }

      setAddedBlockKey(getMentionableKey(serializeMentionable(mentionable)))

      if (focusedMessageId === inputMessage.id) {
        setInputMessage((prevInputMessage) => {
          const mentionableKey = getMentionableKey(
            serializeMentionable(mentionable),
          )
          // Check if mentionable already exists
          if (
            prevInputMessage.mentionables.some(
              (m) =>
                getMentionableKey(serializeMentionable(m)) === mentionableKey,
            )
          ) {
            return prevInputMessage
          }
          return {
            ...prevInputMessage,
            mentionables: [...prevInputMessage.mentionables, mentionable],
          }
        })
      } else {
        setChatMessages((prevChatHistory) =>
          prevChatHistory.map((message) => {
            if (message.id === focusedMessageId && message.role === 'user') {
              const mentionableKey = getMentionableKey(
                serializeMentionable(mentionable),
              )
              // Check if mentionable already exists
              if (
                message.mentionables.some(
                  (m) =>
                    getMentionableKey(serializeMentionable(m)) ===
                    mentionableKey,
                )
              ) {
                return message
              }
              return {
                ...message,
                mentionables: [...message.mentionables, mentionable],
              }
            }
            return message
          }),
        )
      }
    },
    focusMessage: () => {
      if (!focusedMessageId) return
      chatUserInputRefs.current.get(focusedMessageId)?.focus()
    },
  }))

  return (
    <div className="aide-chat-container">
      <div className="aide-chat-header">
        <div className="aide-chat-header-left">
          <h1 className="aide-chat-header-title">
            {language === 'zh' ? '对话' : 'Chat'}
          </h1>
          <button
            onClick={() => {
              const nextLang = language === 'zh' ? 'en' : 'zh'
              void setSettings({
                ...settings,
                language: nextLang,
              })
            }}
            className="clickable-icon"
            title={
              language === 'zh'
                ? '切换为英文 (Switch to English)'
                : '切换为中文 (Switch to Chinese)'
            }
            style={{ marginLeft: '4px' }}
          >
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '0 2px' }}>
              {language === 'zh' ? '中' : 'EN'}
            </span>
          </button>
        </div>

        <div className="aide-chat-header-buttons">
          {/* AI 自动根据上下文生成标题 */}
          <button
            onClick={() => void handleGenerateTitle()}
            className="clickable-icon"
            disabled={isGeneratingTitle}
            title={
              language === 'zh'
                ? isGeneratingTitle
                  ? '正在生成标题...'
                  : 'AI 生成会话标题'
                : isGeneratingTitle
                  ? 'Generating title...'
                  : 'Generate Title with AI'
            }
            style={{
              opacity: isGeneratingTitle ? 0.6 : 1,
              cursor: isGeneratingTitle ? 'not-allowed' : 'pointer',
            }}
          >
            <Sparkles size={16} />
          </button>

          {/* 当前文章历史专属按钮 */}
          <ChatListDropdown
            chatList={currentArticleChats}
            currentConversationId={currentConversationId}
            ariaLabel={
              language === 'zh'
                ? '当前文章的历史会话'
                : 'Current Article Chats'
            }
            emptyText={
              language === 'zh'
                ? '当前文章暂无其他历史会话'
                : 'No history for this article'
            }
            onSelect={async (conversationId) => {
              if (conversationId === currentConversationId) return
              await handleLoadConversation(conversationId)
            }}
            onDelete={async (conversationId) => {
              await deleteConversation(conversationId)
              const path = app.workspace.getActiveFile()?.path
              if (path) void refreshArticleChats(path)
              if (conversationId === currentConversationId) {
                handleNewChat()
              }
            }}
            onUpdateTitle={async (conversationId, newTitle) => {
              await updateConversationTitle(conversationId, newTitle)
              const path = app.workspace.getActiveFile()?.path
              if (path) void refreshArticleChats(path)
            }}
          >
            <FileText size={16} />
          </ChatListDropdown>

          {/* 全局所有历史会话按钮 */}
          <ChatListDropdown
            chatList={chatList}
            currentConversationId={currentConversationId}
            ariaLabel={
              language === 'zh' ? '全部历史会话' : 'All Chat History'
            }
            emptyText={
              language === 'zh' ? '暂无历史会话' : 'No conversations'
            }
            onSelect={async (conversationId) => {
              if (conversationId === currentConversationId) return
              await handleLoadConversation(conversationId)
            }}
            onDelete={async (conversationId) => {
              await deleteConversation(conversationId)
              const path = app.workspace.getActiveFile()?.path
              if (path) void refreshArticleChats(path)
              if (conversationId === currentConversationId) {
                const nextConversation = chatList.find(
                  (chat) => chat.id !== conversationId,
                )
                if (nextConversation) {
                  void handleLoadConversation(nextConversation.id)
                } else {
                  handleNewChat()
                }
              }
            }}
            onUpdateTitle={async (conversationId, newTitle) => {
              await updateConversationTitle(conversationId, newTitle)
              const path = app.workspace.getActiveFile()?.path
              if (path) void refreshArticleChats(path)
            }}
          >
            <History size={16} />
          </ChatListDropdown>
        </div>
      </div>
      <div className="aide-chat-messages" ref={chatMessagesRef}>
        {groupedChatMessages.map((messageOrGroup, index) =>
          !Array.isArray(messageOrGroup) ? (
            <UserMessageItem
              key={messageOrGroup.id}
              message={messageOrGroup}
              onEditAndResubmit={handleEditAndResubmit}
              chatUserInputRef={(ref) =>
                registerChatUserInputRef(messageOrGroup.id, ref)
              }
              onInputChange={(content) => {
                setChatMessages((prevChatHistory) =>
                  prevChatHistory.map((msg) =>
                    msg.role === 'user' && msg.id === messageOrGroup.id
                      ? {
                          ...msg,
                          content,
                        }
                      : msg,
                  ),
                )
              }}
              onSubmit={(content, useVaultSearch) => {
                if (editorStateToPlainText(content).trim() === '') return
                handleUserMessageSubmit({
                  inputChatMessages: [
                    ...groupedChatMessages
                      .slice(0, index)
                      .flatMap((messageOrGroup): ChatMessage[] =>
                        !Array.isArray(messageOrGroup)
                          ? [messageOrGroup]
                          : messageOrGroup,
                      ),
                    {
                      role: 'user',
                      content: content,
                      promptContent: null,
                      id: messageOrGroup.id,
                      mentionables: messageOrGroup.mentionables,
                    },
                  ],
                  useVaultSearch,
                })
                chatUserInputRefs.current.get(inputMessage.id)?.focus()
              }}
              onFocus={() => {
                setFocusedMessageId(messageOrGroup.id)
              }}
              onMentionablesChange={(mentionables) => {
                setChatMessages((prevChatHistory) =>
                  prevChatHistory.map((msg) =>
                    msg.id === messageOrGroup.id
                      ? { ...msg, mentionables }
                      : msg,
                  ),
                )
              }}
            />
          ) : (
            <AssistantToolMessageGroupItem
              key={messageOrGroup.at(0)?.id}
              messages={messageOrGroup}
              contextMessages={groupedChatMessages
                .slice(0, index + 1)
                .flatMap((messageOrGroup): ChatMessage[] =>
                  !Array.isArray(messageOrGroup)
                    ? [messageOrGroup]
                    : messageOrGroup,
                )}
              conversationId={currentConversationId}
              onToolMessageUpdate={handleToolMessageUpdate}
            />
          ),
        )}
        <QueryProgress state={queryProgress} />
        {showContinueResponseButton && (
          <div className="aide-continue-response-button-container">
            <button
              className="aide-continue-response-button"
              onClick={handleContinueResponse}
            >
              <div>{language === 'zh' ? '继续回复' : 'Continue Response'}</div>
            </button>
          </div>
        )}
        {submitChatMutation.isPending && (
          <button onClick={abortActiveStreams} className="aide-stop-gen-btn">
            <CircleStop size={16} />
            <div>{language === 'zh' ? '停止生成' : 'Stop Generation'}</div>
          </button>
        )}
      </div>
      <ChatUserInput
        key={inputMessage.id} // this is needed to clear the editor when the user submits a new message
        ref={(ref) => registerChatUserInputRef(inputMessage.id, ref)}
        initialSerializedEditorState={inputMessage.content}
        onChange={(content) => {
          setInputMessage((prevInputMessage) => ({
            ...prevInputMessage,
            content,
          }))
        }}
        onSubmit={(content, useVaultSearch) => {
          if (editorStateToPlainText(content).trim() === '') return
          handleUserMessageSubmit({
            inputChatMessages: [...chatMessages, { ...inputMessage, content }],
            useVaultSearch,
          })
          setInputMessage(getNewInputMessage(app))
        }}
        onFocus={() => {
          setFocusedMessageId(inputMessage.id)
        }}
        mentionables={inputMessage.mentionables}
        setMentionables={(mentionables) => {
          setInputMessage((prevInputMessage) => ({
            ...prevInputMessage,
            mentionables,
          }))
        }}
        onNewChat={handleNewChat}
        autoFocus
        addedBlockKey={addedBlockKey}
      />
    </div>
  )
})

Chat.displayName = 'Chat'

export default Chat
