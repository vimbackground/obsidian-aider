import { App, TFolder } from 'obsidian'
import { useState } from 'react'

import { RECOMMENDED_MODELS_FOR_EMBEDDING } from '../../../constants'
import { useSettings } from '../../../contexts/settings-context'
import SmartComposerPlugin from '../../../main'
import { findFilesMatchingPatterns } from '../../../utils/glob-utils'
import { useI18n } from '../../../utils/i18n'
import { ObsidianButton } from '../../common/ObsidianButton'
import { ObsidianDropdown } from '../../common/ObsidianDropdown'
import { ObsidianSetting } from '../../common/ObsidianSetting'
import { ObsidianTextArea } from '../../common/ObsidianTextArea'
import { ObsidianTextInput } from '../../common/ObsidianTextInput'
import { ObsidianToggle } from '../../common/ObsidianToggle'
import { EmbeddingDbManageModal } from '../modals/EmbeddingDbManageModal'
import { ExcludedFilesModal } from '../modals/ExcludedFilesModal'
import { IncludedFilesModal } from '../modals/IncludedFilesModal'

type RAGSectionProps = {
  app: App
  plugin: SmartComposerPlugin
}

export function RAGSection({ app, plugin }: RAGSectionProps) {
  const { settings, setSettings } = useSettings()
  const { t } = useI18n()

  const [selectedFolderToAdd, setSelectedFolderToAdd] = useState('')

  // 获取 Vault 中现存的所有文件夹列表（排除系统隐藏文件夹）
  const systemFolders = [app.vault.configDir, '.aider', '.aide', '.trash', '.git', '.smart-env']
  const allVaultFolders = app.vault
    .getAllLoadedFiles()
    .filter((f): f is TFolder => f instanceof TFolder && f.path !== '/')
    .map((f) => f.path)
    .filter(
      (p) =>
        !systemFolders.some((sys) => p === sys || p.startsWith(sys + '/')),
    )
    .sort((a, b) => a.localeCompare(b))

  // 生成具有直观层级缩进与树状符号的文件夹选项，避免人眼扁平化误读
  const folderDropdownOptions: Record<string, string> = {}
  for (const folderPath of allVaultFolders) {
    const parts = folderPath.split('/')
    const depth = parts.length - 1
    const folderName = parts[parts.length - 1]
    if (depth === 0) {
      folderDropdownOptions[folderPath] = `📁 ${folderName}`
    } else {
      const indent = '　'.repeat(depth) // 全角空格保证在下拉框中清晰对齐
      folderDropdownOptions[folderPath] = `${indent}└─ 📁 ${folderName}  (${folderPath})`
    }
  }

  const currentFilterMode = settings.ragOptions.filterMode ?? 'blacklist'

  const handleAddFolder = async (folderPath: string) => {
    if (!folderPath) return
    if (currentFilterMode === 'blacklist') {
      const currentList = settings.ragOptions.excludePatterns ?? []
      if (!currentList.includes(folderPath)) {
        await setSettings({
          ...settings,
          ragOptions: {
            ...settings.ragOptions,
            excludePatterns: [...currentList, folderPath],
          },
        })
      }
    } else {
      const currentList = settings.ragOptions.includePatterns ?? []
      if (!currentList.includes(folderPath)) {
        await setSettings({
          ...settings,
          ragOptions: {
            ...settings.ragOptions,
            includePatterns: [...currentList, folderPath],
          },
        })
      }
    }
    setSelectedFolderToAdd('')
  }

  const handleRemovePattern = async (patternToRemove: string) => {
    if (currentFilterMode === 'blacklist') {
      const updated = (settings.ragOptions.excludePatterns ?? []).filter(
        (p) => p !== patternToRemove,
      )
      await setSettings({
        ...settings,
        ragOptions: {
          ...settings.ragOptions,
          excludePatterns: updated,
        },
      })
    } else {
      const updated = (settings.ragOptions.includePatterns ?? []).filter(
        (p) => p !== patternToRemove,
      )
      await setSettings({
        ...settings,
        ragOptions: {
          ...settings.ragOptions,
          includePatterns: updated,
        },
      })
    }
  }

  return (
    <div className="aide-settings-section">
      <div className="aide-settings-header">{t('settings.rag')}</div>

      <ObsidianSetting
        name={t('settings.backgroundIndexing')}
        desc={t('settings.backgroundIndexingDesc')}
      >
        <ObsidianToggle
          value={settings.ragOptions.backgroundIndexing ?? false}
          onChange={async (value) => {
            await setSettings({
              ...settings,
              ragOptions: {
                ...settings.ragOptions,
                backgroundIndexing: value,
              },
            })
          }}
        />
      </ObsidianSetting>

      <ObsidianSetting
        name={t('settings.embeddingModel')}
        desc={t('settings.embeddingModelDesc')}
      >
        <ObsidianDropdown
          value={settings.embeddingModelId}
          options={Object.fromEntries(
            settings.embeddingModels.map((embeddingModel) => [
              embeddingModel.id,
              `${embeddingModel.id}${RECOMMENDED_MODELS_FOR_EMBEDDING.includes(embeddingModel.id) ? ' (Recommended)' : ''}`,
            ]),
          )}
          onChange={async (value) => {
            await setSettings({
              ...settings,
              embeddingModelId: value,
            })
          }}
        />
      </ObsidianSetting>

      {/* 目录过滤模式（黑名单 / 白名单 严格互斥） */}
      <ObsidianSetting
        name="目录过滤模式 (Filter Mode)"
        desc="选择过滤知识库目录的策略。黑名单与白名单模式互斥生效，杜绝扫描与索引冲突。"
      >
        <ObsidianDropdown
          value={currentFilterMode}
          options={{
            blacklist: '黑名单模式 (全库扫描，仅排除指定目录 - 推荐)',
            whitelist: '白名单模式 (仅扫描指定目录，其余全部排除)',
          }}
          onChange={async (value: string) => {
            await setSettings({
              ...settings,
              ragOptions: {
                ...settings.ragOptions,
                filterMode: value as 'blacklist' | 'whitelist',
              },
            })
          }}
        />
      </ObsidianSetting>

      {currentFilterMode === 'blacklist' ? (
        <>
          <ObsidianSetting
            name="排除目录设置 (黑名单)"
            desc="指定不参与向量扫描的目录或文件。系统核心目录（配置目录、.aider、.trash、.git 等）已由底层默认强制排除。"
          >
            <ObsidianButton
              text="测试匹配排除文件"
              onClick={async () => {
                const patterns = settings.ragOptions.excludePatterns
                const excludedFiles = await findFilesMatchingPatterns(
                  patterns,
                  plugin.app.vault,
                )
                new ExcludedFilesModal(app, excludedFiles).open()
              }}
            />
          </ObsidianSetting>

          {/* 鼠标点击下拉快速添加文件夹 */}
          <ObsidianSetting
            name="鼠标快速添加排除文件夹"
            desc="从当前库中现有的文件夹列表直接点选加入黑名单："
          >
            <ObsidianDropdown
              value={selectedFolderToAdd}
              options={{
                '': '-- 点击鼠标选择要排除的文件夹 --',
                ...folderDropdownOptions,
              }}
              onChange={(value: string) => {
                if (value) void handleAddFolder(value)
              }}
            />
          </ObsidianSetting>

          {/* 已排除标签列表，支持鼠标直接点击删除 */}
          {settings.ragOptions.excludePatterns &&
            settings.ragOptions.excludePatterns.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  padding: '8px 12px',
                  margin: '4px 0 12px 0',
                  background: 'var(--background-secondary)',
                  borderRadius: 'var(--radius-s)',
                  border: '1px solid var(--background-modifier-border)',
                }}
              >
                {settings.ragOptions.excludePatterns.map((pattern) => {
                  const isSystemDefault = systemFolders.includes(pattern)
                  return (
                    <span
                      key={pattern}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        background: 'var(--background-primary)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        border: '1px solid var(--background-modifier-border)',
                      }}
                    >
                      <code>{pattern}</code>
                      {isSystemDefault ? (
                        <span
                          style={{
                            fontSize: '10px',
                            color: 'var(--text-muted)',
                          }}
                        >
                          (系统默认)
                        </span>
                      ) : (
                        <span
                          onClick={() => handleRemovePattern(pattern)}
                          style={{
                            cursor: 'pointer',
                            color: 'var(--text-accent)',
                            fontWeight: 'bold',
                            marginLeft: '2px',
                          }}
                          title="点击删除此条目"
                        >
                          ×
                        </span>
                      )}
                    </span>
                  )
                })}
              </div>
            )}

          <ObsidianSetting
            name="手动编辑排除规则文本"
            desc="高级选项：支持输入 glob 规则（每行一条，例如 templates/** 或 assets）。"
            className="aide-settings-textarea"
          >
            <ObsidianTextArea
              value={settings.ragOptions.excludePatterns.join('\n')}
              onChange={async (value: string) => {
                const patterns = value
                  .split('\n')
                  .map((p) => p.trim())
                  .filter((p) => p.length > 0)
                await setSettings({
                  ...settings,
                  ragOptions: {
                    ...settings.ragOptions,
                    excludePatterns: patterns,
                  },
                })
              }}
            />
          </ObsidianSetting>
        </>
      ) : (
        <>
          <ObsidianSetting
            name="指定包含目录 (白名单)"
            desc="仅此列表中的文件夹会被扫描和向量化。留空则默认全库包含（系统核心目录除外）。"
          >
            <ObsidianButton
              text="测试匹配包含文件"
              onClick={async () => {
                const patterns = settings.ragOptions.includePatterns
                const includedFiles = await findFilesMatchingPatterns(
                  patterns,
                  plugin.app.vault,
                )
                new IncludedFilesModal(app, includedFiles, patterns).open()
              }}
            />
          </ObsidianSetting>

          {/* 鼠标点击下拉快速添加文件夹 */}
          <ObsidianSetting
            name="鼠标快速添加白名单文件夹"
            desc="从当前库中现有的文件夹列表直接点选加入白名单："
          >
            <ObsidianDropdown
              value={selectedFolderToAdd}
              options={{
                '': '-- 点击鼠标选择要包含的文件夹 --',
                ...folderDropdownOptions,
              }}
              onChange={(value: string) => {
                if (value) void handleAddFolder(value)
              }}
            />
          </ObsidianSetting>

          {/* 已包含标签列表，支持鼠标直接点击删除 */}
          {settings.ragOptions.includePatterns &&
            settings.ragOptions.includePatterns.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  padding: '8px 12px',
                  margin: '4px 0 12px 0',
                  background: 'var(--background-secondary)',
                  borderRadius: 'var(--radius-s)',
                  border: '1px solid var(--background-modifier-border)',
                }}
              >
                {settings.ragOptions.includePatterns.map((pattern) => (
                  <span
                    key={pattern}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      background: 'var(--background-primary)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      border: '1px solid var(--background-modifier-border)',
                    }}
                  >
                    <code>{pattern}</code>
                    <span
                      onClick={() => handleRemovePattern(pattern)}
                      style={{
                        cursor: 'pointer',
                        color: 'var(--text-accent)',
                        fontWeight: 'bold',
                        marginLeft: '2px',
                      }}
                      title="点击删除此条目"
                    >
                      ×
                    </span>
                  </span>
                ))}
              </div>
            )}

          <ObsidianSetting
            name="手动编辑白名单规则文本"
            desc="高级选项：支持输入 glob 规则（每行一条，例如 notes/** 或 articles）。"
            className="aide-settings-textarea"
          >
            <ObsidianTextArea
              value={settings.ragOptions.includePatterns.join('\n')}
              onChange={async (value: string) => {
                const patterns = value
                  .split('\n')
                  .map((p) => p.trim())
                  .filter((p) => p.length > 0)
                await setSettings({
                  ...settings,
                  ragOptions: {
                    ...settings.ragOptions,
                    includePatterns: patterns,
                  },
                })
              }}
            />
          </ObsidianSetting>
        </>
      )}

      {/* 文本分块策略呈现卡片 */}
      <div className="aide-settings-sub-header" style={{ marginTop: '20px' }}>
        文本分块策略 (Text Chunking)
      </div>

      <div
        style={{
          padding: '12px 16px',
          margin: '10px 0 14px 0',
          background: 'var(--background-secondary)',
          borderRadius: 'var(--radius-m)',
          border: '1px solid var(--interactive-accent)',
        }}
      >
        <div
          style={{
            fontWeight: 600,
            color: 'var(--interactive-accent)',
            marginBottom: '4px',
            fontSize: '13px',
          }}
        >
          🟢 语义优先模式 (自然段落与标题自适应切分)
        </div>
        <div
          style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            lineHeight: '1.5',
          }}
        >
          Aide 采用智能自然语义切分技术：优先根据 Markdown 标题层级和换行段落进行自适应切分，并在切片时自动剥离开头的 YAML Frontmatter 元数据，确保上下文完整连贯、语义不割裂；当单个段落内容超出设定的最大容量限制时自动平滑递归细分。
        </div>
      </div>

      <ObsidianSetting
        name="单块最大容量限制 (Max Chunk Size)"
        desc="单个语义文本分块允许的最大字符数（默认 1000 字符）。修改后建议全量重建索引以重新切分。"
      >
        <ObsidianTextInput
          value={String(settings.ragOptions.chunkSize)}
          placeholder="1000"
          onChange={async (value) => {
            const chunkSize = parseInt(value, 10)
            if (!isNaN(chunkSize)) {
              await setSettings({
                ...settings,
                ragOptions: {
                  ...settings.ragOptions,
                  chunkSize,
                },
              })
            }
          }}
        />
      </ObsidianSetting>

      <ObsidianSetting
        name="上下文 Token 阈值 (Threshold tokens)"
        desc="当对话中引入的笔记总 Token 估算超过此数值时，自动从全文包含转为知识库相似度检索。"
      >
        <ObsidianTextInput
          value={String(settings.ragOptions.thresholdTokens)}
          placeholder="8192"
          onChange={async (value) => {
            const thresholdTokens = parseInt(value, 10)
            if (!isNaN(thresholdTokens)) {
              await setSettings({
                ...settings,
                ragOptions: {
                  ...settings.ragOptions,
                  thresholdTokens,
                },
              })
            }
          }}
        />
      </ObsidianSetting>

      <ObsidianSetting
        name="最低相似度 (Minimum similarity)"
        desc="向量检索结果的最低余弦相似度（0.0 ~ 1.0）。数值越高结果越相关，但过高可能导致匹配过少。"
      >
        <ObsidianTextInput
          value={String(settings.ragOptions.minSimilarity)}
          placeholder="0.0"
          onChange={async (value) => {
            if (!/^[0-9.]*$/.test(value)) return
            if (value === '.' || value.endsWith('.')) return
            const minSimilarity = parseFloat(value)
            if (!isNaN(minSimilarity)) {
              await setSettings({
                ...settings,
                ragOptions: {
                  ...settings.ragOptions,
                  minSimilarity,
                },
              })
            }
          }}
        />
      </ObsidianSetting>

      <ObsidianSetting
        name="最大检索条数 (Limit)"
        desc="知识库检索时最多召回并提供给 AI 的笔记分块数量。"
      >
        <ObsidianTextInput
          value={String(settings.ragOptions.limit)}
          placeholder="10"
          onChange={async (value) => {
            const limit = parseInt(value, 10)
            if (!isNaN(limit)) {
              await setSettings({
                ...settings,
                ragOptions: {
                  ...settings.ragOptions,
                  limit,
                },
              })
            }
          }}
        />
      </ObsidianSetting>

      <div className="aide-settings-sub-header">重排序模型深度检索</div>

      <ObsidianSetting
        name="启用重排深度排序"
        desc="在初筛向量检索后，调用重排序模型对候选文本块进行深度语义重新打分与排序，大幅提升检索精准度。"
      >
        <ObsidianToggle
          value={settings.ragOptions.rerank?.enabled ?? false}
          onChange={async (value) => {
            await setSettings({
              ...settings,
              ragOptions: {
                ...settings.ragOptions,
                rerank: {
                  ...(settings.ragOptions.rerank ?? {
                    modelId: settings.rerankModels?.[0]?.id ?? 'BAAI/bge-reranker-v2-m3',
                    providerId: settings.rerankModels?.[0]?.providerId ?? 'siliconflow',
                    model: settings.rerankModels?.[0]?.model ?? 'BAAI/bge-reranker-v2-m3',
                    topN: 5,
                  }),
                  enabled: value,
                },
              },
            })
          }}
        />
      </ObsidianSetting>

      {settings.ragOptions.rerank?.enabled && (
        <>
          <ObsidianSetting
            name="选择当前采用的重排序模型"
            desc="从【模型管理】已添加的重排序模型列表中选择一个用于当前检索重排。"
          >
            {settings.rerankModels && settings.rerankModels.length > 0 ? (
              <ObsidianDropdown
                value={
                  settings.ragOptions.rerank?.modelId ??
                  settings.rerankModels[0]?.id ??
                  ''
                }
                options={Object.fromEntries(
                  settings.rerankModels.map((m) => [
                    m.id,
                    `${m.id} (${m.providerId})`,
                  ]),
                )}
                onChange={async (value) => {
                  const selected = settings.rerankModels.find(
                    (m) => m.id === value,
                  )
                  await setSettings({
                    ...settings,
                    ragOptions: {
                      ...settings.ragOptions,
                      rerank: {
                        ...settings.ragOptions.rerank,
                        modelId: value,
                        providerId: selected?.providerId,
                        model: selected?.model,
                      },
                    },
                  })
                }}
              />
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                尚未添加任何重排序模型，请先前往左侧【模型管理】添加
              </div>
            )}
          </ObsidianSetting>

          <ObsidianSetting
            name="重排最终输出条数 (Top N)"
            desc="经过重排序打分后，最终截取保留的相关度最高的内容条数。"
          >
            <ObsidianTextInput
              value={String(settings.ragOptions.rerank?.topN ?? 5)}
              placeholder="5"
              onChange={async (value) => {
                const topN = parseInt(value, 10)
                if (!isNaN(topN)) {
                  await setSettings({
                    ...settings,
                    ragOptions: {
                      ...settings.ragOptions,
                      rerank: {
                        ...settings.ragOptions.rerank,
                        topN,
                      },
                    },
                  })
                }
              }}
            />
          </ObsidianSetting>
        </>
      )}

      <div className="aide-settings-sub-header">向量数据管理</div>

      <ObsidianSetting
        name="向量索引数据"
        desc="查看当前库中各嵌入模型的向量记录总数与占用空间，或清空并重新构建索引。"
      >
        <ObsidianButton
          text="查看与管理向量索引"
          onClick={() => {
            new EmbeddingDbManageModal(app, plugin).open()
          }}
        />
      </ObsidianSetting>
    </div>
  )
}
