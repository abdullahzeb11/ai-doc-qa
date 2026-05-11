import { supabaseAdmin } from "@/lib/supabase/admin";
import { embedQuery } from "@/lib/embeddings/voyage";
import type { MatchedChunk } from "@/lib/types";

export async function retrieveRelevantChunks(
  documentId: string,
  query: string,
  topK = 6,
): Promise<MatchedChunk[]> {
  const embedding = await embedQuery(query);
  const supabase = supabaseAdmin();

  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: embedding,
    document_id_filter: documentId,
    match_count: topK,
  });

  if (error) {
    throw new Error(`Vector search failed: ${error.message}`);
  }

  return (data ?? []) as MatchedChunk[];
}
