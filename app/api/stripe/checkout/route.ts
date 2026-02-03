import Stripe from "stripe";

import { getSiteUrl } from "@/lib/seo";

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 200;
const DEFAULT_AMOUNT = 3;
const UNIT_AMOUNT_CENTS = 100;

const getStripe = () => {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return null;
  return new Stripe(secret, {
    apiVersion: "2024-04-10",
  });
};

const clampAmount = (value: number | null): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_AMOUNT;
  }
  const clamped = Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, value));
  return Math.round(clamped * 100) / 100;
};

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return Response.json(
      { error: "Stripe is not configured." },
      { status: 500 },
    );
  }

  let amount: number | null = null;
  try {
    const body = (await request.json()) as { amount?: number | string | null };
    if (body?.amount != null) {
      const parsed = Number.parseFloat(String(body.amount));
      amount = Number.isFinite(parsed) ? parsed : null;
    }
  } catch {
    amount = null;
  }

  const donationAmount = clampAmount(amount);
  const baseUrl = getSiteUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Donation",
          },
          unit_amount: Math.max(
            UNIT_AMOUNT_CENTS,
            Math.round(donationAmount * 100),
          ),
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/donate?success=1`,
    cancel_url: `${baseUrl}/donate?canceled=1`,
  });

  return Response.json({ url: session.url });
}
