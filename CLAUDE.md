# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Build to docs/ (production)
npm run build:gh     # Build + copy 404.html for GitHub Pages
npm run lint         # ESLint

# Data management
npm run sync:products   # Convert data/products.xlsx → public/data/products.json
npm run sync:images     # Map public/images/fotos/ photos to products in JSON
npm run translate:es    # Translate products to Spanish then sync
```

No test runner is configured.

## Architecture

**Static SPA** — Vite + React + TypeScript, deployed to Cloudflare Workers (wrangler.jsonc). There is no backend or database. All product data originates in `data/products.xlsx`, is converted to `public/data/products.json` by Node.js scripts, and consumed by the frontend at runtime via `fetch`.

**Data pipeline:**
```
data/products.xlsx
  → npm run sync:products → public/data/products.json
  → npm run sync:images   → annotates JSON with image paths from public/images/fotos/
```

The JSON file is the frontend's source of truth. Editing it directly will be overwritten on next sync.

**Data fetching:** `usePhones` hook (src/hooks/usePhones.ts) fetches `products.json` via React Query, applies client-side filtering (brand, price range, year, search text) and sorting. All filtering happens in-browser — there is no API.

**Routing** (React Router v6):
- `/` — Home with featured & sale sections
- `/catalog` — Full catalog with sidebar filters
- `/phone/:id` — Phone detail with specs and WhatsApp CTA
- `/services`, `/about` — Static info pages

**WhatsApp integration:** `useSettings` hook (src/hooks/useSettings.ts) reads `VITE_WHATSAPP_NUMBER` from env and generates inquiry links. This is the primary purchase CTA across the app.

## Key Files

| Path | Purpose |
|------|---------|
| `src/types/products.ts` | `Phone` and `Brand` TypeScript interfaces — source of type truth |
| `src/hooks/usePhones.ts` | All data fetching and filter logic |
| `src/hooks/useSettings.ts` | WhatsApp config and link generation |
| `src/lib/utils.ts` | `cn()` — clsx + tailwind-merge helper used everywhere |
| `vite.config.ts` | Builds to `docs/`, path alias `@/` → `src/` |
| `tailwind.config.ts` | Custom colors (`primary`, `sale`, `whatsapp`, `sidebar`) and entrance animations |
| `.env.example` | Copy to `.env`; only required var is `VITE_WHATSAPP_NUMBER` |

## UI Conventions

- Components use **shadcn/ui** (`src/components/ui/`) — Radix UI primitives styled with Tailwind.
- Class merging always goes through `cn()` from `src/lib/utils.ts`.
- Custom Tailwind animations: `fade-in`, `slide-in-right`, `scale-in`, `pulse-glow` — defined in `tailwind.config.ts`.
- TypeScript is intentionally relaxed (`noImplicitAny: false`, `strictNullChecks: false`).
- UI language is Spanish.
