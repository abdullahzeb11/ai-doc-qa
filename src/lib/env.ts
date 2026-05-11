// Centralized env access. Uses lazy getters so a missing var only throws
// when actually used at request time — not at import/build time.

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
    get url() {
      return required("NEXT_PUBLIC_SUPABASE_URL");
    },
    get anonKey() {
      return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    },
    get serviceRoleKey() {
      return required("SUPABASE_SERVICE_ROLE_KEY");
    },
    get bucket() {
      return process.env.SUPABASE_STORAGE_BUCKET || "documents";
    },
  },
  anthropic: {
    get apiKey() {
      return required("ANTHROPIC_API_KEY");
    },
    get model() {
      return process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
    },
  },
  voyage: {
    get apiKey() {
      return required("VOYAGE_API_KEY");
    },
    get model() {
      return process.env.VOYAGE_EMBEDDING_MODEL || "voyage-3";
    },
  },
};

// Public env (safe for the browser). NEXT_PUBLIC_* vars are inlined at
// build time, so these are evaluated when the bundle loads.
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
};
