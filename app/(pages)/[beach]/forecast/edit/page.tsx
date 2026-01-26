import DashboardEditRedirect from "@/components/general/DashboardEditRedirect";

export default async function Page({
  params,
}: {
  params: Promise<{ beach: string }>;
}) {
  const { beach } = await params;
  return <DashboardEditRedirect beachParam={beach} type="forecast" />;
}

