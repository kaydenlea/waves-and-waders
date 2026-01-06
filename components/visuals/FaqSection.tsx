import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import InViewOnce from "@/components/marketing/InViewOnce";
import type { CSSProperties } from "react";

const faqData = [
  {
    question: "How accurate are the surf forecasts?",
    answer:
      "Our forecasts are sourced from NOAA model grids and tide stations, then refreshed on a steady schedule so conditions stay current before you head out.",
  },
  {
    question: "What data sources do you use?",
    answer:
      "We use NOAA model grid data for surf conditions and NOAA tide stations for tide predictions. These sources provide consistent coverage across the coast.",
  },
  {
    question: "Can I save my favorite surf spots?",
    answer:
      "Yes! You can save your favorite beaches for quick access. Your saved spots will appear in your favorites page, making it easy to check conditions at your go-to breaks.",
  },
  {
    question: "How often is the data updated?",
    answer:
      "Nowcast updates run every 3 hours, and a full daily refresh runs around 00:30 PT to update surf and tides. We also cache results for faster load times.",
  },
];

const FaqSection = () => {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqData.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <section
      data-ww-section
      data-inview="false"
      className="ww-section mx-auto max-w-4xl xl:max-w-5xl px-4 sm:px-6 py-16 sm:py-20"
    >
      <InViewOnce rootAttr="data-ww-section" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <header className="text-center">
        <h2 className="text-balance text-4xl md:text-5xl font-semibold tracking-tight">
          Frequently Asked Questions
        </h2>
      </header>
      <div
        className="ww-reveal mx-auto mt-10 rounded-3xl border border-border/30 bg-background/40 p-3 shadow-xs sm:p-6"
        style={{ "--delay": "60ms" } as CSSProperties}
      >
        <Accordion type="single" collapsible>
          {faqData.map((faq, index) => (
            <AccordionItem
              key={`question-${index + 1}`}
              value={`question-${index + 1}`}
            >
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FaqSection;
