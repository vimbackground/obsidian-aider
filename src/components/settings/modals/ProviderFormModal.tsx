import { App, Notice, requestUrl } from 'obsidian'
import { useState } from 'react'

import { PLAN_PROVIDER_TYPES, PROVIDER_TYPES_INFO } from '../../../constants'
import AiderPlugin from '../../../main'
import {
  LLMProvider,
  LLMProviderType,
  llmProviderSchema,
} from '../../../types/provider.types'
import { ObsidianButton } from '../../common/ObsidianButton'
import { ObsidianDropdown } from '../../common/ObsidianDropdown'
import { ObsidianSetting } from '../../common/ObsidianSetting'
import { ObsidianTextInput } from '../../common/ObsidianTextInput'
import { ObsidianToggle } from '../../common/ObsidianToggle'
import { ReactModal } from '../../common/ReactModal'

type ProviderFormComponentProps = {
  plugin: AiderPlugin
  provider: LLMProvider | null // null for new provider
  onClose: () => void
}

export class AddProviderModal extends ReactModal<ProviderFormComponentProps> {
  constructor(app: App, plugin: AiderPlugin) {
    const isZh = plugin.settings.language === 'zh'
    super({
      app: app,
      Component: ProviderFormComponent,
      props: { plugin, provider: null },
      options: {
        title: isZh ? '添加自定义服务商' : 'Add Custom Provider',
      },
    })
  }
}

export class EditProviderModal extends ReactModal<ProviderFormComponentProps> {
  constructor(app: App, plugin: AiderPlugin, provider: LLMProvider) {
    const isZh = plugin.settings.language === 'zh'
    super({
      app: app,
      Component: ProviderFormComponent,
      props: { plugin, provider },
      options: {
        title: isZh ? `编辑服务商: ${provider.id}` : `Edit Provider: ${provider.id}`,
      },
    })
  }
}

function getApiKeyUrl(type: string, id: string): string | null {
  const lowerType = (type || '').toLowerCase()
  const lowerId = (id || '').toLowerCase()

  // 1. SiliconFlow 特例专属网址
  if (lowerType === 'siliconflow' || lowerId.includes('silicon')) {
    return 'https://cloud.siliconflow.cn/i/8wyT87da'
  }
  // 2. 其它主流服务商后台网址
  if (lowerType === 'groq' || lowerId.includes('groq')) {
    return 'https://console.groq.com/keys'
  }
  if (lowerType === 'deepseek' || lowerId.includes('deepseek')) {
    return 'https://platform.deepseek.com/api_keys'
  }
  if (lowerType === 'openrouter' || lowerId.includes('openrouter')) {
    return 'https://openrouter.ai/keys'
  }
  if (lowerType === 'openai' || lowerId.includes('openai')) {
    return 'https://platform.openai.com/api-keys'
  }
  if (lowerType === 'gemini' || lowerId.includes('gemini') || lowerId.includes('google')) {
    return 'https://aistudio.google.com/app/apikey'
  }
  if (lowerType === 'anthropic' || lowerId.includes('anthropic') || lowerId.includes('claude')) {
    return 'https://console.anthropic.com/settings/keys'
  }
  if (lowerType === 'mistral' || lowerId.includes('mistral')) {
    return 'https://console.mistral.ai/api-keys/'
  }
  if (lowerType === 'modelscope' || lowerId.includes('modelscope')) {
    return 'https://modelscope.cn/my/myaccesstoken'
  }
  return null
}

function ProviderFormComponent({
  plugin,
  provider,
  onClose,
}: ProviderFormComponentProps) {
  const [formData, setFormData] = useState<LLMProvider>(
    provider
      ? { ...provider }
      : {
          type: 'openai-compatible',
          id: '',
          apiKey: '',
          baseUrl: '',
        },
  )
  const [isTesting, setIsTesting] = useState(false)

  const handleTestKey = async () => {
    const isZh = plugin.settings.language === 'zh'
    try {
      setIsTesting(true)
      new Notice(
        isZh
          ? '正在测试连接有效性，请稍候...'
          : 'Testing connection validity, please wait...',
      )

      let baseUrl = formData.baseUrl
      if (!baseUrl) {
        if (formData.type === 'openai') baseUrl = 'https://api.openai.com/v1'
        else if (formData.type === 'deepseek')
          baseUrl = 'https://api.deepseek.com/v1'
        else if (formData.type === 'siliconflow')
          baseUrl = 'https://api.siliconflow.cn/v1'
        else if (formData.type === 'openrouter')
          baseUrl = 'https://openrouter.ai/api/v1'
        else if (formData.type === 'groq')
          baseUrl = 'https://api.groq.com/openai/v1'
        else if (formData.type === 'modelscope')
          baseUrl = 'https://api-inference.modelscope.cn/v1'
        else if (formData.type === 'gemini')
          baseUrl = 'https://generativelanguage.googleapis.com/v1beta'
      }

      if (formData.type === 'gemini') {
        const testUrl = `${baseUrl}/models?key=${encodeURIComponent(formData.apiKey || '')}`
        const res = await requestUrl({
          url: testUrl,
          method: 'GET',
        })
        if (res.status === 200) {
          new Notice(
            isZh
              ? '✅ 测试成功！API Key 有效且服务商响应正常。'
              : '✅ Test succeeded! API key is valid and provider responded normally.',
          )
        } else {
          new Notice(
            isZh
              ? `❌ 测试失败：状态码 ${String(res.status)}`
              : `❌ Test failed: Status code ${String(res.status)}`,
          )
        }
      } else {
        if (!baseUrl) {
          new Notice(
            isZh
              ? '❌ 测试失败：未指定 Base URL，无法测试'
              : '❌ Test failed: Base URL is required to test connectivity',
          )
          return
        }

        const normalizedBaseUrl = baseUrl.replace(/\/+$/, '')
        const testUrl = `${normalizedBaseUrl}/models`

        const headers: Record<string, string> = {}
        if (formData.apiKey) {
          headers['Authorization'] = `Bearer ${formData.apiKey}`
        }

        const res = await requestUrl({
          url: testUrl,
          method: 'GET',
          headers,
        })

        if (res.status === 200) {
          new Notice(
            isZh
              ? '✅ 测试成功！API Key 有效且服务商响应正常。'
              : '✅ Test succeeded! API key is valid and provider responded normally.',
          )
        } else {
          new Notice(
            isZh
              ? `❌ 测试失败：状态码 ${String(res.status)}`
              : `❌ Test failed: Status code ${String(res.status)}`,
          )
        }
      }
    } catch (error: unknown) {
      console.error('API key test error:', error)
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes('401') || msg.includes('Unauthorized')) {
        new Notice(
          isZh
            ? '❌ 测试失败：API Key 无效或未授权 (401 Unauthorized)'
            : '❌ Test failed: API Key is invalid or unauthorized (401 Unauthorized)',
        )
      } else if (msg.includes('403') || msg.includes('Forbidden')) {
        new Notice(
          isZh
            ? '❌ 测试失败：访问被拒绝 (403 Forbidden)'
            : '❌ Test failed: Access forbidden (403 Forbidden)',
        )
      } else if (msg.includes('404')) {
        new Notice(
          isZh
            ? '❌ 测试失败：接口路径不存在 (404 Not Found)，请检查 Base URL'
            : '❌ Test failed: Endpoint not found (404 Not Found), please check Base URL',
        )
      } else {
        new Notice(
          isZh
            ? `❌ 测试失败：网络连接错误或端点不可达 (${msg})`
            : `❌ Test failed: Network error or endpoint unreachable (${msg})`,
        )
      }
    } finally {
      setIsTesting(false)
    }
  }

  const handleSubmit = async () => {
    const isZh = plugin.settings.language === 'zh'
    if (provider) {
      const newProviders = [...plugin.settings.providers]
      const currentProviderIndex = newProviders.findIndex(
        (v) => v.id === formData.id,
      )

      if (currentProviderIndex === -1) {
        new Notice(
          isZh ? `未找到此 ID 的服务商` : `Provider not found for this ID`,
        )
        return
      }

      const validationResult = llmProviderSchema.safeParse(formData)
      if (!validationResult.success) {
        new Notice(
          validationResult.error.issues.map((v) => v.message).join('\n'),
        )
        return
      }

      await plugin.setSettings({
        ...plugin.settings,
        providers: [
          ...plugin.settings.providers.slice(0, currentProviderIndex),
          formData,
          ...plugin.settings.providers.slice(currentProviderIndex + 1),
        ],
      })
    } else {
      if (
        plugin.settings.providers.some((p: LLMProvider) => p.id === formData.id)
      ) {
        new Notice(
          isZh
            ? '已存在相同 ID 的服务商，请更换一个 ID'
            : 'A provider with this ID already exists, please choose another ID',
        )
        return
      }

      const validationResult = llmProviderSchema.safeParse(formData)
      if (!validationResult.success) {
        new Notice(
          validationResult.error.issues.map((v) => v.message).join('\n'),
        )
        return
      }

      await plugin.setSettings({
        ...plugin.settings,
        providers: [...plugin.settings.providers, formData],
      })
    }

    onClose()
  }

  const providerTypeInfo = PROVIDER_TYPES_INFO[formData.type]
  const isZh = plugin.settings.language === 'zh'

  return (
    <>
      {!provider && (
        <>
          <ObsidianSetting
            name={isZh ? '服务商标识' : 'Provider ID'}
            desc={
              isZh
                ? '用于在设置中标识该服务商的唯一代号（仅供插件内部引用）。'
                : 'Unique identifier for internal reference in settings.'
            }
            required
          >
            <ObsidianTextInput
              value={formData.id}
              placeholder={isZh ? '例如 my-custom-provider' : 'e.g. my-custom-provider'}
              onChange={(value: string) =>
                setFormData((prev) => ({ ...prev, id: value }))
              }
            />
          </ObsidianSetting>

          <ObsidianSetting
            name={isZh ? '服务商类型' : 'Provider Type'}
            required
          >
            <ObsidianDropdown
              value={formData.type}
              options={Object.fromEntries(
                Object.entries(PROVIDER_TYPES_INFO)
                  .filter(
                    ([key]) =>
                      !PLAN_PROVIDER_TYPES.includes(key as LLMProviderType),
                  )
                  .map(([key, info]) => [key, isZh ? info.labelZh : info.label]),
              )}
              onChange={(value: string) =>
                setFormData(
                  (prev) =>
                    ({
                      ...prev,
                      type: value,
                      additionalSettings: {},
                    }) as LLMProvider,
                )
              }
            />
          </ObsidianSetting>
        </>
      )}

      {!PLAN_PROVIDER_TYPES.includes(formData.type) && (
        <>
          <ObsidianSetting
            name={plugin.settings.language === 'en' ? 'API Key' : 'API 密钥'}
            desc={
              getApiKeyUrl(formData.type, formData.id)
                ? plugin.settings.language === 'en'
                  ? 'Enter API key provided by your service provider, or click the button to apply online.'
                  : '输入服务商提供的密钥。若尚未获取，可点击右侧按钮前往服务商后台申请。'
                : plugin.settings.language === 'en'
                  ? 'Enter API key provided by your service provider.'
                  : '输入服务商提供的密钥。'
            }
            required={providerTypeInfo.requireApiKey}
          >
            <ObsidianTextInput
              value={formData.apiKey ?? ''}
              placeholder={plugin.settings.language === 'en' ? 'Enter your API key' : '输入你的 API 密钥'}
              onChange={(value: string) =>
                setFormData((prev) => ({ ...prev, apiKey: value }))
              }
            />
            {getApiKeyUrl(formData.type, formData.id) && (
              <ObsidianButton
                text={plugin.settings.language === 'en' ? 'Get API Key' : '获取 API 密钥'}
                onClick={() => {
                  const url = getApiKeyUrl(formData.type, formData.id)
                  if (url) window.open(url, '_blank')
                }}
              />
            )}
          </ObsidianSetting>

          <ObsidianSetting
            name={plugin.settings.language === 'en' ? 'Base URL' : '接口基地址'}
            desc={
              plugin.settings.language === 'en'
                ? 'Leave empty for official default; fill in proxy or compatible /v1 endpoint.'
                : '若使用官方默认地址可留空；反代或兼容服务商请填写对应 /v1 地址。'
            }
            required={providerTypeInfo.requireBaseUrl}
          >
            <ObsidianTextInput
              value={formData.baseUrl ?? ''}
              placeholder="https://api.openai.com/v1"
              onChange={(value: string) =>
                setFormData((prev) => ({ ...prev, baseUrl: value }))
              }
            />
          </ObsidianSetting>

          <ObsidianSetting
            name={plugin.settings.language === 'en' ? 'Test Connectivity' : '连通性测试'}
            desc={
              plugin.settings.language === 'en'
                ? 'Test if the API key and Base URL can successfully connect to the service.'
                : '测试当前填写的密钥与接口地址是否能正常连通服务商。'
            }
          >
            <ObsidianButton
              text={
                isTesting
                  ? plugin.settings.language === 'en' ? 'Testing...' : '正在测试中...'
                  : plugin.settings.language === 'en' ? 'Test Connection' : '测试连接有效性'
              }
              disabled={isTesting}
              onClick={handleTestKey}
            />
          </ObsidianSetting>
        </>
      )}

      {providerTypeInfo.additionalSettings.map((setting) => (
        <ObsidianSetting
          key={setting.key}
          name={isZh && setting.labelZh ? setting.labelZh : setting.label}
          desc={
            isZh && 'descriptionZh' in setting && setting.descriptionZh
              ? setting.descriptionZh
              : 'description' in setting
                ? setting.description
                : undefined
          }
          required={setting.required}
        >
          {setting.type === 'toggle' ? (
            <ObsidianToggle
              value={
                (formData.additionalSettings as Record<string, boolean>)?.[
                  setting.key
                ] ?? false
              }
              onChange={(value: boolean) =>
                setFormData(
                  (prev) =>
                    ({
                      ...prev,
                      additionalSettings: {
                        ...(prev.additionalSettings ?? {}),
                        [setting.key]: value,
                      },
                    }) as LLMProvider,
                )
              }
            />
          ) : (
            <ObsidianTextInput
              value={
                (formData.additionalSettings as Record<string, string>)?.[
                  setting.key
                ] ?? ''
              }
              placeholder={
                isZh && setting.placeholderZh
                  ? setting.placeholderZh
                  : setting.placeholder
              }
              onChange={(value: string) =>
                setFormData(
                  (prev) =>
                    ({
                      ...prev,
                      additionalSettings: {
                        ...(prev.additionalSettings ?? {}),
                        [setting.key]: value,
                      },
                    }) as LLMProvider,
                )
              }
            />
          )}
        </ObsidianSetting>
      ))}

      <ObsidianSetting>
        <ObsidianButton
          text={
            provider
              ? isZh ? '保存' : 'Save'
              : isZh ? '添加' : 'Add'
          }
          onClick={handleSubmit}
          cta
        />
        <ObsidianButton
          text={isZh ? '取消' : 'Cancel'}
          onClick={onClose}
        />
      </ObsidianSetting>
    </>
  )
}
