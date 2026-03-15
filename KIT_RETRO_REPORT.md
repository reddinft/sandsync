# Kit Retro Generation Report
**Date:** 2026-03-16  
**Agent:** Kit (backend specialist)

---

## Summary

Fixed 3 backend issues with the SandSync API/app. All 11 stories now have both images and audio.

---

## Task 1: Retro-generate Missing Images & Audio ✅

**Problem:** 5 stories were missing image_url and/or audio_url on chapter 1.

**Before:**
- `3ad4ba52` — ✅ img | ❌ audio (Shopkeeper's Gift)
- `f0edceb5` — ✅ img | ❌ audio (Girl Between the Silk Cotton Trees)
- `97105ad2` — ❌ img | ❌ audio (Waterfall's Blessing)
- `c2165ace` — ❌ img | ❌ audio (Mahogany Boundary)
- `e5bc058e` — ❌ img | ❌ audio (Fisherman's Midnight Bargain)

**After:** All 11+ stories have ✅ img | ✅ audio

**How:**
- `scripts/retro_generate.py` already existed with fal.ai + Gemini Imagen cascade
- Images generated via **Gemini Imagen 4.0 Fast** (fal.ai key not available locally, only in fly.io secrets)
- Audio generated via **ElevenLabs TTS** (voice `dhwafD61uVd8h85wAZSE` / Denzel, model `eleven_turbo_v2_5`)
- Run with env vars: `GEMINI_KEY`, `EL_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Key fix:** Gemini Imagen API requires the API key as a URL query parameter (`?key=...`), NOT as a Bearer token header. The existing script already handled this correctly once the right env var was set.

---

## Task 2: Fix Showcase Page to Filter Stories Without Images ✅

**File:** `apps/web/app/routes/showcase.tsx`

**Changes:**
1. Added filter after fetching stories: `all.filter((s) => s.first_chapter?.image_url)`
2. Updated header subtitle to show count: `"X stories — Previously generated Caribbean folklore"`

**Effect:** Showcase page now shows only stories with cover images (no broken image placeholders).

---

## Task 3: Isolate Imagen from Devi Failures in Pipeline ✅

**File:** `apps/api/src/mastra/workflows/story-pipeline.ts`

**Problem:** If Devi (TTS narration) threw an error outside its inner try/catch, Imagen (image generation) might not run.

**Fix:** Wrapped the entire Devi `if (!dryRun) { ... } else { ... }` block in an outer guard:
```typescript
// Devi is fully wrapped — any unhandled throw is caught here so Imagen always runs
try {
  if (!dryRun) { /* Devi block */ } else { /* dry-run mock */ }
} catch (deviGuardErr: any) {
  console.warn(`  [Devi] 🛡️  Guard caught unhandled error: ${deviGuardErr.message} — Imagen will still run`);
  await writeAgentEvent(supabase, storyId, "devi", "failed", { ... });
}
// Imagen runs here regardless
```

Note: The original structure already had inner try/catches. This outer guard is a belt-and-suspenders safety net to ensure imagen ALWAYS runs, even in edge cases.

---

## Deployments

- **API:** `flyctl deploy --app sandsync-api --strategy immediate` ✅
- **Frontend:** `npx vercel --prod` → https://web-eta-black-15.vercel.app ✅

---

## Verification

```
45efd1b9 | img ✅ | aud ✅ | The Fisherman's Bargain: What Mama Dlo T
40548f3d | img ✅ | aud ✅ | The Fisherman's Bargain: What Mama Dlo T
c8e42300 | img ✅ | aud ✅ | The Last Fare
33bc0729 | img ✅ | aud ✅ | The Voice of Mama Dlo
8a1b6e07 | img ✅ | aud ✅ | Anansi and the Lion's Stolen Thunder
a870513f | img ✅ | aud ✅ | Anansi and the Lion's Pride
888b6736 | img ✅ | aud ✅ | The Parrot's Message
3ad4ba52 | img ✅ | aud ✅ | The Shopkeeper's Gift
f0edceb5 | img ✅ | aud ✅ | The Girl Between the Silk Cotton Trees
97105ad2 | img ✅ | aud ✅ | The Waterfall's Blessing
c2165ace | img ✅ | aud ✅ | The Mahogany Boundary
e5bc058e | img ✅ | aud ✅ | The Fisherman's Midnight Bargain: Anansi
```

---

## Notes

- The audio from the first run (`briny-cedar` session) actually succeeded for ALL missing audio stories (11 chapters total across 5 stories — all chapters, not just chapter 1)
- The retro_generate.py script correctly only targets chapter 1 images as the `first_chapter` is what the `/stories` API uses for cover images
- FAL_KEY is stored in fly.io secrets but not locally — Gemini Imagen was used as the image provider instead (same visual quality)
- Commit: `8ef9940`
