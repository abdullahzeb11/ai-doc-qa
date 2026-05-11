import Link from "next/link";
import { ChevronLeft, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatBytes } from "@/lib/utils";
import type { DocumentRow } from "@/lib/types";

export function DocumentMeta({ document: doc }: { document: DocumentRow }) {
  return (
    <div className="border-b bg-muted/20 px-4 py-2.5">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <Link
          href="/documents"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3 w-3" />
          All documents
        </Link>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          <span className="max-w-[24ch] truncate font-medium text-foreground">
            {doc.filename}
          </span>
          {doc.page_count != null && <span>· {doc.page_count} pages</span>}
          <span>· {formatBytes(doc.file_size)}</span>
          {doc.language && (
            <Badge variant="outline" className="text-[10px] uppercase">
              {doc.language}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
