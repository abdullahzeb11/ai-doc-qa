"use client";

import * as React from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { Upload, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn, formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface UploadResponse {
  id: string;
  status: "ready" | "failed";
  error?: string;
}

const MAX_SIZE = 25 * 1024 * 1024;

export function UploadDropzone({ onUploaded }: { onUploaded?: (id: string) => void }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState<string | null>(null);

  const upload = React.useCallback(
    async (file: File) => {
      setBusy(true);
      setProgress(`Uploading ${file.name}…`);

      const fd = new FormData();
      fd.append("file", file);

      try {
        setProgress("Parsing & embedding…");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const json = (await res.json()) as UploadResponse;

        if (!res.ok || json.status !== "ready") {
          throw new Error(json.error ?? "Upload failed");
        }

        toast.success("Document is ready.");
        if (onUploaded) onUploaded(json.id);
        else router.push(`/chat/${json.id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        toast.error(message);
      } finally {
        setBusy(false);
        setProgress(null);
      }
    },
    [router, onUploaded],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxSize: MAX_SIZE,
    multiple: false,
    disabled: busy,
    noClick: true,
    onDropAccepted: (files) => {
      const file = files[0];
      if (file) void upload(file);
    },
    onDropRejected: (rejections) => {
      const reason = rejections[0]?.errors[0]?.message ?? "File rejected";
      toast.error(reason);
    },
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative rounded-lg border border-dashed p-10 text-center transition-colors",
        isDragActive ? "border-foreground bg-accent/40" : "border-border",
        busy && "opacity-60",
      )}
    >
      <input {...getInputProps()} />
      <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
        {busy ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : (
          <div className="rounded-full border bg-muted/50 p-3">
            <Upload className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {busy ? progress : "Drop a PDF here, or click to choose"}
          </p>
          <p className="text-xs text-muted-foreground">
            English or Arabic. Up to {formatBytes(MAX_SIZE)}. Text PDFs only — scanned
            images aren&apos;t OCR&apos;d yet.
          </p>
        </div>
        {!busy && (
          <Button type="button" variant="outline" size="sm" onClick={open}>
            <FileText className="h-4 w-4" />
            Choose file
          </Button>
        )}
      </div>
    </div>
  );
}
