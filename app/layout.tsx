import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { ScrollToTopOnRouteChange } from "@/lib/utils/scrollTop";
import { getServerSupabase } from "@/lib/supabaseServer";
import { SupabaseProvider } from "@/components/providers/SupabaseProvider";

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

  // Only fetch session if we have an authenticated user
  let session = null;
  if (user) {
    const { data: sessionData } = await supabase.auth.getSession();
    session = sessionData.session;
  }

  if (userError) {
    console.error("Failed to load authenticated user", userError);
  }

  const initialSession = user && session
    ? {
        ...session,
        user: user,
      }
    : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.variable} font-poppins antialiased`}>
        <SupabaseProvider initialSession={initialSession}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ScrollToTopOnRouteChange />
            {children}
          </ThemeProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
