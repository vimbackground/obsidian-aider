import { App } from 'obsidian'
import React from 'react'

import AiderPlugin from '../../../main'
import { useI18n } from '../../../utils/i18n'

import { ChatModelsSubSection } from './models/ChatModelsSubSection'
import { EmbeddingModelsSubSection } from './models/EmbeddingModelsSubSection'
import { RerankModelsSubSection } from './models/RerankModelsSubSection'

type ModelsSectionProps = {
  app: App
  plugin: AiderPlugin
}

export function ModelsSection({ app, plugin }: ModelsSectionProps) {
  const { t } = useI18n()
  return (
    <div className="aide-settings-section">
      <div className="aide-settings-header">{t('settings.models')}</div>
      <ChatModelsSubSection app={app} plugin={plugin} />
      <EmbeddingModelsSubSection app={app} plugin={plugin} />
      <RerankModelsSubSection app={app} plugin={plugin} />
    </div>
  )
}
