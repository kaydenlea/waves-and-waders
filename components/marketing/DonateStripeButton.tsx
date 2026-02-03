"use client";

import * as React from "react";

type Props = {
  amount: number | null;
  label: string;
  disabled?: boolean;
};

export default function DonateStripeButton({
  amount,
  label,
  disabled = false,
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onClick = async () => {
    if (loading || disabled) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error || "Unable to start checkout.");
      }

      const data = (await res.json()) as { url?: string | null };
      if (!data?.url) throw new Error("Checkout session URL missing.");
      const opened = window.open(data.url, "_blank", "noopener,noreferrer");
      if (!opened) {
        throw new Error(
          "Popup blocked. Allow popups for this site to open Stripe Checkout."
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-stretch gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={loading || disabled}
        className="inline-flex items-center justify-center rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-sm transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Redirecting…" : label}
      </button>
      {error ? (
        <p className="text-xs text-rose-500" role="status">
          {error}
        </p>
      ) : null}
    </div>
  );
}
