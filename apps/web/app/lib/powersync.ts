import { Schema, Table, Column, ColumnType } from "@powersync/web";
import { PowerSyncDatabase } from "@powersync/web";

// Define the local schema matching the Supabase tables
const appSchema = new Schema({
  stories: new Table({
    columns: [
      new Column({ name: "title", type: ColumnType.TEXT }),
      new Column({ name: "genre", type: ColumnType.TEXT }),
      new Column({ name: "theme", type: ColumnType.TEXT }),
      new Column({ name: "status", type: ColumnType.TEXT }),
      new Column({ name: "user_id", type: ColumnType.TEXT }),
      new Column({ name: "created_at", type: ColumnType.TEXT }),
      new Column({ name: "updated_at", type: ColumnType.TEXT }),
    ],
  }),
  story_chapters: new Table({
    columns: [
      new Column({ name: "story_id", type: ColumnType.TEXT }),
      new Column({ name: "chapter_number", type: ColumnType.INTEGER }),
      new Column({ name: "title", type: ColumnType.TEXT }),
      new Column({ name: "content", type: ColumnType.TEXT }),
      new Column({ name: "reviewed_content", type: ColumnType.TEXT }),
      new Column({ name: "audio_url", type: ColumnType.TEXT }),
      new Column({ name: "image_url", type: ColumnType.TEXT }),
      new Column({ name: "illustration_prompt", type: ColumnType.TEXT }),
      new Column({ name: "agent_trace", type: ColumnType.TEXT }),
      new Column({ name: "created_at", type: ColumnType.TEXT }),
      new Column({ name: "updated_at", type: ColumnType.TEXT }),
    ],
  }),
  agent_events: new Table({
    columns: [
      new Column({ name: "story_id", type: ColumnType.TEXT }),
      new Column({ name: "agent", type: ColumnType.TEXT }),
      new Column({ name: "event_type", type: ColumnType.TEXT }),
      new Column({ name: "payload", type: ColumnType.TEXT }),
      new Column({ name: "created_at", type: ColumnType.TEXT }),
    ],
  }),
});

// Initialize PowerSync database (let Vite resolve the ESM worker via import.meta.url)
export const powerSyncDatabase = new PowerSyncDatabase({
  schema: appSchema,
  database: {
    dbFilename: "sandsync.db",
  },
});

// Export types for convenience
export type Story = {
  id: string;
  title: string;
  genre: string;
  theme?: string;
  status: "queued" | "generating" | "complete" | "failed";
  user_id: string;
  created_at: string;
  updated_at: string;
};

export type StoryChapter = {
  id: string;
  story_id: string;
  chapter_number: number;
  title: string;
  content: string;
  reviewed_content?: string;
  audio_url?: string;
  image_url?: string;
  illustration_prompt?: string;
  agent_trace?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AgentEvent = {
  id: string;
  story_id: string;
  agent: string;
  event_type: "started" | "completed" | "failed";
  payload: Record<string, unknown>;
  created_at: string;
};
