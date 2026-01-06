import NavBar from "@/components/general/NavBar";
import Footer from "@/components/general/Footer";
import type { ReactNode } from "react";
import { DateProvider } from "@/components/context/DateContext";
import { MapFilterProvider } from "@/components/context/MapFilterContext";
import { MapViewportProvider } from "@/components/context/MapViewportContext";
import { ViewportBeachesProvider } from "@/components/context/ViewportBeachesContext";
import { PathProvider } from "@/components/context/PathContext";
import { SearchProvider } from "@/components/context/SearchContext";
import { BeachStatsCacheProvider } from "@/components/context/BeachStatsCacheContext";
import { DashboardEditModeProvider } from "@/components/context/DashboardEditModeContext";
import ViewportBeachesManager from "@/components/context/ViewportBeachesManager";

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <DateProvider>
      <MapViewportProvider>
        <MapFilterProvider>
          <ViewportBeachesProvider>
            <SearchProvider>
              <BeachStatsCacheProvider>
                <PathProvider>
                  <DashboardEditModeProvider>
                    <ViewportBeachesManager />
                    <NavBar landingPage variant="marketing" />
                    {children}
                    <Footer className="rounded-t-xl" />
                  </DashboardEditModeProvider>
                </PathProvider>
              </BeachStatsCacheProvider>
            </SearchProvider>
          </ViewportBeachesProvider>
        </MapFilterProvider>
      </MapViewportProvider>
    </DateProvider>
  );
};

export default Layout;
