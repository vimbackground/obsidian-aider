import { ChatModel } from './types/chat-model.types'
import { EmbeddingModel } from './types/embedding-model.types'
import { LLMProvider, LLMProviderType } from './types/provider.types'

export const CHAT_VIEW_TYPE = 'aide-chat-view'

// Default model ids
export const DEFAULT_CHAT_MODEL_ID = 'Qwen/Qwen3.5-4B'
export const DEFAULT_APPLY_MODEL_ID = ''

// Recommended model ids
export const RECOMMENDED_MODELS_FOR_CHAT = ['Qwen/Qwen3.5-4B']
export const RECOMMENDED_MODELS_FOR_APPLY = ['Qwen/Qwen3.5-4B']
export const RECOMMENDED_MODELS_FOR_EMBEDDING = ['BAAI/bge-m3']

export const PLAN_PROVIDER_TYPES: readonly LLMProviderType[] = []
export const PROVIDER_TYPES_INFO = {
  anthropic: {
    label: 'Anthropic',
    labelZh: 'Anthropic',
    defaultProviderId: 'anthropic',
    requireApiKey: true,
    requireBaseUrl: false,
    supportEmbedding: false,
    additionalSettings: [],
  },
  openai: {
    label: 'OpenAI',
    labelZh: 'OpenAI',
    defaultProviderId: 'openai',
    requireApiKey: true,
    requireBaseUrl: false,
    supportEmbedding: true,
    additionalSettings: [],
  },
  gemini: {
    label: 'Gemini',
    labelZh: 'Gemini',
    defaultProviderId: 'gemini',
    requireApiKey: true,
    requireBaseUrl: false,
    supportEmbedding: true,
    additionalSettings: [],
  },
  xai: {
    label: 'xAI',
    labelZh: 'xAI',
    defaultProviderId: 'xai',
    requireApiKey: true,
    requireBaseUrl: false,
    supportEmbedding: false,
    additionalSettings: [],
  },
  deepseek: {
    label: 'DeepSeek',
    labelZh: 'DeepSeek',
    defaultProviderId: 'deepseek',
    requireApiKey: true,
    requireBaseUrl: false,
    supportEmbedding: false,
    additionalSettings: [],
  },
  siliconflow: {
    label: 'SiliconFlow',
    labelZh: '硅基流动 (SiliconFlow)',
    defaultProviderId: 'siliconflow',
    requireApiKey: true,
    requireBaseUrl: true,
    supportEmbedding: true,
    additionalSettings: [],
  },
  mistral: {
    label: 'Mistral',
    labelZh: 'Mistral',
    defaultProviderId: 'mistral',
    requireApiKey: true,
    requireBaseUrl: false,
    supportEmbedding: false,
    additionalSettings: [],
  },
  perplexity: {
    label: 'Perplexity',
    labelZh: 'Perplexity',
    defaultProviderId: 'perplexity',
    requireApiKey: true,
    requireBaseUrl: false,
    supportEmbedding: false,
    additionalSettings: [],
  },
  openrouter: {
    label: 'OpenRouter',
    labelZh: 'OpenRouter',
    defaultProviderId: 'openrouter',
    requireApiKey: true,
    requireBaseUrl: false,
    supportEmbedding: false,
    additionalSettings: [],
  },
  groq: {
    label: 'Groq',
    labelZh: 'Groq',
    defaultProviderId: 'groq',
    requireApiKey: true,
    requireBaseUrl: false,
    supportEmbedding: false,
    additionalSettings: [],
  },
  modelscope: {
    label: 'ModelScope',
    labelZh: '魔搭社区 (ModelScope)',
    defaultProviderId: 'modelscope',
    requireApiKey: true,
    requireBaseUrl: false,
    supportEmbedding: true,
    additionalSettings: [],
  },
  ollama: {
    label: 'Ollama',
    labelZh: 'Ollama (本地私有部署)',
    defaultProviderId: 'ollama',
    requireApiKey: false,
    requireBaseUrl: false,
    supportEmbedding: true,
    additionalSettings: [],
  },
  'lm-studio': {
    label: 'LM Studio',
    labelZh: 'LM Studio (本地私有部署)',
    defaultProviderId: 'lm-studio',
    requireApiKey: false,
    requireBaseUrl: false,
    supportEmbedding: true,
    additionalSettings: [],
  },
  'azure-openai': {
    label: 'Azure OpenAI',
    labelZh: 'Azure OpenAI',
    defaultProviderId: null, // no default provider for this type
    requireApiKey: true,
    requireBaseUrl: true,
    supportEmbedding: false,
    additionalSettings: [
      {
        label: 'Deployment',
        labelZh: '部署名称 (Deployment)',
        key: 'deployment',
        placeholder: 'Enter your deployment name',
        placeholderZh: '输入你的部署名称',
        type: 'text',
        required: true,
      },
      {
        label: 'API Version',
        labelZh: 'API 版本 (API Version)',
        key: 'apiVersion',
        placeholder: 'Enter your API version',
        placeholderZh: '输入你的 API 版本',
        type: 'text',
        required: true,
      },
    ],
  },
  'openai-compatible': {
    label: 'OpenAI Compatible',
    labelZh: '自定义 OpenAI 兼容接口',
    defaultProviderId: null, // no default provider for this type
    requireApiKey: false,
    requireBaseUrl: true,
    supportEmbedding: true,
    additionalSettings: [
      {
        label: 'No Stainless Headers',
        labelZh: '移除 Stainless 请求头',
        key: 'noStainless',
        type: 'toggle',
        required: false,
        description:
          'Enable this if you encounter CORS errors related to Stainless headers (x-stainless-os, etc.)',
        descriptionZh:
          '若在连接特定中转时遇到 Stainless 请求头导致的跨域错误，开启此项可自动剥除该头。',
      },
    ],
  },
} as const satisfies Record<
  LLMProviderType,
  {
    label: string
    labelZh: string
    defaultProviderId: string | null
    requireApiKey: boolean
    requireBaseUrl: boolean
    supportEmbedding: boolean
    additionalSettings: {
      label: string
      labelZh?: string
      key: string
      type: 'text' | 'toggle'
      placeholder?: string
      placeholderZh?: string
      description?: string
      descriptionZh?: string
      required?: boolean
    }[]
  }
>

export function getProviderTypeLabel(
  type: LLMProviderType,
  language: string = 'en',
): string {
  const info = PROVIDER_TYPES_INFO[type]
  if (!info) return type
  return language === 'zh' ? info.labelZh : info.label
}

/**
 * Important
 * 1. When adding new default provider, settings migration should be added
 * 2. If there's same provider id in user's settings, it's data should be overwritten by default provider
 */
export const DEFAULT_PROVIDERS: readonly LLMProvider[] = [
  {
    type: 'openai',
    id: PROVIDER_TYPES_INFO.openai.defaultProviderId,
  },
  {
    type: 'deepseek',
    id: PROVIDER_TYPES_INFO.deepseek.defaultProviderId,
  },
  {
    type: 'openrouter',
    id: PROVIDER_TYPES_INFO.openrouter.defaultProviderId,
  },
  {
    type: 'siliconflow',
    id: PROVIDER_TYPES_INFO.siliconflow.defaultProviderId,
    baseUrl: 'https://api.siliconflow.cn/v1',
  },
]

/**
 * Important
 * 1. When adding new default model, settings migration should be added
 * 2. If there's same model id in user's settings, it's data should be overwritten by default model
 */
export const DEFAULT_CHAT_MODELS: readonly ChatModel[] = [
  {
    providerType: 'siliconflow',
    providerId: PROVIDER_TYPES_INFO.siliconflow.defaultProviderId,
    id: 'Qwen/Qwen3.5-4B',
    model: 'Qwen/Qwen3.5-4B',
    enable: true,
  },
]

export const DEFAULT_SYSTEM_PROMPT = `You are an intelligent assistant and thinking partner powered by Aider in Obsidian. Your responsibility is to objectively, accurately, and concisely assist users with reading, writing, and organizing their notes and ideas.

### Core Principles & Guidelines:
1. **Standard Markdown Format**: Strictly adhere to standard Markdown formatting (headings, lists, tables, task checkboxes, and code blocks). Ensure clean, compatible layout across standard Markdown renderers without proprietary syntax.
2. **Fidelity to Reference Facts**: When notes or context materials are provided in the conversation, base your reasoning and responses strictly on the supplied facts. If materials are insufficient, truthfully state so without fabricating information.
3. **Objectivity and Neutrality**: Maintain a rational, rigorous, and neutral stance. Present different perspectives objectively on open-ended or controversial topics.
4. **Conciseness and Clarity**: Keep writing structured, concise, and focused directly on the core topic, avoiding unnecessary filler and boilerplate.`


/**
 * Important
 * 1. When adding new default embedding model, settings migration should be added
 * 2. If there's same embedding model id in user's settings, it's data should be overwritten by default embedding model
 */
export const DEFAULT_EMBEDDING_MODELS: readonly EmbeddingModel[] = [
  {
    providerType: 'siliconflow',
    providerId: PROVIDER_TYPES_INFO.siliconflow.defaultProviderId,
    id: 'BAAI/bge-m3',
    model: 'BAAI/bge-m3',
    dimension: 1024,
    enable: true,
  },
]

// Pricing in dollars per million tokens
type ModelPricing = {
  input: number
  output: number
}

export const OPENAI_PRICES: Record<string, ModelPricing> = {
  'gpt-5.2': { input: 1.75, output: 14 },
  'gpt-5.1': { input: 1.25, output: 10 },
  'gpt-5': { input: 1.25, output: 10 },
  'gpt-5-mini': { input: 0.25, output: 2 },
  'gpt-5-nano': { input: 0.05, output: 0.4 },
  'gpt-4.1': { input: 2.0, output: 8.0 },
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
  'gpt-4.1-nano': { input: 0.1, output: 0.4 },
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  o3: { input: 10, output: 40 },
  o1: { input: 15, output: 60 },
  'o4-mini': { input: 1.1, output: 4.4 },
  'o3-mini': { input: 1.1, output: 4.4 },
  'o1-mini': { input: 1.1, output: 4.4 },
}

export const ANTHROPIC_PRICES: Record<string, ModelPricing> = {
  'claude-opus-4-5': { input: 5, output: 25 },
  'claude-opus-4-1': { input: 15, output: 75 },
  'claude-opus-4-0': { input: 15, output: 75 },
  'claude-sonnet-4-5': { input: 3, output: 15 },
  'claude-sonnet-4-0': { input: 3, output: 15 },
  'claude-3-5-sonnet-latest': { input: 3, output: 15 },
  'claude-3-7-sonnet-latest': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 1, output: 5 },
  'claude-3-5-haiku-latest': { input: 1, output: 5 },
}

// Gemini is currently free for low rate limits
export const GEMINI_PRICES: Record<string, ModelPricing> = {}

export const XAI_PRICES: Record<string, ModelPricing> = {
  'grok-4-1-fast': { input: 0.2, output: 0.5 },
  'grok-4-1-fast-non-reasoning': { input: 0.2, output: 0.5 },
}

export const DEEPSEEK_PRICES: Record<string, ModelPricing> = {
  // Model version: DeepSeek-V3.2
  'deepseek-chat': { input: 0.28, output: 0.42 },
  'deepseek-reasoner': { input: 0.28, output: 0.42 },
}

export type PresetPromptTemplate = {
  id: string
  name: string
  content: string
}

export const OBSIDIAN_PRESET_TEMPLATES: readonly PresetPromptTemplate[] = [
  {
    id: 'preset-atomic-note',
    name: 'Atomic Note(卡片重构)',
    content: 'Please refactor and distill the selected note content following the principles of Atomic Notes:\n1. Formulate a single core thesis as the theme sentence;\n2. Strip away minor details, retaining key supporting arguments and logical chains;\n3. Use clear, concise phrasing to ensure the note is self-contained.',
  },
  {
    id: 'preset-wikilink-extract',
    name: 'WikiLinks(双链提取)',
    content: 'Please read through the current note to discover core concepts, domain entities, and potential cross-links:\n1. Identify 5-8 keywords most suitable for bidirectional linking in Obsidian, formatted as `[[Concept Name]]`;\n2. Provide a 1-sentence contextual justification for each link, explaining how it connects to other notes in the vault.',
  },
  {
    id: 'preset-daily-review',
    name: 'Daily Review(每日复盘)',
    content: 'Please analyze today\'s journal entries and generate a structured daily reflection:\n- 🎯 **Core Achievements**: Key progress accomplished today;\n- 💡 **Key Insights & Learnings**: New ideas, reflections, or lessons learned;\n- ⏳ **Open Questions & Blockers**: Issues pending resolution;\n- 📋 **Top 3 Priorities for Tomorrow**: Next actionable steps.',
  },
  {
    id: 'preset-meeting-minutes',
    name: 'Meeting Minutes(会议纪要)',
    content: 'Please organize the following meeting discussion notes into structured professional minutes:\n1. 📌 **Meeting Objective & Overview**;\n2. 🗣️ **Key Decisions & Consensus**;\n3. ✅ **Action Items Checklist**: Explicitly formatted as `- [ ] @Assignee Task description (Due date)`.',
  },
  {
    id: 'preset-structure-outline',
    name: 'Outline(思维导图大纲)',
    content: 'Please parse the provided text into a hierarchical Markdown outline suitable for Obsidian:\n1. Use strict heading levels (`#`, `##`, `###`);\n2. Summarize 1-2 key points under each branch, demonstrating a clear logical progression.',
  },
  {
    id: 'preset-academic-distill',
    name: 'Paper Digest(论文要点速读)',
    content: 'Please digest and synthesize the following academic paper from a researcher\'s perspective:\n1. 🔬 **Research Question**: What core problem does the author address?\n2. 🛠️ **Methodology & Novelty**: What is the key mechanism or technical approach?\n3. 📊 **Key Findings & Evidence**;\n4. ⚖️ **Limitations & Future Directions**.',
  },
  {
    id: 'preset-feynman-explain',
    name: 'Feynman Explain(费曼讲解)',
    content: 'Using the Feynman Technique, explain the complex concept above in simple, intuitive terms:\n1. Explain it as if to a high schooler without prior domain background, using vivid real-life analogies;\n2. Avoid obscure jargon;\n3. Conclude with a practical daily example to solidify understanding.',
  },
  {
    id: 'preset-bilingual-polish',
    name: 'Text Polish(文本润色)',
    content: 'Please perform a thorough and professional polish on the following text:\n1. Correct grammar, syntax, punctuation, and wording inconsistencies;\n2. Enhance vocabulary precision and flow;\n3. Provide both the [Polished Version] and a concise explanation of [Key Improvements].',
  },
  {
    id: 'preset-critical-review',
    name: "Devil's Advocate(魔鬼反辩)",
    content: 'Act as a rigorous "Devil\'s Advocate" and critically review the arguments in this note:\n1. Identify logical fallacies, unverified assumptions, or blind spots;\n2. Pose the 3 most challenging counter-questions;\n3. Suggest actionable ways to strengthen the robustness of the argument.',
  },
  {
    id: 'preset-action-plan',
    name: 'Action Plan(动作规划)',
    content: 'Please break down the goal above into an actionable Work Breakdown Structure (WBS):\n1. Decompose into concrete micro-tasks (executable within 30-60 minutes each);\n2. Highlight dependencies between tasks;\n3. Output in standard Obsidian Markdown task checkbox format (`- [ ]`).',
  },
]
