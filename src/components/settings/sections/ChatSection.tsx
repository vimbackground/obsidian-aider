import { RECOMMENDED_MODELS_FOR_CHAT } from '../../../constants'
import { useSettings } from '../../../contexts/settings-context'
import { useI18n } from '../../../utils/i18n'
import { ObsidianDropdown } from '../../common/ObsidianDropdown'
import { ObsidianSetting } from '../../common/ObsidianSetting'
import { ObsidianTextArea } from '../../common/ObsidianTextArea'
import { ObsidianTextInput } from '../../common/ObsidianTextInput'
import { ObsidianToggle } from '../../common/ObsidianToggle'

export function ChatSection() {
  const { settings, setSettings } = useSettings()
  const { t, language } = useI18n()

  const chatModelOptions: Record<string, string> = {
    '': t('common.notSelected'),
    ...Object.fromEntries(
      settings.chatModels
        .filter(({ enable }) => enable ?? true)
        .map((chatModel) => [
          chatModel.id,
          chatModel.id,
        ]),
    ),
  }

  return (
    <div className="aide-settings-section">
      <div className="aide-settings-header">{t('settings.chat')}</div>

      <ObsidianSetting
        name={t('settings.chatModel')}
        desc={t('settings.chatModelDesc')}
      >
        <ObsidianDropdown
          value={settings.chatModelId}
          options={chatModelOptions}
          onChange={async (value) => {
            await setSettings({
              ...settings,
              chatModelId: value,
            })
          }}
        />
      </ObsidianSetting>

      <ObsidianSetting
        name={t('settings.systemPrompt')}
        desc={t('settings.systemPromptDesc')}
        className="aide-settings-textarea-header"
      />

      <ObsidianSetting className="aide-settings-textarea">
        <ObsidianTextArea
          value={settings.systemPrompt}
          onChange={async (value: string) => {
            await setSettings({
              ...settings,
              systemPrompt: value,
            })
          }}
        />
      </ObsidianSetting>

      <ObsidianSetting
        name={t('settings.includeCurrentFile')}
        desc={t('settings.includeCurrentFileDesc')}
      >
        <ObsidianToggle
          value={settings.chatOptions.includeCurrentFileContent}
          onChange={async (value) => {
            await setSettings({
              ...settings,
              chatOptions: {
                ...settings.chatOptions,
                includeCurrentFileContent: value,
              },
            })
          }}
        />
      </ObsidianSetting>

      <ObsidianSetting
        name={t('settings.enableTools')}
        desc={t('settings.enableToolsDesc')}
      >
        <ObsidianToggle
          value={settings.chatOptions.enableTools}
          onChange={async (value) => {
            await setSettings({
              ...settings,
              chatOptions: {
                ...settings.chatOptions,
                enableTools: value,
              },
            })
          }}
        />
      </ObsidianSetting>

      <ObsidianSetting
        name={t('settings.maxAutoIterations')}
        desc={t('settings.maxAutoIterationsDesc')}
      >
        <ObsidianTextInput
          value={settings.chatOptions.maxAutoIterations.toString()}
          onChange={async (value) => {
            const parsedValue = parseInt(value)
            if (isNaN(parsedValue) || parsedValue < 1) {
              return
            }
            await setSettings({
              ...settings,
              chatOptions: {
                ...settings.chatOptions,
                maxAutoIterations: parsedValue,
              },
            })
          }}
        />
      </ObsidianSetting>

      <ObsidianSetting
        name={language === 'zh' ? '服务层级与速率模式' : 'Runtime Profile'}
        desc={
          language === 'zh'
            ? '针对免费层（如 Groq 免费层 8000 TPM 限额）与付费层提供差异化 Token 压缩与工具调度策略'
            : 'Differentiated token and tool strategies for free tier (e.g. Groq 8000 TPM limit) and paid tier.'
        }
      >
        <ObsidianDropdown
          value={settings.chatOptions.runtimeProfile ?? 'eco'}
          options={{
            eco:
              language === 'zh'
                ? '🌱 免费层轻量模式 (严格控流、精简 Token、防 429、单跳检索)'
                : '🌱 Free Tier / Eco (Strict rate control, compact tokens, single-hop)',
            pro:
              language === 'zh'
                ? '🚀 付费层高精度模式 (完整上下文、深度探索、详尽正文提取)'
                : '🚀 Paid Tier / Pro (Full context, deep exploration, rich content)',
          }}
          onChange={async (value) => {
            await setSettings({
              ...settings,
              chatOptions: {
                ...settings.chatOptions,
                runtimeProfile: value as 'eco' | 'pro',
              },
            })
          }}
        />
      </ObsidianSetting>
    </div>
  )
}
