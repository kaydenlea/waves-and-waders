import "server-only";

import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export const getServerSupabase = async () => {
  const cookieStore = await cookies();
  return createServerComponentClient({
    cookies: () => cookieStore as unknown as ReturnType<typeof cookies>,
  });
};
