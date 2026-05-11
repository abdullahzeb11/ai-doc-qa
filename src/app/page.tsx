import Link from "next/link";
import { ArrowRight, FileText, Quote, Languages, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="container py-20 md:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Ask questions about your PDFs.
            </h1>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">
              Upload a document, ask in English or Arabic, get answers with the
              exact passages they came from.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/documents">
                  Get started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="container pb-20">
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            <Feature
              icon={<FileText className="h-4 w-4" />}
              title="Drop in a PDF"
              body="Upload any text-based PDF up to 25 MB. The document is parsed, chunked, and embedded into pgvector."
            />
            <Feature
              icon={<Quote className="h-4 w-4" />}
              title="Cited answers"
              body="Every response shows the exact passages it relied on, with page numbers. No hallucinated sources."
            />
            <Feature
              icon={<Languages className="h-4 w-4" />}
              title="English and Arabic"
              body="Multilingual embeddings and a model that responds in the language you ask in."
            />
            <Feature
              icon={<Zap className="h-4 w-4" />}
              title="Streaming responses"
              body="Answers stream token-by-token. Powered by Claude — easy to swap from Haiku to Sonnet."
            />
          </div>
        </section>
      </main>
      <footer className="border-t py-6">
        <div className="container text-center text-xs text-muted-foreground">
          Built with Next.js, Supabase pgvector, and Claude.
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border p-5">
      <div className="mb-3 inline-flex rounded-md border bg-muted/40 p-2 text-muted-foreground">
        {icon}
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
