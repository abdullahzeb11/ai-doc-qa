"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Citation } from "@/lib/types";

// Detects RTL-leaning text so we can flip direction on snippet display.
function isRtl(text: string): boolean {
  const sample = text.slice(0, 200);
  let arabic = 0;
  let latin = 0;
  for (const ch of sample) {
    const code = ch.codePointAt(0)!;
    if (code >= 0x0600 && code <= 0x06ff) arabic++;
    else if (code >= 0x0041 && code <= 0x007a) latin++;
  }
  return arabic > latin;
}

export function CitationList({ citations }: { citations: Citation[] }) {
  const [open, setOpen] = React.useState(false);
  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-3 rounded-md border bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <span>
          {citations.length} source{citations.length === 1 ? "" : "s"}
        </span>
        <ChevronDown
          className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="space-y-2 border-t px-3 py-2">
          {citations.map((c, i) => {
            const rtl = isRtl(c.snippet);
            return (
              <div key={c.chunk_id} className="text-xs">
                <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                  <span className="font-mono">[{i + 1}]</span>
                  {c.page_number != null && <span>page {c.page_number}</span>}
                  <span className="ml-auto font-mono">
                    {(c.similarity * 100).toFixed(0)}% match
                  </span>
                </div>
                <p
                  dir={rtl ? "rtl" : "ltr"}
                  className="whitespace-pre-wrap leading-relaxed text-foreground/80"
                >
                  {c.snippet}
                  {c.snippet.length === 280 && "…"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
