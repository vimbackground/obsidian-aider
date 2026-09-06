import { useSettingsSafe } from '../contexts/settings-context'

export const translations: Record<'en' | 'zh', Record<string, string>> = {
  en: {
    // General
    'common.add': 'Add',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.reset': 'Reset',
    'common.actions': 'Actions',
    'common.enable': 'Enable',
    'common.id': 'ID',
    'common.type': 'Type',
    'common.model': 'Model',
    'common.providerId': 'Provider',
    'common.apiKey': 'API Key',
    'common.setApiKey': 'Set API Key',
    'common.notSelected': '(Not selected)',
    'common.selectModel': 'Select model...',

    // Settings Header & Sections
    'settings.title': 'Aider Settings',
    'settings.chat': 'Chat Settings',
    'settings.chatModel': 'Chat Model',
    'settings.chatModelDesc': 'Choose the default model used for intelligence and conversation.',
    'settings.systemPrompt': 'Global System Prompt',
    'settings.systemPromptDesc': 'This prompt will be automatically prepended to every conversation.',
    'settings.includeCurrentFile': 'Include Active Note',
    'settings.includeCurrentFileDesc': 'Automatically include the active note content as conversation context.',
    'settings.enableTools': 'Enable Tools',
    'settings.enableToolsDesc': 'Allow AI to invoke built-in native tools and connected external MCP extensions.',
    'settings.maxAutoIterations': 'Max Tool Steps',
    'settings.maxAutoIterationsDesc': 'Maximum number of consecutive tool executions without manual confirmation.',

    // Providers
    'settings.providers': 'Model Providers',
    'settings.providersDesc': 'Configure API keys and endpoints for AI platforms.',
    'settings.addCustomProvider': 'Add Custom Provider',
    'settings.howToGetApiKey': 'How to obtain API keys',

    // Models
    'settings.models': 'Model Management',
    'settings.chatModels': 'Chat Models',
    'settings.chatModelsDesc': 'Models used for conversation and question-answering.',
    'settings.addCustomModel': 'Add Custom Model',
    'settings.embeddingModels': 'Embedding Models',
    'settings.embeddingModelsDesc': 'Models used for vault vector indexing and semantic retrieval.',
    'settings.dimension': 'Dimension',

    // RAG
    'settings.rag': 'Vault Knowledge Base',
    'settings.ragDesc': 'Configure semantic vector retrieval over your Obsidian vault notes.',
    'settings.enableRag': 'Enable Vault Knowledge Base',
    'settings.enableRagDesc': 'Enable semantic vector retrieval and AI indexing over your vault notes.',
    'settings.backgroundIndexing': 'Background Silent Indexing',
    'settings.backgroundIndexingDesc': 'When enabled, vault changes will be indexed silently in the background. When disabled, index updates only run on-demand before queries.',
    'settings.embeddingModel': 'Active Embedding Model',
    'settings.embeddingModelDesc': 'Choose the model used to embed your notes.',
    'chat.ragDisabledNotice': 'Vault Knowledge Base is disabled. Please enable it in Settings first.',
    'chat.noEmbeddingModelNotice': 'Please select an Active Embedding Model in Settings first.',
    'settings.filterMode': 'Directory Filter Mode',
    'settings.filterModeDesc': 'Choose the strategy for indexing directories. Blacklist and Whitelist modes are mutually exclusive.',
    'settings.filterModeBlacklist': 'Blacklist (Scan entire vault, exclude specified folders - Recommended)',
    'settings.filterModeWhitelist': 'Whitelist (Scan only specified folders, exclude everything else)',
    'settings.excludeSettings': 'Exclude Directories (Blacklist)',
    'settings.excludeSettingsDesc': 'Specify directories or files to ignore during vector indexing. System folders (.obsidian, .aider, .trash, .git) are excluded by default.',
    'settings.testExcludedFiles': 'Test Matching Excluded Files',
    'settings.quickAddExcludeFolder': 'Quick Add Excluded Folder',
    'settings.quickAddExcludeFolderDesc': 'Select a folder from the current vault to add to the blacklist:',
    'settings.selectFolderToExclude': '-- Select a folder to exclude --',
    'settings.systemDefaultBadge': '(System Default)',
    'settings.removeRuleTooltip': 'Click to remove this entry',
    'settings.manualEditExcludeRules': 'Manually Edit Exclusion Rules',
    'settings.manualEditExcludeRulesDesc': 'Advanced: supports glob rules (one per line, e.g. templates/** or assets).',
    'settings.includeSettings': 'Included Directories (Whitelist)',
    'settings.includeSettingsDesc': 'Only folders in this list will be scanned and vectorized.',
    'settings.testIncludedFiles': 'Test Matching Included Files',
    'settings.quickAddIncludeFolder': 'Quick Add Whitelist Folder',
    'settings.quickAddIncludeFolderDesc': 'Select a folder from the current vault to add to the whitelist:',
    'settings.selectFolderToInclude': '-- Select a folder to include --',
    'settings.manualEditIncludeRules': 'Manually Edit Whitelist Rules',
    'settings.manualEditIncludeRulesDesc': 'Advanced: supports glob rules (one per line, e.g. notes/** or articles).',
    'settings.chunkingStrategy': 'Text Chunking Strategy',
    'settings.semanticModeBadge': '🟢 Semantic-First Mode (Adaptive Headings & Paragraphs)',
    'settings.semanticModeDesc': 'Intelligently splits notes by headings and paragraphs to preserve context, smoothly dividing long sections.',
    'settings.chunkSize': 'Max Chunk Size',
    'settings.chunkSizeDesc': 'Maximum characters allowed per semantic chunk (default 1000). Rebuilding the index is recommended after changing this.',
    'settings.thresholdTokens': 'Context Token Threshold',
    'settings.thresholdTokensDesc': 'When estimated tokens of active notes exceed this threshold, conversation switches automatically from full context to RAG semantic retrieval.',
    'settings.minSimilarity': 'Minimum Similarity',
    'settings.minSimilarityDesc': 'Minimum cosine similarity (0.0 - 1.0) for vector results. Higher values yield more relevant chunks.',
    'settings.limit': 'Max Retrieval Limit',
    'settings.limitDesc': 'Maximum number of note chunks retrieved and supplied to AI during RAG queries.',
    'settings.rerankDeepRetrieval': 'Rerank Semantic Deep Search',
    'settings.enableRerank': 'Enable Deep Reranking',
    'settings.enableRerankDesc': 'After initial vector recall, use a reranker model to re-score candidate text chunks for significantly higher precision.',
    'settings.selectRerankModel': 'Active Rerank Model',
    'settings.selectRerankModelDesc': 'Choose a rerank model from your configured list for retrieval re-scoring.',
    'settings.noRerankModels': 'No rerank models configured. Please add one under Model Management.',
    'settings.rerankTopN': 'Rerank Top N',
    'settings.rerankTopNDesc': 'Number of top-scoring chunks to keep after reranking.',
    'settings.vectorDataManagement': 'Vector Database Management',
    'settings.vectorDataStatus': 'Vector Index Data',
    'settings.vectorDataStatusDesc': 'Inspect vector storage counts, view dimensions, or clear and rebuild indexes.',
    'settings.viewManageVectors': 'View & Manage Vector Store',
    'settings.rebuildIndex': 'Rebuild Entire Index',
    'settings.rebuildIndexBtn': 'Rebuild Index',

    // MCP
    'settings.mcp': 'Tool Extensions Ecosystem',
    'settings.mcpDesc': 'Extend AI capabilities with built-in native tools and external MCP servers.',

    // Templates
    'settings.templates': 'Prompt Templates',
    'settings.templatesDesc': 'Manage reusable prompt templates for quick query insertion.',
    'settings.savedTemplates': 'Saved Templates',
    'settings.addTemplate': 'Add Template',
    'settings.templateName': 'Template Name',
    'settings.templateContent': 'Template Content',
    'settings.noTemplates': 'No saved prompt templates',
    'settings.loadingTemplates': 'Loading templates...',
    'settings.deleteTemplateConfirm': 'Are you sure you want to delete template "{name}"?',

    // Etc
    'settings.etc': 'Other Settings',
    'settings.language': 'Interface Language',
    'settings.languageDesc': 'Choose the display language for the plugin interface.',
    'settings.resetSettings': 'Reset All Settings',
    'settings.resetSettingsDesc': 'Reset all settings back to default values.',
  },
  zh: {
    // 通用
    'common.add': '添加',
    'common.cancel': '取消',
    'common.save': '保存',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.reset': '重置',
    'common.actions': '操作',
    'common.enable': '启用',
    'common.id': '标识',
    'common.type': '类型',
    'common.model': '模型名称',
    'common.providerId': '服务商',
    'common.apiKey': 'API 密钥',
    'common.setApiKey': '设置密钥',
    'common.notSelected': '(未选择)',
    'common.selectModel': '选择模型...',

    // 设置主栏目
    'settings.title': 'Aider 设置',
    'settings.chat': '对话设置',
    'settings.chatModel': '对话模型',
    'settings.chatModelDesc': '选择默认用于智能问答与对话的模型。',
    'settings.systemPrompt': '全局系统提示词',
    'settings.systemPromptDesc': '该提示词将自动附加在每次对话的开头。',
    'settings.includeCurrentFile': '自动附加当前笔记',
    'settings.includeCurrentFileDesc': '在对话时自动将当前激活笔记的内容作为参考上下文。',
    'settings.enableTools': '启用扩展工具',
    'settings.enableToolsDesc': '允许 AI 在回答时调用内置原生工具或外部扩展工具。',
    'settings.maxAutoIterations': '最大工具调用轮次',
    'settings.maxAutoIterationsDesc': '无需手动确认即可连续执行工具的最大步数。',

    // 服务商
    'settings.providers': '模型服务商',
    'settings.providersDesc': '配置各个 AI 平台的 API 密钥与连接端点。',
    'settings.addCustomProvider': '添加自定义服务商',
    'settings.howToGetApiKey': '如何获取 API 密钥',

    // 模型
    'settings.models': '模型管理',
    'settings.chatModels': '对话模型',
    'settings.chatModelsDesc': '用于对话问答与内容创作的模型，支持随时增删管理。',
    'settings.addCustomModel': '添加自定义模型',
    'settings.embeddingModels': '嵌入模型',
    'settings.embeddingModelsDesc': '用于笔记向量化索引和智能语义检索的专用模型。',
    'settings.dimension': '向量维度',

    // RAG 知识库
    'settings.rag': '知识库检索',
    'settings.ragDesc': '配置基于本地笔记的轻量级向量化检索功能。',
    'settings.enableRag': '启用知识库检索',
    'settings.enableRagDesc': '开启基于本地笔记的轻量级向量化检索与知识库问答。',
    'settings.backgroundIndexing': '后台静默索引',
    'settings.backgroundIndexingDesc': '开启后：笔记修改时后台自动静默更新；关闭后：仅在提问需要时按需更新。',
    'settings.embeddingModel': '当前使用的嵌入模型',
    'settings.embeddingModelDesc': '用于知识库向量计算的模型。',
    'chat.ragDisabledNotice': '知识库检索功能未开启，请先前往设置开启知识库检索。',
    'chat.noEmbeddingModelNotice': '尚未选择嵌入模型，请先前往设置中选择当前使用的嵌入模型。',
    'settings.filterMode': '目录过滤模式',
    'settings.filterModeDesc': '选择过滤知识库目录的策略。黑名单与白名单模式互斥生效，杜绝扫描与索引冲突。',
    'settings.filterModeBlacklist': '黑名单模式 (全库扫描，仅排除指定目录 - 推荐)',
    'settings.filterModeWhitelist': '白名单模式 (仅扫描指定目录，其余全部排除)',
    'settings.excludeSettings': '排除目录设置 (黑名单)',
    'settings.excludeSettingsDesc': '指定不参与向量扫描的目录或文件。系统核心目录（.obsidian、.aider、.trash、.git 等）已由底层默认强制排除。',
    'settings.testExcludedFiles': '测试匹配排除文件',
    'settings.quickAddExcludeFolder': '鼠标快速添加排除文件夹',
    'settings.quickAddExcludeFolderDesc': '从当前库中现有的文件夹列表直接点选加入黑名单：',
    'settings.selectFolderToExclude': '-- 点击鼠标选择要排除的文件夹 --',
    'settings.systemDefaultBadge': '(系统默认)',
    'settings.removeRuleTooltip': '点击删除此条目',
    'settings.manualEditExcludeRules': '手动编辑排除规则文本',
    'settings.manualEditExcludeRulesDesc': '高级选项：支持输入 glob 规则（每行一条，例如 templates/** 或 assets）。',
    'settings.includeSettings': '指定包含目录 (白名单)',
    'settings.includeSettingsDesc': '仅此列表中的文件夹会被扫描和向量化。留空则默认全库包含（系统核心目录除外）。',
    'settings.testIncludedFiles': '测试匹配包含文件',
    'settings.quickAddIncludeFolder': '鼠标快速添加白名单文件夹',
    'settings.quickAddIncludeFolderDesc': '从当前库中现有的文件夹列表直接点选加入白名单：',
    'settings.selectFolderToInclude': '-- 点击鼠标选择要包含的文件夹 --',
    'settings.manualEditIncludeRules': '手动编辑白名单规则文本',
    'settings.manualEditIncludeRulesDesc': '高级选项：支持输入 glob 规则（每行一条，例如 notes/** 或 articles）。',
    'settings.chunkingStrategy': '文本分块策略',
    'settings.semanticModeBadge': '🟢 语义优先模式 (自然段落与标题自适应切分)',
    'settings.semanticModeDesc': '本系统按笔记标题与自然段落智能分块，保留上下文完整性，超长段落平滑拆分。',
    'settings.chunkSize': '单块最大容量限制',
    'settings.chunkSizeDesc': '单个语义文本分块允许的最大字符数（默认 1000 字符）。修改后建议全量重建索引以重新切分。',
    'settings.thresholdTokens': '上下文 Token 阈值',
    'settings.thresholdTokensDesc': '当对话中引入的笔记总 Token 估算超过此数值时，自动从全文包含转为知识库相似度检索。',
    'settings.minSimilarity': '最低相似度',
    'settings.minSimilarityDesc': '向量检索结果的最低余弦相似度（0.0 ~ 1.0）。数值越高结果越相关，但过高可能导致匹配过少。',
    'settings.limit': '最大检索条数',
    'settings.limitDesc': '知识库检索时最多召回并提供给 AI 的笔记分块数量。',
    'settings.rerankDeepRetrieval': '重排序模型深度检索',
    'settings.enableRerank': '启用重排深度排序',
    'settings.enableRerankDesc': '在初筛向量检索后，调用重排序模型对候选文本块进行深度语义重新打分与排序，大幅提升检索精准度。',
    'settings.selectRerankModel': '选择当前采用的重排序模型',
    'settings.selectRerankModelDesc': '从【模型管理】已添加的重排序模型列表中选择一个用于当前检索重排。',
    'settings.noRerankModels': '尚未添加任何重排序模型，请先前往左侧【模型管理】添加',
    'settings.rerankTopN': '重排最终输出条数',
    'settings.rerankTopNDesc': '经过重排序打分后，最终截取保留的相关度最高的内容条数。',
    'settings.vectorDataManagement': '向量数据管理',
    'settings.vectorDataStatus': '向量索引数据',
    'settings.vectorDataStatusDesc': '查看当前库中各嵌入模型的向量记录总数与占用空间，或清空并重新构建索引。',
    'settings.viewManageVectors': '查看与管理向量索引',
    'settings.rebuildIndex': '重建整个知识库索引',
    'settings.rebuildIndexBtn': '全量重建索引',

    // MCP
    'settings.mcp': '工具扩展生态',
    'settings.mcpDesc': '通过内置原生工具和标准协议接入联网搜索、天气、抓取等实用能力。',

    // 模板
    'settings.templates': '提示词模板',
    'settings.templatesDesc': '管理常用提示词模板，可在对话中一键调用或通过 / 触发。',
    'settings.savedTemplates': '已保存的模板',
    'settings.addTemplate': '添加提示词模板',
    'settings.templateName': '模板名称',
    'settings.templateContent': '模板内容',
    'settings.noTemplates': '暂无保存的提示词模板',
    'settings.loadingTemplates': '正在加载模板...',
    'settings.deleteTemplateConfirm': '确定要删除模板 "{name}" 吗？',

    // 其他
    'settings.etc': '其他设置',
    'settings.language': '界面语言',
    'settings.languageDesc': '选择插件界面的显示语言。',
    'settings.resetSettings': '重置所有设置',
    'settings.resetSettingsDesc': '将插件所有设置项恢复为初始默认状态。',
  },
}

export type Language = 'en' | 'zh' | 'zh-CN' | 'auto'

export function getLanguage(settingsLanguage = 'en'): 'en' | 'zh' {
  if (settingsLanguage === 'auto') {
    // 优先读取 Obsidian 主程序保存在 localStorage 的界面语言设置
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const obsLang = window.localStorage.getItem('language')?.toLowerCase()
        if (obsLang && obsLang.startsWith('zh')) return 'zh'
        if (obsLang && obsLang.startsWith('en')) return 'en'
      } catch {
        // ignore localStorage read error
      }
    }
    const navLang = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'en'
    if (navLang.startsWith('zh')) return 'zh'
    return 'en'
  }
  if (settingsLanguage === 'zh' || settingsLanguage === 'zh-CN') {
    return 'zh'
  }
  return 'en'
}

export function translate(key: string, language = 'en', defaultText?: string): string {
  const lang = getLanguage(language)
  return translations[lang]?.[key] ?? translations.en?.[key] ?? defaultText ?? key
}

export function useI18n() {
  const settingsContext = useSettingsSafe()
  const lang = getLanguage(settingsContext?.settings?.language ?? 'en')

  const t = (key: string, defaultText?: string): string => {
    return translations[lang]?.[key] ?? translations.en?.[key] ?? defaultText ?? key
  }

  return { t, language: lang }
}
