// @ts-nocheck
import { Schema, Table, Column, ColumnType } from "@powersync/web";
import { PowerSyncDatabase } from "@powersync/web";

// Define the local schema matching the Supabase tables
const appSchema = new Schema({
  stories: new Table(
    {
      id: new Column({ name: "id", type: ColumnType.TEXT }),
      title: new Column({ name: "title", type: ColumnType.TEXT }),
      genre: new Column({ name: "genre", type: ColumnType.TEXT }),
      theme: new Column({ name: "theme", type: ColumnType.TEXT }),
      status: new Column({ name: "status", type: ColumnType.TEXT }), // queued, generating, complete, failed
      user_id: new Column({ name: "user_id", type: ColumnType.TEXT }),
      created_at: new Column({ name: "created_at", type: ColumnType.TEXT }),
      updated_at: new Column({ name: "updated_at", type: ColumnType.TEXT }),
    },
    { indexes: ["id"] }
  ),
  story_chapters: new Table(
    {
      id: new Column({ name: "id", type: ColumnType.TEXT }),
      story_id: new Column({ name: "story_id", type: ColumnType.TEXT }),
      chapter_number: new Column({ name: "chapter_number", type: ColumnType.INTEGER }),
      title: new Column({ name: "title", type: ColumnType.TEXT }),
      content: new Column({ name: "content", type: ColumnType.TEXT }),
      reviewed_content: new Column({ name: "reviewed_content", type: ColumnType.TEXT }),
      audio_url: new Column({ name: "audio_url", type: ColumnType.TEXT }),
      agent_trace: new Column({ name: "agent_trace", type: ColumnType.TEXT }), // JSON stringified
      created_at: new Column({ name: "created_at", type: ColumnType.TEXT }),
      updated_at: new Column({ name: "updated_at", type: ColumnType.TEXT }),
    },
    { indexes: ["id", "story_id"] }
  ),
  agent_events: new Table(
    {
      id: new Column({ name: "id", type: ColumnType.TEXT }),
      story_id: new Column({ name: "story_id", type: ColumnType.TEXT }),
      agent: new Column({ name: "agent", type: ColumnType.TEXT }),
      event_type: new Column({ name: "event_type", type: ColumnType.TEXT }), // started, completed, failed
      payload: new Column({ name: "payload", type: ColumnType.TEXT }), // JSON stringified
      created_at: new Column({ name: "created_at", type: ColumnType.TEXT }),
    },
    { indexes: ["id", "story_id"] }
  ),
});

// Auth connector — simple JWT auth using Supabase anon key
const authConnector = {
  async fetchCredentials() {
    // For dev: return the Supabase JWT token (anon key)
    // @ts-ignore - import.meta.env is provided by Vite
    const token = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!token) {
      throw new Error("VITE_SUPABASE_ANON_KEY not configured");
    }
    return {
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    };
  },
  async uploadData(database: any) {
    // For now, just return success — data syncs via PowerSync backend
    return { success: true };
  },
};

// Initialize PowerSync database
export const powerSyncDatabase = new PowerSyncDatabase({
  schema: appSchema,
  database: {
    dbFilename: "sandsync.db",
  },
});

// Setup auth connector if the method exists
if ('setAuthConnector' in powerSyncDatabase) {
  (powerSyncDatabase as any).setAuthConnector(authConnector);
}

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
