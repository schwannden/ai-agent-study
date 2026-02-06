# AI Agent Study

[![Built with Starlight](https://astro.badg.es/v2/built-with-starlight/tiny.svg)](https://starlight.astro.build)

> Comprehensive tutorials for building production-ready AI agents with Claude. Learn ReAct, Plan-Execute-Verify, and Human-in-the-Loop patterns through practical examples.

**Live Site:** [https://schwannden.github.io/ai-agent-study/](https://schwannden.github.io/ai-agent-study/)

## 📚 What You'll Learn

This site provides hands-on tutorials for building autonomous AI agents that can reason, plan, and execute complex tasks. Each pattern includes complete, runnable code examples in Python with implementations using Claude SDK, model-agnostic approaches, and LangChain integration.

### Learning Paths

- **[ReAct Pattern](https://schwannden.github.io/ai-agent-study/react/01-overview/)** (Beginner) - Simple single-loop reasoning agent (~400 lines, 2-3 hours)
- **[Plan-Execute-Verify](https://schwannden.github.io/ai-agent-study/plan-execute-verify/01-overview/)** (Production) - Multi-phase architecture (~1300+ lines, 6-8 hours)
- **[Human-in-the-Loop](https://schwannden.github.io/ai-agent-study/human-in-the-loop/00-index/)** (Interactive) - User approval workflows and interactive agents

### Features

✅ **Bilingual Documentation** - English and Traditional Chinese (繁體中文)
✅ **Real-World Case Study** - Legal document review system
✅ **Complete Code Examples** - Runnable Python implementations
✅ **Multiple Frameworks** - Claude SDK, LangChain, model-agnostic patterns
✅ **Interactive Diagrams** - Mermaid flowcharts with zoom/pan controls
✅ **Dark/Light Mode** - Automatic theme switching

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Claude API key from [console.anthropic.com](https://console.anthropic.com/)
- Basic understanding of REST APIs and async programming

### Getting Started

1. Visit the [landing page](https://schwannden.github.io/ai-agent-study/)
2. Read the [case study](https://schwannden.github.io/ai-agent-study/case-study/) to understand the problem space
3. Start with the [ReAct Pattern tutorial](https://schwannden.github.io/ai-agent-study/react/01-overview/)
4. Progress to [Plan-Execute-Verify](https://schwannden.github.io/ai-agent-study/plan-execute-verify/01-overview/) for production-grade patterns

## 🛠️ Local Development

This site is built with [Astro](https://astro.build/) and [Starlight](https://starlight.astro.build/).

### Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:4321/ai-agent-study/)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting and formatting
npm run lint          # Check code and markdown
npm run lint:fix      # Auto-fix issues
npm run format        # Format with Prettier
npm run typecheck     # TypeScript checking
```

### Project Structure

```
src/content/docs/
├── index.mdx                    # Landing page
├── case-study.md                # Overview article
├── react/                       # ReAct pattern tutorials
├── plan-execute-verify/         # PEV pattern tutorials
├── human-in-the-loop/           # HITL pattern tutorials
└── zh-tw/                       # Traditional Chinese translations
```

## 📖 Documentation

- [CLAUDE.md](./CLAUDE.md) - Comprehensive guide for Claude Code users
- [AGENTS.md](./AGENTS.md) - Technical context for AI coding agents
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment and configuration guide

## 🌐 Deployment

This site is automatically deployed to GitHub Pages via GitHub Actions when changes are pushed to the `main` branch.

- **Deployment URL:** https://schwannden.github.io/ai-agent-study/
- **Base Path:** `/ai-agent-study`
- **Build Time:** ~2-3 minutes

## 🤝 Contributing

Contributions are welcome! Please feel free to:

- Report bugs or issues
- Suggest improvements to tutorials
- Add translations
- Submit pull requests

## 📝 License

This project is open source and available under the MIT License.

## 🔗 Links

- **Live Site:** https://schwannden.github.io/ai-agent-study/
- **Repository:** https://github.com/schwannden/ai-agent-study
- **Claude API:** https://docs.anthropic.com/
- **Anthropic:** https://www.anthropic.com/

## 🙏 Credits

Built with:

- [Astro](https://astro.build/) - Static site framework
- [Starlight](https://starlight.astro.build/) - Documentation theme
- [Mermaid](https://mermaid.js.org/) - Diagram rendering
- [Claude](https://www.anthropic.com/claude) - AI assistance
