// import Footer from "@/components/general/Footer";
// import { LazyLoadMap } from "@/components/general/LazyLoad/LazyLoadMap";
// import NavBar from "@/components/general/NavBar";

// const Layout = ({ children }: { children: React.ReactNode }) => {
//   return (
//     <div className="h-screen @min-3xl:flex @min-3xl:flex-col">
//       <NavBar />
//       <main className="@min-3xl:flex @min-3xl:flex-1 overflow-hidden bg-background-2">
//         <aside className="fixed @min-3xl:relative @min-3xl:flex-1 @min-3xl:py-3 @min-3xl:pl-3 @min-3xl:max-w-200 w-full h-full">
//           <LazyLoadMap />
//         </aside>
//         <article className="bg-background-2 w-full absolute px-2 @min-3xl:relative @min-3xl:pt-4 @min-3xl:flex-1 @min-3xl:translate-y-0 bottom-0 z-1 translate-y-[97%] rounded-t-3xl @min-3xl:rounded-t-none overflow-y-auto">
//           <div className="block @min-3xl:hidden flex justify-center my-3">
//             <div className="bg-gray-300 w-16 h-1.5 rounded-full" />
//           </div>
//           {children}
//         </article>
//       </main>
//     </div>
//   );
// };

// export default Layout;

import Footer from "@/components/general/Footer";
import { LazyLoadMap } from "@/components/general/LazyLoad/LazyLoadMap";
import NavBar from "@/components/general/NavBar";
import { MapFilterProvider } from "@/components/context/MapFilterContext";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    // <div className="h-screen @min-3xl:flex @min-3xl:flex-col">
    //   <NavBar />
    //   <main className="@min-3xl:flex @min-3xl:flex-1 bg-background-2 @min-3xl:mt-19 pb-4">
    //     <aside className="fixed @min-3xl:sticky @min-3xl:top-19 @min-3xl:flex-1 @min-3xl:py-3 @min-3xl:pl-3 @min-3xl:max-w-200 w-full h-full @min-3xl:h-[calc(100vh-4.6rem)]">
    //       <LazyLoadMap />
    //     </aside>
    //     <article className="touch-pan-y bg-background-2 w-full absolute px-2 @min-3xl:relative @min-3xl:pt-4 @min-3xl:flex-1 @min-3xl:translate-y-0 bottom-0 z-1 translate-y-[calc(100%-25px)] rounded-t-3xl @min-3xl:rounded-t-none">
    //       <div className="block @min-3xl:hidden flex justify-center my-3">
    //         <div className="bg-gray-300 w-16 h-1.5 rounded-full" />
    //       </div>
    //       {children}
    //       <Footer className="@min-3xl:hidden rounded-md" />
    //     </article>
    //   </main>
    //   <Footer className="hidden @min-3xl:block" />
    // </div>
    <MapFilterProvider>
      <div className="h-screen @min-3xl:flex @min-3xl:flex-col">
        <NavBar />
        <main
          id="main-content"
          className="@min-3xl:flex @min-3xl:flex-1 bg-background-2 @min-3xl:mt-[5.5rem] @min-3xl:pb-4"
        >
          {/* <aside className="fixed @min-3xl:sticky @min-3xl:top-[5.5rem] @min-3xl:flex-1 @min-3xl:py-3 @min-3xl:pl-3 @min-3xl:max-w-200 w-full h-full @min-3xl:h-[calc(100vh-5.5rem)]">
          <LazyLoadMap />
        </aside> */}
          <LazyLoadMap />
          <div className="h-[calc(100vh-3rem)] @min-3xl:hidden" />
          <article className="touch-pan-y bg-background-2 w-full px-2 relative @min-3xl:pt-4 @min-3xl:flex-1 z-1 rounded-t-3xl @min-3xl:rounded-t-none max-w-350 mx-auto">
            {children}
            <Footer className="@min-3xl:hidden rounded-md" />
          </article>
        </main>
        <Footer className="hidden @min-3xl:block" />
      </div>
    </MapFilterProvider>
  );
};

export default Layout;
