import { MapFilterProvider } from "@/components/context/MapFilterContext";
import { ViewportBeachesProvider } from "@/components/context/ViewportBeachesContext";
import { DateProvider } from "@/components/context/DateContext";
import { SearchProvider } from "@/components/context/SearchContext";
import { PathProvider } from "@/components/context/PathContext";
import { BeachStatsCacheProvider } from "@/components/context/BeachStatsCacheContext";
import ViewportBeachesManager from "@/components/context/ViewportBeachesManager";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <DateProvider>
      <MapFilterProvider>
        <ViewportBeachesProvider>
          <SearchProvider>
            <BeachStatsCacheProvider>
              <PathProvider>
                <ViewportBeachesManager />
                <div className="min-h-screen @min-4xl:flex @min-4xl:flex-col">
                  {children}
                </div>
              </PathProvider>
            </BeachStatsCacheProvider>
          </SearchProvider>
        </ViewportBeachesProvider>
      </MapFilterProvider>
    </DateProvider>
  );
};

export default Layout;
