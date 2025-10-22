import { DateProvider } from "@/components/context/DateContext";
import { MapFilterProvider } from "@/components/context/MapFilterContext";
import { PathProvider } from "@/components/context/PathContext";
import { SearchProvider } from "@/components/context/SearchContext";
import React from "react";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <MapFilterProvider>
      <DateProvider>
        <SearchProvider>
          <PathProvider>
            <main>{children}</main>
          </PathProvider>
        </SearchProvider>
      </DateProvider>
    </MapFilterProvider>
  );
};

export default Layout;
