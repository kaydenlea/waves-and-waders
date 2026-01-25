"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import type { Provider } from "@supabase/supabase-js";
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { publicEnv } from "@/lib/env/public";
import type { ReactNode } from "react";

type Mode = "signin" | "signup" | "forgot-password" | "reset-password";

export const AuthForm = ({
  className,
  footer,
}: {
  className?: string;
  footer?: ReactNode;
}) => {
  const supabase = useSupabaseClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams?.get("next");
  const redirectTarget =
    nextParam && nextParam.startsWith("/") ? nextParam : "/";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const toggleMode = () => {
    setMode((current) => (current === "signin" ? "signup" : "signin"));
    setError(null);
    setMessage(null);
  };

  const setPrimaryMode = (nextMode: Extract<Mode, "signin" | "signup">) => {
    setMode(nextMode);
    setError(null);
    setMessage(null);
  };

  const showForgotPassword = () => {
    setMode("forgot-password");
    setError(null);
    setMessage(null);
  };

  const backToSignIn = () => {
    setMode("signin");
    setError(null);
    setMessage(null);
    setEmail("");
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleOAuthSignIn = async (provider: Provider) => {
    setError(null);
    setMessage(null);
    const origin =
      publicEnv.NEXT_PUBLIC_SITE_URL ??
      (typeof window !== "undefined" ? window.location.origin : undefined);
    const params = new URLSearchParams();
    if (redirectTarget && redirectTarget !== "/") {
      params.set("next", redirectTarget);
    }
    const callbackPath = params.size
      ? `/api/auth/callback?${params}`
      : "/api/auth/callback";
    const redirectTo = origin ? `${origin}${callbackPath}` : undefined;
    const { error: providerError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    });
    if (providerError) setError(providerError.message);
  };

  const handleForgotPassword = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : undefined;
      const resetUrl = origin ? `${origin}/login?mode=reset` : undefined;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: resetUrl,
        }
      );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setMessage(
        "Password reset link sent! Check your email inbox for instructions to reset your password."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setMessage("Password updated successfully! Redirecting to home...");
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (mode === "forgot-password") {
      return handleForgotPassword(event);
    }

    if (mode === "reset-password") {
      return handleResetPassword(event);
    }

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

  // Check for reset mode from URL
  useEffect(() => {
    const modeParam = searchParams?.get("mode");
    if (modeParam === "reset") {
      setMode("reset-password");
    }
  }, [searchParams]);

  const getTitle = () => {
    switch (mode) {
      case "signin":
        return "Sign in";
      case "signup":
        return "Create an account";
      case "forgot-password":
        return "Reset your password";
      case "reset-password":
        return "Set new password";
      default:
        return "Sign in";
    }
  };

  const getDescription = () => {
    switch (mode) {
      case "signin":
      case "signup":
        return "Use your email address or continue with Google.";
      case "forgot-password":
        return "Enter your email address and we'll send you a link to reset your password.";
      case "reset-password":
        return "Enter your new password below.";
      default:
        return "";
    }
  };

  const showOAuth = mode === "signin" || mode === "signup";
  const showResetBack = mode === "forgot-password" || mode === "reset-password";

  return (
    <div
      className={cn(
        "max-w-xl mx-auto ww-hero-reveal motion-reduce:animate-none w-full rounded-[2rem] border border-border/60 bg-background/90 p-6 shadow-[0_24px_70px_rgba(2,6,23,0.12)] supports-[backdrop-filter]:bg-background/70 supports-[backdrop-filter]:backdrop-blur-xl sm:p-8 dark:bg-background/40 dark:shadow-[0_24px_70px_rgba(0,0,0,0.35)]",
        className
      )}
    >
      <header className="space-y-4 text-center">
        {showOAuth ? (
          <div className="space-y-3">
            <Tabs
              value={mode}
              onValueChange={(value) =>
                setPrimaryMode(value as "signin" | "signup")
              }
            >
              <TabsList className="mx-auto h-11 w-full max-w-[20rem] rounded-2xl border border-border/60 bg-background/70 p-1 shadow-sm supports-[backdrop-filter]:bg-background/55 supports-[backdrop-filter]:backdrop-blur-md dark:bg-background/35">
                <TabsTrigger
                  value="signin"
                  className="h-9 rounded-xl text-sm font-semibold"
                >
                  Sign in
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="h-9 rounded-xl text-sm font-semibold"
                >
                  Sign up
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-pretty text-sm text-muted-foreground">
              {getDescription()}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              {getTitle()}
            </h1>
            <p className="text-pretty text-sm text-muted-foreground">
              {getDescription()}
            </p>
          </div>
        )}
      </header>

      <form
        className="mt-2 flex flex-col gap-4"
        onSubmit={handleSubmit}
        aria-busy={loading}
      >
        {mode === "reset-password" ? (
          <>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                New Password
              </span>
              <div className="relative">
                <KeyRound
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Enter a new password"
                  className="h-11 w-full rounded-xl border border-border bg-background/75 px-3 pl-10 text-sm outline-none ring-offset-background transition focus:border-foreground/30 focus:ring-2 focus:ring-ring/40 dark:bg-background/35"
                  minLength={6}
                />
              </div>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Confirm New Password
              </span>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter your new password"
                  className="h-11 w-full rounded-xl border border-border bg-background/75 px-3 pl-10 text-sm outline-none ring-offset-background transition focus:border-foreground/30 focus:ring-2 focus:ring-ring/40 dark:bg-background/35"
                  minLength={6}
                />
              </div>
            </label>
          </>
        ) : (
          <>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Email
              </span>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  required
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="h-11 w-full rounded-xl border border-border bg-background/75 px-3 pl-10 text-sm outline-none ring-offset-background transition focus:border-foreground/30 focus:ring-2 focus:ring-ring/40 dark:bg-background/35"
                />
              </div>
            </label>
            {mode !== "forgot-password" && (
              <label className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Password
                  </span>
                  {mode === "signin" ? (
                    <button
                      type="button"
                      onClick={showForgotPassword}
                      className="text-xs text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 rounded-sm"
                    >
                      Forgot password?
                    </button>
                  ) : (
                    <span
                      aria-hidden="true"
                      className="text-xs text-transparent select-none"
                    >
                      Forgot password?
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <input
                    required
                    type="password"
                    autoComplete={
                      mode === "signin" ? "current-password" : "new-password"
                    }
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    className="h-11 w-full rounded-xl border border-border bg-background/75 px-3 pl-10 text-sm outline-none ring-offset-background transition focus:border-foreground/30 focus:ring-2 focus:ring-ring/40 dark:bg-background/35"
                  />
                </div>
              </label>
            )}
          </>
        )}
        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-xl text-sm font-semibold shadow-sm shadow-foreground/10"
        >
          {loading
            ? "Working..."
            : mode === "signin"
            ? "Sign in"
            : mode === "signup"
            ? "Create account"
            : mode === "forgot-password"
            ? "Send reset link"
            : "Update password"}
        </Button>
      </form>

      {showOAuth && (
        <div className="mt-6">
          <div
            role="separator"
            aria-label="or"
            className="flex items-center gap-3"
          >
            <div className="h-px flex-1 bg-border/70" aria-hidden="true" />
            <span className="text-xs font-medium text-muted-foreground">
              or
            </span>
            <div className="h-px flex-1 bg-border/70" aria-hidden="true" />
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Button
              variant="outline"
              onClick={() => handleOAuthSignIn("google")}
              disabled={loading}
              className="h-11 w-full rounded-xl bg-background/60 hover:bg-highlight-6/50 supports-[backdrop-filter]:bg-background/45 supports-[backdrop-filter]:backdrop-blur-md"
            >
              Continue with Google
            </Button>

            <button
              type="button"
              onClick={toggleMode}
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 rounded-sm"
            >
              {mode === "signin"
                ? "New here? Create an account"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      )}

      {showResetBack && (
        <button
          type="button"
          onClick={backToSignIn}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 rounded-sm"
        >
          Back to sign in
        </button>
      )}

      <div className="min-h-[3.25rem] space-y-2" aria-live="polite">
        {error ? (
          <div
            role="alert"
            className="flex gap-2 rounded-2xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <p className="min-w-0">Error: {error}</p>
          </div>
        ) : null}
        {message ? (
          <div className="flex gap-2 rounded-2xl border border-border/60 bg-background/50 px-3 py-2 text-sm text-muted-foreground supports-[backdrop-filter]:bg-background/40 supports-[backdrop-filter]:backdrop-blur-md">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70"
              aria-hidden="true"
            />
            <p className="min-w-0">{message}</p>
          </div>
        ) : null}
      </div>

      {footer ? <div className="mt-6">{footer}</div> : null}
    </div>
  );
};
