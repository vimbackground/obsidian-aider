import { App, Notice, requestUrl } from 'obsidian'
import { useState } from 'react'

import { PROVIDER_TYPES_INFO } from '../../../constants'
import SmartComposerPlugin from '../../../main'
import {
  RerankModel,
  rerankModelSchema,
} from '../../../settings/schema/setting.types'
import { ObsidianButton } from '../../common/ObsidianButton'
import { ObsidianDropdown } from '../../common/ObsidianDropdown'
import { ObsidianSetting } from '../../common/ObsidianSetting'
import { ObsidianTextInput } from '../../common/ObsidianTextInput'
import { ObsidianToggle } from '../../common/ObsidianToggle'
import { ReactModal } from '../../common/ReactModal'

type EditRerankModelModalProps = {
  plugin: SmartComposerPlugin
  rerankModel: RerankModel
  onClose: () => void
}

export class EditRerankModelModal extends ReactModal<EditRerankModelModalProps> {
  constructor(
    app: App,
    plugin: SmartComposerPlugin,
    rerankModel: RerankModel,
  ) {
    super({
      app: app,
      Component: EditRerankModelComponent,
      props: { plugin, rerankModel },
      options: {
        title: `编辑/更换重排序模型: ${rerankModel.id}`,
      },
    })
  }
}

function isRerankModel(id: string): boolean {
  const lower = id.toLowerCase()
  const keywords = [
    'rerank',
    'reranker',
    'bge-rerank',
    'bce-rerank',
    'cohere-rerank',
  ]
  return keywords.some((k) => lower.includes(k))
}

function EditRerankModelComponent({
  plugin,
  rerankModel,
  onClose,
}: EditRerankModelModalProps) {
  const [formData, setFormData] = useState<RerankModel>({
    ...rerankModel,
  })
  const [availableModels, setAvailableModels] = useState<string[] | null>(null)
  const [showAllModels, setShowAllModels] = useState<boolean>(false)
  const [isFetching, setIsFetching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!formData.model || formData.model.trim() === '') {
      new Notice('请先从下拉菜单中选择 Rerank 模型，或输入模型名称')
      return
    }

    if (!formData.id || formData.id.trim() === '') {
      formData.id = formData.model.trim()
    }

    const currentList = plugin.settings.rerankModels || []
    if (
      formData.id !== rerankModel.id &&
      currentList.some((m) => m.id === formData.id)
    ) {
      new Notice('已存在相同 ID 的 Rerank 模型，请修改模型标识 (ID)')
      return
    }

    setIsSubmitting(true)
    try {
      const validationResult = rerankModelSchema.safeParse(formData)
      if (!validationResult.success) {
        throw new Error(
          validationResult.error.issues.map((v) => v.message).join('\n'),
        )
      }

      const oldId = rerankModel.id
      const newId = formData.id

      const updatedList = currentList.map((m) =>
        m.id === oldId ? formData : m,
      )

      await plugin.setSettings({
        ...plugin.settings,
        rerankModels: updatedList,
        ragOptions: {
          ...plugin.settings.ragOptions,
          rerank: {
            ...plugin.settings.ragOptions.rerank,
            modelId:
              plugin.settings.ragOptions.rerank?.modelId === oldId
                ? newId
                : plugin.settings.ragOptions.rerank?.modelId ?? newId,
            providerId:
              plugin.settings.ragOptions.rerank?.modelId === oldId
                ? formData.providerId
                : plugin.settings.ragOptions.rerank?.providerId,
            model:
              plugin.settings.ragOptions.rerank?.modelId === oldId
                ? formData.model
                : plugin.settings.ragOptions.rerank?.model,
          },
        },
      })

      new Notice(`已成功更新重排序模型 "${newId}"`)
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
                const detected = models.filter(isRerankModel)
                if (detected.length > 0) {
                  setShowAllModels(false)
                  new Notice(
                    `已自动识别并筛选出 ${String(detected.length)} 个可用 Rerank 重排模型（服务商共有 ${String(models.length)} 个模型）`,
                  )
                } else {
                  setShowAllModels(true)
                  new Notice(
                    `未自动匹配到 Rerank 模型命名特征，已展示全部 ${String(models.length)} 个模型供选择`,
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

      {availableModels && availableModels.length > 0 && availableModels.some(isRerankModel) && (
        <ObsidianSetting
          name="只显示识别出的 Rerank 模型"
          desc={`已智能筛选出 ${availableModels.filter(isRerankModel).length} 个重排模型。如需查看服务商所有 ${availableModels.length} 个模型，可关闭此开关。`}
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
              '': '-- 请用鼠标选择一个 Rerank 模型 (Click to select) --',
              ...Object.fromEntries(
                (showAllModels
                  ? availableModels
                  : availableModels.filter(isRerankModel).length > 0
                    ? availableModels.filter(isRerankModel)
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
            placeholder="输入 Rerank 模型名称（如 BAAI/bge-reranker-v2-m3）"
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
          placeholder="例如 BAAI/bge-reranker-v2-m3"
          onChange={(value: string) =>
            setFormData((prev) => ({ ...prev, id: value }))
          }
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
          text={isSubmitting ? '正在保存...' : '保存修改'}
          onClick={() => {
            void handleSubmit()
          }}
          disabled={isSubmitting}
        />
      </div>
    </>
  )
}