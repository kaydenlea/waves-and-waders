"use client";

import React, { useState, useEffect, useRef } from "react";
import { FaSearch as SearchIcon } from "react-icons/fa";
import { FiSliders as SliderIcon, FiX as CloseIcon } from "react-icons/fi";
import { searchBeaches, Beach } from "@/lib/supabase";

interface SearchBarProps {
  onBeachSelect?: (beach: Beach) => void;
  selectedBeach?: Beach | null;
  placeholder?: string;
  className?: string;
}

const SearchBar = ({ 
  onBeachSelect, 
  selectedBeach, 
  placeholder = "Search beaches",
  className = ""
}: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Beach[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [countyFilter, setCountyFilter] = useState<string>("");
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search beaches when query changes
  useEffect(() => {
    const searchDebounced = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      try {
        setLoading(true);
        const beaches = await searchBeaches(query.trim());
        
        // Apply county filter if selected
        const filteredBeaches = countyFilter 
          ? beaches.filter(beach => beach.COUNTY === countyFilter)
          : beaches;
          
        setResults(filteredBeaches);
        setIsOpen(filteredBeaches.length > 0);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
        setIsOpen(false);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(searchDebounced, 300); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [query, countyFilter]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleBeachSelect = (beach: Beach) => {
    setQuery(beach.Name);
    setIsOpen(false);
    if (onBeachSelect) {
      onBeachSelect(beach);
    }
  };

  const handleClearSearch = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleSearch = () => {
    if (results.length > 0) {
      handleBeachSelect(results[0]); // Select first result
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  // Set initial query from selected beach
  useEffect(() => {
    if (selectedBeach && !query) {
      setQuery(selectedBeach.Name);
    }
  }, [selectedBeach]);

  // Get unique counties for filter
  const getUniqueCounties = () => {
    const counties = [...new Set(results.map(beach => beach.COUNTY))];
    return counties.sort();
  };

  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative flex items-center gap-1 w-full justify-center">
        <div ref={searchRef} className="relative flex min-w-40 items-center rounded-full h-full shadow-lg border border-gray-400 gap-2">
          <button
            onClick={handleSearch}
            aria-label="search"
            className="bg-blue-500 p-1.5 ml-2 text-white rounded-full hover:bg-blue-600 transition-colors"
            disabled={loading}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <SearchIcon className="w-4 h-4" />
            )}
          </button>
          
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              name="query"
              aria-label="beach search"
              type="text"
              placeholder={placeholder}
              value={query}
              onChange={handleInputChange}
              onFocus={() => query.length >= 2 && results.length > 0 && setIsOpen(true)}
              onKeyPress={handleKeyPress}
              className="w-full placeholder:text-sm focus:outline-none pr-8"
              autoComplete="off"
            />
            
            {query && (
              <button
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="clear search"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
              {results.length > 0 ? (
                <>
                  {/* County filter */}
                  {getUniqueCounties().length > 1 && (
                    <div className="p-2 border-b border-gray-200">
                      <select
                        value={countyFilter}
                        onChange={(e) => setCountyFilter(e.target.value)}
                        className="w-full text-xs p-1 border border-gray-300 rounded"
                      >
                        <option value="">All Counties</option>
                        {getUniqueCounties().map(county => (
                          <option key={county} value={county}>{county} County</option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {/* Beach Results */}
                  {results.map((beach) => (
                    <button
                      key={beach.id}
                      onClick={() => handleBeachSelect(beach)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-sm">{beach.Name}</div>
                          <div className="text-xs text-gray-500">{beach.COUNTY} County</div>
                        </div>
                        <div className="text-xs text-gray-400">
                          {beach.LATITUDE.toFixed(2)}, {beach.LONGITUDE.toFixed(2)}
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              ) : query.length >= 2 && !loading ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No beaches found for "{query}"
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Filters Button */}
        <button 
          onClick={() => setShowFilters(!showFilters)}
          aria-label="filters" 
          className={`p-4 rounded-full transition-colors ${
            showFilters ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
          }`}
        >
          <SliderIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-40">
          <h3 className="font-medium text-sm mb-3">Filters</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                County
              </label>
              <select
                value={countyFilter}
                onChange={(e) => setCountyFilter(e.target.value)}
                className="w-full text-sm p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Counties</option>
                <option value="Orange">Orange County</option>
                <option value="Los Angeles">Los Angeles County</option>
                <option value="Ventura">Ventura County</option>
                <option value="San Diego">San Diego County</option>
                <option value="Santa Barbara">Santa Barbara County</option>
                <option value="Monterey">Monterey County</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setCountyFilter("");
                  setShowFilters(false);
                }}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="flex-1 px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Beach Display */}
      {selectedBeach && (
        <div className="mt-2 text-xs text-gray-600">
          📍 {selectedBeach.Name}, {selectedBeach.COUNTY} County
        </div>
      )}
    </div>
  );
};

export default SearchBar;