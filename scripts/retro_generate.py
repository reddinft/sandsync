#!/usr/bin/env python3
"""
retro_generate.py — Backfill missing images and audio for existing SandSync stories.

Current state (verified via Supabase):
  97105ad2-ef67-401a-a125-499bfc4815f7 — The Waterfall's Blessing        → needs IMAGE
  c2165ace-3d9c-4e13-8423-10fbec8f86a9 — The Mahogany Boundary           → needs IMAGE
  e5bc058e-8251-4ab9-8a85-00e17f9d911e — The Fisherman's Midnight Bargain → needs IMAGE
  3ad4ba52-c963-49db-b66e-5717f95fdc83 — The Shopkeeper's Gift            → already has both ✅
  f0edceb5-d90d-4ff1-99b0-f92e68191271 — The Girl Between the Silk Cotton → already has both ✅
"""

import os
import sys
import json
import time
import base64
import urllib.request
import urllib.error

# ── Credentials ────────────────────────────────────────────────────────────────

SUPABASE_URL = "https://houtondlrbwaosdwqyiu.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
FAL_KEY      = os.environ.get("FAL_KEY", "")
GEMINI_KEY   = os.environ.get("GEMINI_KEY", "")
EL_KEY       = os.environ.get("EL_KEY", "")

ELEVENLABS_VOICE_ID = "dhwafD61uVd8h85wAZSE"
ELEVENLABS_MODEL    = "eleven_turbo_v2_5"

# ── Story targets — full UUIDs ─────────────────────────────────────────────────

STORIES = [
    {
        "id":    "97105ad2-ef67-401a-a125-499bfc4815f7",
        "title": "The Waterfall's Blessing",
        "need_image": True,
        "need_audio": False,  # already has audio
    },
    {
        "id":    "c2165ace-3d9c-4e13-8423-10fbec8f86a9",
        "title": "The Mahogany Boundary",
        "need_image": True,
        "need_audio": False,  # already has audio
    },
    {
        "id":    "e5bc058e-8251-4ab9-8a85-00e17f9d911e",
        "title": "The Fisherman's Midnight Bargain: Anansi at the Edge of the Sea",
        "need_image": True,
        "need_audio": False,  # already has audio
    },
]

# ── HTTP helpers ───────────────────────────────────────────────────────────────

def http_get(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())

def http_post_json(url, data, headers=None):
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers={
        "Content-Type": "application/json",
        **(headers or {}),
    })
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read())

def http_post_raw(url, data: bytes, content_type: str, headers=None):
    """POST raw bytes (for file uploads)."""
    req = urllib.request.Request(url, data=data, headers={
        "Content-Type": content_type,
        **(headers or {}),
    })
    with urllib.request.urlopen(req, timeout=60) as resp:
        raw = resp.read()
        try:
            return json.loads(raw)
        except Exception:
            return {"raw": raw.decode(errors="replace")}

def http_fetch_bytes(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()

# ── Supabase helpers ───────────────────────────────────────────────────────────

def supa_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }

def get_chapter1(story_id: str) -> dict | None:
    """Fetch chapter 1 for a story by full UUID."""
    url = (
        f"{SUPABASE_URL}/rest/v1/story_chapters"
        f"?story_id=eq.{story_id}"
        f"&chapter_number=eq.1"
        f"&select=id,story_id,content,image_url,audio_url"
        f"&limit=1"
    )
    headers = {**supa_headers(), "Accept": "application/json"}
    rows = http_get(url, headers)
    return rows[0] if rows else None

def update_chapter(chapter_id: str, updates: dict):
    url = f"{SUPABASE_URL}/rest/v1/story_chapters?id=eq.{chapter_id}"
    headers = {
        **supa_headers(),
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    body = json.dumps(updates).encode()
    req = urllib.request.Request(url, data=body, method="PATCH", headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.status

def upload_to_storage(bucket: str, path: str, data: bytes, content_type: str) -> str | None:
    url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{path}"
    headers = {
        **supa_headers(),
        "x-upsert": "true",
    }
    result = http_post_raw(url, data, content_type, headers)
    if isinstance(result, dict) and result.get("error"):
        print(f"  [Storage] Upload error: {result}")
        return None
    public_url = f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}"
    return public_url

# ── Image generation ───────────────────────────────────────────────────────────

def make_illustration_prompt(content: str, title: str) -> str:
    paras = [p.strip() for p in content.split("\n") if p.strip()]
    mid = paras[len(paras)//2] if paras else content[:200]
    snippet = mid[:80]
    return (
        f'Lush Caribbean watercolor illustration of "{snippet}..." '
        f'from the story "{title}". '
        "Studio Ghibli-inspired, warm golden dusk light, vibrant tropical colors, "
        "folklore magic. No text or words. Children's book style."
    )

def generate_image_fal(prompt: str, story_id: str) -> bytes | None:
    """Try fal.ai FLUX Schnell (queue API). Returns PNG bytes or None."""
    if not FAL_KEY:
        print("  [Image] FAL_KEY not set — skipping fal.ai")
        return None
    print(f"  [Image] Calling fal.ai FLUX Schnell...")
    try:
        # Submit job to queue
        submit_url = "https://queue.fal.run/fal-ai/flux/schnell"
        resp = http_post_json(submit_url, {
            "prompt": prompt,
            "image_size": "landscape_4_3",
            "num_inference_steps": 4,
            "num_images": 1,
        }, headers={"Authorization": f"Key {FAL_KEY}"})
        request_id = resp.get("request_id")
        if not request_id:
            print(f"  [Image] fal.ai no request_id: {resp}")
            return None
        
        # Poll for result
        status_url = f"https://queue.fal.run/fal-ai/flux/schnell/requests/{request_id}"
        for attempt in range(30):
            time.sleep(2)
            try:
                status_resp = http_get(status_url, headers={"Authorization": f"Key {FAL_KEY}"})
            except Exception as e:
                print(f"  [Image] fal.ai poll error (attempt {attempt}): {e}")
                continue
            status = status_resp.get("status")
            print(f"  [Image] fal.ai status: {status} (attempt {attempt+1})")
            if status == "COMPLETED":
                result_url = f"{status_url}/response"
                result = http_get(result_url, headers={"Authorization": f"Key {FAL_KEY}"})
                images = result.get("images", [])
                if images:
                    img_url = images[0].get("url")
                    if img_url:
                        print(f"  [Image] fal.ai image URL: {img_url[:60]}...")
                        return http_fetch_bytes(img_url)
                print(f"  [Image] fal.ai COMPLETED but no images: {result}")
                return None
            elif status in ("FAILED", "CANCELLED"):
                print(f"  [Image] fal.ai job {status}: {status_resp}")
                return None

        print("  [Image] fal.ai timed out after 60s")
        return None
    except Exception as e:
        print(f"  [Image] fal.ai error: {e}")
        return None

def generate_image_gemini(prompt: str) -> bytes | None:
    """Try Gemini Imagen 3. Returns PNG bytes or None."""
    if not GEMINI_KEY:
        print("  [Image] GEMINI_KEY not set — skipping Gemini")
        return None
    print(f"  [Image] Calling Gemini Imagen 3...")
    try:
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"imagen-4.0-fast-generate-001:predict?key={GEMINI_KEY}"
        )
        resp = http_post_json(url, {
            "instances": [{"prompt": prompt}],
            "parameters": {"sampleCount": 1, "aspectRatio": "4:3"},
        })
        predictions = resp.get("predictions", [])
        if predictions:
            b64 = predictions[0].get("bytesBase64Encoded")
            if b64:
                return base64.b64decode(b64)
        print(f"  [Image] Gemini no predictions: {str(resp)[:300]}")
        return None
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        print(f"  [Image] Gemini HTTP {e.code}: {body[:300]}")
        return None
    except Exception as e:
        print(f"  [Image] Gemini error: {e}")
        return None

def generate_image(content: str, title: str, story_id: str) -> bytes | None:
    prompt = make_illustration_prompt(content, title)
    print(f"  [Image] Prompt: {prompt[:100]}...")
    # Try fal.ai first (if key set), fall back to Gemini
    img = generate_image_fal(prompt, story_id)
    if img:
        print(f"  [Image] ✅ fal.ai success ({len(img)} bytes)")
        return img
    img = generate_image_gemini(prompt)
    if img:
        print(f"  [Image] ✅ Gemini success ({len(img)} bytes)")
        return img
    print("  [Image] ❌ All image providers failed")
    return None

# ── Audio generation ───────────────────────────────────────────────────────────

def generate_audio_elevenlabs(content: str) -> bytes | None:
    """Call ElevenLabs TTS. Returns MP3 bytes or None."""
    if not EL_KEY:
        print("  [Audio] EL_KEY not set")
        return None
    print(f"  [Audio] Calling ElevenLabs TTS ({len(content)} chars)...")
    try:
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
        payload = {
            "text": content[:5000],
            "model_id": ELEVENLABS_MODEL,
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
        }
        req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={
            "Content-Type": "application/json",
            "xi-api-key": EL_KEY,
            "Accept": "audio/mpeg",
        })
        with urllib.request.urlopen(req, timeout=90) as resp:
            audio_bytes = resp.read()
        print(f"  [Audio] ✅ ElevenLabs success ({len(audio_bytes)} bytes)")
        return audio_bytes
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        print(f"  [Audio] ElevenLabs HTTP {e.code}: {body[:200]}")
        return None
    except Exception as e:
        print(f"  [Audio] ElevenLabs error: {e}")
        return None

# ── Main ───────────────────────────────────────────────────────────────────────

def process_story(story: dict):
    story_id   = story["id"]
    title      = story["title"]
    do_image   = story.get("need_image", False)
    do_audio   = story.get("need_audio", False)
    
    print(f"\n{'='*60}")
    print(f"Story: {title}")
    print(f"  ID: {story_id}")
    print(f"  Needs image: {do_image} | Needs audio: {do_audio}")
    
    chapter = get_chapter1(story_id)
    if not chapter:
        print(f"  ❌ No chapter 1 found")
        return False
    
    chapter_id = chapter["id"]
    content    = chapter.get("content", "")
    print(f"  Chapter ID: {chapter_id}")
    print(f"  Content: {len(content)} chars")
    print(f"  Current image_url: {'✅ set' if chapter.get('image_url') else '❌ missing'}")
    print(f"  Current audio_url: {'✅ set' if chapter.get('audio_url') else '❌ missing'}")
    
    updates = {}
    success = True
    
    # ── Image ──────────────────────────────────────────────────────────────
    if do_image:
        if chapter.get("image_url"):
            print(f"  [Image] Already has image_url — skipping")
        else:
            img_bytes = generate_image(content, title, story_id)
            if img_bytes:
                storage_path = f"{story_id}/chapter_1_fal.png"
                img_url = upload_to_storage("story-images", storage_path, img_bytes, "image/png")
                if img_url:
                    print(f"  [Image] Uploaded: {img_url}")
                    updates["image_url"] = img_url
                    updates["image_source"] = "fal"
                else:
                    print(f"  [Image] ❌ Upload failed")
                    success = False
            else:
                success = False
    
    # ── Audio ──────────────────────────────────────────────────────────────
    if do_audio:
        if chapter.get("audio_url"):
            print(f"  [Audio] Already has audio_url — skipping")
        else:
            audio_bytes = generate_audio_elevenlabs(content)
            if audio_bytes:
                storage_path = f"{story_id}/chapter_1.mp3"
                audio_url = upload_to_storage("story-audio", storage_path, audio_bytes, "audio/mpeg")
                if audio_url:
                    print(f"  [Audio] Uploaded: {audio_url}")
                    updates["audio_url"] = audio_url
                    updates["audio_source"] = "elevenlabs"
                else:
                    print(f"  [Audio] ❌ Upload failed")
                    success = False
            else:
                success = False
    
    # ── DB update ──────────────────────────────────────────────────────────
    if updates:
        print(f"  [DB] Updating chapter with: {list(updates.keys())}")
        status = update_chapter(chapter_id, updates)
        print(f"  [DB] PATCH status: {status}")
    else:
        print(f"  [DB] No updates needed")
    
    return success

def main():
    print("SandSync Retro Generate")
    print("="*60)
    
    if not SUPABASE_KEY:
        print("❌ SUPABASE_SERVICE_ROLE_KEY not set")
        sys.exit(1)
    
    print(f"SUPABASE_KEY: {SUPABASE_KEY[:20]}...")
    print(f"FAL_KEY:      {'set (' + FAL_KEY[:10] + '...)' if FAL_KEY else 'NOT SET — will use Gemini'}")
    print(f"GEMINI_KEY:   {'set (' + GEMINI_KEY[:10] + '...)' if GEMINI_KEY else 'NOT SET'}")
    print(f"EL_KEY:       {'set (' + EL_KEY[:10] + '...)' if EL_KEY else 'NOT SET'}")
    
    results = {}
    for story in STORIES:
        ok = process_story(story)
        results[story["id"][:8]] = ok
    
    print(f"\n{'='*60}")
    print("Summary:")
    for sid, ok in results.items():
        print(f"  {'✅' if ok else '⚠️ '} {sid}")
    
    failed = [s for s, ok in results.items() if not ok]
    if failed:
        print(f"\n⚠️  {len(failed)} story/stories had issues: {failed}")
        sys.exit(1)
    else:
        print("\n✅ All done!")

if __name__ == "__main__":
    main()
