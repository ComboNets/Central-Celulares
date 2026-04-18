# Central Celulares (Phone Showcase)
A simple phone catalog built with Vite + React.

## Data workflow (Excel → JSON)
Source of truth: `data/products.xlsx`

Generate the JSON consumed by the app:
- `public/data/products.json`
- `docs/data/products.json`

Command:
- `npm run sync:products`

## Photos
- **Source photos (local-only):** `assets-src/` (ignored by git)
- **Served photos:** `public/images/fotos/`

The script `scripts/link-fotos-to-products.mjs` can map/copy images from `assets-src/` into `public/images/fotos/` and update `data/products.xlsx` image paths.

## Development
```sh
npm install
npm run dev
```

## Build / GitHub Pages
This repo is configured to build into `docs/`.

```sh
npm run build:gh
```

## Environment variables
Copy `.env.example` to `.env`:
- `VITE_WHATSAPP_NUMBER`

## Admin publish API (single commit push)
The admin app can queue many local product edits and publish them in one commit to `main` via Worker API routes:
- `GET /api/products`
- `POST /api/products/publish`

Required Wrangler secrets:
- `GITHUB_TOKEN` (GitHub token with `contents:write` for this repo)
- `ADMIN_API_TOKEN` (bearer token expected by `/api/products/publish`)

Set secrets:
- `npx wrangler secret put GITHUB_TOKEN`
- `npx wrangler secret put ADMIN_API_TOKEN`
