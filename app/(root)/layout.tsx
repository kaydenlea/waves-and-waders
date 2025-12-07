import { DateProvider } from "@/components/context/DateContext";
import { MapFilterProvider } from "@/components/context/MapFilterContext";
import { ViewportBeachesProvider } from "@/components/context/ViewportBeachesContext";
import { PathProvider } from "@/components/context/PathContext";
import { SearchProvider } from "@/components/context/SearchContext";
import { BeachStatsCacheProvider } from "@/components/context/BeachStatsCacheContext";
import ViewportBeachesManager from "@/components/context/ViewportBeachesManager";
import React from "react";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <MapFilterProvider>
      <ViewportBeachesProvider>
        <DateProvider>
          <SearchProvider>
            <BeachStatsCacheProvider>
              <PathProvider>
                <ViewportBeachesManager />
                <main>{children}</main>
              </PathProvider>
            </BeachStatsCacheProvider>
          </SearchProvider>
        </DateProvider>
      </ViewportBeachesProvider>
    </MapFilterProvider>
  );
};

export default Layout;
