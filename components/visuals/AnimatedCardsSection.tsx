import Link from "next/link";
import CardSwap, { Card } from "./CardSwap";
import { Compass, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export const Description = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "p-2 space-y-4 flex-1 flex flex-col items-center xl:items-start",
        className
      )}
    >
      <h2 className="text-4xl sm:text-5xl font-semibold">
        Forecasts made simple.
      </h2>
      <p className="text-muted-foreground w-9/10 sm:w-3/4 md:w-3/5 lg:w-2/5 xl:w-full text-center xl:text-start">
        Decide what conditions you want to see in your forecasts. Simplify your
        dashboard to what you need.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-row flex-wrap items-center justify-center w-full gap-2 whitespace-nowrap">
          <Link
            href="/beaches#content"
            className="group inline-flex items-center gap-2 rounded-full bg-foreground border border-transparent px-4 py-3 font-medium text-background shadow-xl transition hover:shadow-cyan-500/20"
          >
            <Compass className="h-4 w-4" /> Explore
            <span className="hidden md:block md:-ml-1">nearby</span>
          </Link>
          <Link
            href="/favorites"
            className="shadow-xl inline-flex items-center gap-2 rounded-full border border-border/40 bg-highlight-1 px-4 py-3 font-medium text-foreground/90 backdrop-blur transition hover:shadow-cyan-500/20"
          >
            <Heart className="h-4 w-4" /> Saved
            <span className="hidden md:block md:-ml-1">spots</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

const AnimatedScrollSection = () => {
  return (
    <CardSwap cardDistance={60} verticalDistance={70} delay={3000}>
      <Card>
        <h3>Card 1</h3>
        <p>Your content here</p>
      </Card>
      <Card>
        <h3>Card 2</h3>
        <p>Your content here</p>
      </Card>
      <Card>
        <h3>Card 3</h3>
        <p>Your content here</p>
      </Card>
    </CardSwap>
  );
};
export default AnimatedScrollSection;
