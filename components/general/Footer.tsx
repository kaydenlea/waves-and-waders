import Link from "next/link";
import { Waves } from "lucide-react";
import { cn } from "@/lib/utils";

const Footer = ({ className }: { className?: string }) => {
  return (
    <footer
      className={cn(
        "border-t border-border/10 py-10 bg-highlight-3",
        className
      )}
    >
      <div className="mx-auto flex flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6">
        <div className="flex items-center gap-3 text-foreground/70">
          <Waves className="h-5 w-5" /> Waves&Waders
          {/* <span className="text-foreground/40">·</span>
          <span className="text-foreground/60">Made for the ocean-minded</span> */}
        </div>
        <div className="flex items-center gap-4 text-foreground/60">
          <Link href="#" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="#" className="hover:text-foreground">
            Terms
          </Link>
          <Link href="#" className="hover:text-foreground">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
