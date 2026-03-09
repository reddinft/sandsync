# SandSync Deployment Guide

## Architecture

- **Frontend:** Vercel (TanStack Router SPA)
- **Backend API:** Fly.io `syd` region (Bun + Mastra agent pipeline)
- **Database:** Supabase `ap-southeast-2` (Sydney) — co-located with Fly.io `syd`
- **Sync:** PowerSync `69ae074bd42a43395100b01b.powersync.journeyapps.com`

## Deploy Frontend (Vercel)

```bash
cd apps/web
vercel --prod
```

### Required Vercel env vars:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://houtondlrbwaosdwqyiu.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | (from apps/web/.env.local) |
| `VITE_POWERSYNC_URL` | `https://69ae074bd42a43395100b01b.powersync.journeyapps.com` |
| `VITE_API_URL` | `https://sandsync-api.fly.dev` |

## Deploy Backend API (Fly.io)

```bash
cd apps/api
flyctl apps create sandsync-api --org personal
flyctl deploy --remote-only
```

### Required Fly.io secrets:

```bash
flyctl secrets set \
  SUPABASE_URL=https://houtondlrbwaosdwqyiu.supabase.co \
  SUPABASE_SERVICE_KEY=<service-role-key> \
  ANTHROPIC_API_KEY=<from-1password> \
  ELEVENLABS_API_KEY=<from-1password>
```

## Running Tests

```bash
# API unit tests
cd apps/api && bun test

# E2E tests (requires dev server)
cd apps/web && bun run test:e2e

# All tests
bun test # from root
```

## PowerSync Configuration

The frontend uses PowerSync with SharedArrayBuffer (WASM SQLite), which requires CORS headers:

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

These are configured in:
- **Production (Vercel):** `vercel.json` headers section
- **Development (local):** `vite.config.ts` server.headers
