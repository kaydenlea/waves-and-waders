import { LazyLoadMap } from "@/components/general/LazyLoad/LazyLoadMap";
import NavBar from "@/components/general/NavBar";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="h-screen @min-3xl:flex @min-3xl:flex-col">
      <NavBar />
      <main className="@min-3xl:flex @min-3xl:flex-1 overflow-hidden">
        <aside className="fixed @min-3xl:relative @min-3xl:flex-1 @min-3xl:p-1.5 @min-3xl:max-w-200 w-full h-full">
          <LazyLoadMap />
        </aside>
        <article className="bg-background w-full absolute px-2 @min-3xl:relative @min-3xl:pt-4 @min-3xl:flex-1 @min-3xl:translate-y-0 bottom-0 z-1 translate-y-[97%] rounded-t-3xl @min-3xl:rounded-t-none overflow-y-auto">
          <div className="block @min-3xl:hidden flex justify-center my-3">
            <div className="bg-gray-300 w-16 h-1.5 rounded-full" />
          </div>
          {children}
        </article>
      </main>
    </div>
  );
};

export default Layout;
