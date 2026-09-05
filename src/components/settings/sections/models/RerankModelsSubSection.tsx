import { Trash2 } from 'lucide-react'
import { App } from 'obsidian'

import { useSettings } from '../../../../contexts/settings-context'
import SmartComposerPlugin from '../../../../main'
import { useI18n } from '../../../../utils/i18n'
import { ConfirmModal } from '../../../modals/ConfirmModal'
import { AddRerankModelModal } from '../../modals/AddRerankModelModal'

type RerankModelsSubSectionProps = {
  app: App
  plugin: SmartComposerPlugin
}

export function RerankModelsSubSection({
  app,
  plugin,
}: RerankModelsSubSectionProps) {
  const { settings, setSettings } = useSettings()
  const { language } = useI18n()

  const rerankModels = settings.rerankModels || []

  const handleDeleteRerankModel = async (modelId: string) => {
    const message = `确定要删除重排序模型 "${modelId}" 吗？`

    new ConfirmModal(app, {
      title: '删除重排序模型',
      message: message,
      ctaText: '删除',
      onConfirm: async () => {
        const remainingModels = rerankModels.filter((v) => v.id !== modelId)
        await setSettings({
          ...settings,
          rerankModels: remainingModels,
          ragOptions: {
            ...settings.ragOptions,
            rerank: {
              ...settings.ragOptions.rerank,
              modelId:
                settings.ragOptions.rerank?.modelId === modelId
                  ? remainingModels[0]?.id ?? ''
                  : settings.ragOptions.rerank?.modelId ?? '',
            },
          },
        })
      },
    }).open()
  }

  return (
    <div style={{ marginTop: '24px' }}>
      <div className="aide-settings-sub-header">
        {language === 'zh' ? '重排序模型' : 'Rerank Models'}
      </div>
      <div className="aide-settings-desc">
        {language === 'zh'
          ? '用于知识库检索的二次语义精排模型。'
          : 'Models used for semantic reranking in RAG retrieval.'}
      </div>

      <div className="aide-settings-table-container">
        <table className="aide-settings-table">
          <thead>
            <tr>
              <th>{language === 'zh' ? '模型标识' : 'ID'}</th>
              <th>{language === 'zh' ? '服务商' : 'Provider'}</th>
              <th>{language === 'zh' ? '模型代号' : 'Model'}</th>
              <th>{language === 'zh' ? '操作' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {rerankModels.length > 0 ? (
              rerankModels.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.providerId}</td>
                  <td>{item.model}</td>
                  <td>
                    <div className="aide-settings-actions">
                      <button
                        onClick={() => {
                          void handleDeleteRerankModel(item.id)
                        }}
                        className="clickable-icon"
                        title={language === 'zh' ? '删除' : 'Delete'}
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  {language === 'zh' ? '暂未添加重排序模型，点击下方按钮添加' : 'No rerank models added yet.'}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>
                <button
                  onClick={() => {
                    new AddRerankModelModal(app, plugin).open()
                  }}
                >
                  {language === 'zh' ? '添加重排序模型' : 'Add Rerank Model'}
                </button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
