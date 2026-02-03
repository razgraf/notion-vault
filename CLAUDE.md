# Notion Vault

A self-hosted viewer for Notion workspace exports with dark-mode aesthetics.

## Tech Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- Bun as package manager

## Project Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/               # REST endpoints (nav, page, csv, image, search)
│   └── page/[slug]/       # Dynamic page route
├── components/            # React components (Sidebar, PageContent, Table, SearchModal)
└── lib/
    ├── config.ts          # Loads notion-preview.config.js
    ├── parser/            # index.html, markdown, CSV, HTML metadata parsers
    └── search/            # MiniSearch full-text search
```

## Key Files

- `notion-preview.config.js` — User configuration (workspace paths, features)
- `workspace/html/index.html` — Source of truth for navigation tree (from HTML export)
- `workspace/markdown/**/*.md` — Markdown pages
- `workspace/markdown/**/*.csv` — Database exports
- `workspace/html/**/*.html` — HTML pages (for icons and property colors)

## Commands

```bash
bun run dev      # Development server
bun run build    # Production build
bun run lint     # ESLint
```

## Code Conventions

- Use `bun` for all package operations
- Prefer Tailwind utility classes over custom CSS
- Components use 'use client' directive when needed
- API routes read from `/workspace` folder at runtime

## Workspace Structure

The app uses a hybrid data source:
- **Markdown export** (`workspace/markdown/`): Content, CSV data
- **HTML export** (`workspace/html/`): Navigation tree, icons, property colors

## Notion Dark Theme Colors

```css
--bg-primary: #191919;
--bg-secondary: #202020;
--bg-tertiary: #2f2f2f;
--text-primary: rgba(255, 255, 255, 0.81);
--text-secondary: rgba(255, 255, 255, 0.44);
--accent: #2eaadc;
--border: rgba(255, 255, 255, 0.08);
```

## Testing Changes

1. Ensure `workspace/` has valid Notion exports (markdown and html folders)
2. Run `bun run dev` and check http://localhost:3000
3. Verify: sidebar navigation, page rendering, images, search (Cmd+K)
4. Test icons: pages should show emoji/image icons in sidebar and page headers
