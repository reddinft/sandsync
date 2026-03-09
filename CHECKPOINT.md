# CHECKPOINT — SandSync: 8 Critical QA Fixes (Oli Review)

**Commit:** `1fd7fd0`
**Branch:** `main`
**Date:** 2026-03-10

---

## Fix 1 — Configurable Ollama model (`apps/api/src/mastra/agents/ogma.ts`)

Replaced hardcoded `ollama("qwen2.5:latest")` with `ollama(process.env.OLLAMA_MODEL || "qwen2.5:latest")`.
Updated the comment from `qwen3:4b` reference to reflect env-var override.
Operators can now hot-swap the local model without redeploying.

---

## Fix 2 — AbortController timeout on Gemini Imagen (`apps/api/src/services/imagen.ts`)

Added `AbortController` with `setTimeout(() => controller.abort(), 30_000)` around the Imagen `fetch()`.
Caught `AbortError` → rethrows `new Error("Image generation timed out")`.
Prevents the story pipeline from hanging indefinitely if the Imagen API stalls.

---

## Fix 3 — Async file writes (`apps/api/src/services/imagen.ts` + `story-pipeline.ts`)

Replaced all `fs.writeFileSync(...)` calls with `await writeFile(...)` from `fs/promises`.
Added `import { writeFile } from "fs/promises"` to both files.
Removes blocking I/O from async pipeline steps, improving throughput under concurrent story requests.

---

## Fix 4 — Relative image URLs + static `/images/*` handler

**`imagen.ts`:** `saveImageBase64` now returns `/images/{storyId}/chapter_{n}.png` instead of a `data:` URL.
**`index.ts`:** Added `GET /images/*.png` route — reads the file from `IMAGE_DIR` (or `./images/`) via `Bun.file`, returns `Content-Type: image/png` with a 1-hour cache header.
Eliminates massive base64 payloads in Supabase rows and SSE events.

---

## Fix 5 — Safe `JSON.parse` for event payloads (`$id.tsx` + `$id.agents.tsx`)

Wrapped every `JSON.parse(event.payload)` in an IIFE try-catch returning `{}` on error.
Prevents a single malformed event from crashing the story reader or agent debug view.

---

## Fix 6 — AudioPlayer null-src guard (`apps/web/app/components/AudioPlayer.tsx`)

Added early return at the top of the render path: if `!src`, returns a minimal `<div>` with `<p className="text-xs text-amber-200/40">Audio not available</p>`.
Prevents the `<audio src="">` element from firing a spurious network request and triggering the error state.

---

## Fix 7 — PowerSync connection error banner (`apps/web/app/routes/__root.tsx`)

Added `connectionError` state. The existing `connectDb` catch now calls `setConnectionError(err.message)`.
A rose-coloured banner (`bg-rose-900/80 border-rose-500/50 text-rose-200`) renders above the header when the error is set, informing users that sync failed and the app is running from local cache.

---

## Fix 8 — Offline status polling (`apps/web/app/routes/stories/$id.tsx`)

Added `pollStatus` state and a `useEffect` that starts a `setInterval` polling `GET /stories/{id}/status` every **2 seconds** when `!syncStatus.connected`.
Poll results are merged into the agent status display: `completedAgents` and `totalAgents` use `pollStatus.chapters_complete` / `pollStatus.total_chapters` when offline, and `isGenerating` reflects `pollStatus.status` when available.
The interval is cleared when the component unmounts or PowerSync reconnects.

---

## Test results

```
bun test v1.3.9
 7 pass
 0 fail
 23 expect() calls
Ran 7 tests across 1 file. [1.90s]
```
