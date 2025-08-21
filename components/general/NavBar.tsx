import Link from "next/link";
import SearchBar from "./SearchBar";
import ThemeToggle from "./ThemeToggle";

const NavBar = () => {
  return (
    <header className="fixed @min-3xl:relative px-1.5 pt-1.5 z-2 w-full @container backdrop-blur-md">
      <nav
        aria-label="primary navigation"
        className="flex justify-center @min-lg:justify-between p-4 shadow-md bg-background rounded-md w-full"
      >
        <Link href="/" className="p-3 icon-button hide-button">
          Logo
        </Link>
        <SearchBar />
        <ThemeToggle />
      </nav>
    </header>
  );
};

export default NavBar;
