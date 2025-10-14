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
  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.getSession();

  let session = sessionData.session ?? null;
  let user = session?.user ?? null;
  let userError: Error | null = null;

  if (session) {
    const {
      data: userData,
      error,
    } = await supabase.auth.getUser();

    if (error) {
      userError = error;
    } else {
      user = userData.user;
    }
  }

  if (userError) {
    console.error("Failed to load authenticated user", userError);
  }

  if (sessionError) {
    console.error("Failed to load session", sessionError);
  }

  const initialSession = session
    ? {
        ...session,
        user: user ?? session.user,
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
