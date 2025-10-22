import { MapFilterProvider } from "@/components/context/MapFilterContext";
import { DateProvider } from "@/components/context/DateContext";
import { SearchProvider } from "@/components/context/SearchContext";
import { PathProvider } from "@/components/context/PathContext";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <DateProvider>
      <MapFilterProvider>
        <SearchProvider>
          <PathProvider>
            <div className="min-h-screen @min-4xl:flex @min-4xl:flex-col">
              {children}
            </div>
          </PathProvider>
        </SearchProvider>
      </MapFilterProvider>
    </DateProvider>
  );
};

export default Layout;
