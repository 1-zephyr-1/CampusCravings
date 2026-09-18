"use client";

import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

export function useSupabase(): SupabaseClient {
  if (typeof window === "undefined") {
    return createClient();
  }
  if (!client) {
    client = createClient();
  }
  return client;
}
