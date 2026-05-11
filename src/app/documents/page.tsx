import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { UploadDropzone } from "@/components/upload-dropzone";
import { DocumentList, DocumentListSkeleton } from "@/components/document-list";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { DocumentRow } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getDocuments(): Promise<DocumentRow[]> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Failed to fetch documents:", error.message);
    return [];
  }
  return (data ?? []) as DocumentRow[];
}

export default async function DocumentsPage() {
  const documents = await getDocuments();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container flex-1 py-8">
        <div className="mx-auto max-w-3xl space-y-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload a PDF to start asking questions.
            </p>
          </div>

          <UploadDropzone />

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Your documents
            </h2>
            <Suspense fallback={<DocumentListSkeleton />}>
              <DocumentList initial={documents} />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
