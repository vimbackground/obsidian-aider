# Release Notes: v1.0.0 - Official Milestone Release / 1.0.0 正式里程碑版本

## 🌐 English
- **Vault Chat & RAG Quick Setup Guided Workflow**:
  - Interactive setup modal automatically guides users when initiating vault-wide knowledge base chat without active RAG or embedding model configuration, seamlessly continuing chat upon saving.
  - Seamless localization resolution: modal strictly honors system language (`auto` / Obsidian locale) across titles, notice toasts, and settings controls.
  - Aligned model selection logic: Rerank model defaults to unselected (`''`), prompting users to actively choose their model just like embedding models.
- **Visual Design & Typography Refinement**:
  - **Dual Action Button Consistency**: "Article Chat" and "Vault Chat" buttons now share identical refined accent borders and subtle backgrounds matching Obsidian theme palettes.
  - **Balanced User Bubble Styling**: Removed saturated user bubble background, harmonizing typography, border, and line height with assistant responses.
  - **Left-Aligned Reference Citations**: RAG document retrieval results ("Show Referenced Documents") are now left-aligned with assistant message streams and fully localized.
  - **MCP Table Typography Alignment**: Normalized tool name font size (12.5px, 500 weight) to match description text for a clean, balanced layout.
- **RAG & Knowledge Base Enhancements**:
  - **Simplified Semantic Chunking Description**: Concise, plain-language description of semantic-first chunking strategy (heading hierarchy and natural paragraph preservation).
  - **Exclusion of Vault System Folders**: Enforced default exclusion of non-note directories (`.obsidian`, `.aider`, `.aide`, `.trash`, `.git`, `.smart-env`) to safeguard indexing integrity.
  - **Pure Single-Language Localization**: Eliminated mixed-language English parenthetical notations in Chinese settings panels.
- **Default Models Modernization**:
  - Initial chat model defaulted to SiliconFlow `Qwen/Qwen3.5-4B`.
  - Default embedding model set to SiliconFlow `BAAI/bge-m3`.
- **System Language Auto-Follow**: Default interface language now set to `auto`, detecting and aligning automatically with the Obsidian application language.

## 🇨🇳 中文说明
- **全知识库对话引导弹窗与 RAG 交互闭环**：
  - 前台发起全知识库检索对话时，若 RAG 未启用或未选择嵌入模型，弹出就地配置引导窗口，保存后直接自动无缝提交对话，无需重复点击。
  - 多语言解析跟随系统：彻底修复在 `auto`（跟随系统）语言下弹窗偶现英文的问题，界面、提示词与按钮纯正本地化。
  - 重排序模型对齐设计：重排序模型默认设为空（用户主动选择），操作逻辑与嵌入模型完全一致，未配置时平稳降级执行初筛向量检索。
- **界面视觉风格与排版深度优化**：
  - **对话操作按钮模式统一**：“文章对话”与“全知识库对话”统一采用精致强调边框（`var(--interactive-accent)`）与微底色，视觉认知清晰协调。
  - **用户消息气泡去除突兀底色**：用户消息转为无底色细边框卡片，版式、字重与行高与 AI 回复完全统一，沉浸感大幅增强。
  - **检索引用文档消息左对齐**：“查看引用文档”入口消息改为与后续 AI 回复流左对齐，并支持多语言显示。
  - **MCP 工具表格字号协调**：调整工具名称字体大小至 12.5px，与功能说明文字大小一致，视觉排版更为规整。
- **RAG 知识库与文本切分精细化**：
  - **分块策略通俗化**：精简提炼语义优先分块模式说明，通俗易懂地解释标题层级与自然段落分块机制。
  - **系统目录底层默认强制排除**：知识库检索黑名单默认强制排除 `.obsidian`、`.aider`、`.trash`、`.git` 等典型非库内容系统目录，保障扫描精准高效。
  - **后台设置纯净单语言化**：清除知识库设置中的中英文混杂说明与术语括号，中文环境下纯中文、英文环境下纯英文。
- **现代化默认模型精简**：
  - 默认对话模型仅预置 SiliconFlow 的 `Qwen/Qwen3.5-4B`；
  - 默认嵌入模型仅预置 SiliconFlow 的 `BAAI/bge-m3`。
- **默认语言跟随系统**：初次安装与初始化时，界面语言默认设为 `auto`（自动跟随 Obsidian 系统语言）。

---

# Release Notes: v0.13.3 - Obsidian Community Review Compliance & Security Hardening / 官方社区审核合规与安全加固

## 🌐 English
- **Obsidian Official Community Review Compliance**:
  - Eliminated root-cause linter errors (`react-hooks/exhaustive-deps`) by annotating explicit justifications in accordance with Obsidian review guidelines.
  - Standardized window/timer API calls across the plugin for seamless compatibility with Obsidian Popout multi-window contexts.
  - Hardened asynchronous lifecycle and UI event handlers (`ObsidianButton`, `ObsidianToggle`, `ObsidianDropdown`, `ObsidianTextInput`, `ObsidianTextArea`, etc.) with safe `void` Promise resolution, completely resolving floating promise warnings.
- **TypeScript Strong Typing & Quality Refactoring**:
  - Refactored `MentionableBadge`, `mcpManager`, `gemini`, and migration scripts to eliminate unsafe `any` casts and member accesses.
  - Enhanced `openMarkdownFile` signature to support both `TFile` and file path strings seamlessly.
- **Dependency Security Patching**:
  - Upgraded vulnerable dependencies including `uuid` (`^11.1.1`) and completed full `npm audit fix`.
  - Cleaned up obsolete properties and debug logs across adapters.
- **Version Bump**: Updated to version `0.13.3`.

## 🇨🇳 中文说明
- **Obsidian 官方社区审核全项合规化**：
  - 修复硬阻断 ESLint 指令注释，补充明确规则声明与业务场景阐述，达到官方审查最高标准。
  - 标准化定时器与动画帧 API，显式绑定至独立 `window` 上下文，彻底保障 Popout 多窗口环境下的运行稳定性。
  - 深度重构底层基础交互组件（按钮、开关、下拉框、文本框）及业务组件生命周期的异步回调，统一采用安全的浮动 Promise 消费机制，消除所有 Promise 悬空警告。
- **TypeScript 强类型重构与代码质量提升**：
  - 全面消除 `MentionableBadge`、MCP 服务管理、Gemini 适配器及历史配置迁移脚本中的 `any` 与不安全类型断言，增强类型健壮性。
  - 增强 `openMarkdownFile` 工具方法，无缝支持 `TFile` 对象与字符串路径双重传参。
- **依赖安全加固与代码瘦身**：
  - 升级 `uuid` 等核心依赖至安全版本 `^11.1.1`，完成完整依赖安全审计。
  - 清理适配器中废弃的 `system_fingerprint` 赋值与冗余日志。
- **版本更新**：版本号升级为 `0.13.3`。

---

# Release Notes: v0.13.2 - Template Modals Blank Bugfix & Stability / 模板弹窗空白修复与稳定性优化

## 🌐 English
- **Fix Template Modals Blank/Crash**: Resolved an issue where opening the template selection modal from the chat input or clicking "Add/Edit Prompt Template" in Settings would render a completely blank modal due to missing `SettingsProvider` context in React modals.
- **Resilient Multi-Language Fallback**: Hardened `useI18n()` hook with a safe fallback mechanism to prevent runtime crashes when rendered outside the global settings context.
- **Robust Template Loading**: Implemented interval polling retry logic when loading existing template nodes into the Lexical editor during template editing.
- **Version Bump**: Updated to `0.13.2`.

## 🇨🇳 中文说明
- **彻底修复模板相关弹窗内容空白崩溃问题**：修复了在前台聊天输入框点击“提示词模板”图标、以及在后台设置中点击“添加提示模板”或“编辑”已有模板时，因 React 模态框缺失 `SettingsProvider` 导致 `useI18n` 抛出未捕获异常并引起白屏的缺陷。
- **国际化多语言容错与安全降级**：强化 `useI18n()` 钩子，增加安全 Context 查询与默认语种降级，杜绝任何独立组件或弹窗因语种上下文未就绪而导致崩溃。
- **模板编辑加载时序增强**：在编辑已保存模板时，增加 Lexical 编辑器节点挂载状态的轮询重试机制，确保复杂模板内容 100% 稳定呈现。
- **版本更新**：版本号升级为 `0.13.2`。

---

# Release Notes: v0.13.0 - Obsidian Aider Official Release / 正式发布

## 🌐 English
- **AI-Powered One-Click Chat Title Generation**: Added a dedicated title generation button (`Sparkles` icon) in the chat header. The active LLM automatically synthesizes a concise, high-signal conversation title (≤12 characters) from the first and last message context.
- **Obsidian Scenario Preset Prompt Templates**: Built-in 10 curated dual-language prompt templates tailored to Obsidian PKM workflows (Atomic Note Breakdown, Wikilink Discovery, Knowledge Review Weekly, Meeting Minutes Extraction, MOC Outline, Academic Paper Study, Feynman Technique Explanation, Markdown Polishing, Devil's Advocate Critique, Action Plan Checklist). Automatically seeded on startup without overwriting user customizations.
- **Chat Layout & Quick Access Redesign**:
  - Repositioned the language switch button right beside the "Chat" title on the top-left for direct visibility.
  - Placed a dedicated "Prompt Templates" modal trigger button (`Book` icon) right between the "New Chat" and "Model Select" controls below the message input box.
  - Streamlined header controls: top-right now cleanly clusters AI Title Generation, Current Article Chats, and All Chat History.
- **RAG Folder Selection Hierarchical Tree Visualization**: Both RAG inclusion (whitelist) and exclusion (blacklist) folder dropdowns now visually display directory depth with tree indentation symbols (`└─ 📁 Folder (Path)`), eliminating ambiguity when managing deeply nested folders.
- **Strict Single-Language i18n & UI Cleanups**:
  - Model Providers and Prompt Templates configuration panels now display pure Chinese under Chinese locale and pure English under English locale, completely removing mixed-language slashes and labels.
  - "Other Settings" display language dropdown repositioned to the right of the setting label following Obsidian native setting layout standards.
  - Shortened and streamlined descriptions for built-in native tools (Bing Web Search, Web Fetch, Weather, arXiv, System Time).
- **Default Recommended Model Modernization**: Updated default chat model to SiliconFlow's `Qwen/Qwen3.5-4B`, and removed deprecated `deepseek-ai/DeepSeek-V4-Flash`.
- **Packaging Compatibility**: Enhanced packaging script with dual `pwsh` and `powershell` cross-compatibility for seamless bundle packaging.
- **Version Bump**: Updated to version `0.13.0`.

## 🇨🇳 中文说明
- **大模型一键智能生成会话标题**：对话顶栏新增 AI 标题按钮（`Sparkles` 图标），调用当前激活的大模型基于首尾代表性上下文快速总结精准标题（≤12个字），告别千篇一律的手动命名。
- **内置 10 条 Obsidian 经典场景提示词模板**：针对双链笔记和知识管理深度定制 10 大高频模板（原子笔记拆解、双链洞察推荐、知识回溯周报、会议纪要精炼、MOC 大纲架构、学术论文研读、费曼模型讲解、润色排版优化、反方视角质询、行动计划清单），支持中英双语并在首次启动时安全自动注入。
- **前台界面与操作入口优化重构**：
  - 聊天顶栏左侧将语言切换按钮移至“对话 (Chat)”标题右侧紧邻展示，状态一目了然。
  - 聊天输入框下方控制栏在“新建会话”与“模型选择”之间新增“提示词模板”快捷入口按钮（`Book` 图标），调用更顺手。
  - 对话顶栏精简化重构：左侧去除多余的新建与模板按钮，右侧规整排布 AI 标题生成、当前文章历史与全库历史入口。
- **RAG 黑白名单目录树状层级呈现**：后台白名单与黑名单文件夹选择下拉框支持全库层级深度解析，采用树形分支符号（`└─ 📁 文件夹名 (路径)`）直观展示嵌套结构，彻底杜绝多层级重名文件夹误选。
- **纯净单语言国际化与界面排版规范**：
  - 模型服务商配置与提示词模板管理彻底消除中英文混杂与括号斜杠，中文环境下显示纯中文，英文环境下显示纯英文。
  - “其他设置”中界面语言选择下拉框采用标准 Obsidian 组件重构，并规整停靠在设置项右侧。
  - 提炼精简了原生内置工具（必应搜索、网页抓取、天气查询、arXiv 论文检索、系统当前时间）的说明文案。
- **默认推荐模型更新**：默认对话模型升级为 SiliconFlow 的 `Qwen/Qwen3.5-4B`，自动清理并淘汰已失效的 `DeepSeek-V4-Flash`。
- **跨环境打包脚本增强**：优化压缩打包脚本，优先支持 `pwsh` 并平滑回退 `powershell`，保障 Windows 环境构建稳定性。
- **版本发布**：版本号正式升级为 `0.13.0`。

---

# Release Notes: v0.12.0 - Obsidian Aider Official Release / 正式发布

## 🌐 English
- **Full Obsidian Community Plugin Standards Compliance**: Refactored the codebase to achieve 100% compliance with Obsidian's official plugin review requirements. Completely eliminated `@typescript-eslint/no-explicit-any` workarounds and suppression comments, replaced with strict TypeScript typing and type guards.
- **Enhanced Multi-Window & Popout Support**: Replaced all global timers with window-scoped APIs (`window.setTimeout`, `window.clearTimeout`, `window.requestAnimationFrame`), with proper cleanup upon plugin unload.
- **Dynamic Mobile Vault Compatibility**: Removed hardcoded `.obsidian` paths in favor of `app.vault.configDir`, guaranteeing flawless operation with custom mobile vault configurations.
- **Universal Mobile Network Layer**: Converted remaining raw `fetch` network requests to Obsidian's native `requestUrl` API, completely eliminating CORS restrictions across desktop and mobile.
- **Pure CSS Layout Modernization**: Converted all inline JavaScript style assignments to dedicated CSS classes (`.aide-modal-wide`, `.aide-typeahead-menu-container`), eliminated redundant `!important` flags, and standardized gap spacing.
- **Official Build & Provenance Attestation**: Release assets now strictly conform to Obsidian guidelines (only `main.js`, `manifest.json`, `styles.css`), backed by GitHub Artifact Provenance Attestation.
- **Version Bump**: Updated to version `0.12.0`.

## 🇨🇳 中文说明
- **全面通过 Obsidian 官方社区插件审核标准**：针对 Obsidian 官方自动化审核 Bot 提出的所有规范进行深度重构。彻底移除项目中对 `@typescript-eslint/no-explicit-any` 的规则压制，全面引入严格的 TypeScript 类型收窄与守卫机制，全库实现 0 ESLint 错误。
- **多窗口与弹出窗口稳定性提升**：全面将裸定时器替换为作用域明确的 `window.setTimeout` / `window.clearTimeout` / `window.requestAnimationFrame`，并在插件卸载（`onunload`）时执行彻底回收，杜绝多窗口内存泄漏。
- **移动端与自定义配置目录无缝兼容**：废除硬编码的 `.obsidian` 配置路径，统一采用 `app.vault.configDir` 动态读取，完美兼容移动端个性化配置。
- **全平台网络请求统一**：将剩余使用原生 `fetch` 的认证与请求模块全面迁移至 Obsidian 原生 `requestUrl`，彻底杜绝移动端跨域（CORS）与网络隔离阻断。
- **CSS 纯净样式与现代化重构**：将所有通过 JS 动态赋予的内联样式重构为标准样式类（`.aide-modal-wide` 与 `.aide-typeahead-menu-container`），移除无必要的 `!important`，规范布局 `gap` 属性。
- **自动化构建来源凭证 (Provenance Attestation)**：Release 发布附件严格遵循官方规范（仅发布 `main.js`、`manifest.json`、`styles.css`），并集成 GitHub 官方构建产物签名认证。
- **版本发布**：版本号升级为 `0.12.0`。

---

# Release Notes: v0.11.0 - Obsidian Aider Official Release / 正式发布

## 🌐 English
- **Interactive In-Place Question Editing**: Double-clicking on any user message bubble directly activates in-place editing mode, allowing fast query modification and seamless re-generation.
- **Unified Directory Migration**: Standardized the vault configuration and storage directory from `.aide` to `.aider`, with automatic background migration on startup.
- **Streamlined MCP Tool Interface**: Removed internal sandbox security banners from the MCP settings tab to deliver a cleaner, distraction-free configuration experience.
- **Robust Long Filename Handling**: Resolved potential Windows path length overflow (>255 chars) during chat session and template title encoding, ensuring reliable multi-language vault synchronization.
- **Version Bump**: Updated to version `0.11.0`.

## 🇨🇳 中文说明
- **双击编辑历史提问**：前端对话界面中，双击任意用户消息气泡即可直接进入就地编辑状态，支持快速修改与重新生成。
- **项目存储目录规范化**：存储与配置目录全面规范为 `.aider`，启动时自动平滑迁移历史 `.aide` 目录，无缝兼容老版本数据。
- **MCP 界面极简精简**：移除 MCP 工具面板中冗余的“纯净沙箱安全模式”提示，为普通用户提供更清爽直观的交互界面。
- **中文与长文件名防溢出优化**：重构对话历史与模板命名逻辑，彻底解决 Windows 系统下因 URL 编码导致的长文件名路径超限（>255 字符）报错问题。
- **版本发布**：版本号升级为 `0.11.0`。

---

# Release Notes: v0.10.0 - Obsidian Aider Official Release / 正式发布

## 🌐 English
- **Full Cross-Platform & Mobile Readiness**: Completely decoupled from Node.js subprocesses and direct filesystem access (`child_process` and `fs` reduced to 0). Runs purely within Obsidian's official sandbox, fully compliant with the latest Obsidian Community Plugin security review standards, and seamlessly supported across both Desktop and iOS/Android mobile devices.
- **Extreme Lightweight Optimization**: Bundle size further decreased from ~2.1 MB to **0.43 MB** (over 70% reduction), ensuring instantaneous startup and zero lag on your vault.
- **Native Zero-Config Built-in Tools**: 5 native tools (Bing Web Search, Webpage Content Fetch, Global Weather Forecast, arXiv Academic Search, Accurate System Time) running purely on Obsidian's cross-platform network API without extra configuration or API keys.
- **Comprehensive Multi-Provider Ecosystem**: 4 core providers (OpenAI, DeepSeek, OpenRouter, SiliconFlow) enabled by default for out-of-the-box ease, with full support for adding Anthropic (Claude), Google Gemini, xAI (Grok), Mistral AI, Perplexity, Groq, ModelScope, Azure OpenAI, local offline models (Ollama, LM Studio), and any OpenAI-compatible custom endpoints.
- **Version Bump**: Updated to version `0.10.0`.

## 🇨🇳 中文说明
- **全平台合规与移动端无缝支持**：彻底移除 Node.js 子进程与直接文件系统访问依赖（`child_process` 与 `fs` 引用归零），完全基于 Obsidian 官方沙箱环境与跨平台网络接口运行，完美通过官方插件中心最新安全审核，全方位支持桌面端与 iOS / Android 移动设备。
- **极致轻量化精简**：打包体积由 ~2.1 MB 大幅缩减至 **0.43 MB**（瘦身超 70%），秒开加载，不占用多余内存，不拖慢笔记库检索。
- **原生内置工具增强**：5 大开箱即用原生工具（国内必应搜索、网页抓取转 Markdown、全球实时天气预报、arXiv 学术文献检索、当前系统精准时间）原生极速响应，免 API Key、免额外环境配置。
- **全方位多模型服务商矩阵**：默认预置启用 4 家核心服务商（OpenAI、DeepSeek、OpenRouter、SiliconFlow），并全面支持一键添加配置 Anthropic (Claude)、Google Gemini、xAI (Grok)、Mistral、Perplexity、Groq、魔搭社区 (ModelScope)、Azure OpenAI、本地离线大模型 (Ollama、LM Studio) 以及任意兼容 OpenAI 规范的自建与中转服务。
- **版本发布**：版本号升级为 `0.10.0`。

---

# Release Notes: v0.9.0 - Obsidian Aider Official Release / 正式发布

## 🌐 English
- **Default Language**: English is now the default interface and system prompt language.
- **Global System Prompt**: Standardized to English, brand name updated to "Aider".
- **Runtime Profile**: Defaulted to Free Tier / Eco mode (`eco`) with rate-control discipline and token efficiency.
- **Retained Providers**: Core lineup streamlined to 4 primary providers: OpenAI, DeepSeek, OpenRouter, and SiliconFlow.
- **Default Chat Model**: Set to 1 model by default: SiliconFlow's `deepseek-ai/DeepSeek-V4-Flash`.
- **Version Bump**: Bumped to version `0.9.0`.

## 🇨🇳 中文说明
- **默认语言**：项目语言默认为英文（支持随时在设置中切回中文）。
- **全局系统提示词**：改为英文版，并将提示词中的 Aide 规范为 Aider。
- **服务层级**：默认为免费层模式（🌱 Eco Mode，严格控流、精简 Token、防 429）。
- **模型服务商**：精简保留 4 家核心模型服务商（OpenAI、DeepSeek、OpenRouter、SiliconFlow）。
- **对话模型**：默认配置 1 个对话模型（SiliconFlow 的 `deepseek-ai/DeepSeek-V4-Flash`）。
- **版本发布**：版本号升级为 `0.9.0`。

---

# Release Notes: v0.8.3 - Obsidian Aider Official Release / 正式发布

## 🌐 English

🎉 Welcome to **Obsidian Aider**!

Obsidian Aider is a lightweight, distraction-free AI companion designed for deep thinking, note-taking, and writing within Obsidian. Unlike bloated developer-heavy plugins, Aider focuses on pure conversational interaction and symbiotic knowledge creation. Users can enjoy built-in web search, tool integration, and multi-provider AI chat out of the box with zero runtime setup required.

---

### 🚀 Key Features & Highlights

1. **Lightweight & Content-Focused Conversation**:
   - Zero engineering noise: stripped away intrusive Diff/Apply diff merges and cluttered controls, returning to pure natural reading and writing;
   - Ultra-lightweight distribution: final bundled size is only **~2.1 MB** (over 75% reduction compared to traditional alternatives), with zero redundant dependencies and instant startup.

2. **Modern Native Chat Experience**:
   - High-fidelity SMS-style bubble interface styled with native Obsidian CSS variables, seamlessly adapting to light, dark, and community themes (e.g., Minimal);
   - Foldable callout-style rendering for reasoning/thinking models (e.g., DeepSeek-R1, Qwen-Thinking) with smooth streaming expansion;
   - In-place editing of historical questions with instant regeneration.

3. **Vault Knowledge Copilot**:
   - Type `@` to instantly search, link, and reference specific documents or folders in your vault;
   - Chat alongside notes: automatically detects current active notes for intelligent summarization, key takeaways, and multi-document synthesis.

4. **Free-Tier Friendly & Anti-429 Optimization**:
   - Built-in **🌱 Eco Mode (Lightweight Free-Tier)** and **🚀 Pro Mode (High-Precision)**;
   - Deeply optimized for free models on Groq (8,000 TPM limit) and SiliconFlow, reducing per-query tokens by up to 75%;
   - Intelligent 429 rate limit backoff and silent retries with friendly countdown alerts;
   - Proprietary **Loop Guard** prevents infinite tool-calling loops and guarantees structured conclusions.

5. **MCP Friendly & Extensible Tools Ecosystem**:
   - Built-in support for the standard **Model Context Protocol (MCP)**, allowing connection to external MCP servers (via stdio / SSE) to expand AI capabilities without limits;
   - Out-of-the-box native tools without Node.js runtime required:
     - **Domestic Bing Search (CN)**: Direct connection, no proxy, no API key needed;
     - **Web Fetch & Parser**: Converts any webpage URL into clean, readable Markdown;
     - **Real-Time Weather**, **arXiv Paper Search**, and **Accurate Local System Time**.

---

### 📥 Installation Guide

1. Download **`obsidian-aider.zip`** (or **`aider.zip`**) from the release assets below;
2. Extract the archive to find three files: `main.js`, `manifest.json`, and `styles.css`;
3. Move these three files into your Obsidian vault under `.obsidian/plugins/aider/`;
4. Go to Obsidian **Settings -> Community plugins**, reload, and enable **Aider**!

---

### 🙏 Acknowledgments

This project is inspired by and built upon the excellent open-source project [obsidian-smart-composer](https://github.com/glowingjade/obsidian-smart-composer). Sincere thanks to the original author glowingjade!

---

## 🇨🇳 中文说明 (Chinese)

🎉 欢迎使用 **Obsidian Aider**！

Obsidian Aider 是一款轻量级、去干扰、以深度思考与创作为中心的 Obsidian AI 伴侣。不同于臃肿复杂的开发型插件，Aider 回归纯粹的聊天交互与笔记共生体验，普通用户无需安装 Node.js 即可开箱畅享免翻墙联网搜索与多模型问答。

---

### 🚀 核心特性与亮点 (Highlights)

1. **轻量对话聚焦内容**：
   - 去工程化噪音：彻底剔除侵入式的 Diff/Apply 代码合并等繁杂功能与冗余标签，回归纯粹的 Markdown 思考阅读与创作伴侣；
   - 极致轻量架构：最终打包产物体积仅 **2.10 MB**（较传统同类插件减重 75% 以上），零多余依赖，极速秒开加载。

2. **现代聊天体验**：
   - 短信式原生对仗对话体验：用户提问气泡与 AI 回复卡片高保真绑定 Obsidian 官方设计变量，自适应浅色、深色及第三方主题（如 Minimal）；
   - 深度思考优雅折叠：支持推理模型（如 DeepSeek-R1、Qwen-Thinking）的思考过程类 Callout 式折叠与流式展开，思绪清晰可溯；
   - 就地修改历史提问并重新生成。

3. **知识库功能**：
   - 文件与文件夹精准引用：输入 `@` 即可智能检索并关联当前笔记库内的特定文档或目录；
   - 当前文档边读边聊：自动感知当前编辑焦点，针对长笔记进行智能总结、提炼要点与多方对比。

4. **免费层友好**：
   - 内置“🌱 免费层轻量模式 (Eco)”与“🚀 付费层高精度模式 (Pro)”自由切换；
   - 深度适配 Groq（8,000 TPM 限额）与 SiliconFlow 免费模型，单次提问 Token 骤降 75%；
   - 智能捕获 429 速率限制并自动静默重试，告别突兀大红屏；
   - 独创循环熔断机制（Loop Guard），彻底根治模型在工具调用中无休止死磕的死循环。

5. **MCP 友好（工具扩展生态）**：
   - 深度集成开放的标准 **Model Context Protocol (MCP)** 架构，支持连接外部 MCP 服务器（stdio / SSE），无限扩充 AI 工具能力；
   - 免 Node.js 原生工具开箱即用：
     - **国内必应联网搜索 (Bing CN)**：直连国内服务器，免翻墙、免 API Key；
     - **网页正文深度提取 (Web Fetch)**：自动解析任意网页为干净的 Markdown 正文；
     - **实时天气预报**、**arXiv 前沿学术论文检索**、**精准当前时间**随叫随到。

---

### 📥 安装使用指南

1. 下载下方附件中的 **`obsidian-aider.zip`**（或 **`aider.zip`**）；
2. 解压得到三个文件：`main.js`、`manifest.json`、`styles.css`；
3. 将这三个文件放置于您的 Obsidian 库目录中的 `.obsidian/plugins/aider/` 文件夹下；
4. 进入 Obsidian **【设置】->【第三方插件】**，点击刷新并开启 **Aider** 即可！

---

### 🙏 致谢

本项目在产品设计理念与底层架构上深受开源项目 [obsidian-smart-composer](https://github.com/glowingjade/obsidian-smart-composer) 的启发，在此对原作者 glowingjade 表达诚挚的感谢！
