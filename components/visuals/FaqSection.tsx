import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import InViewOnce from "@/components/marketing/InViewOnce";

const faqData = [
  {
    question: "How accurate are the surf forecasts?",
    answer:
      "Forecasts are built using public NOAA/NDBC buoy observations and tide data. They’re best-effort estimates—conditions can change quickly, so always use judgment on the water.",
  },
  {
    question: "What data sources do you use?",
    answer:
      "We use public NOAA and NDBC buoy data and tide prediction stations to power surf and tide views.",
  },
  {
    question: "Can I save my favorite surf spots?",
    answer:
      "Yes! You can save your favorite beaches for quick access. Your saved spots will appear in your favorites page, making it easy to check conditions at your go-to breaks.",
  },
  {
    question: "How often is the data updated?",
    answer:
      "Updates are refreshed on a schedule (typically every few minutes for beach conditions, ~30 minutes for forecasts, and about hourly for tides). Caching keeps pages fast while data stays current.",
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
      className="ww-section mx-auto max-w-5xl px-4 sm:px-6 py-16 sm:py-20"
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
        style={{ ["--delay" as any]: "60ms" }}
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
