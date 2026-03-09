#!/usr/bin/env bun
/**
 * Migration runner for SandSync — runs via Supabase REST using service role key
 * Usage: bun scripts/migrate.ts
 */

const SUPABASE_URL = process.env.SUPABASE_URL || "https://houtondlrbwaosdwqyiu.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvdXRvbmRscmJ3YW9zZHdxeWl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAxMTU5MiwiZXhwIjoyMDg4NTg3NTkyfQ.fS-dLSWzoUoiJvhwIhGQ5EzFtDWKfb4tHbEAmck4cz4";

const PROJECT_REF = "houtondlrbwaosdwqyiu";

// Use Supabase Management API SQL endpoint
const MGMT_API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

const SQL = `
ALTER TABLE story_chapters
  ADD COLUMN IF NOT EXISTS audio_source TEXT DEFAULT 'elevenlabs',
  ADD COLUMN IF NOT EXISTS image_source TEXT DEFAULT 'gemini',
  ADD COLUMN IF NOT EXISTS audio_retry_after TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS image_retry_after TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_story_chapters_audio_retry 
  ON story_chapters(audio_retry_after) WHERE audio_source = 'kokoro';

CREATE INDEX IF NOT EXISTS idx_story_chapters_image_retry 
  ON story_chapters(image_retry_after) WHERE image_source = 'flux';
`;

async function runMigration() {
  console.log("🔄 Running migration 004_fallback_sources...");

  // Try Management API with service role key
  const res = await fetch(MGMT_API, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: SQL }),
  });

  const body = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(`Response: ${body}`);

  if (res.ok) {
    console.log("✅ Migration 004 complete!");
  } else {
    console.error("❌ Migration failed — check output above");
    process.exit(1);
  }
}

runMigration().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
