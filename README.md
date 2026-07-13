# EG Shop

EG Shop is a self-hosted TanStack Start marketplace. The application no longer
depends on Lovable for building, assets, domains, analytics, or AI gateway access.

## Requirements

- Node.js 24 LTS
- npm 11+
- A Supabase project

## Local setup

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Before starting, fill the public Supabase URL and publishable key in `.env.local`.
Do not place a Supabase secret/service-role key in any `VITE_` variable.

## Verification

```bash
npm run typecheck
npm run lint
npm run build
npm run start
```

The production server listens on `PORT` (3000 by default) and starts from
`.output/server/index.mjs`.

## AI Edge Functions

`visual-search` and `ai-auto-reply` use an OpenAI-compatible chat-completions
endpoint. Configure these as Supabase Edge Function secrets:

```text
AI_API_URL=https://provider.example/v1/chat/completions
AI_API_KEY=...
AI_MODEL=provider-model-name
```

Set secrets in the Supabase dashboard or with `supabase secrets set`. Never commit
AI credentials or Supabase secret keys.

## Production

Use either the included Dockerfile/docker-compose setup or the systemd and Nginx
examples under `deploy/`. Nginx should reverse-proxy to the Node server; it must
not serve files from an old build directory.
