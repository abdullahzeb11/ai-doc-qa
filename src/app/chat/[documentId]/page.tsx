import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { ChatInterface } from "@/components/chat-interface";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import { DocumentMeta } from "../_components/document-meta";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ConversationRow, DocumentRow } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ documentId: string }>;
}

async function getDocumentAndConversations(documentId: string): Promise<{
  document: DocumentRow;
  conversations: ConversationRow[];
} | null> {
  const supabase = supabaseAdmin();
  const [docRes, convoRes] = await Promise.all([
    supabase.from("documents").select("*").eq("id", documentId).single(),
    supabase
      .from("conversations")
      .select("*")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false }),
  ]);

  if (docRes.error || !docRes.data) return null;
  return {
    document: docRes.data as DocumentRow,
    conversations: (convoRes.data ?? []) as ConversationRow[],
  };
}

export default async function ChatPage({ params }: Props) {
  const { documentId } = await params;
  const data = await getDocumentAndConversations(documentId);
  if (!data) notFound();

  return (
    <div className="flex h-screen flex-col">
      <SiteHeader />
      <div className="flex flex-1 overflow-hidden">
        <ConversationSidebar
          documentId={documentId}
          conversations={data.conversations}
        />
        <div className="flex flex-1 flex-col">
          <DocumentMeta document={data.document} />
          <div className="flex-1 overflow-hidden">
            <ChatInterface documentId={documentId} />
          </div>
        </div>
      </div>
    </div>
  );
}
