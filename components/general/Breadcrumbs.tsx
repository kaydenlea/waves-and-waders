"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

type BreadcrumbItem = {
  label: string;
  href: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

const Breadcrumbs = ({ items }: BreadcrumbsProps) => {
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-start gap-2 text-sm text-muted-foreground">
          <li>
            <Link
              href="/"
              className="flex items-start hover:text-foreground transition-colors"
              aria-label="Home"
            >
              <Home className="h-4 w-4 mt-[0.1rem]" />
            </Link>
          </li>
          {items.map((item, index) => (
            <li key={item.href} className="flex items-start gap-2">
              <ChevronRight
                className="h-4 w-4 mt-[0.1rem] shrink-0"
                aria-hidden="true"
              />
              {index === items.length - 1 ? (
                <span
                  className="font-medium text-foreground leading-snug"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors leading-snug"
                >
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
};

export default Breadcrumbs;
