import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

// Browser client. Used only for things like signed download URLs we
// surface client-side. All writes go through API routes / server actions.
export function supabaseBrowser() {
  return createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
}
