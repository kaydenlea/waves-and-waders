import type { Metadata } from "next";

const normalizeBaseUrl = (value?: string | null): string | null => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `https://${value}`;
};

export const getSiteUrl = (): string => {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.NEXT_PUBLIC_VERCEL_URL,
    process.env.VERCEL_URL,
    process.env.NEXT_PUBLIC_APP_BASE_URL,
    process.env.APP_BASE_URL,
    process.env.URL,
    process.env.HOST,
  ];

  for (const value of candidates) {
    const normalized = normalizeBaseUrl(value);
    if (normalized) {
      return normalized.replace(/\/+$/, "");
    }
  }

  const port = Number.parseInt(
    process.env.PORT ?? process.env.NEXT_PUBLIC_PORT ?? "",
    10
  );
  return `http://127.0.0.1:${Number.isFinite(port) ? port : 3000}`;
};

export const toAbsoluteUrl = (path: string): string => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return new URL(path, getSiteUrl()).toString();
};

export const buildDefaultMetadata = (): Metadata => {
  const title = "Waves and Waders";
  const description = "Check the surf conditions of your local beaches";
  const base = new URL(getSiteUrl());

  return {
    metadataBase: base,
    title: {
      default: title,
      template: `%s | ${title}`,
    },
    description,
    openGraph: {
      type: "website",
      siteName: title,
      title,
      description,
      url: base,
      images: [
        {
          url: toAbsoluteUrl("/logo.png"),
          width: 512,
          height: 512,
          alt: "Waves and Waders logo",
        },
      ],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [toAbsoluteUrl("/logo.png")],
    },
    alternates: {
      canonical: base.toString(),
    },
  };
};
