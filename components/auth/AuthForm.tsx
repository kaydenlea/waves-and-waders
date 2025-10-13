"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import type { Provider } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";

type Mode = "signin" | "signup";

export const AuthForm = () => {
  const supabase = useSupabaseClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams?.get("next");
  const redirectTarget =
    nextParam && nextParam.startsWith("/") ? nextParam : "/";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const toggleMode = () => {
    setMode((current) => (current === "signin" ? "signup" : "signin"));
    setError(null);
    setMessage(null);
  };

  const handleOAuthSignIn = async (provider: Provider) => {
    setError(null);
    setMessage(null);
    const origin =
      typeof window !== "undefined" ? window.location.origin : undefined;
    const params = new URLSearchParams();
    if (redirectTarget && redirectTarget !== "/") {
      params.set("next", redirectTarget);
    }
    const callbackPath = params.size ? `/api/auth/callback?${params}` : "/api/auth/callback";
    const redirectTo = origin ? `${origin}${callbackPath}` : undefined;
    const { error: providerError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    });
    if (providerError) setError(providerError.message);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError(signInError.message);
          return;
        }
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        setMessage(
          "Check your inbox to confirm your email address before signing in."
        );
        return;
      }
      router.push(redirectTarget);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-3xl border border-border bg-background/80 p-8 shadow-lg backdrop-blur">
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "signin" ? "Sign in" : "Create an account"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Use your email address or continue with Google.
        </p>
      </header>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-muted-foreground">
            Email
          </span>
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-border bg-background/90 px-3 py-2 text-sm outline-none ring-offset-background transition focus:border-primary focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-muted-foreground">
            Password
          </span>
          <input
            required
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-border bg-background/90 px-3 py-2 text-sm outline-none ring-offset-background transition focus:border-primary focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <Button type="submit" disabled={loading}>
          {loading
            ? "Working..."
            : mode === "signin"
            ? "Sign in"
            : "Create account"}
        </Button>
      </form>

      <div className="flex flex-col gap-3">
        <Button
          variant="outline"
          onClick={() => handleOAuthSignIn("google")}
          disabled={loading}
        >
          Continue with Google
        </Button>
        <button
          type="button"
          onClick={toggleMode}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          {mode === "signin"
            ? "New here? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </div>

      {error && <p className="text-sm text-destructive">Error: {error}</p>}
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
};
