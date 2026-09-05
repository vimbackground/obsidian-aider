import { Edit, Settings, Trash2 } from 'lucide-react'
import { App, Notice } from 'obsidian'
import { ObsidianToggle } from 'src/components/common/ObsidianToggle'

import { useSettings } from '../../../../contexts/settings-context'
import SmartComposerPlugin from '../../../../main'
import { useI18n } from '../../../../utils/i18n'
import { ConfirmModal } from '../../../modals/ConfirmModal'
import { AddChatModelModal } from '../../modals/AddChatModelModal'
import { EditChatModelModal } from '../../modals/EditChatModelModal'

import {
  ChatModelSettingsModal,
  hasChatModelSettings,
} from './ChatModelSettings'

type ChatModelsSubSectionProps = {
  app: App
  plugin: SmartComposerPlugin
}

const isEnabled = (enable: boolean | undefined | null) => enable ?? true

export function ChatModelsSubSection({
  app,
  plugin,
}: ChatModelsSubSectionProps) {
  const { settings, setSettings } = useSettings()
  const { t } = useI18n()

  const handleDeleteChatModel = async (modelId: string) => {
    const message = `确定要删除模型 "${modelId}" 吗？`
    new ConfirmModal(app, {
      title: t('common.delete'),
      message: message,
      ctaText: t('common.delete'),
      onConfirm: async () => {
        await setSettings({
          ...settings,
          chatModelId: settings.chatModelId === modelId ? '' : settings.chatModelId,
          applyModelId: settings.applyModelId === modelId ? '' : settings.applyModelId,
          chatModels: [...settings.chatModels].filter((v) => v.id !== modelId),
        })
      },
    }).open()
  }

  const handleToggleEnableChatModel = async (
    modelId: string,
    value: boolean,
  ) => {
    if (
      !value &&
      (modelId === settings.chatModelId || modelId === settings.applyModelId)
    ) {
      new Notice(
        '不能禁用当前正在作为对话模型或应用模型使用的项',
      )

      // to trigger re-render
      await setSettings({
        ...settings,
        chatModels: [...settings.chatModels].map((v) =>
          v.id === modelId ? { ...v, enable: true } : v,
        ),
      })
      return
    }

    await setSettings({
      ...settings,
      chatModels: [...settings.chatModels].map((v) =>
        v.id === modelId ? { ...v, enable: value } : v,
      ),
    })
  }

  return (
    <div>
      <div className="aide-settings-sub-header">{t('settings.chatModels')}</div>
      <div className="aide-settings-desc">{t('settings.chatModelsDesc')}</div>

      <div className="aide-settings-table-container">
        <table className="aide-settings-table">
          <colgroup>
            <col />
            <col />
            <col />
            <col width={60} />
            <col width={60} />
          </colgroup>
          <thead>
            <tr>
              <th>{t('common.id')}</th>
              <th>{t('common.providerId')}</th>
              <th>{t('common.model')}</th>
              <th>{t('common.enable')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {settings.chatModels.map((chatModel) => (
              <tr key={chatModel.id}>
                <td>{chatModel.id}</td>
                <td>{chatModel.providerId}</td>
                <td>{chatModel.model}</td>
                <td>
                  <ObsidianToggle
                    value={isEnabled(chatModel.enable)}
                    onChange={(value) => {
                      void handleToggleEnableChatModel(chatModel.id, value)
                    }}
                  />
                </td>
                <td>
                  <div className="aide-settings-actions">
                    <button
                      onClick={() => {
                        new EditChatModelModal(app, plugin, chatModel).open()
                      }}
                      className="clickable-icon"
                      title="修改/更换模型设置"
                    >
                      <Edit />
                    </button>
                    {hasChatModelSettings(chatModel) && (
                      <button
                        onClick={() => {
                          new ChatModelSettingsModal(
                            chatModel,
                            app,
                            plugin,
                          ).open()
                        }}
                        className="clickable-icon"
                        title="高级参数设置"
                      >
                        <Settings />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        void handleDeleteChatModel(chatModel.id)
                      }}
                      className="clickable-icon"
                      title="删除模型"
                    >
                      <Trash2 />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5}>
                <button
                  onClick={() => {
                    new AddChatModelModal(app, plugin).open()
                  }}
                >
                  {t('settings.addCustomModel')}
                </button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
