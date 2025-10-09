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
import { AlignJustify, TagIcon, Waves } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

const NavBar = () => {
  return (
    <header className="fixed px-1.5 pt-1.5 @min-3xl:p-0 z-2 w-full @container backdrop-blur-md">
      <nav
        aria-label="primary navigation"
        className="h-23 flex items-center justify-between px-6 shadow-md bg-background rounded-md @min-3xl:rounded-t-none w-full border border-border"
      >
        {/* <Link href="/" className="p-3 icon-button">
          Logo
        </Link> */}
        <Link
          href="/"
          className="group inline-flex items-center gap-2 outline-none"
        >
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
          <Popover>
            <PopoverTrigger className="icon-button p-3 hover:bg-highlight-3">
              <AlignJustify className="icon-md" />
            </PopoverTrigger>
            <PopoverContent className="z-3 max-w-30 flex flex-col gap-1">
              <div>Content</div>
              <div>Sign in</div>
            </PopoverContent>
          </Popover>
          {/* <DropdownMenu>
            <DropdownMenuTrigger className="icon-button p-3 hover:bg-highlight-3">
              <AlignJustify className="icon-md" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Billing</DropdownMenuItem>
              <DropdownMenuItem>Team</DropdownMenuItem>
              <DropdownMenuItem>Subscription</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu> */}
        </div>
      </nav>
    </header>
  );
};

export default NavBar;
