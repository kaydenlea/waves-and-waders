import { MapFilterProvider } from "@/components/context/MapFilterContext";
import { MapViewportProvider } from "@/components/context/MapViewportContext";
import { ViewportBeachesProvider } from "@/components/context/ViewportBeachesContext";
import { DateProvider } from "@/components/context/DateContext";
import { SearchProvider } from "@/components/context/SearchContext";
import { PathProvider } from "@/components/context/PathContext";
import { DashboardEditModeProvider } from "@/components/context/DashboardEditModeContext";
import { BeachStatsCacheProvider } from "@/components/context/BeachStatsCacheContext";
import ViewportBeachesManager from "@/components/context/ViewportBeachesManager";

const Layout = ({ children }: { children: React.ReactNode }) => {
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
                    <div className="min-h-screen @min-4xl:flex @min-4xl:flex-col">
                      {children}
                    </div>
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
