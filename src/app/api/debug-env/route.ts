// TEMPORARY DEBUG ROUTE — delete after verifying env vars on Netlify.
// Returns lengths and head/tail of each env var (no full secret leaks).
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function inspect(name: string): {
  set: boolean;
  length: number;
  head: string;
  tail: string;
  dots: number;
  hasWhitespace: boolean;
  hasQuotes: boolean;
} {
  const v = process.env[name] ?? "";
  return {
    set: v.length > 0,
    length: v.length,
    head: v.slice(0, 6),
    tail: v.slice(-6),
    dots: (v.match(/\./g) ?? []).length,
    hasWhitespace: /\s/.test(v),
    hasQuotes: v.startsWith('"') || v.endsWith('"') || v.startsWith("'") || v.endsWith("'"),
  };
}

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: inspect("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: inspect("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: inspect("SUPABASE_SERVICE_ROLE_KEY"),
    SUPABASE_STORAGE_BUCKET: inspect("SUPABASE_STORAGE_BUCKET"),
    ANTHROPIC_API_KEY: inspect("ANTHROPIC_API_KEY"),
    VOYAGE_API_KEY: inspect("VOYAGE_API_KEY"),
  });
}
