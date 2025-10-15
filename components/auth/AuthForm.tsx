"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import type { Provider } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";

type Mode = "signin" | "signup" | "forgot-password" | "reset-password";

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

  const handleForgotPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : undefined;
      const resetUrl = origin ? `${origin}/login?mode=reset` : undefined;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetUrl,
      });

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

  const handleResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
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

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-3xl border border-border bg-background/80 p-8 shadow-lg backdrop-blur">
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {getTitle()}
        </h1>
        <p className="text-sm text-muted-foreground">
          {getDescription()}
        </p>
      </header>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {mode === "reset-password" ? (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-muted-foreground">
                New Password
              </span>
              <input
                required
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-xl border border-border bg-background/90 px-3 py-2 text-sm outline-none ring-offset-background transition focus:border-primary focus:ring-2 focus:ring-primary/40"
                minLength={6}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-muted-foreground">
                Confirm New Password
              </span>
              <input
                required
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-border bg-background/90 px-3 py-2 text-sm outline-none ring-offset-background transition focus:border-primary focus:ring-2 focus:ring-primary/40"
                minLength={6}
              />
            </label>
          </>
        ) : (
          <>
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
            {mode !== "forgot-password" && (
              <label className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Password
                  </span>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={showForgotPassword}
                      className="text-xs text-primary underline-offset-4 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  required
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-border bg-background/90 px-3 py-2 text-sm outline-none ring-offset-background transition focus:border-primary focus:ring-2 focus:ring-primary/40"
                />
              </label>
            )}
          </>
        )}
        <Button type="submit" disabled={loading}>
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

      {(mode === "signin" || mode === "signup") && (
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
      )}

      {(mode === "forgot-password" || mode === "reset-password") && (
        <button
          type="button"
          onClick={backToSignIn}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Back to sign in
        </button>
      )}

      {error && <p className="text-sm text-destructive">Error: {error}</p>}
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
};
