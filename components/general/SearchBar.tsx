import { AlignJustify, Search, SlidersVertical } from "lucide-react";

const SearchBar = ({ className }: { className?: string }) => {
  return (
    <form className="relative flex items-center gap-2 w-full justify-end @min-4xl:justify-center">
      <div className="pl-1.5 py-1.5 flex min-w-40 items-center rounded-full h-full shadow-lg ring ring-border/70 gap-2 bg-highlight-4 hidden @min-4xl:flex">
        <button
          aria-label="search"
          className="bg-gradient-to-br from-cyan-300 to-blue-400 p-1.5 text-white rounded-full"
        >
          <Search strokeWidth={3} className="icon-md" />
        </button>
        <input
          name="query"
          aria-label="beach search"
          type="text"
          placeholder="Search beaches"
          className="placeholder:text-sm focus:outline-none"
        />
      </div>
      <button
        aria-label="search"
        className="mr-2 bg-gradient-to-br from-cyan-300 to-blue-400 p-3 ml-2 text-white rounded-full block @min-4xl:hidden shadow-md border border-border/40"
      >
        <Search strokeWidth={3} className="icon-md" />
      </button>
      <button
        aria-label="filters"
        className="icon-button p-3.5 hide-button hover:bg-highlight-3"
      >
        <SlidersVertical className="icon-sm" />
      </button>
    </form>
  );
};

export default SearchBar;
