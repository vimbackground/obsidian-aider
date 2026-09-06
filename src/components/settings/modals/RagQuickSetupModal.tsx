import { App, Notice } from 'obsidian'
import { useState } from 'react'

import { SmartComposerSettings } from '../../../settings/schema/setting.types'
import { getLanguage } from '../../../utils/i18n'
import { ObsidianButton } from '../../common/ObsidianButton'
import { ObsidianDropdown } from '../../common/ObsidianDropdown'
import { ObsidianSetting } from '../../common/ObsidianSetting'
import { ObsidianToggle } from '../../common/ObsidianToggle'
import { ReactModal } from '../../common/ReactModal'

export type RagQuickSetupModalOptions = {
  settings: SmartComposerSettings
  onSave: (newSettings: SmartComposerSettings) => Promise<void>
  onSuccess?: (savedSettings: SmartComposerSettings) => void
}

type RagQuickSetupComponentProps = {
  settings: SmartComposerSettings
  onSave: (newSettings: SmartComposerSettings) => Promise<void>
  onSuccess?: (savedSettings: SmartComposerSettings) => void
  onClose: () => void
}

export class RagQuickSetupModal extends ReactModal<RagQuickSetupComponentProps> {
  constructor(app: App, options: RagQuickSetupModalOptions) {
    const isZh = getLanguage(options.settings.language) === 'zh'
    super({
      app,
      Component: RagQuickSetupComponent,
      props: {
        settings: options.settings,
        onSave: options.onSave,
        onSuccess: options.onSuccess,
      },
      options: {
        title: isZh ? '全知识库对话与 RAG 配置' : 'Vault Chat & RAG Setup',
      },
    })
  }
}

function RagQuickSetupComponent({
  settings,
  onSave,
  onSuccess,
  onClose,
}: RagQuickSetupComponentProps) {
  const isZh = getLanguage(settings.language) === 'zh'

  const [isRagEnabled, setIsRagEnabled] = useState(
    settings.ragOptions?.enabled ?? false,
  )
  const [embeddingModelId, setEmbeddingModelId] = useState(
    settings.embeddingModelId || '',
  )
  const [isRerankEnabled, setIsRerankEnabled] = useState(
    settings.ragOptions?.rerank?.enabled ?? false,
  )
  const [rerankModelId, setRerankModelId] = useState(
    settings.ragOptions?.rerank?.modelId || '',
  )
  const [isSaving, setIsSaving] = useState(false)

  // 过滤出启用的嵌入模型
  const availableEmbeddingModels = settings.embeddingModels.filter(
    (m) => m.enable ?? true,
  )
  const embeddingDropdownOptions: Record<string, string> = {
    '': isZh ? '(未选择)' : '(Not selected)',
    ...Object.fromEntries(
      availableEmbeddingModels.map((m) => [m.id, m.id]),
    ),
  }

  // 过滤出启用的重排序模型
  const availableRerankModels = settings.rerankModels.filter(
    (m) => m.enable ?? true,
  )
  const rerankDropdownOptions: Record<string, string> = {
    '': isZh ? '(未选择)' : '(Not selected)',
    ...Object.fromEntries(
      availableRerankModels.map((m) => [m.id, m.id]),
    ),
  }

  const handleSave = async () => {
    if (isRagEnabled && !embeddingModelId) {
      new Notice(
        isZh
          ? '开启知识库检索后，请选择一个嵌入模型！'
          : 'Please select an embedding model when RAG is enabled!',
      )
      return
    }

    if (isRagEnabled && isRerankEnabled && !rerankModelId) {
      new Notice(
        isZh
          ? '开启二次重排序后，请选择一个 Rerank 模型！'
          : 'Please select a Rerank model when rerank is enabled!',
      )
      return
    }

    try {
      setIsSaving(true)
      const selectedRerankModel = settings.rerankModels.find(
        (m) => m.id === rerankModelId,
      )

      const updatedSettings: SmartComposerSettings = {
        ...settings,
        embeddingModelId: embeddingModelId,
        ragOptions: {
          ...settings.ragOptions,
          enabled: isRagEnabled,
          rerank: {
            ...settings.ragOptions?.rerank,
            enabled: isRerankEnabled,
            modelId: rerankModelId,
            providerId: selectedRerankModel?.providerId,
            model: selectedRerankModel?.model,
          },
        },
      }

      await onSave(updatedSettings)
      new Notice(
        isZh ? '知识库检索配置已保存' : 'RAG settings saved successfully',
      )
      onClose()
      if (onSuccess && isRagEnabled && embeddingModelId) {
        onSuccess(updatedSettings)
      }
    } catch (err) {
      console.error(err)
      new Notice(
        isZh ? '保存设置失败，请重试' : 'Failed to save settings, please retry',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 引导说明区域 */}
      <div
        style={{
          padding: '12px 14px',
          borderRadius: 'var(--radius-m)',
          backgroundColor: 'var(--background-secondary)',
          border: '1px solid var(--background-modifier-border)',
          fontSize: '13px',
          lineHeight: '1.5',
          color: 'var(--text-normal)',
        }}
      >
        {isZh ? (
          <>
            <strong>说明：</strong>
            「全知识库对话」功能通过向量检索（RAG）索引您的全部笔记并在提问时检索相关上下文。
            当前知识库检索功能尚未就绪，请在下方<strong>开启 RAG 开关</strong>并<strong>选择嵌入模型</strong>。配置完成后即可直接开始全库对话。
          </>
        ) : (
          <>
            <strong>Notice:</strong>
            "Vault Chat" uses Retrieval-Augmented Generation (RAG) to index your notes and find relevant knowledge context.
            RAG is not ready yet. Please <strong>enable RAG</strong> and <strong>select an embedding model</strong> below. Once configured, your vault chat will start immediately.
          </>
        )}
      </div>

      {/* RAG 总控开关 */}
      <ObsidianSetting
        name={isZh ? '启用知识库检索 (RAG)' : 'Enable Vault RAG'}
        desc={
          isZh
            ? '开启后将对库内笔记进行向量检索与智能问答'
            : 'Enable note semantic indexing and vault search'
        }
      >
        <ObsidianToggle value={isRagEnabled} onChange={setIsRagEnabled} />
      </ObsidianSetting>

      {/* 嵌入模型选择 */}
      {isRagEnabled && (
        <>
          <ObsidianSetting
            name={isZh ? '嵌入模型 (Embedding Model)' : 'Embedding Model'}
            desc={
              isZh
                ? '用于计算笔记向量表示的专用嵌入模型'
                : 'Model used to generate vector embeddings for your notes'
            }
          >
            <ObsidianDropdown
              value={embeddingModelId}
              options={embeddingDropdownOptions}
              onChange={setEmbeddingModelId}
            />
          </ObsidianSetting>

          {/* Rerank 开关 */}
          <ObsidianSetting
            name={isZh ? '启用 Rerank 二次重排序' : 'Enable Rerank'}
            desc={
              isZh
                ? '在初步向量检索后使用精细排序模型二次打分，显著提升回答准确率'
                : 'Re-rank search results with a dedicated cross-encoder model for higher accuracy'
            }
          >
            <ObsidianToggle value={isRerankEnabled} onChange={setIsRerankEnabled} />
          </ObsidianSetting>

          {/* Rerank 模型选择 */}
          {isRerankEnabled && (
            <ObsidianSetting
              name={isZh ? 'Rerank 模型' : 'Rerank Model'}
              desc={
                isZh
                  ? '执行二次精排的模型'
                  : 'Model used for cross-encoder re-ranking'
              }
            >
              <ObsidianDropdown
                value={rerankModelId}
                options={rerankDropdownOptions}
                onChange={setRerankModelId}
              />
            </ObsidianSetting>
          )}
        </>
      )}

      {/* 底部按钮栏 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          marginTop: '8px',
        }}
      >
        <ObsidianButton
          text={isZh ? '取消' : 'Cancel'}
          onClick={onClose}
          disabled={isSaving}
        />
        <ObsidianButton
          text={
            isSaving
              ? isZh
                ? '保存中...'
                : 'Saving...'
              : isZh
                ? '保存并开始对话'
                : 'Save & Start Chat'
          }
          onClick={handleSave}
          cta
          disabled={isSaving}
        />
      </div>
    </div>
  )
}
