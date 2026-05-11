import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">404</p>
          <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            That document or conversation doesn&apos;t exist.
          </p>
          <Button asChild className="mt-6">
            <Link href="/documents">Back to documents</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
