import { Waves } from "lucide-react";

const VisualFallback = () => {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.15),_transparent_70%)]">
      <div className="relative">
        <div
          className="absolute inset-0 animate-pulse rounded-full bg-cyan-400/20 blur-2xl"
          aria-hidden
        />
        <div className="relative grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-cyan-300 to-blue-400 text-slate-900 shadow-2xl">
          <Waves className="h-10 w-10" />
        </div>
      </div>
    </div>
  );
};

export default VisualFallback;
