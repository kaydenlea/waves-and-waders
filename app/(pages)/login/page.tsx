import { redirect } from "next/navigation";

import { getServerSupabase } from "@/lib/supabaseServer";
import { AuthForm } from "@/components/auth/AuthForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const supabase = await getServerSupabase();
  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    console.error("Failed to load user", userError);
  }
  const user = userData.user ?? null;

  if (user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-24">
      <AuthForm />
    </main>
  );
}