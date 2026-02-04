import "./globals.css";
import { poppins } from "@/lib/fonts";
import { buildDefaultMetadata, getSiteUrl } from "@/lib/seo";
import { AppProviders } from "./providers";
import { cookies } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import type { Viewport } from "next";

export const metadata = buildDefaultMetadata();
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0891b2",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Avoid getSession on the server to prevent untrusted user warnings.
  const initialSession = null;
  const baseUrl = getSiteUrl();
  const cookieStore = await cookies();
  const initialTabPreferences = {
    beaches: cookieStore.get("ww_tab_beaches")?.value ?? null,
    beachDashboard: cookieStore.get("ww_tab_beach_dashboard")?.value ?? null,
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        name: "Waves and Waders",
        url: baseUrl,
        logo: `${baseUrl}/icon-512.png`,
        description:
          "Live surf conditions, beach maps, and feature-rich spot guides for coastal breaks.",
        sameAs: [
          // Add your social media profiles here when available
          // "https://twitter.com/wavesandwaders",
          // "https://facebook.com/wavesandwaders",
          // "https://instagram.com/wavesandwaders"
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        url: baseUrl,
        name: "Waves and Waders",
        inLanguage: "en-US",
        publisher: { "@id": `${baseUrl}/#organization` },
      },
    ],
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="manifest" href="/manifest.json" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body
        className={`${poppins.variable} font-poppins antialiased`}
        suppressHydrationWarning
      >
        <AppProviders
          initialSession={initialSession}
          initialTabPreferences={initialTabPreferences}
        >
          {children}
          <Analytics />
        </AppProviders>
      </body>
    </html>
  );
}
