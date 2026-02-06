# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **Astro Starlight documentation site** for AI Agent tutorials, deployed to GitHub Pages at `https://schwanndenkuo.github.io/ai-agent-study/`. The site teaches developers how to build production-ready AI agents using patterns like ReAct, Plan-Execute-Verify, and Human-in-the-Loop.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (opens at http://localhost:4321/ai-agent-study/)
npm run dev

# Build for production (includes TypeScript checking)
npm run build

# Preview production build
npm run preview

# Run Astro CLI commands
npm run astro -- <command>

# Code quality tools
npm run lint          # Check code and markdown for issues
npm run lint:fix      # Auto-fix linting issues
npm run format        # Format all files with Prettier
npm run format:check  # Verify formatting without changes
npm run typecheck     # Run TypeScript type checking
```

## Code Quality Tools

This project uses a comprehensive code quality toolchain to maintain consistency and catch issues early:

- **ESLint** - Lints JavaScript/TypeScript/Astro files with strict TypeScript checking
- **Prettier** - Formats code and markdown consistently across all files
- **markdownlint** - Ensures documentation quality (only lints `src/content/docs/`)
- **EditorConfig** - Cross-editor consistency settings
- **Husky + lint-staged** - Pre-commit hooks that run automatically

### Available Commands

- `npm run lint` - Check code and markdown for issues (CI-friendly)
- `npm run lint:fix` - Auto-fix linting issues where possible
- `npm run format` - Format all files with Prettier
- `npm run format:check` - Verify formatting without changes (CI-friendly)
- `npm run typecheck` - Run TypeScript type checking

### Pre-commit Hooks

Pre-commit hooks automatically run when you commit changes:

- Format staged files with Prettier
- Fix linting issues with ESLint
- Check markdown quality with markdownlint
- Run type checking on TypeScript files

**To skip hooks in emergency situations:**

```bash
git commit --no-verify -m "emergency: skip hooks"
```

**Note:** Only use `--no-verify` when absolutely necessary. Hooks catch issues before they reach CI.

### VS Code Integration

Install recommended extensions when prompted. Editor settings automatically:

- Format on save
- Fix ESLint issues on save
- Highlight linting errors inline
- Check markdown quality as you type

### Configuration Files

- `.eslintrc.config.mjs` - ESLint rules (TypeScript strict mode for .ts files)
- `.prettierrc.mjs` - Prettier formatting options
- `.markdownlint-cli2.jsonc` - Markdown linting rules (only `src/content/docs/`)
- `.editorconfig` - Editor settings (tabs for code, spaces for markdown)
- `.lintstagedrc.mjs` - Pre-commit hook configuration

## Architecture

### Content Organization

Content lives in `src/content/docs/` with the following structure:

- **Bilingual Support**: Root locale (English) and `zh-tw/` locale for Traditional Chinese
- **Tutorial Sections**: `react/`, `plan-execute-verify/`, `human-in-the-loop/`
- **Resources**: `resources/` for cross-cutting documentation

### Key Configuration Files

- **`astro.config.mjs`**: Main configuration with:
  - `site`: GitHub Pages URL
  - `base`: `/ai-agent-study` base path (critical for routing)
  - `locales`: English (root) and Traditional Chinese (zh-tw)
  - **Mermaid Setup**: Client-side rendering via CDN with zoom/pan controls
  - `sidebar`: Navigation structure with badges and collapsible sections

- **`src/content/config.ts`**: Content collections schema using Starlight's docsSchema

### Mermaid Diagrams

Diagrams are rendered **client-side** using Mermaid v11:

- CDN loaded via `<head>` in `astro.config.mjs`
- Automatic conversion of `pre[data-language="mermaid"]` blocks
- Theme-aware (dark/light mode)
- Interactive zoom/pan controls via svg-pan-zoom library
- No build-time dependencies required

Usage in markdown:

````markdown
```mermaid
graph LR
    A[Start] --> B[Process]
    B --> C[End]
```
````

## Deployment

### GitHub Actions Workflow

File: `.github/workflows/deploy.yml`

- **Trigger**: Auto-deploy on push to `main` branch
- **Build**: `npm run build` (includes TypeScript checking via `astro check`)
- **Deploy**: GitHub Pages via Actions (not branch-based)
- **Cache**: npm dependencies cached for faster builds

### GitHub Pages Configuration

**CRITICAL**: GitHub Pages must be set to "GitHub Actions" source (NOT branch-based) at:
`https://github.com/schwanndenkuo/ai-agent-study/settings/pages`

## Content Guidelines

### Frontmatter Requirements

All markdown files in `src/content/docs/` must include:

```yaml
---
title: Page Title
description: Page description for SEO
---
```

### Internal Links

Always use the full base path in links:

- ✅ `/ai-agent-study/react/01-overview/`
- ❌ `/react/01-overview/` (will break)
- ❌ `./react/01-overview/` (relative paths don't work reliably)

### i18n Translation

Use the `i18n-translator` skill for translating content to Traditional Chinese:

- Creates corresponding `zh-tw/` files
- Updates internal links for locale
- Follows technical documentation translation guidelines
- See `i18n-translator.skill` for details

### llms.txt Maintenance

**GOLDEN RULE**: Whenever you modify the document structure (add/remove/move/rename content files), you MUST update `public/llms.txt` to keep the site index current.

The `llms.txt` file serves as a public-facing index of all documentation and is critical for AI discoverability. Update it when:

- Adding new tutorials or pages
- Removing or deprecating content
- Reorganizing sections or folders
- Changing page titles or descriptions
- Adding translated content (zh-tw pages)

Format: Each entry includes URL, title, and brief description. Maintain consistent formatting and keep entries organized by section.

## File Structure Patterns

```
src/content/docs/
├── index.mdx                    # Landing page (splash template)
├── case-study.md                # Overview article
├── react/                       # Beginner tutorial (4 parts)
│   ├── 01-overview.md
│   ├── 02-claude-implementation.md
│   ├── 03-model-agnostic.md
│   └── 04-langchain.md
├── plan-execute-verify/         # Advanced tutorial (4 parts)
├── human-in-the-loop/           # Interactive pattern (5 parts with index)
├── resources/                   # Cross-references and comparisons
└── zh-tw/                       # Traditional Chinese translations
    └── [mirrors English structure]
```

## Common Tasks

### Adding New Tutorial Content

1. Create markdown file in appropriate section (e.g., `src/content/docs/react/`)
2. Add frontmatter with `title` and `description`
3. Update `sidebar` array in `astro.config.mjs` if adding new section
4. Use full base paths for all internal links
5. Run `npm run build` to verify (includes TypeScript checking)

### Adding Mermaid Diagrams

1. Use standard markdown code blocks with `mermaid` language identifier
2. Test at https://mermaid.live/ if syntax is complex
3. Diagrams automatically get zoom/pan controls
4. Check both dark and light themes

### Translating to Traditional Chinese

1. Use `/i18n-translator` skill or run manually
2. Create corresponding file in `src/content/docs/zh-tw/`
3. Update internal links to include `zh-tw/` locale prefix
4. Verify navigation works in both locales

## Important Notes

### Base Path

The site uses `base: '/ai-agent-study'` - all routing depends on this. Changing the repository name requires updating:

- `astro.config.mjs` → `base` field
- `astro.config.mjs` → `site` field
- All internal links in content files

### Starlight Blog Plugin

The starlight-blog plugin is **disabled** due to schema compatibility issues. Content uses standard Starlight documentation features instead.

### Development vs Production URLs

- Development: `http://localhost:4321/ai-agent-study/`
- Production: `https://schwanndenkuo.github.io/ai-agent-study/`

### TypeScript Configuration

Project uses strict TypeScript checking via `astro/tsconfigs/strict`. The build command runs `astro check` before building, so type errors will fail the build.
