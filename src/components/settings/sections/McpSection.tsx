import { App } from 'obsidian'

import { useSettings } from '../../../contexts/settings-context'
import SmartComposerPlugin from '../../../main'
import { getLanguage } from '../../../utils/i18n'
import { ObsidianToggle } from '../../common/ObsidianToggle'

type McpSectionProps = {
  app: App
  plugin: SmartComposerPlugin
}

type BuiltinToolInfo = {
  key: string
  titleZh: string
  titleEn: string
  descZh: string
  descEn: string
}

const BUILTIN_TOOLS_CONFIG: BuiltinToolInfo[] = [
  {
    key: 'bing_search',
    titleZh: '国内必应网络搜索',
    titleEn: 'Bing CN Web Search',
    descZh: '直连微软 Bing 国内节点，免翻墙检索最新网络资讯。',
    descEn: 'Search current web facts and news via Bing China node.',
  },
  {
    key: 'web_fetch',
    titleZh: '网页正文抓取提取',
    titleEn: 'Web Page Content Fetch',
    descZh: '抓取网页正文并转为纯净 Markdown 供 AI 研读。',
    descEn: 'Fetch web page URL and extract clean Markdown content.',
  },
  {
    key: 'weather_service',
    titleZh: '全球实时天气预报',
    titleEn: 'Global Weather Forecast',
    descZh: '查询全球各城市实时气象与未来天气预报。',
    descEn: 'Query real-time and forecasted weather for global cities.',
  },
  {
    key: 'arxiv_search',
    titleZh: 'arXiv 学术论文检索',
    titleEn: 'arXiv Academic Search',
    descZh: '检索 arXiv 论文库获取人工智能与各学科前沿文献。',
    descEn: 'Search arXiv academic papers and abstracts.',
  },
  {
    key: 'current_time',
    titleZh: '当前精准时间与时区',
    titleEn: 'Accurate Time & Timezone',
    descZh: '获取当前系统的精确时间、日期与所在时区。',
    descEn: 'Get current accurate system time, date, and timezone.',
  },
]

export function McpSection({ app: _app, plugin: _plugin }: McpSectionProps) {
  const { settings, setSettings } = useSettings()
  const isZh = getLanguage(settings.language) === 'zh'

  const handleToggleBuiltinTool = async (key: string, enabled: boolean) => {
    const current = settings.mcp?.builtinTools ?? {}
    await setSettings({
      ...settings,
      mcp: {
        ...settings.mcp,
        builtinTools: {
          ...current,
          [key]: enabled,
        },
      },
    })
  }

  const builtinSettings = settings.mcp?.builtinTools ?? {}

  return (
    <div className="aide-settings-section">
      <div className="aide-settings-header">
        {isZh ? '工具扩展生态' : 'Tool Extensions Ecosystem'}
      </div>

      {/* 1. 内置原生工具引擎 */}
      <div style={{ marginBottom: '28px' }}>
        <div className="aide-settings-sub-header">
          {isZh ? '内置原生工具 (零环境依赖)' : 'Built-in Native Tools (Zero Dependency)'}
        </div>
        <div className="aide-settings-desc">
          {isZh
            ? '插件原生驱动，无需 Node.js 环境，桌面端与移动端开箱即用。'
            : 'Plugin native engine. Zero Node.js setup, ready across desktop and mobile.'}
        </div>

        <div className="aide-settings-table-container">
          <table className="aide-settings-table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>{isZh ? '工具名称' : 'Tool Name'}</th>
                <th style={{ width: '48%' }}>{isZh ? '功能说明' : 'Description'}</th>
                <th style={{ width: '12%', textAlign: 'center' }}>{isZh ? '状态' : 'Status'}</th>
                <th style={{ width: '12%', textAlign: 'center' }}>{isZh ? '启用' : 'Enabled'}</th>
              </tr>
            </thead>
            <tbody>
              {BUILTIN_TOOLS_CONFIG.map((t) => {
                const isEnabled = builtinSettings[t.key] ?? true
                return (
                  <tr key={t.key}>
                    <td style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--text-normal)' }}>
                      {isZh ? t.titleZh : t.titleEn}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>
                      {isZh ? t.descZh : t.descEn}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '11.5px',
                          color: isEnabled ? 'var(--text-success)' : 'var(--text-muted)',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          backgroundColor: isEnabled
                            ? 'rgba(var(--color-green-rgb), 0.1)'
                            : 'var(--background-secondary)',
                        }}
                      >
                        {isEnabled
                          ? isZh ? '正常就绪' : 'Ready'
                          : isZh ? '已停用' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <ObsidianToggle
                        value={isEnabled}
                        onChange={(val) => handleToggleBuiltinTool(t.key, val)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
