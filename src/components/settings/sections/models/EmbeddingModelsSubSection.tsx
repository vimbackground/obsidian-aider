import { Trash2 } from 'lucide-react'
import { App } from 'obsidian'

import { useSettings } from '../../../../contexts/settings-context'
import { getEmbeddingModelClient } from '../../../../core/rag/embedding'
import SmartComposerPlugin from '../../../../main'
import { useI18n } from '../../../../utils/i18n'
import { ConfirmModal } from '../../../modals/ConfirmModal'
import { AddEmbeddingModelModal } from '../../modals/AddEmbeddingModelModal'

type EmbeddingModelsSubSectionProps = {
  app: App
  plugin: SmartComposerPlugin
}

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
          await vectorManager.clearAllVectors(embeddingModelClient)
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

  return (
    <div>
      <div className="aide-settings-sub-header">{t('settings.embeddingModels')}</div>
      <div className="aide-settings-desc">
        {t('settings.embeddingModelsDesc')}
      </div>

      <div className="aide-settings-table-container">
        <table className="aide-settings-table">
          <thead>
            <tr>
              <th>{t('common.id')}</th>
              <th>{t('common.providerId')}</th>
              <th>{t('common.model')}</th>
              <th>{t('settings.dimension')}</th>
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
                  <div className="aide-settings-actions">
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
              <td colSpan={5}>
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
