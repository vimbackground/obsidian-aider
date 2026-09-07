import { App } from 'obsidian'

import { SettingsProvider } from '../../contexts/settings-context'
import AiderPlugin from '../../main'
import { ReactModal } from '../common/ReactModal'
import { McpSection } from '../settings/sections/McpSection'

type McpSectionComponentProps = {
  app: App
  plugin: AiderPlugin
}

export class McpSectionModal extends ReactModal<McpSectionComponentProps> {
  constructor(app: App, plugin: AiderPlugin) {
    super({
      app: app,
      Component: McpSectionComponent,
      props: {
        app,
        plugin,
      },
    })
    this.modalEl.addClass('aide-modal-wide')
  }
}

function McpSectionComponent({ app, plugin }: McpSectionComponentProps) {
  return (
    <SettingsProvider
      settings={plugin.settings}
      setSettings={(newSettings) => plugin.setSettings(newSettings)}
      addSettingsChangeListener={(listener) =>
        plugin.addSettingsChangeListener(listener)
      }
    >
      <McpSection app={app} plugin={plugin} />
    </SettingsProvider>
  )
}
