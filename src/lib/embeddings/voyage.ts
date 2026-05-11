import { env } from "@/lib/env";

// Voyage AI embeddings API.
// Docs: https://docs.voyageai.com/reference/embeddings-api
//
// voyage-3 is multilingual (Arabic + English), 1024-dim, max 32K tokens
// per input. We batch up to 128 inputs per request (API limit).

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
const MAX_BATCH = 128;

export type EmbeddingInputType = "document" | "query";

interface VoyageResponse {
  object: string;
  data: { object: string; embedding: number[]; index: number }[];
  model: string;
  usage: { total_tokens: number };
}

async function embedBatch(
  inputs: string[],
  inputType: EmbeddingInputType,
): Promise<number[][]> {
  const res = await fetch(VOYAGE_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.voyage.apiKey}`,
    },
    body: JSON.stringify({
      input: inputs,
      model: env.voyage.model,
      input_type: inputType,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Voyage API error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as VoyageResponse;
  // Sort by index to be safe — the API normally returns them in order.
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export async function embedDocuments(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += MAX_BATCH) {
    const batch = texts.slice(i, i + MAX_BATCH);
    const embeddings = await embedBatch(batch, "document");
    out.push(...embeddings);
  }
  return out;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [embedding] = await embedBatch([text], "query");
  return embedding;
}
