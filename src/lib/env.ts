// Centralized env access. Throws fast in dev if anything is missing,
// and gives a single place to swap defaults (e.g. the chat model).

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(
      `Missing required env var: ${name}. See .env.example.`,
    );
  }
  return value;
}

export const env = {
  supabase: {
    url: required("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
    bucket: process.env.SUPABASE_STORAGE_BUCKET || "documents",
  },
  anthropic: {
    apiKey: required("ANTHROPIC_API_KEY"),
    model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
  },
  voyage: {
    apiKey: required("VOYAGE_API_KEY"),
    model: process.env.VOYAGE_EMBEDDING_MODEL || "voyage-3",
  },
};

// Public env (safe for the browser)
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
};
