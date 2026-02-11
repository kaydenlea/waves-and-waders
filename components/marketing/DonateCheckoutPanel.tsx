"use client";

import * as React from "react";

import DonateStripeButton from "@/components/marketing/DonateStripeButton";

type Props = {
  amounts: number[];
  initialAmount: number | null;
};

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 200;

const formatAmountInput = (value: number | null) =>
  value != null && Number.isFinite(value) ? String(value) : "";

const parseAmountInput = (raw: string) => {
  if (!raw.trim()) return null;
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return null;
  return Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, value));
};

export default function DonateCheckoutPanel({
  amounts,
  initialAmount,
}: Props) {
  const [amountInput, setAmountInput] = React.useState(() =>
    formatAmountInput(initialAmount),
  );

  const parsedAmount = parseAmountInput(amountInput);
  const amountValid = amountInput.trim() === "" || parsedAmount != null;
  const donateLabel =
    parsedAmount != null ? `Donate $${parsedAmount}` : "Donate";

  return (
    <div className="flex w-full flex-col gap-4">
      <div>
        <div className="text-xs font-semibold tracking-wide text-foreground/70">
          Suggested
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {amounts.map((amount) => {
            const isActive = Number(amountInput) === amount;
            return (
              <button
                key={amount}
                type="button"
                onClick={() => setAmountInput(String(amount))}
                className={[
                  "inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-sm font-semibold shadow-sm",
                  "transition-colors duration-200 motion-reduce:transition-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  isActive
                    ? "border-border/70 bg-foreground text-background"
                    : "border-border/50 bg-background/50 text-foreground/80 hover:bg-background/70",
                ].join(" ")}
              >
                ${amount}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold tracking-wide text-foreground/70">
          Custom amount
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">$</span>
          <input
            inputMode="decimal"
            type="number"
            min={MIN_AMOUNT}
            max={MAX_AMOUNT}
            step="0.01"
            placeholder="Enter amount"
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
            className="w-full rounded-xl border border-border/50 bg-background/60 px-3 py-2 text-base text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
        {!amountValid ? (
          <p className="text-xs text-rose-500">
            Enter a valid amount between ${MIN_AMOUNT} and ${MAX_AMOUNT}.
          </p>
        ) : null}
      </div>

      <DonateStripeButton
        amount={parsedAmount}
        label={donateLabel}
        disabled={!amountValid}
      />
    </div>
  );
}
