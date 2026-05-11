import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { ChatInterface } from "@/components/chat-interface";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import { DocumentMeta } from "../../_components/document-meta";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  ConversationRow,
  DocumentRow,
  MessageRow,
} from "@/lib/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ documentId: string; conversationId: string }>;
}

async function getData(documentId: string, conversationId: string): Promise<{
  document: DocumentRow;
  conversations: ConversationRow[];
  messages: MessageRow[];
} | null> {
  const supabase = supabaseAdmin();
  const [docRes, convosRes, messagesRes] = await Promise.all([
    supabase.from("documents").select("*").eq("id", documentId).single(),
    supabase
      .from("conversations")
      .select("*")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false }),
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true }),
  ]);

  if (docRes.error || !docRes.data) return null;
  return {
    document: docRes.data as DocumentRow,
    conversations: (convosRes.data ?? []) as ConversationRow[],
    messages: (messagesRes.data ?? []) as MessageRow[],
  };
}

export default async function ChatConversationPage({ params }: Props) {
  const { documentId, conversationId } = await params;
  const data = await getData(documentId, conversationId);
  if (!data) notFound();

  return (
    <div className="flex h-screen flex-col">
      <SiteHeader />
      <div className="flex flex-1 overflow-hidden">
        <ConversationSidebar
          documentId={documentId}
          conversations={data.conversations}
          activeConversationId={conversationId}
        />
        <div className="flex flex-1 flex-col">
          <DocumentMeta document={data.document} />
          <div className="flex-1 overflow-hidden">
            <ChatInterface
              documentId={documentId}
              initialConversationId={conversationId}
              initialMessages={data.messages}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
