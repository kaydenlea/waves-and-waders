import type React from "react";
import { Zap } from "lucide-react";
import BeachesMapPreview from "@/components/marketing/BeachesMapPreview";
import PremiumStatsStrip from "@/components/visuals/PremiumStatsStrip";
import { fetchBeachCount } from "@/lib/supabase";
import { FEATURE_CATEGORIES, FEATURE_COLUMNS } from "@/lib/supabase";
import { ALL_WIDGET_IDS } from "@/components/general/dashboardLayout";

export function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mt-1 mb-9 flex items-start justify-center gap-3">
      {Icon && (
        <div className="mt-1 p-1.5 rounded-xl bg-gradient-to-br from-cyan-300 to-blue-500 text-foreground shadow-lg shadow-cyan-500/20">
          <Icon className="h-7 w-7" aria-hidden />
        </div>
      )}
      <div>
        <h2 className="text-center text-foreground font-semibold tracking-tight text-4xl sm:text-5xl">
          {title}
        </h2>
        {subtitle && (
          <p className="text-center mt-4 max-w-2xl text-foreground/70 text-pretty text-lg">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

const AnimatedCountSection = async () => {
  const beachesCount = await fetchBeachCount();
  //   const ref = useRef<HTMLDivElement | null>(null);
  //   const [isVisible, setIsVisible] = useState(false);

  //   useEffect(() => {
  //     const observer = new IntersectionObserver(
  //       ([entry]) => {
  //         if (entry.isIntersecting) {
  //           setIsVisible(true);
  //           // optional: observer.unobserve(entry.target); // only run once
  //         }
  //       },
  //       { threshold: 0.2 } // 20% in view
  //     );

  //     if (ref.current) {
  //       observer.observe(ref.current);
  //     }

  //     return () => observer.disconnect();
  //   }, []);
  return (
    <section className="mt-16 mx-auto max-w-7xl px-4 sm:px-6">
      <SectionHeader
        // icon={Zap}
        title="Explore Beaches"
        subtitle="Explore beaches on an interactive map. Scan surf spots, open details, and jump to the full Beaches experience."
      />
      <div className="w-full grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] lg:gap-10 lg:items-stretch min-w-0">
        <BeachesMapPreview className="w-full min-w-0" />
        <PremiumStatsStrip
          className="min-w-0"
          stats={[
            {
              id: "beaches",
              label: "Beaches",
              helper: "California coverage.",
              value: beachesCount,
            },
            {
              id: "amenityFilters",
              label: "Amenity filters",
              helper: "Bathrooms, parking, lifeguards.",
              value: FEATURE_COLUMNS.length,
            },
            {
              id: "filterGroups",
              label: "Filter groups",
              helper: "Access, trails, activities.",
              value: Object.keys(FEATURE_CATEGORIES).length,
            },
            {
              id: "dashboardWidgets",
              label: "Dashboard widgets",
              helper: "Tides, swell, wind, more.",
              value: ALL_WIDGET_IDS.length,
            },
          ]}
        />
      </div>
    </section>
  );
};

export default AnimatedCountSection;
