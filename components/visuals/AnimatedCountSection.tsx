// import { useRef, useState } from "react";
import Image from "next/image";
import CountUpNums from "./CountUpNums";
import { Zap } from "lucide-react";
import { SectionHeader } from "@/app/(root)/page";

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
