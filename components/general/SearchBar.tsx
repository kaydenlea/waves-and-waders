import { FaSearch as SearchIcon } from "react-icons/fa";
import { FiSliders as SliderIcon } from "react-icons/fi";

const SearchBar = () => {
  return (
    <form className="relative flex items-center gap-1 w-full justify-center">
      <div className="flex min-w-40 items-center rounded-full h-full shadow-lg border border-gray-400 gap-2">
        <button
          aria-label="search"
          className="bg-blue-500 p-1.5 ml-2 text-white rounded-full"
        >
          <SearchIcon className="icon-sm" />
        </button>
        <input
          name="query"
          aria-label="beach search"
          type="text"
          placeholder="Search beaches"
          className="placeholder:text-sm focus:outline-none"
        />
      </div>
      <button aria-label="filters" className="icon-button p-4">
        <SliderIcon />
      </button>
    </form>
  );
};

export default SearchBar;
