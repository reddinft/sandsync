-- Migration 005: voice_requests table + chapter video columns
-- Part of SandSync Phase 2 — Deepgram voice input + fal.ai video per chapter

-- Ensure uuid extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. voice_requests table ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS voice_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  transcript TEXT NOT NULL,
  audio_duration_ms INT,
  deepgram_request_id TEXT,
  confidence FLOAT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for querying by story
CREATE INDEX IF NOT EXISTS voice_requests_story_id_idx ON voice_requests(story_id);

-- PowerSync: sync voice_requests by story_id so offline clients see their requests
ALTER PUBLICATION powersync ADD TABLE voice_requests;

-- ── 2. story_chapters — video generation columns ──────────────────────────────

ALTER TABLE story_chapters
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS video_source TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS video_status TEXT DEFAULT 'pending';

-- video_status values: pending | generating | ready | failed
-- video_source values: none | fal | local

COMMENT ON COLUMN story_chapters.video_url IS 'URL to generated chapter video clip (Supabase Storage)';
COMMENT ON COLUMN story_chapters.video_source IS 'Provider used: none | fal | local';
COMMENT ON COLUMN story_chapters.video_status IS 'Generation status: pending | generating | ready | failed';
