import { App } from 'obsidian'

import { AppProvider } from '../../contexts/app-context'
import { SettingsProvider } from '../../contexts/settings-context'
import { Template } from '../../database/json/template/types'
import SmartComposerPlugin from '../../main'
import { smartComposerSettingsSchema } from '../../settings/schema/setting.types'
import { ReactModal } from '../common/ReactModal'
import { TemplateSection } from '../settings/sections/TemplateSection'

type TemplateSectionModalProps = {
  app: App
  onSelectTemplate?: (template: Template) => void
}

function TemplateSectionModalWrapper({
  app,
  onSelectTemplate,
}: TemplateSectionModalProps) {
  const appWithPlugins = app as unknown as {
    plugins?: {
      getPlugin?: (id: string) => SmartComposerPlugin | undefined
    }
  }
  const plugin = appWithPlugins.plugins?.getPlugin?.('aider')

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
          <TemplateSection app={app} onSelectTemplate={onSelectTemplate} />
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
        <TemplateSection app={app} onSelectTemplate={onSelectTemplate} />
      </SettingsProvider>
    </AppProvider>
  )
}

export class TemplateSectionModal extends ReactModal<TemplateSectionModalProps> {
  constructor(app: App, onSelectTemplate?: (template: Template) => void) {
    super({
      app: app,
      Component: TemplateSectionModalWrapper,
      props: {
        app,
        onSelectTemplate: onSelectTemplate
          ? (template) => {
              onSelectTemplate(template)
            }
          : undefined,
      },
    })
    this.modalEl.addClass('aide-modal-wide')
  }
}
