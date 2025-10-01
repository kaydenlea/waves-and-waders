import React, { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { Observer } from "gsap/Observer";
import { cn } from "@/lib/utils";

gsap.registerPlugin(Observer);

interface InfiniteScrollItem {
  content: React.ReactNode;
}

interface InfiniteScrollProps {
  width?: string;
  maxHeight?: string;
  negativeMargin?: string;
  items?: InfiniteScrollItem[];
  itemMinHeight?: number;
  isTilted?: boolean;
  tiltDirection?: "left" | "right";
  autoplay?: boolean;
  autoplaySpeed?: number;
  autoplayDirection?: "down" | "up";
  pauseOnHover?: boolean;
}

const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  width = "40rem",
  maxHeight = "100%",
  negativeMargin = "-10.5em",
  items = [],
  itemMinHeight = 400,
  isTilted = false,
  tiltDirection = "left",
  autoplay = false,
  autoplaySpeed = 0.5,
  autoplayDirection = "down",
  pauseOnHover = false,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getTiltTransform = (): string => {
    if (!isTilted) return "none";
    return tiltDirection === "left"
      ? "rotateX(20deg) rotateZ(-20deg) skewX(20deg)"
      : "rotateX(20deg) rotateZ(20deg) skewX(-20deg)";
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (items.length === 0) return;

    const divItems = gsap.utils.toArray<HTMLDivElement>(container.children);
    if (!divItems.length) return;

    const firstItem = divItems[0];
    const itemStyle = getComputedStyle(firstItem);
    const itemHeight = firstItem.offsetHeight;
    const itemMarginTop = parseFloat(itemStyle.marginTop) || 0;
    const totalItemHeight = itemHeight + itemMarginTop;
    const totalHeight =
      itemHeight * items.length + itemMarginTop * (items.length - 1);

    const wrapFn = gsap.utils.wrap(-totalHeight, totalHeight);

    divItems.forEach((child, i) => {
      const y = i * Math.max(150, totalItemHeight);
      gsap.set(child, { y });
    });

    const observer = Observer.create({
      target: container,
      // type: "wheel,touch,pointer",
      type: "pointer",
      preventDefault: true,
      onPress: ({ target }) => {
        (target as HTMLElement).style.cursor = "grabbing";
      },
      onRelease: ({ target }) => {
        (target as HTMLElement).style.cursor = "grab";
      },
      onChange: ({ deltaY, isDragging, event }) => {
        const d = event.type === "wheel" ? -deltaY : deltaY;
        const distance = isDragging ? d * 5 : d * 10;
        divItems.forEach((child) => {
          gsap.to(child, {
            duration: 0.5,
            ease: "expo.out",
            y: `+=${distance}`,
            modifiers: {
              y: gsap.utils.unitize(wrapFn),
            },
          });
        });
      },
    });

    let rafId: number;
    if (autoplay) {
      const directionFactor = autoplayDirection === "down" ? 1 : -1;
      const speedPerFrame = autoplaySpeed * directionFactor;

      const tick = () => {
        divItems.forEach((child) => {
          gsap.set(child, {
            y: `+=${speedPerFrame}`,
            modifiers: {
              y: gsap.utils.unitize(wrapFn),
            },
          });
        });
        rafId = requestAnimationFrame(tick);
      };

      rafId = requestAnimationFrame(tick);

      if (pauseOnHover) {
        const stopTicker = () => rafId && cancelAnimationFrame(rafId);
        const startTicker = () => {
          rafId = requestAnimationFrame(tick);
        };

        container.addEventListener("mouseenter", stopTicker);
        container.addEventListener("mouseleave", startTicker);

        return () => {
          observer.kill();
          stopTicker();
          container.removeEventListener("mouseenter", stopTicker);
          container.removeEventListener("mouseleave", startTicker);
        };
      } else {
        return () => {
          observer.kill();
          // rafId && cancelAnimationFrame(rafId);
          if (rafId) cancelAnimationFrame(rafId);
        };
      }
    }

    return () => {
      observer.kill();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [
    items,
    autoplay,
    autoplaySpeed,
    autoplayDirection,
    pauseOnHover,
    isTilted,
    tiltDirection,
    negativeMargin,
  ]);

  return (
    <div
      className={cn(
        "-ml-[0em] sm:-ml-[45em] md:-ml-[65em] xl:-ml-[40em]",
        `max-h-${maxHeight}`
      )}
      ref={wrapperRef}
    >
      <div
        className={cn(
          "infinite-scroll-container w-full sm:w-[20rem] md:w-[30rem] xl:w-[45rem]",
          // "transform [transform:rotateX(20deg)_rotateZ(20deg)_skewX(-20deg)]"
          "rotate-x-0 rotate-z-0 -skew-x-0 sm:rotate-x-20 sm:rotate-z-20 sm:-skew-x-20"
        )}
        ref={containerRef}
        // style={{
        //   transform: getTiltTransform(),
        // }}
      >
        {items.map((item, i) => (
          <div
            className="infinite-scroll-item bg-highlight-5 h-[250px] md:h-[350px] xl:h-[400px] -mt-[1.5em] sm:-mt-[3.5em] md:-mt-[6em] xl:-mt-[10.5em] rounded-xl p-2"
            key={i}
          >
            {item.content}
          </div>
        ))}
      </div>
    </div>
  );
};

//   return (
//     <div
//       className={cn(
//         "-ml-[0em] sm:-ml-[45em] md:-ml-[65em] xl:-ml-[40em]",
//         `max-h-${maxHeight}`
//       )}
//       ref={wrapperRef}
//     >
//       <div
//         className={cn(
//           "infinite-scroll-container w-full sm:w-[20rem] md:w-[30rem] xl:w-[40rem]",
//           // "transform [transform:rotateX(20deg)_rotateZ(20deg)_skewX(-20deg)]"
//           "rotate-x-0 rotate-z-0 -skew-x-0 sm:rotate-x-20 sm:rotate-z-20 sm:-skew-x-20"
//         )}
//         ref={containerRef}
//         // style={{
//         //   transform: getTiltTransform(),
//         // }}
//       >
//         {items.map((item, i) => (
//           <div
//             className="infinite-scroll-item bg-highlight-5 h-[250px] md:h-[350px] xl:h-[400px] -mt-[1.5em] sm:-mt-[3.5em] md:-mt-[6em] xl:-mt-[10.5em] rounded-xl p-2"
//             key={i}
//           >
//             {item.content}
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

export default InfiniteScroll;

// "use client";

// import React, { useRef, useEffect } from "react";
// import { gsap } from "gsap";
// import { Observer } from "gsap/Observer";

// gsap.registerPlugin(Observer);

// interface InfiniteScrollItem {
//   content: React.ReactNode;
// }

// interface InfiniteScrollProps {
//   width?: string;
//   maxHeight?: string;
//   negativeMargin?: string;
//   items?: InfiniteScrollItem[];
//   itemMinHeight?: number;
//   isTilted?: boolean;
//   tiltDirection?: "left" | "right";
//   autoplay?: boolean;
//   autoplaySpeed?: number;
//   autoplayDirection?: "down" | "up";
//   pauseOnHover?: boolean;
// }

// const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
//   width = "30rem",
//   maxHeight = "100%",
//   negativeMargin = "-0.5em",
//   items = [],
//   itemMinHeight = 150,
//   isTilted = false,
//   tiltDirection = "left",
//   autoplay = false,
//   autoplaySpeed = 0.5,
//   autoplayDirection = "down",
//   pauseOnHover = false,
// }) => {
//   const wrapperRef = useRef<HTMLDivElement>(null);
//   const containerRef = useRef<HTMLDivElement>(null);

//   const getTiltTransform = (): string => {
//     if (!isTilted) return "none";
//     return tiltDirection === "left"
//       ? "rotateX(20deg) rotateZ(-20deg) skewX(20deg)"
//       : "rotateX(20deg) rotateZ(20deg) skewX(-20deg)";
//   };

//   useEffect(() => {
//     const container = containerRef.current;
//     if (!container) return;
//     if (items.length === 0) return;

//     const divItems = gsap.utils.toArray<HTMLDivElement>(container.children);
//     if (!divItems.length) return;

//     const firstItem = divItems[0];
//     const itemStyle = getComputedStyle(firstItem);
//     const itemHeight = firstItem.offsetHeight;
//     const itemMarginTop = parseFloat(itemStyle.marginTop) || 0;
//     const totalItemHeight = itemHeight + itemMarginTop;
//     const totalHeight =
//       itemHeight * items.length + itemMarginTop * (items.length - 1);

//     const wrapFn = gsap.utils.wrap(-totalHeight, totalHeight);

//     divItems.forEach((child, i) => {
//       const y = i * totalItemHeight;
//       gsap.set(child, { y });
//     });

//     const observer = Observer.create({
//       target: container,
//       type: "wheel,touch,pointer",
//       preventDefault: true,
//       onPress: ({ target }) => {
//         (target as HTMLElement).style.cursor = "grabbing";
//       },
//       onRelease: ({ target }) => {
//         (target as HTMLElement).style.cursor = "grab";
//       },
//       onChange: ({ deltaY, isDragging, event }) => {
//         const d = event.type === "wheel" ? -deltaY : deltaY;
//         const distance = isDragging ? d * 5 : d * 10;
//         divItems.forEach((child) => {
//           gsap.to(child, {
//             duration: 0.5,
//             ease: "expo.out",
//             y: `+=${distance}`,
//             modifiers: {
//               y: gsap.utils.unitize(wrapFn),
//             },
//           });
//         });
//       },
//     });

//     let rafId: number;
//     if (autoplay) {
//       const directionFactor = autoplayDirection === "down" ? 1 : -1;
//       const speedPerFrame = autoplaySpeed * directionFactor;

//       const tick = () => {
//         divItems.forEach((child) => {
//           gsap.set(child, {
//             y: `+=${speedPerFrame}`,
//             modifiers: {
//               y: gsap.utils.unitize(wrapFn),
//             },
//           });
//         });
//         rafId = requestAnimationFrame(tick);
//       };

//       rafId = requestAnimationFrame(tick);

//       if (pauseOnHover) {
//         const stopTicker = () => rafId && cancelAnimationFrame(rafId);
//         const startTicker = () => {
//           rafId = requestAnimationFrame(tick);
//         };

//         container.addEventListener("mouseenter", stopTicker);
//         container.addEventListener("mouseleave", startTicker);

//         return () => {
//           observer.kill();
//           stopTicker();
//           container.removeEventListener("mouseenter", stopTicker);
//           container.removeEventListener("mouseleave", startTicker);
//         };
//       } else {
//         return () => {
//           observer.kill();
//           rafId && cancelAnimationFrame(rafId);
//         };
//       }
//     }

//     return () => {
//       observer.kill();
//       if (rafId) cancelAnimationFrame(rafId);
//     };
//   }, [
//     items,
//     autoplay,
//     autoplaySpeed,
//     autoplayDirection,
//     pauseOnHover,
//     isTilted,
//     tiltDirection,
//     negativeMargin,
//   ]);

//   return (
//     <>
//       <style>
//         {`
//           .infinite-scroll-wrapper {
//             max-height: ${maxHeight};
//           }

//           .infinite-scroll-container {
//             width: ${width};
//           }

//           .infinite-scroll-item {
//             height: ${itemMinHeight}px;
//             margin-top: ${negativeMargin};
//           }
//         `}
//       </style>

//       <div className="infinite-scroll-wrapper" ref={wrapperRef}>
//         <div
//           className="infinite-scroll-container"
//           ref={containerRef}
//           style={{
//             transform: getTiltTransform(),
//           }}
//         >
//           {items.map((item, i) => (
//             <div
//               className="infinite-scroll-item bg-highlight-5 p-2 rounded-2xl"
//               key={i}
//             >
//               {item.content}
//             </div>
//           ))}
//         </div>
//       </div>
//     </>
//   );
// };

// export default InfiniteScroll;
