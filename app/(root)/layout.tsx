import NavBar from "@/components/general/NavBar";
import Footer from "@/components/general/Footer";
import type { ReactNode } from "react";
import { DateProvider } from "@/components/context/DateContext";
import { MapFilterProvider } from "@/components/context/MapFilterContext";
import { MapViewportProvider } from "@/components/context/MapViewportContext";
import { ViewportBeachesProvider } from "@/components/context/ViewportBeachesContext";
import { BeachStatsCacheProvider } from "@/components/context/BeachStatsCacheContext";
import { DashboardEditModeProvider } from "@/components/context/DashboardEditModeContext";
import { MobileTooltipProvider } from "@/components/graphs/MobileChartTooltip";
import ViewportBeachesManager from "@/components/context/ViewportBeachesManager";
import { getPacificMidnightUTC } from "@/lib/utils";

const Layout = ({ children }: { children: ReactNode }) => {
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
                  <div className="min-h-[var(--ww-100vh)] bg-background">
                    <div
                      aria-hidden
                      className="fixed inset-0 -z-50 bg-background"
                    />
                    <NavBar landingPage variant="marketing" />
                    {children}
                    <Footer className="rounded-t-xl" />
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
