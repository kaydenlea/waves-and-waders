import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";
  const safeNext =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/";

  if (code) {
    const cookieStore = await cookies();
    const cookieAdapter = {
      get: (name: string) => cookieStore.get(name)?.value,
      set: (name: string, value: string, options?: { [key: string]: unknown }) => {
        cookieStore.set({ name, value, ...(options ?? {}) });
      },
      remove: (name: string, options?: { [key: string]: unknown }) => {
        cookieStore.set({ name, value: "", ...(options ?? {}), maxAge: 0 });
      },
    };
    const supabase = createRouteHandlerClient({ cookies: cookieAdapter });
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("Supabase OAuth exchange error:", error);
        return NextResponse.redirect(
          new URL("/login?error=oauth", requestUrl.origin),
        );
      }
    } catch (err) {
      console.error("Supabase OAuth exchange failed:", err);
      return NextResponse.redirect(
        new URL("/login?error=oauth", requestUrl.origin),
      );
    }
  }

  return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const cookieAdapter = {
    get: (name: string) => cookieStore.get(name)?.value,
    set: (name: string, value: string, options?: { [key: string]: unknown }) => {
      cookieStore.set({ name, value, ...(options ?? {}) });
    },
    remove: (name: string, options?: { [key: string]: unknown }) => {
      cookieStore.set({ name, value: "", ...(options ?? {}), maxAge: 0 });
    },
  };
  const supabase = createRouteHandlerClient({ cookies: cookieAdapter });
  const formData = await request.formData();
  const event = formData.get("event");

  if (event === "SIGNED_OUT") {
    await supabase.auth.signOut();
  }

  return NextResponse.json({ success: true });
}
