export type DocumentStatus = "processing" | "ready" | "failed";

export interface DocumentRow {
  id: string;
  filename: string;
  storage_path: string;
  file_size: number;
  page_count: number | null;
  language: string | null;
  status: DocumentStatus;
  error: string | null;
  created_at: string;
}

export interface ChunkRow {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  page_number: number | null;
  token_count: number | null;
  created_at: string;
}

export interface MatchedChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  page_number: number | null;
  similarity: number;
}

export interface Citation {
  chunk_id: string;
  page_number: number | null;
  snippet: string;
  similarity: number;
}

export type MessageRole = "user" | "assistant";

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  citations: Citation[] | null;
  created_at: string;
}

export interface ConversationRow {
  id: string;
  document_id: string;
  title: string | null;
  created_at: string;
}
