import Link from "next/link";
import { FileText } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <FileText className="h-5 w-5" />
          <span>Doc Q&amp;A</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/documents"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Documents
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
