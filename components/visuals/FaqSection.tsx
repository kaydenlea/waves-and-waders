import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqData = [
  {
    question: "How accurate are the surf forecasts?",
    answer:
      "Our forecasts are sourced directly from NOAA/NDBC buoys and tide stations, providing highly accurate real-time data. We update conditions frequently to ensure you have the most current information before heading to the beach.",
  },
  {
    question: "What data sources do you use?",
    answer:
      "We pull data from multiple reliable sources including NOAA buoys, NDBC wave stations, tide prediction stations, and weather services. This multi-source approach ensures comprehensive and accurate surf conditions.",
  },
  {
    question: "Can I save my favorite surf spots?",
    answer:
      "Yes! You can save your favorite beaches for quick access. Your saved spots will appear in your favorites page, making it easy to check conditions at your go-to breaks.",
  },
  {
    question: "How often is the data updated?",
    answer:
      "Beach conditions are updated every 5 minutes, surf forecasts refresh every 30 minutes, and tide data updates hourly. We use smart caching to ensure fast load times while keeping data fresh.",
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
    <section className="max-w-4xl mx-auto my-20 px-5">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <header className="p-10 text-center">
        <h2 className="text-4xl md:text-5xl font-semibold">
          Frequently Asked Questions
        </h2>
      </header>
      <Accordion type="single" collapsible>
        {faqData.map((faq, index) => (
          <AccordionItem key={`question-${index + 1}`} value={`question-${index + 1}`}>
            <AccordionTrigger>{faq.question}</AccordionTrigger>
            <AccordionContent>{faq.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};

export default FaqSection;
