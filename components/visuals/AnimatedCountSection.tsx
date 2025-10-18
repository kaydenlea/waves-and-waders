// import { useRef, useState } from "react";
import Image from "next/image";
import CountUpNums from "./CountUpNums";
import { Zap } from "lucide-react";

export function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mt-1 mb-12 flex items-center gap-3">
      <div className="p-1.5 rounded-xl bg-gradient-to-br from-cyan-300 to-blue-500 text-foreground shadow-lg shadow-cyan-500/20">
        <Icon className="h-7 w-7" aria-hidden />
      </div>
      <div>
        <h2 className="text-foreground font-semibold tracking-tight text-4xl sm:text-5xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 max-w-2xl text-foreground/70">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

const AnimatedCountSection = () => {
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
        icon={Zap}
        title="Features"
        // subtitle="Calculated from your device location for a fast, privacy-first experience."
      />
      <div className="flex flex-col lg:flex-row justify-between gap-20 w-full px-4">
        {/* <Image
          className="rounded-b-2xl w-full h-full"
          src="/surf2.png"
          alt="Surf background"
          width={0}
          height={0}
          priority
        /> */}
        <div className="bg-highlight-5 rounded-xl w-full lg:w-7/10 h-80 lg:h-120 my-auto" />
        <ul className="text-6xl font-semibold flex flex-col gap-3">
          <li className="flex flex-col text-end">
            <span>
              <CountUpNums from={1000} to={1100} separator="," direction="up" />
              +
            </span>
            <span className="text-lg font-medium text-foreground/70">
              Beaches
            </span>
          </li>
          <hr className="w-full lg:w-60 ml-auto" />
          <li className="flex flex-col py-2 text-end">
            <span>
              <CountUpNums from={300} to={400} separator="," direction="up" />+
            </span>
            <span className="text-lg font-medium text-foreground/70">
              Beach Tags
            </span>
          </li>
          <hr className="w-full lg:w-60 ml-auto" />
          <li className="flex flex-col py-2 text-end">
            <span>
              <CountUpNums from={0} to={16} separator="," direction="up" />+
            </span>
            <span className="text-lg font-medium text-foreground/70">
              Day Forecasts
            </span>
          </li>
          <hr className="w-full lg:w-60 ml-auto" />
          <li className="flex flex-col py-2 text-end">
            <span>
              <CountUpNums from={0} to={8} separator="," direction="up" />+
            </span>
            <span className="text-lg font-medium text-foreground/70">
              Features
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
};

export default AnimatedCountSection;
