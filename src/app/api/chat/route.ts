import { type NextRequest } from "next/server";
import { anthropic, CHAT_MODEL } from "@/lib/anthropic/client";
import { retrieveRelevantChunks } from "@/lib/retrieval/search";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Citation } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a careful research assistant. Answer the user's question using ONLY the document excerpts provided in the <context> tags.

Rules:
- If the answer is not in the context, say so plainly. Don't guess.
- Cite excerpts inline as [^1], [^2], etc., where the number matches the excerpt id.
- Quote sparingly. Paraphrase where you can.
- Match the user's language: answer in Arabic if asked in Arabic, English if asked in English.
- Be concise. No filler.`;

interface ChatRequest {
  documentId: string;
  conversationId?: string;
  message: string;
}

function sseEvent(payload: object): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function POST(req: NextRequest) {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { documentId, conversationId: existingConvoId } = body;
  const message = body.message?.trim();

  if (!documentId || !message) {
    return new Response(
      JSON.stringify({ error: "documentId and message are required" }),
      { status: 400 },
    );
  }

  const supabase = supabaseAdmin();

  // Confirm the document exists and is ready before doing anything expensive.
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id, status")
    .eq("id", documentId)
    .single();
  if (docError || !doc) {
    return new Response(JSON.stringify({ error: "Document not found" }), {
      status: 404,
    });
  }
  if (doc.status !== "ready") {
    return new Response(
      JSON.stringify({ error: `Document is ${doc.status}, not ready for chat.` }),
      { status: 409 },
    );
  }

  // Retrieve top-K chunks for the question.
  const matches = await retrieveRelevantChunks(documentId, message, 6);
  const citations: Citation[] = matches.map((m) => ({
    chunk_id: m.id,
    page_number: m.page_number,
    snippet: m.content.slice(0, 280),
    similarity: m.similarity,
  }));

  // Build the user message with the retrieved context inlined.
  const contextBlocks =
    matches.length > 0
      ? matches
          .map(
            (m, i) =>
              `<excerpt id="${i + 1}" page="${m.page_number ?? "?"}">\n${m.content}\n</excerpt>`,
          )
          .join("\n\n")
      : "(no relevant excerpts found)";

  const augmentedUserMessage = `<context>\n${contextBlocks}\n</context>\n\nQuestion: ${message}`;

  // Make sure we have a conversation to write to.
  let conversationId = existingConvoId;
  if (!conversationId) {
    const { data: convo, error: convoErr } = await supabase
      .from("conversations")
      .insert({
        document_id: documentId,
        title: message.slice(0, 80),
      })
      .select()
      .single();
    if (convoErr || !convo) {
      return new Response(
        JSON.stringify({ error: convoErr?.message ?? "Failed to create conversation" }),
        { status: 500 },
      );
    }
    conversationId = convo.id;
  }

  // Pull prior messages for multi-turn context.
  const { data: prior } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  // Persist the user's raw message immediately.
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: message,
  });

  const messages = [
    ...(prior ?? []).map((p) => ({
      role: p.role as "user" | "assistant",
      content: p.content,
    })),
    { role: "user" as const, content: augmentedUserMessage },
  ];

  const stream = anthropic().messages.stream({
    model: CHAT_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages,
  });

  let fullText = "";
  const finalConvoId = conversationId;

  const readable = new ReadableStream({
    async start(controller) {
      // Send metadata first so the UI can render citations alongside the answer.
      controller.enqueue(
        sseEvent({ type: "meta", conversationId: finalConvoId, citations }),
      );

      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullText += event.delta.text;
            controller.enqueue(sseEvent({ type: "delta", text: event.delta.text }));
          }
        }

        await supabase.from("messages").insert({
          conversation_id: finalConvoId,
          role: "assistant",
          content: fullText,
          citations,
        });

        controller.enqueue(sseEvent({ type: "done" }));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Stream error";
        controller.enqueue(sseEvent({ type: "error", error: errorMessage }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
