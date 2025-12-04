import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { ScrollToTopOnRouteChange } from "@/lib/utils/scrollTop";
import { getServerSupabase } from "@/lib/supabaseServer";
import { SupabaseProvider } from "@/components/providers/SupabaseProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { poppins } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Waves and Waders",
  description: "Check the surf conditions of your local beaches",
};

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

  return (
    <html lang="en" suppressHydrationWarning>
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
              <ScrollToTopOnRouteChange />
              {children}
            </ThemeProvider>
          </QueryProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
