import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { parsePdf, detectLanguage } from "@/lib/pdf/parse";
import { chunkPages } from "@/lib/pdf/chunk";
import { embedDocuments } from "@/lib/embeddings/voyage";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Max 25 MB." },
      { status: 413 },
    );
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json(
      { error: "Only PDF files are supported." },
      { status: 400 },
    );
  }

  const supabase = supabaseAdmin();
  const buffer = await file.arrayBuffer();

  // 1. Upload original PDF to Storage so we can keep it for re-processing.
  const storagePath = `${crypto.randomUUID()}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from(env.supabase.bucket)
    .upload(storagePath, buffer, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (uploadError) {
    return NextResponse.json(
      { error: `Storage upload failed: ${uploadError.message}` },
      { status: 500 },
    );
  }

  // 2. Insert the document row (status=processing).
  const { data: docRow, error: insertError } = await supabase
    .from("documents")
    .insert({
      filename: file.name,
      storage_path: storagePath,
      file_size: file.size,
      status: "processing",
    })
    .select()
    .single();
  if (insertError || !docRow) {
    return NextResponse.json(
      { error: insertError?.message ?? "Failed to create document row." },
      { status: 500 },
    );
  }

  // 3. Parse, chunk, embed — synchronously. For larger workloads this would
  //    move to a background job, but synchronous is fine for portfolio scope
  //    and gives the UI immediate "ready" feedback.
  try {
    const parsed = await parsePdf(buffer);

    if (parsed.pages.every((p) => p.text.length === 0)) {
      throw new Error(
        "No extractable text found. The PDF may be a scanned image — OCR is not supported yet.",
      );
    }

    const allText = parsed.pages.map((p) => p.text).join(" ");
    const language = detectLanguage(allText);
    const chunks = chunkPages(parsed.pages);

    if (chunks.length === 0) {
      throw new Error("Document produced zero chunks.");
    }

    const embeddings = await embedDocuments(chunks.map((c) => c.content));

    const chunkRows = chunks.map((c, i) => ({
      document_id: docRow.id,
      chunk_index: c.chunkIndex,
      content: c.content,
      page_number: c.pageNumber,
      token_count: c.tokenCount,
      embedding: embeddings[i],
    }));

    // Insert in batches to stay under request-size limits.
    const INSERT_BATCH = 100;
    for (let i = 0; i < chunkRows.length; i += INSERT_BATCH) {
      const batch = chunkRows.slice(i, i + INSERT_BATCH);
      const { error: chunkError } = await supabase.from("chunks").insert(batch);
      if (chunkError) throw new Error(`Chunk insert failed: ${chunkError.message}`);
    }

    await supabase
      .from("documents")
      .update({
        status: "ready",
        page_count: parsed.pageCount,
        language,
      })
      .eq("id", docRow.id);

    return NextResponse.json({
      id: docRow.id,
      status: "ready",
      page_count: parsed.pageCount,
      chunk_count: chunks.length,
      language,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown processing error";
    await supabase
      .from("documents")
      .update({ status: "failed", error: message })
      .eq("id", docRow.id);
    return NextResponse.json(
      { id: docRow.id, status: "failed", error: message },
      { status: 500 },
    );
  }
}
