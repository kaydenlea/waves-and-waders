import type { ReactNode } from "react";

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
    <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-[calc(7rem+env(safe-area-inset-top))] sm:px-6 sm:pt-[calc(7.5rem+env(safe-area-inset-top))]">
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
  );
}
