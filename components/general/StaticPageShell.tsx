import type { ReactNode } from "react";
import NavBar from "@/components/general/NavBar";
import Footer from "@/components/general/Footer";

export default function StaticPageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <>
      <NavBar />
      <main className="mx-auto w-full max-w-4xl px-4 pt-24 pb-16 sm:px-6 @min-4xl:mt-[5.5rem] @min-4xl:pt-16">
        <header className="mx-auto max-w-3xl text-center">
          <h1 className="text-balance text-foreground text-4xl sm:text-5xl font-semibold tracking-tight">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-4 text-pretty text-muted-foreground text-lg">
              {subtitle}
            </p>
          ) : null}
        </header>
        <div className="mx-auto mt-12 max-w-3xl">{children}</div>
      </main>
      <Footer className="static rounded-t-xl" />
    </>
  );
}
