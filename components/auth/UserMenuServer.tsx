import "server-only";

import { getServerSupabase } from "@/lib/supabaseServer";
import { UserMenu } from "./UserMenu";

export const UserMenuServer = async ({
  landingPage = false,
}: {
  landingPage?: boolean;
}) => {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return <UserMenu landingPage={landingPage} initialUser={null} />;
  }

  return <UserMenu landingPage={landingPage} initialUser={data.user} />;
};
