import { createClient } from "@supabase/supabase-js";

export type StoryStatus = "queued" | "generating" | "complete" | "failed";
export type AgentName = "papa_bois" | "anansi" | "ogma" | "devi";
export type EventType = "started" | "completed" | "failed";

export interface Story {
  id: string;
  user_id: string;
  title: string | null;
  genre: string | null;
  status: StoryStatus;
  created_at: string;
}

export interface StoryChapter {
  id: string;
  story_id: string;
  chapter_number: number;
  content: string | null;
  reviewed_content: string | null;
  audio_url: string | null;
  agent_trace: Record<string, unknown>;
  created_at: string;
}

export interface AgentEvent {
  id: string;
  story_id: string;
  agent: AgentName;
  event_type: EventType;
  payload: Record<string, unknown>;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      stories: {
        Row: Story;
        Insert: Omit<Story, "id" | "created_at"> & Partial<Pick<Story, "id" | "created_at">>;
        Update: Partial<Omit<Story, "id">>;
      };
      story_chapters: {
        Row: StoryChapter;
        Insert: Omit<StoryChapter, "id" | "created_at"> & Partial<Pick<StoryChapter, "id" | "created_at">>;
        Update: Partial<Omit<StoryChapter, "id">>;
      };
      agent_events: {
        Row: AgentEvent;
        Insert: Omit<AgentEvent, "id" | "created_at"> & Partial<Pick<AgentEvent, "id" | "created_at">>;
        Update: Partial<Omit<AgentEvent, "id">>;
      };
    };
  };
};

export function createSupabaseClient(url: string, key: string) {
  return createClient<Database>(url, key);
}
