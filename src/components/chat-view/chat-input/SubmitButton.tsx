import { CornerDownLeftIcon } from 'lucide-react'

import { useI18n } from '../../../utils/i18n'

export function SubmitButton({ onClick }: { onClick: () => void }) {
  const { language } = useI18n()
  return (
    <button
      type="button"
      className="aide-chat-user-input-submit-button aide-chat-btn-article"
      onClick={onClick}
      title={
        language === 'zh'
          ? '针对当前打开的文章进行问答 (Enter)'
          : 'Chat about current article (Enter)'
      }
    >
      <div className="aide-chat-user-input-submit-button-icons">
        <CornerDownLeftIcon size={13} />
      </div>
      <span className="aide-chat-btn-text">
        {language === 'zh' ? '文章对话' : 'Article Chat'}
      </span>
    </button>
  )
}
