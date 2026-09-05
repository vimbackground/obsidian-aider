import { $generateNodesFromSerializedNodes } from '@lexical/clipboard'
import { BaseSerializedNode } from '@lexical/clipboard/clipboard'
import { InitialEditorStateType } from '@lexical/react/LexicalComposer'
import { $getRoot, LexicalEditor } from 'lexical'
import { App, Notice } from 'obsidian'
import { useEffect, useMemo, useRef, useState } from 'react'

import { AppProvider } from '../../contexts/app-context'
import { SettingsProvider } from '../../contexts/settings-context'
import { DuplicateTemplateException } from '../../database/json/exception'
import { TemplateManager } from '../../database/json/template/TemplateManager'
import SmartComposerPlugin from '../../main'
import { smartComposerSettingsSchema } from '../../settings/schema/setting.types'
import { useI18n } from '../../utils/i18n'
import LexicalContentEditable from '../chat-view/chat-input/LexicalContentEditable'
import { ObsidianButton } from '../common/ObsidianButton'
import { ObsidianSetting } from '../common/ObsidianSetting'
import { ObsidianTextInput } from '../common/ObsidianTextInput'
import { ReactModal } from '../common/ReactModal'

type TemplateFormComponentProps = {
  app: App
  selectedSerializedNodes?: BaseSerializedNode[] | null
  templateId?: string
  onSubmit?: () => void
  onClose: () => void
}

export class CreateTemplateModal extends ReactModal<TemplateFormComponentProps> {
  constructor({
    app,
    selectedSerializedNodes,
    onSubmit,
  }: {
    app: App
    selectedSerializedNodes?: BaseSerializedNode[] | null
    onSubmit?: () => void
  }) {
    super({
      app: app,
      Component: TemplateFormComponentWrapper,
      props: {
        app,
        selectedSerializedNodes,
        onSubmit,
      },
      options: {
        title: 'Add Template', // Will be rendered by wrapper or modal option
      },
    })
  }
}

export class EditTemplateModal extends ReactModal<TemplateFormComponentProps> {
  constructor({
    app,
    templateId,
    onSubmit,
  }: {
    app: App
    templateId?: string
    onSubmit?: () => void
  }) {
    super({
      app: app,
      Component: TemplateFormComponentWrapper,
      props: {
        app,
        templateId,
        onSubmit,
      },
      options: {
        title: 'Edit Template',
      },
    })
  }
}

function TemplateFormComponentWrapper({
  app,
  selectedSerializedNodes,
  templateId,
  onSubmit,
  onClose,
}: TemplateFormComponentProps) {
  const plugin = (app as any).plugins?.getPlugin?.('aider') as
    | SmartComposerPlugin
    | undefined

  const content = (
    <TemplateFormComponent
      app={app}
      selectedSerializedNodes={selectedSerializedNodes}
      templateId={templateId}
      onSubmit={onSubmit}
      onClose={onClose}
    />
  )

  if (plugin) {
    return (
      <AppProvider app={app}>
        <SettingsProvider
          settings={plugin.settings}
          setSettings={(newSettings) => plugin.setSettings(newSettings)}
          addSettingsChangeListener={(listener) =>
            plugin.addSettingsChangeListener(listener)
          }
        >
          {content}
        </SettingsProvider>
      </AppProvider>
    )
  }

  const defaultSettings = smartComposerSettingsSchema.parse({})
  return (
    <AppProvider app={app}>
      <SettingsProvider
        settings={defaultSettings}
        setSettings={() => {}}
        addSettingsChangeListener={() => () => {}}
      >
        {content}
      </SettingsProvider>
    </AppProvider>
  )
}

function TemplateFormComponent({
  app,
  selectedSerializedNodes,
  templateId,
  onSubmit,
  onClose,
}: TemplateFormComponentProps) {
  const templateManager = useMemo(() => new TemplateManager(app), [app])
  const { t, language } = useI18n()
  const isZh = language === 'zh'

  const [templateName, setTemplateName] = useState('')
  const editorRef = useRef<LexicalEditor | null>(null)
  const contentEditableRef = useRef<HTMLDivElement>(null)

  const existingNodesRef = useRef<BaseSerializedNode[] | null>(null)

  const initialEditorState: InitialEditorStateType = (
    editor: LexicalEditor,
  ) => {
    if (!selectedSerializedNodes) return
    editor.update(() => {
      const parsedNodes = $generateNodesFromSerializedNodes(
        selectedSerializedNodes,
      )
      const root = $getRoot()
      root.clear()
      parsedNodes.forEach((node) => root.append(node))
    })
  }

  const applyNodesToEditor = (nodes: BaseSerializedNode[]) => {
    if (!editorRef.current) return false
    try {
      editorRef.current.update(() => {
        const parsedNodes = $generateNodesFromSerializedNodes(nodes)
        const root = $getRoot()
        root.clear()
        parsedNodes.forEach((node) => root.append(node))
      })
      return true
    } catch (err) {
      console.warn('Failed to apply nodes to Lexical editor:', err)
      return false
    }
  }

  const handleSubmit = async () => {
    try {
      if (!editorRef.current) return
      const serializedEditorState = editorRef.current.toJSON()
      const nodes = serializedEditorState.editorState.root.children
      if (nodes.length === 0) {
        new Notice(
          isZh
            ? '请输入模板内容'
            : 'Please enter content for your template',
        )
        return
      }
      if (templateName.trim().length === 0) {
        new Notice(
          isZh
            ? '请输入模板名称'
            : 'Please enter a name for your template',
        )
        return
      }

      if (templateId === undefined) {
        await templateManager.createTemplate({
          name: templateName,
          content: { nodes },
        })
      } else {
        await templateManager.updateTemplate(templateId, {
          name: templateName,
          content: { nodes },
        })
      }

      new Notice(
        isZh
          ? `模板已${templateId === undefined ? '创建' : '更新'}: ${templateName}`
          : `Template ${templateId === undefined ? 'created' : 'updated'}: ${templateName}`,
      )

      onSubmit?.()
      onClose()
    } catch (error) {
      if (error instanceof DuplicateTemplateException) {
        new Notice(
          isZh
            ? '已存在同名的模板'
            : 'A template with this name already exists',
        )
      } else {
        console.error(error)
        new Notice(
          isZh
            ? '保存模板失败，请重试'
            : 'Failed to save template',
        )
      }
    }
  }

  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true

    async function fetchExistingTemplate(id: string) {
      try {
        const existingTemplate = await templateManager.findById(id)
        if (existingTemplate && isMountedRef.current) {
          setTemplateName(existingTemplate.name)
          existingNodesRef.current = existingTemplate.content.nodes

          // Try immediate update
          const applied = applyNodesToEditor(existingTemplate.content.nodes)
          if (!applied) {
            // If editor wasn't ready yet, poll every 50ms up to 15 times (750ms)
            let attempts = 0
            const interval = window.setInterval(() => {
              if (!isMountedRef.current || attempts++ > 15) {
                window.clearInterval(interval)
                return
              }
              if (existingNodesRef.current && applyNodesToEditor(existingNodesRef.current)) {
                window.clearInterval(interval)
              }
            }, 50)
          }
        }
      } catch (error) {
        console.error('Failed to fetch existing template:', error)
        new Notice(
          isZh
            ? '加载模板失败，请重试。'
            : 'Failed to load template. Please try again.',
        )
      }
    }

    if (templateId) {
      void fetchExistingTemplate(templateId)
    }

    return () => {
      isMountedRef.current = false
    }
  }, [templateId, templateManager, isZh])

  return (
    <>
      <ObsidianSetting
        name={isZh ? '模板名称' : 'Name'}
        desc={isZh ? '该提示词模板的显示名称' : 'The name of the template'}
        required
      >
        <ObsidianTextInput
          value={templateName}
          onChange={(value) => setTemplateName(value)}
        />
      </ObsidianSetting>

      <ObsidianSetting
        name={isZh ? '模板内容' : 'Template Content'}
        desc={isZh ? '模板主体文本，支持在对话框中一键填充' : 'Content of the template'}
        className="aide-settings-description-preserve-whitespace"
        required
      />
      <div className="aide-chat-user-input-container">
        <LexicalContentEditable
          initialEditorState={initialEditorState}
          editorRef={editorRef}
          contentEditableRef={contentEditableRef}
          onEnter={handleSubmit}
        />
      </div>

      <ObsidianSetting>
        <ObsidianButton
          text={t('common.save')}
          onClick={handleSubmit}
          cta
        />
        <ObsidianButton
          text={t('common.cancel')}
          onClick={onClose}
        />
      </ObsidianSetting>
    </>
  )
}
