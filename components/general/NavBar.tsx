"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import SearchBar from "./SearchBar";
import ThemeToggle from "./ThemeToggle";
import type { Beach } from "@/lib/supabase";

interface NavBarProps {
  selectedBeach?: Beach | null;
  onBeachSelect?: (beach: Beach) => void;
}

const NavBar = ({ selectedBeach, onBeachSelect }: NavBarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [currentBeach, setCurrentBeach] = useState<Beach | null>(selectedBeach || null);

  // Handle beach selection from SearchBar
  const handleBeachSelect = (beach: Beach) => {
    setCurrentBeach(beach);
    // Call parent callback if provided
    onBeachSelect?.(beach);
    // Navigate to overview page with id query param
    const newPath = `/beach/overview?id=${encodeURIComponent(String(beach.id))}`;
    router.push(newPath);
  };

  // Sync internal state when selectedBeach prop changes
  useEffect(() => {
    if (selectedBeach) {
      setCurrentBeach(selectedBeach);
    }
  }, [selectedBeach]);

  return (
    <header className="fixed @min-3xl:relative px-1.5 pt-1.5 z-2 w-full @container backdrop-blur-md">
      <nav
        aria-label="primary navigation"
        className="flex justify-center @min-lg:justify-between p-4 shadow-md bg-background rounded-md w-full items-center"
      >
        {/* Logo */}
        <Link
          href="/"
          className="p-3 icon-button hide-button font-bold text-blue-600 hover:text-blue-700 transition-colors"
        >
          Waves & Waders
        </Link>

        {/* SearchBar - responsive width */}
        <div className="flex-1 max-w-md mx-4 @min-lg:mx-8">
          <SearchBar
            onBeachSelect={handleBeachSelect}
            selectedBeach={currentBeach}
            placeholder="Find your beach..."
          />
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />
      </nav>

      {/* Current beach indicator - mobile only */}
      {currentBeach && (
        <div className="@min-3xl:hidden px-6 pb-2">
          <div className="text-xs text-gray-600 bg-blue-50 px-3 py-1 rounded-full text-center">
            📍 {currentBeach.Name}, {currentBeach.COUNTY} County
          </div>
        </div>
      )}
    </header>
  );
};

export default NavBar;