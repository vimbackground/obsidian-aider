import { Edit, Trash2 } from 'lucide-react'
import { App, Notice } from 'obsidian'
import { ObsidianToggle } from 'src/components/common/ObsidianToggle'

import { useSettings } from '../../../../contexts/settings-context'
import { getEmbeddingModelClient } from '../../../../core/rag/embedding'
import SmartComposerPlugin from '../../../../main'
import { useI18n } from '../../../../utils/i18n'
import { ConfirmModal } from '../../../modals/ConfirmModal'
import { AddEmbeddingModelModal } from '../../modals/AddEmbeddingModelModal'
import { EditEmbeddingModelModal } from '../../modals/EditEmbeddingModelModal'

type EmbeddingModelsSubSectionProps = {
  app: App
  plugin: SmartComposerPlugin
}

const isEnabled = (enable: boolean | undefined | null) => enable ?? true

export function EmbeddingModelsSubSection({
  app,
  plugin,
}: EmbeddingModelsSubSectionProps) {
  const { settings, setSettings } = useSettings()
  const { t } = useI18n()

  const handleDeleteEmbeddingModel = async (modelId: string) => {
    const message =
      `确定要删除嵌入模型 "${modelId}" 吗？\n\n` +
      `这同时会清理数据库中使用该模型生成的所有向量索引。`

    new ConfirmModal(app, {
      title: '删除嵌入模型',
      message: message,
      ctaText: '删除',
      onConfirm: async () => {
        const vectorManager = (await plugin.getDbManager()).getVectorManager()
        const embeddingStats = await vectorManager.getEmbeddingStats()
        const embeddingStat = embeddingStats.find((v) => v.model === modelId)

        if (embeddingStat?.rowCount && embeddingStat.rowCount > 0) {
          // only clear when there's data
          const embeddingModelClient = getEmbeddingModelClient({
            settings,
            embeddingModelId: modelId,
          })
          if (embeddingModelClient) {
            await vectorManager.clearAllVectors(embeddingModelClient)
          }
        }

        const remainingModels = settings.embeddingModels.filter((v) => v.id !== modelId)
        await setSettings({
          ...settings,
          embeddingModelId:
            settings.embeddingModelId === modelId
              ? remainingModels[0]?.id ?? ''
              : settings.embeddingModelId,
          embeddingModels: remainingModels,
        })
      },
    }).open()
  }

  const handleToggleEnableEmbeddingModel = async (
    modelId: string,
    value: boolean,
  ) => {
    if (!value && modelId === settings.embeddingModelId) {
      new Notice('不能禁用当前正在作为活动嵌入模型使用的项')
      await setSettings({
        ...settings,
        embeddingModels: settings.embeddingModels.map((v) =>
          v.id === modelId ? { ...v, enable: true } : v,
        ),
      })
      return
    }

    await setSettings({
      ...settings,
      embeddingModels: settings.embeddingModels.map((v) =>
        v.id === modelId ? { ...v, enable: value } : v,
      ),
    })
  }

  return (
    <div>
      <div className="aide-settings-sub-header">{t('settings.embeddingModels')}</div>
      <div className="aide-settings-desc">
        {t('settings.embeddingModelsDesc')}
      </div>

      <div className="aide-settings-table-container">
        <table className="aide-settings-table">
          <colgroup>
            <col />
            <col />
            <col />
            <col width={80} />
            <col width={60} />
            <col width={70} />
          </colgroup>
          <thead>
            <tr>
              <th>{t('common.id')}</th>
              <th>{t('common.providerId')}</th>
              <th>{t('common.model')}</th>
              <th>{t('settings.dimension')}</th>
              <th>{t('common.enable')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {settings.embeddingModels.map((embeddingModel) => (
              <tr key={embeddingModel.id}>
                <td>{embeddingModel.id}</td>
                <td>{embeddingModel.providerId}</td>
                <td>{embeddingModel.model}</td>
                <td>{embeddingModel.dimension}</td>
                <td>
                  <ObsidianToggle
                    value={isEnabled(embeddingModel.enable)}
                    onChange={(value) => {
                      void handleToggleEnableEmbeddingModel(embeddingModel.id, value)
                    }}
                  />
                </td>
                <td>
                  <div className="aide-settings-actions">
                    <button
                      onClick={() => {
                        new EditEmbeddingModelModal(app, plugin, embeddingModel).open()
                      }}
                      className="clickable-icon"
                      title="修改/更换嵌入模型"
                    >
                      <Edit />
                    </button>
                    <button
                      onClick={() => {
                        void handleDeleteEmbeddingModel(embeddingModel.id)
                      }}
                      className="clickable-icon"
                      title={t('common.delete')}
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
              <td colSpan={6}>
                <button
                  onClick={() => {
                    new AddEmbeddingModelModal(app, plugin).open()
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
