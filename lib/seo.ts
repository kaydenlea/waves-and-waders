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

export const buildPageMetadata = (input: {
  title: string;
  description: string;
  canonicalPath: string;
  openGraphImage?: string;
  twitterImage?: string;
  robots?:
    | {
        index?: boolean;
        follow?: boolean;
      }
    | undefined;
}): Metadata => {
  const canonical = input.canonicalPath;
  const ogImage = input.openGraphImage ?? "/opengraph-image";
  const twitterImage = input.twitterImage ?? "/twitter-image";

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical },
    openGraph: {
      title: input.title,
      description: input.description,
      url: canonical,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${input.title} | Waves and Waders`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [twitterImage],
    },
    robots: input.robots,
  };
};

export const buildDefaultMetadata = (): Metadata => {
  const title = "Waves and Waders";
  const description = "Get real-time surf forecasts, wave heights, swell direction, and tide charts for your favorite beaches. Plan your surf sessions with accurate NOAA data and interactive maps.";
  const base = new URL(getSiteUrl());
  const ogImage = "/opengraph-image";
  const twitterImage = "/twitter-image";

  return {
    metadataBase: base,
    title: {
      default: title,
      template: `%s | ${title}`,
    },
    description,
    keywords: [
      "surf forecast",
      "surf report",
      "wave forecast",
      "beach conditions",
      "swell forecast",
      "tide charts",
      "surf conditions",
      "ocean weather",
      "NOAA surf data",
    ],
    openGraph: {
      type: "website",
      siteName: title,
      title,
      description,
      url: base,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: "Waves and Waders surf forecasts",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [twitterImage],
    },
    icons: {
      icon: [
        { url: "/icon.png", type: "image/png", sizes: "32x32" },
        { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
        { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
      ],
      apple: [
        { url: "/apple-icon.png", type: "image/png", sizes: "180x180" },
      ],
      shortcut: ["/icon.png"],
    },
  };
};
