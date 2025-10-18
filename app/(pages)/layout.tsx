import Footer from "@/components/general/Footer";
import { LazyLoadMap } from "@/components/general/LazyLoad/LazyLoadMap";
import NavBar from "@/components/general/NavBar";
import { MapFilterProvider } from "@/components/context/MapFilterContext";
import { DateProvider } from "@/components/context/DateContext";
import PathStyleWrapper from "@/components/general/PathStyleWrapper";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <DateProvider>
      <MapFilterProvider>
        <div className="min-h-screen @min-4xl:flex @min-4xl:flex-col">
          <NavBar />
          <main
            id="main-content"
            className="bg-background-2 min-h-[calc(100vh-4rem)] @min-4xl:flex @min-4xl:flex-1 @min-4xl:mt-[5.5rem] @min-4xl:pb-4"
          >
            <LazyLoadMap />
            <PathStyleWrapper>{children}</PathStyleWrapper>
          </main>
          <Footer />
        </div>
      </MapFilterProvider>
    </DateProvider>
  );
};

export default Layout;
