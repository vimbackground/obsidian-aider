import * as Tooltip from '@radix-ui/react-tooltip'
import {
  ArrowBigUp,
  ChevronUp,
  Command,
  CornerDownLeftIcon,
} from 'lucide-react'
import { Platform } from 'obsidian'

import { useSettings } from '../../../contexts/settings-context'
import { useI18n } from '../../../utils/i18n'

export function VaultChatButton({ onClick }: { onClick: () => void }) {
  const { language } = useI18n()
  const { settings } = useSettings()
  const isRagActive = Boolean(
    settings.ragOptions?.enabled && settings.embeddingModelId,
  )

  return (
    <Tooltip.Provider delayDuration={0}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            className={`aide-chat-user-input-submit-button aide-chat-btn-vault ${isRagActive ? 'is-rag-active' : ''}`}
            onClick={onClick}
          >
            <div className="aide-chat-user-input-submit-button-icons">
              {Platform.isMacOS ? (
                <Command size={11} />
              ) : (
                <ChevronUp size={12} />
              )}
              <ArrowBigUp size={12} />
              <CornerDownLeftIcon size={12} />
            </div>
            <span className="aide-chat-btn-text">
              {language === 'zh' ? '全知识库对话' : 'Vault Chat'}
            </span>
            {isRagActive && (
              <span className="aide-chat-btn-badge">RAG</span>
            )}
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="aide-tooltip-content" sideOffset={5}>
            {language === 'zh'
              ? isRagActive
                ? '已就绪：结合全库笔记向量索引进行深度问答 (Shift + Enter)'
                : '点击进行 RAG 知识库检索配置与问答 (Shift + Enter)'
              : isRagActive
                ? 'Ready: Chat with entire vault knowledge base (Shift + Enter)'
                : 'Click to configure and chat with vault (Shift + Enter)'}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
