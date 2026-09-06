# Obsidian Aider

<p align="center">
  <b>A distraction-free, native AI companion for Obsidian — chat with your vault, explore ideas, and write with focus.</b>
</p>

<p align="center">
  <a href="README.md"><b>English</b></a> | <a href="README_zh.md"><b>简体中文</b></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="version">
  <img src="https://img.shields.io/badge/platform-Obsidian-purple.svg" alt="platform">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="license">
  <img src="https://img.shields.io/badge/cross--platform-Desktop%20%26%20Mobile-brightgreen.svg" alt="cross-platform">
</p>

---

## 💡 What is Obsidian Aider & Who is it for?

**Obsidian Aider** is a distraction-free, native AI companion seamlessly integrated into your Obsidian workspace. Focused on document reading, literature research, idea brainstorming, and creative writing, it empowers you to converse effortlessly with your personal knowledge vault and modern LLMs without ever leaving your notes.

### Needs Met & Pain Points Solved
- **Deeply Integrated with Your Notes**: Say goodbye to constantly switching between external web chats and Obsidian. Aider resides in your sidebar, aware of your active note, and lets you pull in referenced vault notes via `@` at any time for seamless reading and writing companion workflows.
- **Clean & Focused Interface**: Strips away complex setup hurdles and distracting visual clutter, presenting an intuitive bubble chat with foldable reasoning blocks that keeps your focus entirely on reading, thinking, and writing.
- **Free-Tier Friendly & Resilient Rate Limiting**: Built with smart context optimization and automatic rate-limit backoff tailored for lightweight and free-tier models, preventing disruptive 429 quota errors and extending your token mileage.
- **Zero Configuration & Cross-Platform**: No additional runtime or programming environment required. Fully compatible out of the box across desktop computers and iOS/Android mobile devices.

### Target Audience
- 📚 **Researchers & Scholars**: Synthesize extensive papers, search arXiv literature, and cross-reference viewpoints across notes.
- ✍️ **Writers & Content Creators**: Brainstorm article outlines in the sidebar, polish phrasing, and overcome writer's block.
- 🎒 **Students & Lifelong Learners**: Transform your vault into an interactive 24/7 personal tutor to clarify concepts and extract key review points.
- 💡 **PKM Enthusiasts**: Anyone seeking a calm, unobtrusive, and native-feeling AI assistant for Obsidian.

---

## ⚖️ Core Features at a Glance

### 1. Natural, Distraction-Free Conversation
- **Harmonious Native Aesthetic**: Modern bubble interface adapts seamlessly to Obsidian light, dark, and community themes (e.g. Minimal);
- **Foldable Reasoning Stream**: Thought processes from reasoning models (like DeepSeek-R1) are neatly tucked into expandable callout blocks to keep chats readable;
- **In-Place Query Editing**: Revisit and edit past questions directly in the timeline to explore new branches of inquiry.

### 2. Vault Knowledge Interaction (`@` Mentions)
- **Contextual Note Referencing**: Type `@` in the chat input to search and attach single notes or whole folders;
- **Active Document Awareness**: Instantly perceives your currently opened document to provide summaries, extract highlights, or answer targeted questions.

### 3. Local Vault Deep Retrieval (RAG)
- **Intelligent Semantic Chunking**: Automatically splits notes according to Markdown heading hierarchies and natural paragraphs, preserving cohesive context;
- **Vault-Wide Knowledge Chat**: Single-click "Vault Chat" at the bottom of the chat panel. A frictionless on-screen guide helps you configure embedding and rerank models and immediately start querying;
- **Deep Re-ranking (Rerank)**: Seamlessly integrates dedicated cross-encoder rerank models (such as BAAI Bge-Reranker) to re-score vector recall candidates for significantly higher precision;
- **Transparent Source Citations**: Clear reference preview listing source notes and line ranges before AI answers, with direct click-to-open jumping;
- **Robust Exclusion Rules**: Fully supports directory inclusion (whitelist) and exclusion (blacklist), with core system folders (`.obsidian`, `.git`, `.trash`, etc.) enforced by default.

### 4. Token Efficiency & Intelligent Anti-Rate-Limit Protection
- **🌱 Eco Mode**: Intelligently compacts conversation context, reducing token overhead by up to 75%;
- **Smart Rate-Limit Backoff & Silent Retries**: Automatically calculates wait intervals upon encountering provider 429 limits, eliminating manual refreshes;
- **Loop Guard**: Prevents multi-step reasoning tools from falling into repetitive loops, ensuring concise and well-structured conclusions.

### 5. Ultra-Lightweight & Universal Compatibility
- **Instantaneous Startup**: Bundle size is only **~0.44 MB**, placing zero performance overhead or lag on your vault indexing;
- **Full Cross-Platform Support**: Complies strictly with official Obsidian sandbox standards, running smoothly on Windows, macOS, Linux, iOS, and Android.

### 6. Out-of-the-Box Zero-Config Native Tools
- **Bing Web Search**: Direct, fast web search without extra proxies or API keys required;
- **Webpage Content Fetcher**: Paste any URL to extract clean, readable Markdown in seconds;
- **Global Real-Time Weather**: Query accurate current weather and 3-day forecasts for any city;
- **arXiv Academic Search**: Search scientific papers and abstracts from the world's leading open literature repository;
- **Accurate System Time**: Millisecond-accurate local and UTC time awareness to prevent temporal hallucinations.

---

## 🌐 Comprehensive Multi-Provider Ecosystem

Obsidian Aider supports a rich variety of AI model providers. **4 core providers are enabled by default** out of the box (simply input your API key to start chatting):
- **OpenAI**
- **DeepSeek**
- **OpenRouter**
- **SiliconFlow**

In addition to the 4 default-enabled providers, you can easily add and configure any other supported provider directly from the settings:
- **Global Commercial Clouds**: Anthropic (Claude), Google Gemini, xAI (Grok), Mistral AI, Perplexity, Groq, Azure OpenAI
- **Domestic AI Platforms**: ModelScope
- **Local Offline Models**: Ollama, LM Studio (runs 100% locally on your machine with complete data privacy)
- **Custom & Reverse Proxies**: OpenAI Compatible (supports any custom, third-party proxy, or OneAPI / NewAPI endpoint conforming to the OpenAI standard)
- **Web Plan Subscriptions**: Claude Plan, OpenAI Plan, and Gemini Plan direct session authorizations

---

## 🚀 Quick Start & Usage

### 1. Method 1: Install from Obsidian Community Plugins (Recommended)

Obsidian Aider has been reviewed and officially published on the **Obsidian Community Plugins** marketplace:

1. Open Obsidian, navigate to **Settings -> Community plugins**;
2. Ensure "Restricted mode" is turned off, then click **Browse**;
3. Search for **`Aider`**;
4. Locate the **Aider** plugin, click **Install**, and once completed, click **Enable**.

### 2. Method 2: Manual Offline Installation

If you cannot access the official marketplace directly, you can install manually:

1. Download **[: `main.js`, `manifest.json`, and `styles.css`;](https://github.com/vimbackground/obsidian-aider/releases/latest)** from the latest release;
2. Place them into your vault at `<Vault>/.obsidian/plugins/aider/`;
4. In Obsidian, go to **Settings -> Community plugins**, reload the installed plugins list, and enable **Aider**.

### 3. How to Use
- **Open Chat**: Click the Aider icon on the left ribbon (or press `Ctrl/Cmd + P` and search `Open chat`);
- **Article Chat**: Click the "Article Chat" button at the bottom of the input box (or press `Enter`) to discuss the currently open note;
- **Vault Chat (RAG)**: Click the "Vault Chat" button at the bottom (or press `Shift + Enter`) to query your whole vault knowledge base with vector indexing. A quick setup modal will guide you on first use;
- **Reference Notes**: Type `@` in the chat input to pick notes or folders to include in your conversation context;
- **Configure Models**: Open **Settings -> Aider**, enter your API key for your preferred provider, and select your chat, embedding, or rerank models.

---

## 🛠️ For Developers & Technical Operations

If you wish to build from source code, customize components, or understand our automated GitHub Actions CI/CD release pipeline, please refer to the dedicated:

👉 **[Developer & Technical Guide (docs/DEVELOPMENT.md)](docs/DEVELOPMENT.md)**

---

## 🙏 Acknowledgments

Obsidian Aider is deeply inspired by the design ideas and architecture of [obsidian-smart-composer](https://github.com/glowingjade/obsidian-smart-composer). Sincere thanks to original author [glowingjade](https://github.com/glowingjade) for their pioneering contributions!

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
