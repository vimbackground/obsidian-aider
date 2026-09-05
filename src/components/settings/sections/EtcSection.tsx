import { App, Notice } from 'obsidian'

import { useSettings } from '../../../contexts/settings-context'
import SmartComposerPlugin from '../../../main'
import { smartComposerSettingsSchema } from '../../../settings/schema/setting.types'
import { useI18n } from '../../../utils/i18n'
import { ObsidianButton } from '../../common/ObsidianButton'
import { ObsidianDropdown } from '../../common/ObsidianDropdown'
import { ObsidianSetting } from '../../common/ObsidianSetting'
import { ConfirmModal } from '../../modals/ConfirmModal'

type EtcSectionProps = {
  app: App
  plugin: SmartComposerPlugin
}

export function EtcSection({ app }: EtcSectionProps) {
  const { settings, setSettings } = useSettings()
  const { t } = useI18n()

  const handleResetSettings = () => {
    new ConfirmModal(app, {
      title: t('settings.resetSettings'),
      message:
        '确定要重置所有设置为默认值吗？此操作无法撤销。',
      ctaText: t('common.reset'),
      onConfirm: async () => {
        const defaultSettings = smartComposerSettingsSchema.parse({})
        await setSettings(defaultSettings)
        new Notice('所有设置已重置为默认值')
      },
    }).open()
  }

  return (
    <div className="aide-settings-section">
      <div className="aide-settings-header">{t('settings.etc')}</div>

      <ObsidianSetting
        name={t('settings.language')}
        desc={t('settings.languageDesc')}
      >
        <ObsidianDropdown
          value={settings.language || 'en'}
          options={{
            zh: '中文 (简体)',
            en: 'English',
            auto: 'Auto (跟随系统)',
          }}
          onChange={(value) => {
            void setSettings({
              ...settings,
              language: value as 'en' | 'zh' | 'zh-CN' | 'auto',
            })
          }}
        />
      </ObsidianSetting>

      <ObsidianSetting
        name={t('settings.resetSettings')}
        desc={t('settings.resetSettingsDesc')}
      >
        <ObsidianButton text={t('common.reset')} warning onClick={handleResetSettings} />
      </ObsidianSetting>
    </div>
  )
}
