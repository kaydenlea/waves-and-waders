import { redirect } from "next/navigation";

import DashboardEditRedirect from "@/components/general/DashboardEditRedirect";
import { getServerSupabase } from "@/lib/supabaseServer";

const Page = async ({ params }: { params: Promise<{ beach: string }> }) => {
  const { beach } = await params;

  const supabase = await getServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect(`/login?next=${encodeURIComponent(`/${beach}/overview/edit`)}`);
  }

  return <DashboardEditRedirect beachParam={beach} type="overview" />;
};

export default Page;
