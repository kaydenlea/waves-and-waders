import NavBar from "@/components/general/NavBar";
import Footer from "@/components/general/Footer";
import type { ReactNode } from "react";
import { DateProvider } from "@/components/context/DateContext";
import { MapFilterProvider } from "@/components/context/MapFilterContext";
import { MapViewportProvider } from "@/components/context/MapViewportContext";
import { ViewportBeachesProvider } from "@/components/context/ViewportBeachesContext";
import { PathProvider } from "@/components/context/PathContext";
import { BeachStatsCacheProvider } from "@/components/context/BeachStatsCacheContext";
import { DashboardEditModeProvider } from "@/components/context/DashboardEditModeContext";
import { MobileTooltipProvider } from "@/components/graphs/MobileChartTooltip";
import ViewportBeachesManager from "@/components/context/ViewportBeachesManager";

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <DateProvider>
      <MobileTooltipProvider>
        <MapViewportProvider>
          <MapFilterProvider>
            <ViewportBeachesProvider>
              <BeachStatsCacheProvider>
                <PathProvider>
                  <DashboardEditModeProvider>
                    <ViewportBeachesManager />
                    <div className="min-h-screen bg-background overscroll-y-none">
                      <div aria-hidden className="fixed inset-0 -z-50 bg-background" />
                      <NavBar landingPage variant="marketing" />
                      {children}
                      <Footer className="rounded-t-xl" />
                    </div>
                  </DashboardEditModeProvider>
                </PathProvider>
              </BeachStatsCacheProvider>
            </ViewportBeachesProvider>
          </MapFilterProvider>
        </MapViewportProvider>
      </MobileTooltipProvider>
    </DateProvider>
  );
};

export default Layout;
