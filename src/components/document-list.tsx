"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Trash2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBytes, formatDate } from "@/lib/utils";
import type { DocumentRow } from "@/lib/types";

export function DocumentList({ initial }: { initial: DocumentRow[] }) {
  const router = useRouter();
  const [documents, setDocuments] = React.useState(initial);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    const res = await fetch("/api/documents");
    const json = (await res.json()) as { documents: DocumentRow[] };
    setDocuments(json.documents);
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document and all of its conversations?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toast.success("Document deleted.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  // Light polling: if anything is still processing, refresh every 2s.
  React.useEffect(() => {
    const anyProcessing = documents.some((d) => d.status === "processing");
    if (!anyProcessing) return;
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [documents, refresh]);

  if (documents.length === 0) {
    return (
      <Card className="border-dashed p-10 text-center text-sm text-muted-foreground">
        No documents yet. Upload one above to get started.
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <Card
          key={doc.id}
          className="flex items-center gap-4 p-4 transition-colors hover:bg-accent/30"
        >
          <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {doc.status === "ready" ? (
                <Link
                  href={`/chat/${doc.id}`}
                  className="truncate text-sm font-medium hover:underline"
                  title={doc.filename}
                >
                  {doc.filename}
                </Link>
              ) : (
                <span className="truncate text-sm font-medium" title={doc.filename}>
                  {doc.filename}
                </span>
              )}
              <StatusBadge status={doc.status} />
              {doc.language && (
                <Badge variant="outline" className="text-xs uppercase">
                  {doc.language}
                </Badge>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{formatDate(doc.created_at)}</span>
              <span>·</span>
              <span>{formatBytes(doc.file_size)}</span>
              {doc.page_count != null && (
                <>
                  <span>·</span>
                  <span>{doc.page_count} pages</span>
                </>
              )}
            </div>
            {doc.status === "failed" && doc.error && (
              <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                {doc.error}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(doc.id)}
            disabled={deletingId === doc.id}
            aria-label="Delete document"
          >
            {deletingId === doc.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </Card>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: DocumentRow["status"] }) {
  if (status === "ready") return <Badge variant="success">Ready</Badge>;
  if (status === "processing")
    return (
      <Badge variant="warning" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Processing
      </Badge>
    );
  return <Badge variant="destructive">Failed</Badge>;
}

export function DocumentListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="h-5 w-5" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </Card>
      ))}
    </div>
  );
}
