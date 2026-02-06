# AGENTS.md

This file provides AI coding agents with technical context for working with this Astro Starlight documentation site.

## Project Type

**Astro Starlight Documentation Site** — Static site generator for technical documentation with bilingual support (English/Traditional Chinese).

## Quick Commands

```bash
# Development
npm install                    # Install dependencies
npm run dev                    # Start dev server → http://localhost:4321/ai-agent-study/
npm run build                  # Production build (includes type checking)
npm run preview                # Preview production build

# Validation
npm run astro check            # TypeScript and content validation
```

## Architecture

### Stack

- **Framework**: Astro 5 with Starlight theme
- **Content**: Markdown/MDX files in `src/content/docs/`
- **Styling**: Tailwind CSS (via Starlight)
- **Diagrams**: Mermaid v11 (client-side rendering via CDN)
- **Deployment**: GitHub Actions → GitHub Pages
- **TypeScript**: Strict mode enabled

### Critical Configuration

**Base Path**: `/ai-agent-study` — ALL internal links must use this prefix

- Development URL: `http://localhost:4321/ai-agent-study/`
- Production URL: `https://schwannden.github.io/ai-agent-study/`

**Config Files**:

- `astro.config.mjs` — Site config, i18n, sidebar navigation, Mermaid setup
- `src/content/config.ts` — Content collections schema
- `.github/workflows/deploy.yml` — CI/CD pipeline

## Content Management

### File Structure

```
src/content/docs/
├── index.mdx                    # Splash page (landing)
├── case-study.md                # Overview article
├── react/                       # 4-part tutorial
├── plan-execute-verify/         # 4-part tutorial
├── human-in-the-loop/           # 5-part tutorial with index
├── resources/                   # Cross-reference docs
└── zh-tw/                       # Traditional Chinese (mirrors English structure)
```

### Frontmatter Requirements

Every content file MUST include:

```yaml
---
title: Page Title
description: Brief description for SEO and previews
---
```

**Optional fields**: `sidebar.label`, `sidebar.badge`, `prev`, `next`

### Internal Linking Rules

✅ **CORRECT**: Use full base path

```markdown
[Link text](/ai-agent-study/react/01-overview/)
```

❌ **INCORRECT**: These will break

```markdown
[Link text](/react/01-overview/) # Missing base path
[Link text](./react/01-overview/) # Relative paths unreliable
[Link text](../plan-execute-verify/) # Avoid relative navigation
```

### Mermaid Diagrams

Diagrams render **client-side only** (no build-time processing):

````markdown
```mermaid
graph LR
    A[Start] --> B[Process]
    B --> C[End]
```
````

**Features**:

- Auto-detects code blocks with `mermaid` language
- Theme-aware (dark/light mode switching)
- Interactive zoom/pan via svg-pan-zoom
- Test syntax at https://mermaid.live/ before committing

## Development Workflow

### Adding New Content

1. Create `.md` or `.mdx` file in appropriate `src/content/docs/` subdirectory
2. Add required frontmatter (`title`, `description`)
3. Use full base paths for all internal links
4. Update `sidebar` in `astro.config.mjs` if adding new section
5. **CRITICAL**: Update `public/llms.txt` with the new page URL, title, and description
6. Run `npm run build` to verify (fails on type errors or broken links)

**GOLDEN RULE**: Always update `public/llms.txt` when modifying document structure (add/remove/move/rename files). This file is the public index of all documentation and must stay in sync with actual content.

### Translation to Traditional Chinese

Use the `i18n-translator` skill or manual process:

1. Create corresponding file in `src/content/docs/zh-tw/`
2. Translate content (keep code examples and technical terms consistent)
3. Update internal links to include `zh-tw/` prefix: `/ai-agent-study/zh-tw/react/01-overview/`
4. Verify navigation in both locales

**Translation Guidelines**:

- Keep frontmatter structure identical
- Preserve code blocks and technical terms
- Maintain heading hierarchy
- Update cross-references to point to translated pages

### Sidebar Configuration

Edit `astro.config.mjs` → `starlight()` → `sidebar` array:

```javascript
sidebar: [
  {
    label: 'Section Name',
    items: [
      { label: 'Page', slug: 'folder/page' }, // No .md extension
      { label: 'Badge Page', slug: 'folder/page', badge: { text: 'New', variant: 'success' } },
    ],
  },
];
```

**Notes**:

- `slug` is relative to `src/content/docs/` (no leading slash)
- Auto-generates pages for `index.md` files in directories
- Collapsible groups supported via nested `items` arrays

## Build and Deployment

### Build Process

```bash
npm run build
```

**Build Steps**:

1. `astro check` — TypeScript validation
2. `astro build` — Static site generation
3. Output → `dist/` directory

**Common Build Errors**:

- Missing frontmatter → Add `title` and `description`
- Type errors → Check `src/content/config.ts` schema
- Broken links → Verify base path usage
- Invalid Mermaid → Test at mermaid.live

### GitHub Actions Deployment

**Trigger**: Push to `main` branch

**Workflow** (`.github/workflows/deploy.yml`):

1. Checkout code
2. Setup Node.js (version 20)
3. Cache npm dependencies
4. Run `npm ci`
5. Run `npm run build`
6. Deploy to GitHub Pages via `actions/deploy-pages@v4`

**Requirements**:

- GitHub Pages source set to "GitHub Actions" (NOT branch)
- Configure at: `https://github.com/schwannden/ai-agent-study/settings/pages`
- Workflow needs `pages: write` and `id-token: write` permissions

### Verifying Deployment

1. Check Actions tab: `https://github.com/schwannden/ai-agent-study/actions`
2. Wait for deployment completion (usually 2-3 minutes)
3. Visit: `https://schwannden.github.io/ai-agent-study/`
4. Test navigation and locale switching

## Code Conventions

### TypeScript

- Strict mode enabled (`astro/tsconfigs/strict`)
- Type errors fail builds
- Schema validation via Zod in `src/content/config.ts`

### Markdown Style

- ATX-style headers (`#`, `##`, `###`)
- Fenced code blocks with language identifiers
- Tables for structured data
- Admonitions via Starlight syntax: `:::note`, `:::tip`, `:::caution`, `:::danger`

### File Naming

- Lowercase with hyphens: `plan-execute-verify.md`
- Numbered prefixes for ordered tutorials: `01-overview.md`, `02-implementation.md`
- `index.md` for section landing pages

## Common Patterns

### Tutorial Section Structure

Each multi-part tutorial follows this pattern:

```
tutorial-name/
├── index.md              # Section overview (optional)
├── 01-part-one.md
├── 02-part-two.md
└── 03-part-three.md
```

### Cross-Referencing

Use consistent link patterns:

```markdown
See the [ReAct tutorial](/ai-agent-study/react/01-overview/) for foundational concepts.

Related: [Plan-Execute-Verify](/ai-agent-study/plan-execute-verify/)
```

### Code Examples

Include language identifiers for syntax highlighting:

````markdown
```typescript
// TypeScript code
const agent: Agent = { ... };
```

```python
# Python code
def create_agent():
    pass
```
````

## Troubleshooting

### Dev Server Issues

- **Port conflict**: Change port with `npm run dev -- --port 4322`
- **Hot reload fails**: Restart dev server, check for syntax errors
- **404 on dev**: Ensure using full base path in URLs

### Build Failures

- **Type errors**: Run `npm run astro check` for detailed diagnostics
- **Content schema**: Verify frontmatter matches `src/content/config.ts`
- **Memory issues**: Increase Node memory: `NODE_OPTIONS=--max-old-space-size=4096 npm run build`

### Deployment Issues

- **404 on GitHub Pages**: Verify `base` path matches repository name
- **Pages not updating**: Check GitHub Actions logs, clear browser cache
- **Missing assets**: Ensure all imports use relative paths from `src/`

## Project-Specific Notes

### Original Content

### Disabled Features

- **Starlight Blog Plugin**: Disabled due to schema compatibility issues. Use standard docs structure instead.

### Repository Renaming

If repository name changes, update:

1. `astro.config.mjs` → `site` and `base` fields
2. All internal links in content files (find/replace `/ai-agent-study/`)
3. GitHub Pages configuration
4. Update this file

## Agent-Specific Guidance

### When Adding Content

1. **CRITICAL**: Update `public/llms.txt` whenever adding/removing/moving content files
2. Always run `npm run build` before committing to catch errors
3. Check both English and Chinese navigation if updating sidebar
4. Use full base paths in all links — this is non-negotiable
5. Test Mermaid diagrams at mermaid.live if complex

### When Modifying Configuration

1. `astro.config.mjs` changes require dev server restart
2. Sidebar changes reflect immediately in dev mode
3. Schema changes in `src/content/config.ts` require content updates

### When Troubleshooting

1. Check `npm run astro check` output for specific errors
2. Review GitHub Actions logs for deployment failures
3. Verify GitHub Pages settings are correct
4. Test locally with `npm run preview` before pushing

## Additional Resources

- Astro Docs: https://docs.astro.build/
- Starlight Docs: https://starlight.astro.build/
- Mermaid Docs: https://mermaid.js.org/
- GitHub Actions Docs: https://docs.github.com/en/actions
