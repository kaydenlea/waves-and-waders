import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { User } from "@supabase/supabase-js";
import { CommunityHttpError } from "@/lib/community/errors";

type RouteClientOptions = Parameters<typeof createRouteHandlerClient>[0];

const createRouteCookies = async (): Promise<RouteClientOptions["cookies"]> => {
  const cookieStore = await cookies();
  return ((() => cookieStore) as unknown) as RouteClientOptions["cookies"];
};

export const createCommunityRouteClient = async () => {
  const routeCookies = await createRouteCookies();
  return createRouteHandlerClient({ cookies: routeCookies });
};

export const requireCommunityUser = async (): Promise<{
  supabase: Awaited<ReturnType<typeof createCommunityRouteClient>>;
  user: User;
}> => {
  const supabase = await createCommunityRouteClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new CommunityHttpError(401, "Authentication required.");
  }
  return {
    supabase,
    user: data.user,
  };
};
