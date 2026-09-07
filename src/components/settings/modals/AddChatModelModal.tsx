import { App, Notice, requestUrl } from 'obsidian'
import { useState } from 'react'

import { DEFAULT_PROVIDERS, PROVIDER_TYPES_INFO } from '../../../constants'
import AiderPlugin from '../../../main'
import {
  ChatModel,
  chatModelSchema,
} from '../../../types/chat-model.types'
import { ObsidianButton } from '../../common/ObsidianButton'
import { ObsidianDropdown } from '../../common/ObsidianDropdown'
import { ObsidianSetting } from '../../common/ObsidianSetting'
import { ObsidianTextInput } from '../../common/ObsidianTextInput'
import { ReactModal } from '../../common/ReactModal'

type AddChatModelModalProps = {
  plugin: AiderPlugin
  onClose: () => void
}

export class AddChatModelModal extends ReactModal<AddChatModelModalProps> {
  constructor(app: App, plugin: AiderPlugin) {
    super({
      app: app,
      Component: AddChatModelComponent,
      props: { plugin },
      options: {
        title: '添加自定义对话模型',
      },
    })
  }
}

function AddChatModelComponent({ plugin, onClose }: AddChatModelModalProps) {
  const [formData, setFormData] = useState<ChatModel>({
    providerId: DEFAULT_PROVIDERS[0].id,
    providerType: DEFAULT_PROVIDERS[0].type,
    id: '',
    model: '',
  })
  const [availableModels, setAvailableModels] = useState<string[] | null>(null)
  const [isFetching, setIsFetching] = useState(false)

  const handleSubmit = async () => {
    if (!formData.model || formData.model.trim() === '') {
      new Notice('请先从下拉菜单中选择模型，或输入模型名称')
      return
    }

    if (!formData.id || formData.id.trim() === '') {
      formData.id = formData.model.trim()
    }

    if (plugin.settings.chatModels.some((m) => m.id === formData.id)) {
      new Notice('已存在相同 ID 的模型，请修改模型标识 (ID)')
      return
    }

    const validationResult = chatModelSchema.safeParse(formData)
    if (!validationResult.success) {
      new Notice(validationResult.error.issues.map((v) => v.message).join('\n'))
      return
    }

    await plugin.setSettings({
      ...plugin.settings,
      chatModels: [...plugin.settings.chatModels, formData],
    })

    new Notice(`已成功添加模型 "${formData.id}"`)
    onClose()
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
            setFormData(
              (prev) =>
                ({
                  ...prev,
                  providerId: value,
                  providerType: provider.type,
                  model: '',
                }) as ChatModel,
            )
          }}
        />
      </ObsidianSetting>

      <ObsidianSetting
        name="从服务商获取模型"
        desc="点击按钮连接当前服务商，拉取线上可用模型列表"
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
              new Notice('该服务商未配置 Base URL 或 API Key，请先在服务商设置中填写')
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
                // 注意：保持 formData.model 为空，让用户自主在下拉菜单中点击选择，不自动填充
                new Notice(
                  `已成功获取到 ${String(models.length)} 个模型，请在下方下拉菜单中选择`,
                )
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

      <ObsidianSetting 
        name="模型名称 (Model)" 
        desc={availableModels ? "请在下拉列表中鼠标点击选择一个模型" : "可直接手动输入，或点击上方按钮拉取在线模型"}
        required
      >
        {availableModels && availableModels.length > 0 ? (
          <ObsidianDropdown
            value={formData.model}
            options={{
              '': '-- 请用鼠标选择一个模型 (Click to select) --',
              ...Object.fromEntries(availableModels.map((m) => [m, m])),
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
            placeholder="输入模型名称（如 deepseek-chat 或 gpt-4o）"
            onChange={(value: string) =>
              setFormData((prev) => ({ ...prev, model: value }))
            }
          />
        )}
      </ObsidianSetting>

      <ObsidianSetting
        name="模型标识 (ID)"
        desc="在插件界面中显示的名称（默认与模型名称一致，可自定义）。"
        required
      >
        <ObsidianTextInput
          value={formData.id}
          placeholder="例如 deepseek-chat"
          onChange={(value: string) =>
            setFormData((prev) => ({ ...prev, id: value }))
          }
        />
      </ObsidianSetting>

      <ObsidianSetting>
        <ObsidianButton text="添加模型 (Add)" onClick={handleSubmit} cta />
        <ObsidianButton text="取消 (Cancel)" onClick={onClose} />
      </ObsidianSetting>
    </>
  )
}
