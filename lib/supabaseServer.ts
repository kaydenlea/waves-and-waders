import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export const getServerSupabase = async () => {
  return createServerComponentClient({
    cookies,
  });
};
