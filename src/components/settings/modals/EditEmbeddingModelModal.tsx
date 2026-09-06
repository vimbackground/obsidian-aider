import { App, Notice, requestUrl } from 'obsidian'
import { useState } from 'react'

import { PROVIDER_TYPES_INFO } from '../../../constants'
import { getProviderClient } from '../../../core/llm/manager'
import SmartComposerPlugin from '../../../main'
import {
  EmbeddingModel,
  embeddingModelSchema,
} from '../../../types/embedding-model.types'
import { ObsidianButton } from '../../common/ObsidianButton'
import { ObsidianDropdown } from '../../common/ObsidianDropdown'
import { ObsidianSetting } from '../../common/ObsidianSetting'
import { ObsidianTextInput } from '../../common/ObsidianTextInput'
import { ObsidianToggle } from '../../common/ObsidianToggle'
import { ReactModal } from '../../common/ReactModal'

type EditEmbeddingModelModalProps = {
  plugin: SmartComposerPlugin
  embeddingModel: EmbeddingModel
  onClose: () => void
}

export class EditEmbeddingModelModal extends ReactModal<EditEmbeddingModelModalProps> {
  constructor(
    app: App,
    plugin: SmartComposerPlugin,
    embeddingModel: EmbeddingModel,
  ) {
    super({
      app: app,
      Component: EditEmbeddingModelComponent,
      props: { plugin, embeddingModel },
      options: {
        title: `编辑/更换嵌入模型: ${embeddingModel.id}`,
      },
    })
  }
}

function isEmbeddingModel(id: string): boolean {
  const lower = id.toLowerCase()
  const keywords = [
    'embed',
    'embedding',
    'bge-',
    'bge_',
    'gte-',
    'gte_',
    'e5-',
    'e5_',
    'text-embedding',
    'voyage',
    'jina-embeddings',
    'multilingual-e5',
    'sentence-transformers',
  ]
  return keywords.some((k) => lower.includes(k))
}

function EditEmbeddingModelComponent({
  plugin,
  embeddingModel,
  onClose,
}: EditEmbeddingModelModalProps) {
  const [formData, setFormData] = useState<EmbeddingModel>({
    ...embeddingModel,
  })
  const [outputDimensionInput, setOutputDimensionInput] = useState<string>(
    formData.outputDimension ? String(formData.outputDimension) : '',
  )
  const [availableModels, setAvailableModels] = useState<string[] | null>(null)
  const [showAllModels, setShowAllModels] = useState<boolean>(false)
  const [isFetching, setIsFetching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!formData.model || formData.model.trim() === '') {
      new Notice('请先从下拉菜单中选择嵌入模型，或输入模型名称')
      return
    }

    if (!formData.id || formData.id.trim() === '') {
      formData.id = formData.model.trim()
    }

    if (
      formData.id !== embeddingModel.id &&
      plugin.settings.embeddingModels.some((m) => m.id === formData.id)
    ) {
      new Notice('已存在相同 ID 的嵌入模型，请修改模型标识 (ID)')
      return
    }

    setIsSubmitting(true)
    new Notice('正在测试并连接嵌入模型以验证向量维度...')

    try {
      if (
        !plugin.settings.providers.some(
          (provider) => provider.id === formData.providerId,
        )
      ) {
        throw new Error('未找到该服务商配置')
      }

      const providerClient = getProviderClient({
        settings: plugin.settings,
        providerId: formData.providerId,
      })

      const embeddingResult = await providerClient.getEmbedding(
        formData.model,
        'test',
        { dimensions: formData.outputDimension },
      )

      if (!Array.isArray(embeddingResult) || embeddingResult.length === 0) {
        throw new Error('嵌入模型测试调用未返回有效向量数据')
      }

      const dimension = embeddingResult.length

      if (
        formData.outputDimension !== undefined &&
        dimension !== formData.outputDimension
      ) {
        throw new Error(
          `期望输出维度 ${formData.outputDimension}，但模型返回了 ${dimension} 维。` +
            `该模型可能不支持自定义维度。请将“输出维度”留空以使用模型默认维度。`,
        )
      }

      const updatedModel: EmbeddingModel = {
        ...formData,
        dimension,
      }

      const validationResult = embeddingModelSchema.safeParse(updatedModel)
      if (!validationResult.success) {
        throw new Error(
          validationResult.error.issues.map((v) => v.message).join('\n'),
        )
      }

      const oldId = embeddingModel.id
      const newId = updatedModel.id

      const updatedList = plugin.settings.embeddingModels.map((m) =>
        m.id === oldId ? updatedModel : m,
      )

      await plugin.setSettings({
        ...plugin.settings,
        embeddingModels: updatedList,
        embeddingModelId:
          plugin.settings.embeddingModelId === oldId
            ? newId
            : plugin.settings.embeddingModelId,
      })

      new Notice(`已成功更新嵌入模型 "${newId}"`)
      onClose()
    } catch (error) {
      console.error(error)
      new Notice(
        `更新失败: ${error instanceof Error ? error.message : '未知错误'}`,
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <ObsidianSetting name="所属服务商 (Provider)" required>
        <ObsidianDropdown
          value={formData.providerId}
          options={Object.fromEntries(
            plugin.settings.providers.map((provider) => [
              provider.id,
              `${provider.id} (${PROVIDER_TYPES_INFO[provider.type]?.label ?? provider.type})`,
            ]),
          )}
          onChange={(value: string) => {
            const provider = plugin.settings.providers.find(
              (p) => p.id === value,
            )
            if (!provider) {
              new Notice(`未找到 ID 为 ${value} 的服务商`)
              return
            }
            setAvailableModels(null)
            setFormData((prev) => ({
              ...prev,
              providerId: value,
              providerType: provider.type,
              model: '',
            }))
          }}
        />
      </ObsidianSetting>

      <ObsidianSetting
        name="从服务商获取模型"
        desc="点击按钮连接当前服务商，重新拉取线上可用模型列表"
      >
        <ObsidianButton
          text={isFetching ? '正在拉取...' : '拉取在线可用模型 (Fetch)'}
          disabled={isFetching}
          onClick={async () => {
            const provider = plugin.settings.providers.find(
              (p) => p.id === formData.providerId,
            )
            if (!provider) return
            let baseUrl = provider.baseUrl
            if (!baseUrl) {
              if (provider.type === 'openai') baseUrl = 'https://api.openai.com/v1'
              else if (provider.type === 'deepseek')
                baseUrl = 'https://api.deepseek.com/v1'
              else if (provider.type === 'siliconflow')
                baseUrl = 'https://api.siliconflow.cn/v1'
              else if (provider.type === 'openrouter')
                baseUrl = 'https://openrouter.ai/api/v1'
              else if (provider.type === 'groq')
                baseUrl = 'https://api.groq.com/openai/v1'
              else if (provider.type === 'modelscope')
                baseUrl = 'https://api-inference.modelscope.cn/v1'
            }
            if (!baseUrl || !provider.apiKey) {
              new Notice('服务商缺少 Base URL 或 API Key，请先在服务商设置中填写')
              return
            }
            setIsFetching(true)
            try {
              new Notice('正在从服务商拉取可用模型列表...')
              const res = await requestUrl({
                url: `${baseUrl.replace(/\/+$/, '')}/models`,
                method: 'GET',
                headers: { Authorization: `Bearer ${provider.apiKey}` },
              })
              const data = res.json as { data?: Array<{ id?: string }> } | undefined
              if (data && Array.isArray(data.data)) {
                const models = data.data
                  .map((m) => m.id)
                  .filter((id): id is string => Boolean(id))
                setAvailableModels(models)
                const detected = models.filter(isEmbeddingModel)
                if (detected.length > 0) {
                  setShowAllModels(false)
                  new Notice(
                    `已自动识别并筛选出 ${String(detected.length)} 个可用嵌入模型（服务商共有 ${String(models.length)} 个模型）`,
                  )
                } else {
                  setShowAllModels(true)
                  new Notice(
                    `未自动匹配到嵌入模型命名特征，已展示全部 ${String(models.length)} 个模型供选择`,
                  )
                }
              } else {
                new Notice('未在返回数据中解析到可用模型列表')
              }
            } catch (e: unknown) {
              const errMsg = e instanceof Error ? e.message : '网络请求错误'
              new Notice(`拉取模型失败：${errMsg}`)
              console.error(e)
            } finally {
              setIsFetching(false)
            }
          }}
        />
      </ObsidianSetting>

      {availableModels && availableModels.length > 0 && availableModels.some(isEmbeddingModel) && (
        <ObsidianSetting
          name="只显示识别出的嵌入模型"
          desc={`已智能筛选出 ${availableModels.filter(isEmbeddingModel).length} 个嵌入模型。如需查看服务商所有 ${availableModels.length} 个模型，可关闭此开关。`}
        >
          <ObsidianToggle
            value={!showAllModels}
            onChange={(val: boolean) => setShowAllModels(!val)}
          />
        </ObsidianSetting>
      )}

      <ObsidianSetting 
        name="模型名称 (Model)" 
        desc={availableModels ? '请在下拉列表中鼠标点击选择一个模型' : '可直接手动输入，或点击上方按钮拉取在线模型'}
        required
      >
        {availableModels && availableModels.length > 0 ? (
          <ObsidianDropdown
            value={formData.model}
            options={{
              '': '-- 请用鼠标选择一个嵌入模型 (Click to select) --',
              ...Object.fromEntries(
                (showAllModels
                  ? availableModels
                  : availableModels.filter(isEmbeddingModel).length > 0
                    ? availableModels.filter(isEmbeddingModel)
                    : availableModels
                ).map((m) => [m, m]),
              ),
            }}
            onChange={(value: string) =>
              setFormData((prev) => ({
                ...prev,
                model: value,
                id: prev.id && prev.id !== prev.model ? prev.id : value,
              }))
            }
          />
        ) : (
          <ObsidianTextInput
            value={formData.model}
            placeholder="输入嵌入模型名称（如 text-embedding-3-small 或 BAAI/bge-m3）"
            onChange={(value: string) =>
              setFormData((prev) => ({
                ...prev,
                model: value,
                id: prev.id && prev.id !== prev.model ? prev.id : value,
              }))
            }
          />
        )}
      </ObsidianSetting>

      <ObsidianSetting
        name="模型标识 (ID)"
        desc="插件内部唯一标识符（默认自动与模型名称一致）"
        required
      >
        <ObsidianTextInput
          value={formData.id}
          placeholder="例如 bge-m3 或 text-embedding-3-small"
          onChange={(value: string) =>
            setFormData((prev) => ({ ...prev, id: value }))
          }
        />
      </ObsidianSetting>

      <ObsidianSetting
        name="自定义输出维度 (可选)"
        desc="仅适用于支持 MRL 维度裁剪的模型（如 OpenAI text-embedding-3 或 Gemini embedding）。留空则自动检测模型默认维度。"
      >
        <ObsidianTextInput
          value={outputDimensionInput}
          placeholder="留空以使用模型默认维度 (例如 512, 1024, 1536)"
          onChange={(value: string) => {
            setOutputDimensionInput(value)
            const trimmed = value.trim()
            if (trimmed === '') {
              setFormData((prev) => ({ ...prev, outputDimension: undefined }))
            } else {
              const num = parseInt(trimmed, 10)
              if (!isNaN(num) && num > 0) {
                setFormData((prev) => ({ ...prev, outputDimension: num }))
              }
            }
          }}
        />
      </ObsidianSetting>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          marginTop: '20px',
        }}
      >
        <ObsidianButton text="取消" onClick={onClose} disabled={isSubmitting} />
        <ObsidianButton
          text={isSubmitting ? '正在验证并保存...' : '保存修改'}
          onClick={() => {
            void handleSubmit()
          }}
          disabled={isSubmitting}
        />
      </div>
    </>
  )
}