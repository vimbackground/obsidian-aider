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
  const systemFolders = [app.vault.configDir, '.obsidian', '.aider', '.aide', '.trash', '.git', '.smart-env']
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

  const isRagEnabled = settings.ragOptions.enabled ?? false

  return (
    <div className="aide-settings-section">
      <div className="aide-settings-header">{t('settings.rag')}</div>

      <ObsidianSetting
        name={t('settings.enableRag')}
        desc={t('settings.enableRagDesc')}
      >
        <ObsidianToggle
          value={isRagEnabled}
          onChange={async (value) => {
            await setSettings({
              ...settings,
              ragOptions: {
                ...settings.ragOptions,
                enabled: value,
              },
            })
          }}
        />
      </ObsidianSetting>

      {isRagEnabled && (
        <>
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
              options={{
                '': t('common.notSelected'),
                ...Object.fromEntries(
                  settings.embeddingModels
                    .filter(({ enable }) => enable ?? true)
                    .map((embeddingModel) => [
                      embeddingModel.id,
                      embeddingModel.id,
                    ]),
                ),
              }}
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
            name={t('settings.filterMode')}
            desc={t('settings.filterModeDesc')}
          >
        <ObsidianDropdown
          value={currentFilterMode}
          options={{
            blacklist: t('settings.filterModeBlacklist'),
            whitelist: t('settings.filterModeWhitelist'),
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
            name={t('settings.excludeSettings')}
            desc={t('settings.excludeSettingsDesc')}
          >
            <ObsidianButton
              text={t('settings.testExcludedFiles')}
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
            name={t('settings.quickAddExcludeFolder')}
            desc={t('settings.quickAddExcludeFolderDesc')}
          >
            <ObsidianDropdown
              value={selectedFolderToAdd}
              options={{
                '': t('settings.selectFolderToExclude'),
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
                          {t('settings.systemDefaultBadge')}
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
                          title={t('settings.removeRuleTooltip')}
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
            name={t('settings.manualEditExcludeRules')}
            desc={t('settings.manualEditExcludeRulesDesc')}
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
            name={t('settings.includeSettings')}
            desc={t('settings.includeSettingsDesc')}
          >
            <ObsidianButton
              text={t('settings.testIncludedFiles')}
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
            name={t('settings.quickAddIncludeFolder')}
            desc={t('settings.quickAddIncludeFolderDesc')}
          >
            <ObsidianDropdown
              value={selectedFolderToAdd}
              options={{
                '': t('settings.selectFolderToInclude'),
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
                      title={t('settings.removeRuleTooltip')}
                    >
                      ×
                    </span>
                  </span>
                ))}
              </div>
            )}

          <ObsidianSetting
            name={t('settings.manualEditIncludeRules')}
            desc={t('settings.manualEditIncludeRulesDesc')}
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
        {t('settings.chunkingStrategy')}
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
          {t('settings.semanticModeBadge')}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            lineHeight: '1.5',
          }}
        >
          {t('settings.semanticModeDesc')}
        </div>
      </div>

      <ObsidianSetting
        name={t('settings.chunkSize')}
        desc={t('settings.chunkSizeDesc')}
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
        name={t('settings.thresholdTokens')}
        desc={t('settings.thresholdTokensDesc')}
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
        name={t('settings.minSimilarity')}
        desc={t('settings.minSimilarityDesc')}
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
        name={t('settings.limit')}
        desc={t('settings.limitDesc')}
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

      <div className="aide-settings-sub-header">{t('settings.rerankDeepRetrieval')}</div>

      <ObsidianSetting
        name={t('settings.enableRerank')}
        desc={t('settings.enableRerankDesc')}
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
            name={t('settings.selectRerankModel')}
            desc={t('settings.selectRerankModelDesc')}
          >
            {settings.rerankModels && settings.rerankModels.length > 0 ? (
              <ObsidianDropdown
                value={settings.ragOptions.rerank?.modelId ?? ''}
                options={{
                  '': t('common.notSelected'),
                  ...Object.fromEntries(
                    settings.rerankModels
                      .filter(({ enable }) => enable ?? true)
                      .map((m) => [
                        m.id,
                        `${m.id} (${m.providerId})`,
                      ]),
                  ),
                }}
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
                {t('settings.noRerankModels')}
              </div>
            )}
          </ObsidianSetting>

          <ObsidianSetting
            name={t('settings.rerankTopN')}
            desc={t('settings.rerankTopNDesc')}
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

      <div className="aide-settings-sub-header">{t('settings.vectorDataManagement')}</div>

      <ObsidianSetting
        name={t('settings.vectorDataStatus')}
        desc={t('settings.vectorDataStatusDesc')}
      >
        <ObsidianButton
          text={t('settings.viewManageVectors')}
          onClick={() => {
            new EmbeddingDbManageModal(app, plugin).open()
          }}
        />
      </ObsidianSetting>
        </>
      )}
    </div>
  )
}
