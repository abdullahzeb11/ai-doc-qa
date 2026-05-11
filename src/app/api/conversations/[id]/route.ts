import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = supabaseAdmin();

  const [{ data: convo, error: convoError }, { data: messages, error: msgError }] =
    await Promise.all([
      supabase.from("conversations").select("*").eq("id", id).single(),
      supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true }),
    ]);

  if (convoError || !convo) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }
  if (msgError) {
    return NextResponse.json({ error: msgError.message }, { status: 500 });
  }

  return NextResponse.json({ conversation: convo, messages: messages ?? [] });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("conversations").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
