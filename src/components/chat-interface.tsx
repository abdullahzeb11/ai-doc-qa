"use client";

import * as React from "react";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CitationList } from "./citation-list";
import { cn } from "@/lib/utils";
import type { Citation, MessageRow } from "@/lib/types";

interface ChatInterfaceProps {
  documentId: string;
  initialConversationId?: string;
  initialMessages?: MessageRow[];
}

interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[] | null;
  streaming?: boolean;
}

interface ServerEvent {
  type: "meta" | "delta" | "done" | "error";
  conversationId?: string;
  citations?: Citation[];
  text?: string;
  error?: string;
}

function detectRtl(text: string): boolean {
  const sample = text.slice(0, 200);
  let ar = 0;
  let la = 0;
  for (const ch of sample) {
    const c = ch.codePointAt(0)!;
    if (c >= 0x0600 && c <= 0x06ff) ar++;
    else if (c >= 0x0041 && c <= 0x007a) la++;
  }
  return ar > la;
}

export function ChatInterface({
  documentId,
  initialConversationId,
  initialMessages = [],
}: ChatInterfaceProps) {
  const [conversationId, setConversationId] = React.useState<string | undefined>(
    initialConversationId,
  );
  const [messages, setMessages] = React.useState<UiMessage[]>(() =>
    initialMessages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      citations: m.citations,
    })),
  );
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;

    setInput("");
    const userMsg: UiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      citations: null,
    };
    const assistantMsg: UiMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      citations: null,
      streaming: true,
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          documentId,
          conversationId,
          message: trimmed,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errorBody = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(errorBody.error ?? "Request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE: events are separated by blank lines.
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const evt of events) {
          const dataLine = evt.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          let parsed: ServerEvent;
          try {
            parsed = JSON.parse(dataLine.slice(6)) as ServerEvent;
          } catch {
            continue;
          }
          handleEvent(parsed, assistantMsg.id);
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const message = err instanceof Error ? err.message : "Chat failed";
      toast.error(message);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: `Error: ${message}`, streaming: false }
            : m,
        ),
      );
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const handleEvent = (evt: ServerEvent, assistantId: string) => {
    if (evt.type === "meta") {
      if (evt.conversationId) setConversationId(evt.conversationId);
      if (evt.citations) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, citations: evt.citations! } : m,
          ),
        );
      }
    } else if (evt.type === "delta" && evt.text) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: m.content + evt.text } : m,
        ),
      );
    } else if (evt.type === "done") {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)),
      );
    } else if (evt.type === "error") {
      throw new Error(evt.error ?? "Stream error");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        className="scrollbar-thin flex-1 overflow-y-auto px-4 py-6"
      >
        <div className="mx-auto max-w-2xl space-y-6">
          {messages.length === 0 && <EmptyState />}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
        </div>
      </div>
      <div className="border-t bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-2xl p-4">
          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about this document…"
              rows={2}
              className="resize-none pr-12"
              disabled={streaming}
            />
            <Button
              size="icon"
              onClick={() => void send()}
              disabled={streaming || input.trim().length === 0}
              className="absolute bottom-2 right-2 h-8 w-8"
              aria-label="Send"
            >
              {streaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Press Enter to send. Shift+Enter for a new line.
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: UiMessage }) {
  const rtl = detectRtl(message.content);
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        message.role === "user" ? "items-end" : "items-start",
      )}
    >
      <div
        dir={rtl ? "rtl" : "ltr"}
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-lg px-4 py-2.5 text-sm leading-relaxed",
          message.role === "user"
            ? "bg-primary text-primary-foreground"
            : "bg-muted",
        )}
      >
        {message.content || (message.streaming ? <TypingDots /> : null)}
      </div>
      {message.role === "assistant" && message.citations && (
        <div className="w-full max-w-[85%]">
          <CitationList citations={message.citations} />
        </div>
      )}
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1 py-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60" />
    </span>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="rounded-full border bg-muted/50 p-3">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">Ask a question</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Answers are grounded in the document text. Each response includes the
          source excerpts it used.
        </p>
      </div>
    </div>
  );
}
