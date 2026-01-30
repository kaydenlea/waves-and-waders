import { MapFilterProvider } from "@/components/context/MapFilterContext";
import { MapViewportProvider } from "@/components/context/MapViewportContext";
import { ViewportBeachesProvider } from "@/components/context/ViewportBeachesContext";
import { DateProvider } from "@/components/context/DateContext";
import { DashboardEditModeProvider } from "@/components/context/DashboardEditModeContext";
import { BeachStatsCacheProvider } from "@/components/context/BeachStatsCacheContext";
import { MobileTooltipProvider } from "@/components/graphs/MobileChartTooltip";
import ViewportBeachesManager from "@/components/context/ViewportBeachesManager";
import { getPacificMidnightUTC } from "@/lib/utils";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const initialSelectedMs = getPacificMidnightUTC(new Date()).getTime();
  return (
    <DateProvider initialSelectedMs={initialSelectedMs}>
      <MobileTooltipProvider>
        <MapViewportProvider>
          <MapFilterProvider>
            <ViewportBeachesProvider>
              <BeachStatsCacheProvider>
                <DashboardEditModeProvider>
                  <ViewportBeachesManager />
                  <div className="min-h-screen @min-4xl:flex @min-4xl:flex-col">
                    {children}
                  </div>
                </DashboardEditModeProvider>
              </BeachStatsCacheProvider>
            </ViewportBeachesProvider>
          </MapFilterProvider>
        </MapViewportProvider>
      </MobileTooltipProvider>
    </DateProvider>
  );
};

export default Layout;
