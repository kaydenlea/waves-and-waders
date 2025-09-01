// import Link from "next/link";
// import SearchBar from "./SearchBar";
// import ThemeToggle from "./ThemeToggle";
// import { AlignJustify, Waves } from "lucide-react";

// const NavBar = () => {
//   return (
//     <header className="fixed @min-3xl:relative px-1.5 pt-1.5 @min-3xl:p-0 z-2 w-full @container backdrop-blur-md">
//       <nav
//         aria-label="primary navigation"
//         className="flex justify-between p-3 shadow-md bg-background rounded-md @min-3xl:rounded-none w-full border border-border"
//       >
//         {/* <Link href="/" className="p-3 icon-button">
//           Logo
//         </Link> */}
//         <Link href="/" className="group inline-flex items-center gap-2">
//           <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 to-blue-500 text-foreground shadow-lg shadow-cyan-500/20">
//             <Waves className="h-6 w-6" aria-hidden />
//           </div>
//           <span className="text-lg font-semibold tracking-tight text-foreground hidden sm:block">
//             Waves<span className="ml-[0.9]">&</span>Waders
//           </span>
//           <span className="text-lg font-semibold tracking-tight text-foreground sm:hidden">
//             W&W
//           </span>
//         </Link>
//         <SearchBar />
//         <div className="flex gap-2">
//           <Link
//             href="/"
//             className="whitespace-nowrap flex items-center text-md font-medium text-foreground/70 hidden @min-4xl:flex hover:bg-highlight-3 p-2 rounded-full"
//           >
//             Sign in
//           </Link>
//           <ThemeToggle />
//           <button
//             aria-label="more options"
//             className="icon-button p-4 hover:bg-highlight-3"
//           >
//             <AlignJustify className="icon-sm" />
//           </button>
//         </div>
//       </nav>
//     </header>
//   );
// };

// export default NavBar;

import Link from "next/link";
import SearchBar from "./SearchBar";
import ThemeToggle from "./ThemeToggle";
import { AlignJustify, Waves } from "lucide-react";

const NavBar = () => {
  return (
    <header className="fixed px-1.5 pt-1.5 @min-3xl:p-0 z-2 w-full @container backdrop-blur-md">
      <nav
        aria-label="primary navigation"
        className="flex items-center justify-between p-5 shadow-md bg-background rounded-md @min-3xl:rounded-none w-full border border-border"
      >
        {/* <Link href="/" className="p-3 icon-button">
          Logo
        </Link> */}
        <Link href="/" className="group inline-flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 to-blue-500 text-foreground shadow-lg shadow-cyan-500/20">
            <Waves className="h-6 w-6" aria-hidden />
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground hidden sm:block">
            Waves<span className="ml-[0.9]">&</span>Waders
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground sm:hidden">
            W&W
          </span>
        </Link>
        <SearchBar />
        <div className="flex gap-2">
          <Link
            href="/"
            className="whitespace-nowrap flex items-center text-md font-medium text-foreground/70 hidden @min-4xl:flex hover:bg-highlight-3 p-2 rounded-full"
          >
            Sign in
          </Link>
          <ThemeToggle className="hide-button" />
          <button
            aria-label="more options"
            className="icon-button p-3 hover:bg-highlight-3"
          >
            <AlignJustify className="icon-sm" />
          </button>
        </div>
      </nav>
    </header>
  );
};

export default NavBar;
