import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

import { useSettings } from '../../../contexts/settings-context'
import { useI18n } from '../../../utils/i18n'

export function ModelSelect() {
  const { settings, setSettings } = useSettings()
  const { language } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const enabledChatModels = settings.chatModels.filter(
    ({ enable }) => enable ?? true,
  )

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger className="aide-chat-input-model-select">
        <div className="aide-chat-input-model-select__model-name">
          {settings.chatModelId ||
            (language === 'zh' ? '选择模型...' : 'Select Model...')}
        </div>
        <div className="aide-chat-input-model-select__icon">
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className="aide-popover">
          <ul>
            {enabledChatModels.length === 0 ? (
              <li
                style={{
                  padding: '6px 12px',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                }}
              >
                {language === 'zh' ? '暂无可用模型' : 'No models available'}
              </li>
            ) : (
              enabledChatModels.map((chatModelOption) => (
                <DropdownMenu.Item
                  key={chatModelOption.id}
                  onSelect={() => {
                    void setSettings({
                      ...settings,
                      chatModelId: chatModelOption.id,
                    })
                  }}
                  asChild
                >
                  <li>{chatModelOption.id}</li>
                </DropdownMenu.Item>
              ))
            )}
          </ul>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
