import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { ScrollToTopOnRouteChange } from "@/lib/utils/scrollTop";
import { getServerSupabase } from "@/lib/supabaseServer";
import { SupabaseProvider } from "@/components/providers/SupabaseProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";

const poppins = Poppins({
  variable: "--font-poppins",
  display: "swap",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
});

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

  // Use getUser() instead of getSession() for secure authentication
  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser();

  const user = userData.user ?? null;

  if (userError) {
    console.error("Failed to load authenticated user", userError);
  }

  // Create a minimal session object from the authenticated user
  const initialSession = user
    ? {
        access_token: '', // Not needed on client
        refresh_token: '', // Not needed on client
        expires_in: 0,
        expires_at: 0,
        token_type: 'bearer',
        user: user,
      }
    : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.variable} font-poppins antialiased`} suppressHydrationWarning>
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
