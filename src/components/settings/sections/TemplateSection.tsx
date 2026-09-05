import { Edit, PlusCircle, Trash2 } from 'lucide-react'
import { App, Notice } from 'obsidian'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { TemplateManager } from '../../../database/json/template/TemplateManager'
import { Template, TemplateMetadata } from '../../../database/json/template/types'
import { useI18n } from '../../../utils/i18n'
import { ObsidianButton } from '../../common/ObsidianButton'
import { ConfirmModal } from '../../modals/ConfirmModal'
import {
  CreateTemplateModal,
  EditTemplateModal,
} from '../../modals/TemplateFormModal'

type TemplateSectionProps = {
  app: App
  onSelectTemplate?: (template: Template) => void
}

export function TemplateSection({ app, onSelectTemplate }: TemplateSectionProps) {
  const templateManager = useMemo(() => new TemplateManager(app), [app])
  const { t, language } = useI18n()
  const isZh = language === 'zh'

  const [templateList, setTemplateList] = useState<TemplateMetadata[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchTemplateList = useCallback(async () => {
    setIsLoading(true)
    try {
      setTemplateList(await templateManager.listMetadata())
    } catch (error) {
      console.error('Failed to fetch template list:', error)
      new Notice(
        isZh
          ? '加载提示词模板失败，请尝试刷新设置。'
          : 'Failed to load templates. Please try refreshing the settings.',
      )
      setTemplateList([])
    } finally {
      setIsLoading(false)
    }
  }, [templateManager, isZh])

  const handleCreate = useCallback(() => {
    new CreateTemplateModal({
      app,
      selectedSerializedNodes: null,
      onSubmit: fetchTemplateList,
    }).open()
  }, [fetchTemplateList, app])

  const handleEdit = useCallback(
    (template: TemplateMetadata) => {
      new EditTemplateModal({
        app,
        templateId: template.id,
        onSubmit: fetchTemplateList,
      }).open()
    },
    [fetchTemplateList, app],
  )

  const handleSelect = useCallback(
    async (templateMeta: TemplateMetadata) => {
      if (!onSelectTemplate) return
      try {
        const fullTemplate = await templateManager.findById(templateMeta.id)
        if (fullTemplate) {
          onSelectTemplate(fullTemplate)
        }
      } catch (err) {
        console.error('Failed to load full template:', err)
      }
    },
    [templateManager, onSelectTemplate],
  )

  const handleDelete = useCallback(
    (template: TemplateMetadata) => {
      const message = t('settings.deleteTemplateConfirm').replace(
        '{name}',
        template.name,
      )
      new ConfirmModal(app, {
        title: isZh ? '删除模板' : 'Delete Template',
        message: message,
        ctaText: t('common.delete'),
        onConfirm: async () => {
          try {
            await templateManager.deleteTemplate(template.id)
            void fetchTemplateList()
          } catch (error) {
            console.error('Failed to delete template:', error)
            new Notice(
              isZh
                ? '删除模板失败，请重试'
                : 'Failed to delete template, please try again',
            )
          }
        },
      }).open()
    },
    [templateManager, fetchTemplateList, app, t, isZh],
  )

  useEffect(() => {
    void fetchTemplateList()
  }, [fetchTemplateList])

  return (
    <div className="aide-settings-section">
      <div className="aide-settings-header">{t('settings.templates')}</div>

      <div className="aide-settings-sub-header-container">
        <div className="aide-settings-sub-header">
          {t('settings.savedTemplates')}
        </div>
        <ObsidianButton text={t('settings.addTemplate')} onClick={handleCreate} />
      </div>

      <div className="aide-templates-container">
        <div className="aide-templates-header">
          <div>{t('settings.templateName')}</div>
          <div>{t('common.actions')}</div>
        </div>
        {isLoading ? (
          <div className="aide-templates-empty">{t('settings.loadingTemplates')}</div>
        ) : templateList.length > 0 ? (
          templateList.map((template) => (
            <TemplateItem
              key={template.id}
              template={template}
              isSelectMode={Boolean(onSelectTemplate)}
              onSelect={() => {
                void handleSelect(template)
              }}
              onDelete={() => {
                handleDelete(template)
              }}
              onEdit={() => {
                handleEdit(template)
              }}
            />
          ))
        ) : (
          <div className="aide-templates-empty">{t('settings.noTemplates')}</div>
        )}
      </div>
    </div>
  )
}

function TemplateItem({
  template,
  isSelectMode,
  onSelect,
  onEdit,
  onDelete,
}: {
  template: TemplateMetadata
  isSelectMode?: boolean
  onSelect?: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div
      className="aide-template"
      style={{ cursor: isSelectMode ? 'pointer' : undefined }}
      onClick={() => {
        if (isSelectMode) onSelect?.()
      }}
    >
      <div className="aide-template-row">
        <div className="aide-template-name" style={{ flex: 1, marginRight: 8 }}>
          {template.name}
        </div>
        <div
          className="aide-template-actions"
          onClick={(e) => e.stopPropagation()}
        >
          {isSelectMode && (
            <button
              className="clickable-icon"
              aria-label="Insert template"
              title="插入模板 / Apply template"
              onClick={onSelect}
              style={{ color: 'var(--interactive-accent)', marginRight: 4 }}
            >
              <PlusCircle size={16} />
            </button>
          )}
          <button
            className="clickable-icon"
            aria-label="Edit Template"
            onClick={onEdit}
          >
            <Edit size={16} />
          </button>
          <button
            className="clickable-icon"
            aria-label="Delete Template"
            onClick={onDelete}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
