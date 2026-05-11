"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import type { ConversationRow } from "@/lib/types";

interface Props {
  documentId: string;
  conversations: ConversationRow[];
  activeConversationId?: string;
}

export function ConversationSidebar({
  documentId,
  conversations,
  activeConversationId,
}: Props) {
  const pathname = usePathname();
  const onNewConversation = pathname === `/chat/${documentId}`;

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-muted/20 md:block">
      <div className="p-3">
        <Button
          asChild
          variant={onNewConversation ? "secondary" : "outline"}
          size="sm"
          className="w-full justify-start"
        >
          <Link href={`/chat/${documentId}`}>
            <Plus className="h-4 w-4" />
            New conversation
          </Link>
        </Button>
      </div>
      <div className="px-2 pb-3">
        {conversations.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted-foreground">
            No past conversations.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/chat/${documentId}/${c.id}`}
                  className={cn(
                    "flex flex-col gap-0.5 rounded-md px-2 py-1.5 text-xs hover:bg-accent",
                    activeConversationId === c.id && "bg-accent",
                  )}
                >
                  <span className="flex items-center gap-1.5 truncate font-medium">
                    <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">{c.title ?? "Untitled"}</span>
                  </span>
                  <span className="pl-4 text-[10px] text-muted-foreground">
                    {formatDate(c.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
