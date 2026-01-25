import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { ScrollToTopOnRouteChange } from "@/lib/utils/scrollTop";
import { getServerSupabase } from "@/lib/supabaseServer";
import { SupabaseProvider } from "@/components/providers/SupabaseProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { SearchProvider } from "@/components/context/SearchContext";
import ScrollPerfHandler from "@/components/general/ScrollPerfHandler";
import { poppins } from "@/lib/fonts";
import { buildDefaultMetadata, getSiteUrl } from "@/lib/seo";

export const metadata = buildDefaultMetadata();

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await getServerSupabase();

  // Get the actual session data which includes access tokens
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error("Failed to load session", sessionError);
  }

  const initialSession = session;
  const baseUrl = getSiteUrl();

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
        <meta name="theme-color" content="#0891b2" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
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
        <SupabaseProvider initialSession={initialSession}>
          <QueryProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <ToastProvider>
                <SearchProvider>
                  <ScrollToTopOnRouteChange />
                  <ScrollPerfHandler />
                  {children}
                </SearchProvider>
              </ToastProvider>
            </ThemeProvider>
          </QueryProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
