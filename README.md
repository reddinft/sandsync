# SandSync 🌴

**Offline-first AI storytelling platform** — PowerSync AI Hackathon 2026

An immersive Caribbean folklore storytelling experience powered by a multi-agent AI pipeline. Named agents with distinct cultural voices collaborate asynchronously to write, narrate, and sync stories in real-time — even when you're offline.

## The Agent Pipeline

```
User request
    │
    ▼
Papa Bois (Orchestrator) — Trinidad 🇹🇹
  Parses request, assigns theme/genre, queues to Anansi
    │
    ▼
Anansi (Storyteller) — Trinidad 🇹🇹
  Writes the story draft, chapter by chapter
    │
    ▼
Ogma (Language Guardian) — Irish 🇮🇪
  Reviews for language quality, cultural authenticity
    │
    ▼
Devi (Voice/Audio) — 🙏 Sanskrit
  Triggers ElevenLabs narration per chapter, attaches audio URL
    │
    ▼
Story synced to user via PowerSync ✅
```

## Tech Stack

| Layer | Technology |
|---|---|
| Sync engine | PowerSync |
| Backend DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Agent orchestration | Mastra |
| Frontend | TanStack Start |
| AI — Papa Bois, Anansi, Devi | Claude Haiku |
| AI — Ogma (Language Guardian) | qwen3:4b local |
| Voice narration | ElevenLabs |

## Monorepo Structure

```
sandsync/
├── apps/
│   ├── web/          # TanStack Start frontend
│   └── api/          # Mastra agent backend
├── packages/
│   └── db/           # Shared Supabase types + schema
├── supabase/
│   ├── migrations/   # SQL schema files
│   └── config.toml   # Supabase local config
└── package.json      # Root workspace
```

## Getting Started

```bash
# Install dependencies
bun install

# Start local Supabase
supabase start

# Run development servers
bun dev
```

## Story Genres

Caribbean folklore only: Anansi stories, Papa Bois mythology, Soucouyant, Lagahoo, La Diablesse, and more.
