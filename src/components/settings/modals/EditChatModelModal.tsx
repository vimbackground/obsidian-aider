import { App, Notice, requestUrl } from 'obsidian'
import { useState } from 'react'

import { PROVIDER_TYPES_INFO } from '../../../constants'
import AiderPlugin from '../../../main'
import { ChatModel, chatModelSchema } from '../../../types/chat-model.types'
import { ObsidianButton } from '../../common/ObsidianButton'
import { ObsidianDropdown } from '../../common/ObsidianDropdown'
import { ObsidianSetting } from '../../common/ObsidianSetting'
import { ObsidianTextInput } from '../../common/ObsidianTextInput'
import { ReactModal } from '../../common/ReactModal'

type EditChatModelModalProps = {
  plugin: AiderPlugin
  chatModel: ChatModel
  onClose: () => void
}

export class EditChatModelModal extends ReactModal<EditChatModelModalProps> {
  constructor(app: App, plugin: AiderPlugin, chatModel: ChatModel) {
    super({
      app: app,
      Component: EditChatModelComponent,
      props: { plugin, chatModel },
      options: {
        title: `编辑/更换模型: ${chatModel.id}`,
      },
    })
  }
}

function EditChatModelComponent({
  plugin,
  chatModel,
  onClose,
}: EditChatModelModalProps) {
  const [formData, setFormData] = useState<ChatModel>({ ...chatModel })
  const [availableModels, setAvailableModels] = useState<string[] | null>(null)
  const [isFetching, setIsFetching] = useState(false)

  const handleSubmit = async () => {
    if (!formData.model || formData.model.trim() === '') {
      new Notice('模型名称不能为空，请选择或输入模型')
      return
    }

    if (!formData.id || formData.id.trim() === '') {
      formData.id = formData.model.trim()
    }

    // If ID changed, verify no duplicate
    if (
      formData.id !== chatModel.id &&
      plugin.settings.chatModels.some((m) => m.id === formData.id)
    ) {
      new Notice('已存在相同 ID 的模型，请更换模型标识')
      return
    }

    const validationResult = chatModelSchema.safeParse(formData)
    if (!validationResult.success) {
      new Notice(validationResult.error.issues.map((v) => v.message).join('\n'))
      return
    }

    const oldId = chatModel.id
    const newId = formData.id

    const newChatModels = plugin.settings.chatModels.map((m) =>
      m.id === oldId ? formData : m,
    )

    await plugin.setSettings({
      ...plugin.settings,
      chatModels: newChatModels,
      chatModelId:
        plugin.settings.chatModelId === oldId ? newId : plugin.settings.chatModelId,
      applyModelId:
        plugin.settings.applyModelId === oldId ? newId : plugin.settings.applyModelId,
    })

    new Notice(`已成功更新模型 "${newId}"`)
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
                }) as ChatModel,
            )
          }}
        />
      </ObsidianSetting>

      <ObsidianSetting
        name="从服务商获取模型"
        desc="重新从当前服务商拉取可用模型列表，以便更换"
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
        desc={availableModels ? "请在下拉列表中用鼠标选择更换的新模型" : "可直接手动修改模型名称，或点击上方拉取在线模型"}
        required
      >
        {availableModels && availableModels.length > 0 ? (
          <ObsidianDropdown
            value={formData.model}
            options={{
              '': '-- 请用鼠标选择一个模型 (Click to select) --',
              ...Object.fromEntries(availableModels.map((m) => [m, m])),
            }}
            onChange={(value: string) => {
              if (value) {
                setFormData((prev) => ({
                  ...prev,
                  model: value,
                  id: prev.id === prev.model ? value : prev.id,
                }))
              }
            }}
          />
        ) : (
          <ObsidianTextInput
            value={formData.model}
            placeholder="输入模型名称（如 deepseek-chat 或 Qwen/Qwen2.5-7B）"
            onChange={(value: string) =>
              setFormData((prev) => ({ ...prev, model: value }))
            }
          />
        )}
      </ObsidianSetting>

      <ObsidianSetting
        name="模型标识 (ID)"
        desc="在界面中显示的名称（默认与模型名称一致）。"
        required
      >
        <ObsidianTextInput
          value={formData.id}
          placeholder="例如 my-model-id"
          onChange={(value: string) =>
            setFormData((prev) => ({ ...prev, id: value }))
          }
        />
      </ObsidianSetting>

      <ObsidianSetting>
        <ObsidianButton text="保存修改 (Save)" onClick={handleSubmit} cta />
        <ObsidianButton text="取消 (Cancel)" onClick={onClose} />
      </ObsidianSetting>
    </>
  )
}
