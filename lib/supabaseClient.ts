import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export const createSupabaseBrowserClient = () => createClientComponentClient();

export type SupabaseBrowserClient = ReturnType<
  typeof createSupabaseBrowserClient
>;
