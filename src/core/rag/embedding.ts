import { SmartComposerSettings } from '../../settings/schema/setting.types'
import { EmbeddingModelClient } from '../../types/embedding'
import { getProviderClient } from '../llm/manager'

export const getEmbeddingModelClient = ({
  settings,
  embeddingModelId,
}: {
  settings: SmartComposerSettings
  embeddingModelId: string
}): EmbeddingModelClient | null => {
  if (!embeddingModelId || embeddingModelId.trim() === '') {
    return null
  }

  const embeddingModel = settings.embeddingModels.find(
    (model) => model.id === embeddingModelId,
  )
  if (!embeddingModel) {
    return null
  }

  const providerClient = getProviderClient({
    settings,
    providerId: embeddingModel.providerId,
  })

  return {
    id: embeddingModel.id,
    dimension: embeddingModel.dimension,
    getEmbedding: (text: string) =>
      providerClient.getEmbedding(embeddingModel.model, text, {
        dimensions: embeddingModel.outputDimension,
      }),
  }
}
