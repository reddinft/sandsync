-- Add fallback source tracking columns to story_chapters
ALTER TABLE story_chapters
  ADD COLUMN IF NOT EXISTS audio_source TEXT DEFAULT 'elevenlabs',
  ADD COLUMN IF NOT EXISTS image_source TEXT DEFAULT 'gemini',
  ADD COLUMN IF NOT EXISTS audio_retry_after TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS image_retry_after TIMESTAMPTZ;

-- Create index on retry columns for efficient polling
CREATE INDEX IF NOT EXISTS idx_story_chapters_audio_retry ON story_chapters(audio_retry_after) WHERE audio_source = 'kokoro';
CREATE INDEX IF NOT EXISTS idx_story_chapters_image_retry ON story_chapters(image_retry_after) WHERE image_source = 'flux';
