import { getSiteUrl } from "@/lib/seo";

type BreadcrumbItem = {
  label: string;
  href: string;
};

export default function BreadcrumbsJsonLd({
  items,
}: {
  items: BreadcrumbItem[];
}) {
  const baseUrl = getSiteUrl();
  const toAbsolute = (href: string) => {
    try {
      return new URL(href, baseUrl).toString();
    } catch {
      const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
      const normalizedHref = href.startsWith("/") ? href : `/${href}`;
      return `${normalizedBase}${normalizedHref}`;
    }
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: toAbsolute("/"),
      },
      ...items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: item.label,
        item: toAbsolute(item.href),
      })),
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
    />
  );
}

