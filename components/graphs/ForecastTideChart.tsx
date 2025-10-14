// "use client";

// import React, { useEffect, useState } from "react";

// import {
//   Line,
//   LineChart,
//   CartesianGrid,
//   XAxis,
//   YAxis,
//   ReferenceArea,
//   LabelList,
//   LabelProps,
//   ReferenceLine,
// } from "recharts";
// import {
//   ChartConfig,
//   ChartContainer,
//   ChartTooltip,
//   ChartTooltipContent,
// } from "@/components/ui/chart";
// import { Sun } from "lucide-react";
// import {
//   fetchBeachByIdLoose,
//   fetchBeachDetails,
//   fetchDailyConditions,
//   fetchBeachTides,
//   fetchBeachForecast,
// } from "@/lib/supabase";
// import DaySlider from "../general/DaySlider";

// type Props = { beachId?: string; date?: Date };
// type TidePoint = { hour: number; tide: number; isPeak?: number };

// const ForecastTideChart: React.FC<Props> = ({ beachId, date }) => {
//   const [data, setData] = useState<TidePoint[]>([]);
//   const [dayAreas, setDayAreas] = useState<{ x1: number; x2: number }[]>([]);
//   const [nightAreas, setNightAreas] = useState<{ x1: number; x2?: number }[]>(
//     []
//   );
//   const [sunMarkers, setSunMarkers] = useState<number[]>([]);
//   const [startIndex, setStartIndex] = React.useState(0);
//   const [windowSize, setWindowSize] = React.useState(0);

//   const chartRef = React.useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     const load = async () => {
//       try {
//         if (!beachId) return;
//         const resolved = await fetchBeachByIdLoose(beachId);
//         const id = resolved?.id ?? beachId;

//         // 48-hour window from selected day midnight (Pacific)
//         const startInput = date instanceof Date ? new Date(date) : new Date();
//         const startLocal = new Date(
//           startInput.toLocaleString("en-US", {
//             timeZone: "America/Los_Angeles",
//           })
//         );
//         startLocal.setHours(0, 0, 0, 0);
//         const startMs = startLocal.getTime();
//         const end = new Date(startMs + windowSize * 60 * 60 * 1000);

//         const points = await fetchBeachTides(id, new Date(startMs), end);
//         let series: TidePoint[];
//         if (!points || points.length === 0) {
//           const rows = await fetchBeachForecast(id, new Date(startMs), end);
//           series = rows.map((r) => ({
//             hour: Math.round(
//               (new Date(r.timestamp).getTime() - startMs) / (60 * 60 * 1000)
//             ),
//             tide: r.conditions.tideLevel ?? 0,
//           }));
//         } else {
//           series = points.map((p) => ({
//             hour: Math.round(
//               (new Date(p.timestamp).getTime() - startMs) / (60 * 60 * 1000)
//             ),
//             tide: p.tideLevelFt ?? 0,
//           }));
//         }
//         series = series
//           .filter((p) => p.hour >= 0 && p.hour < windowSize)
//           .sort((a, b) => a.hour - b.hour);
//         // peaks
//         const out = series.map((p) => ({ ...p }));
//         for (let i = 1; i < series.length - 1; i++) {
//           const a = series[i - 1],
//             b = series[i],
//             c = series[i + 1];
//           if (b.tide > a.tide && b.tide >= c.tide)
//             out[i].isPeak = Number(b.tide.toFixed(1));
//           else if (b.tide < a.tide && b.tide <= c.tide)
//             out[i].isPeak = Number(b.tide.toFixed(1));
//         }
//         setData(out);

//         // shading & markers across two days
//         const beach = await fetchBeachDetails(String(id));
//         const county = beach?.COUNTY;
//         if (county) {
//           const parseHM = (
//             s: string | null
//           ): { h: number; m: number } | null => {
//             if (!s) return null;
//             const m = /^(\d{1,2}):(\d{2})/.exec(s.trim());
//             if (!m) return null;
//             const h = Number(m[1]);
//             const mm = Number(m[2]);
//             if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
//             return { h, m: mm };
//           };
//           const days = [];
//           for (let i = 0; i < (windowSize - 1) / 24; i++) {
//             days.push(new Date(startMs + 24 * i * 60 * 60 * 1000));
//           }
//           console.log("DAYS", days);
//           const dayAreasBuild: { x1: number; x2: number }[] = [];
//           const nightAreasBuild: { x1: number; x2?: number }[] = [];
//           const markers: number[] = [];
//           let nightStart = 0;
//           for (let di = 0; di < days.length; di++) {
//             const cond = await fetchDailyConditions(county, days[di]);
//             console.log("CONDITIO NOW", cond);
//             const rise = parseHM(cond?.sunrise ?? null);
//             const setv = parseHM(cond?.sunset ?? null);
//             if (!rise || !setv) continue;
//             const offset = di * 24;
//             const rH = offset + rise.h;
//             const sH = offset + setv.h;
//             const dayStart = Math.min(rH, sH);
//             const dayEnd = Math.max(rH, sH);
//             dayAreasBuild.push({ x1: dayStart, x2: dayEnd });
//             nightAreasBuild.push({ x1: nightStart, x2: dayStart });
//             nightStart = dayEnd;
//             markers.push(rH, sH);
//           }
//           setDayAreas(dayAreasBuild);
//           nightAreasBuild.push({ x1: nightStart });
//           setNightAreas(nightAreasBuild);
//           setSunMarkers(markers);
//         } else {
//           setDayAreas([]);
//           setSunMarkers([]);
//         }
//       } catch (e) {
//         console.error("Failed to load forecast tide", e);
//       }
//     };
//     load();
//   }, [windowSize, beachId, date]);

//   React.useEffect(() => {
//     const chart = chartRef.current;
//     if (!chart) return;

//     const adjustData = () => {
//       const width = chart.clientWidth;
//       if (width < 550) {
//         setWindowSize(25);
//       } else if (width < 750) {
//         setWindowSize(49);
//       } else if (width < 1000) {
//         setWindowSize(73);
//       } else {
//         setWindowSize(97);
//       }
//     };

//     const observer = new ResizeObserver(adjustData);
//     observer.observe(chart);

//     adjustData();

//     return () => observer.disconnect();
//   }, []);

//   const handleNext = () => {
//     if (startIndex + windowSize < data.length) {
//       setStartIndex((prev) => prev + 24);
//     }
//   };

//   const handleBack = () => {
//     if (startIndex > 0) {
//       setStartIndex((prev) => prev - 24);
//     }
//   };

//   const visibleData = data.slice(startIndex, startIndex + windowSize);

//   return (
//     <>
//       <DaySlider
//         handleBack={handleBack}
//         handleNext={handleNext}
//         startIndex={startIndex}
//         windowSize={windowSize}
//         length={data.length}
//         days="Wed, 8/15 - Fri, 8/17"
//       />
//       <ChartContainer
//         config={{ tide: { label: "Tide", color: "#6e6e6eff" } } as ChartConfig}
//         ref={chartRef}
//         className="aspect-auto h-[250px] w-full"
//       >
//         <LineChart
//           data={visibleData}
//           margin={{ left: -35, right: 15, bottom: 5 }}
//         >
//           {dayAreas.map((a, idx) => (
//             <ReferenceArea
//               key={`day-${idx}`}
//               x1={a.x1}
//               x2={a.x2}
//               fill="#FFE58F"
//               fillOpacity={0.2}
//             />
//           ))}
//           {nightAreas.map((a, idx) => (
//             <ReferenceArea
//               key={`night-${idx}`}
//               x1={a.x1}
//               x2={idx === nightAreas.length - 1 ? undefined : a.x2}
//               fill="#ccc1ffff"
//               fillOpacity={0.2}
//             />
//           ))}
//           {Array.from({ length: (windowSize - 1) / 24 }, (_, i) => {
//             if (i !== 0 && i !== windowSize - 1) {
//               return (
//                 <ReferenceLine
//                   key={`boundary-${i}`}
//                   x={i * 24}
//                   stroke="#c9c9c9ff"
//                   strokeWidth={0.5}
//                 />
//               );
//             }
//           })}
//           <CartesianGrid
//             strokeDasharray="3 3"
//             stroke="var(--foreground)"
//             strokeWidth={0.1}
//             vertical={false}
//           />
//           <XAxis
//             dataKey="hour"
//             tickLine={false}
//             axisLine={false}
//             tickMargin={8}
//             minTickGap={0}
//             fontSize={11}
//             domain={[0, 47]}
//             tickFormatter={(v: number) =>
//               v % 3 === 0 ? String(v % 12 === 0 ? 12 : v % 12) : ""
//             }
//           />
//           <YAxis
//             dataKey="tide"
//             tickLine={false}
//             axisLine={false}
//             tickMargin={8}
//             fontSize={11}
//             domain={[
//               (dataMin: number) => Math.floor(dataMin) - 1,
//               (dataMax: number) => Math.max(Math.ceil(dataMax) + 2, 8),
//             ]}
//           />
//           <ChartTooltip content={<ChartTooltipContent />} />
//           <Line
//             dataKey="tide"
//             type="natural"
//             stroke="var(--color-tide)"
//             strokeWidth={2}
//             dot={({ payload, cx, cy }: any) => {
//               const hour = payload.hour as number;
//               if (sunMarkers.includes(hour)) {
//                 return (
//                   <circle
//                     key={hour}
//                     cx={cx}
//                     cy={cy}
//                     r={3}
//                     fill="orange"
//                     stroke="var(--color-tide)"
//                     strokeWidth={1}
//                   />
//                 );
//               } else if (
//                 payload.isPeak !== undefined &&
//                 payload.isPeak !== null
//               ) {
//                 const isLow =
//                   typeof payload.isPeak === "number" &&
//                   payload.isPeak <= (payload.tide ?? 0) &&
//                   payload.isPeak <= 0;
//                 return (
//                   <circle
//                     key={hour}
//                     cx={cx}
//                     cy={cy}
//                     r={3}
//                     fill={isLow ? "#ef4444" : "#22c55e"}
//                     stroke="var(--color-tide)"
//                     strokeWidth={1}
//                   />
//                 );
//               }
//               return <g key={hour} />;
//             }}
//           >
//             <LabelList
//               dataKey="tide"
//               content={(props: LabelProps) => {
//                 const safeX = typeof props.x === "number" ? props.x : 0;
//                 const hour = data[props.index ?? -1]?.hour;
//                 return (
//                   <g>
//                     {hour != null && sunMarkers.includes(hour) ? (
//                       <Sun
//                         size={20}
//                         x={safeX - 10}
//                         y={0}
//                         fill="#ff9946ff"
//                         color="#ff9946ff"
//                       />
//                     ) : null}
//                   </g>
//                 );
//               }}
//             />
//             <LabelList
//               dataKey="isPeak"
//               content={(props: LabelProps) => {
//                 const safeX = typeof props.x === "number" ? props.x : 0;
//                 const safeY = typeof props.y === "number" ? props.y : 0;
//                 if (props.value && typeof props.index === "number") {
//                   const h = data[props.index]?.hour ?? 0;
//                   const lbl = `${h % 12 === 0 ? 12 : h % 12} ${
//                     h >= 12 ? "PM" : "AM"
//                   }`;
//                   return (
//                     <g>
//                       <text
//                         x={safeX}
//                         y={safeY - 32}
//                         fill="var(--foreground)"
//                         textAnchor="middle"
//                         dominantBaseline="middle"
//                         fontSize={10}
//                       >
//                         {lbl}
//                       </text>
//                       <text
//                         x={safeX}
//                         y={safeY - 17}
//                         fill="var(--foreground)"
//                         textAnchor="middle"
//                         fontWeight="bold"
//                         fontSize={12}
//                       >{`${props.value} ft`}</text>
//                     </g>
//                   );
//                 }
//               }}
//             />
//           </Line>
//         </LineChart>
//       </ChartContainer>
//     </>
//   );
// };

// export default ForecastTideChart;

// ########################################################################################################################

// "use client";

// import React, {
//   useCallback,
//   useEffect,
//   useMemo,
//   useRef,
//   useState,
// } from "react";
// import {
//   Line,
//   LineChart,
//   CartesianGrid,
//   XAxis,
//   YAxis,
//   ReferenceArea,
//   ReferenceLine,
//   LabelList,
// } from "recharts";
// import {
//   ChartConfig,
//   ChartContainer,
//   ChartTooltip,
//   ChartTooltipContent,
// } from "@/components/ui/chart";
// import { Sun } from "lucide-react";
// import {
//   fetchBeachByIdLoose,
//   fetchBeachDetails,
//   fetchDailyConditions,
//   fetchBeachTides,
//   fetchBeachForecast,
// } from "@/lib/supabase";

// /**
//  * Swipeable 4-day tide chart
//  *
//  * Assumptions: the project's ChartContainer and ChartTooltip components exist.
//  * Keep fetch helpers (fetchBeachTides, fetchBeachForecast, etc.) as in your original.
//  */

// type Props = { beachId?: string; date?: Date };
// type TidePoint = { hour: number; tide: number; isPeak?: number };

// const WINDOW_DAYS = 4;
// const WINDOW_HOURS = WINDOW_DAYS * 24;

// // Minimum pixels per day when we lock the inner chart width. On very narrow screens the chart will be pannable.
// const MIN_DAY_PX = 180; // tweakable
// // Vertical size of chart
// const CHART_HEIGHT = 250;

// const ForecastTideChart: React.FC<Props> = ({ beachId, date }) => {
//   // raw data for full 4-day window (hours 0 .. 95)
//   const [data, setData] = useState<TidePoint[]>([]);
//   const [dayAreas, setDayAreas] = useState<{ x1: number; x2: number }[]>([]);
//   const [nightAreas, setNightAreas] = useState<{ x1: number; x2?: number }[]>(
//     []
//   );
//   const [sunMarkers, setSunMarkers] = useState<number[]>([]);

//   // UI / pan state
//   const outerRef = useRef<HTMLDivElement | null>(null);
//   const innerRef = useRef<HTMLDivElement | null>(null);
//   const [containerWidth, setContainerWidth] = useState<number>(0);
//   const [translateX, setTranslateX] = useState<number>(0); // px, negative moves left
//   const [isDragging, setIsDragging] = useState(false);

//   // logical "startHour" (0..WINDOW_HOURS-1) that is currently aligned at the left edge of the viewport
//   // We'll derive this from translateX and perHourPx when needed.
//   const [startHourIndex, setStartHourIndex] = useState(0);

//   // derived dimensions
//   const perDayPx = useMemo(
//     () => Math.max(containerWidth / WINDOW_DAYS, MIN_DAY_PX),
//     [containerWidth]
//   );
//   const innerWidth = useMemo(
//     () => Math.max(containerWidth, perDayPx * WINDOW_DAYS),
//     [containerWidth, perDayPx]
//   );
//   const perHourPx = useMemo(() => innerWidth / WINDOW_HOURS, [innerWidth]);

//   // Keep startDate for header labels and fetch
//   const startDateRef = useRef<Date | null>(null);

//   // Helpers for clamping translate
//   const maxTranslate = Math.max(0, innerWidth - containerWidth);
//   const clampTranslate = useCallback(
//     (t: number) => {
//       if (t > 0) return 0;
//       if (-t > maxTranslate) return -maxTranslate;
//       return t;
//     },
//     [maxTranslate]
//   );

//   // Convert current translateX -> startHourIndex (rounded to nearest hour)
//   useEffect(() => {
//     if (perHourPx <= 0) return;
//     const hours = Math.round(Math.abs(translateX) / perHourPx);
//     const clamped = Math.max(
//       0,
//       Math.min(WINDOW_HOURS - Math.ceil(containerWidth / perHourPx), hours)
//     );
//     setStartHourIndex(clamped);
//   }, [translateX, perHourPx, containerWidth]);

//   // Resize observer to track container width
//   useEffect(() => {
//     const el = outerRef.current;
//     if (!el) return;
//     const ro = new ResizeObserver(() => {
//       const w = el.clientWidth || 0;
//       setContainerWidth(w);
//     });
//     ro.observe(el);
//     setContainerWidth(el.clientWidth || 0);
//     return () => ro.disconnect();
//   }, []);

//   // Fetch / load data for a 4-day window starting at "date" (midnight America/Los_Angeles)
//   useEffect(() => {
//     let cancelled = false;

//     const load = async () => {
//       try {
//         if (!beachId) return;
//         const resolved = await fetchBeachByIdLoose(beachId);
//         const id = resolved?.id ?? beachId;

//         // compute local midnight in Pacific
//         const startInput = date instanceof Date ? new Date(date) : new Date();
//         const startLocal = new Date(
//           startInput.toLocaleString("en-US", {
//             timeZone: "America/Los_Angeles",
//           })
//         );
//         startLocal.setHours(0, 0, 0, 0);
//         startDateRef.current = startLocal;

//         const startMs = startLocal.getTime();
//         const end = new Date(startMs + WINDOW_HOURS * 60 * 60 * 1000);

//         const points = await fetchBeachTides(id, new Date(startMs), end);
//         let series: TidePoint[] = [];
//         if (!points || points.length === 0) {
//           const rows = await fetchBeachForecast(id, new Date(startMs), end);
//           series = rows.map((r) => ({
//             hour: Math.round(
//               (new Date(r.timestamp).getTime() - startMs) / (60 * 60 * 1000)
//             ),
//             tide: r.conditions?.tideLevel ?? 0,
//           }));
//         } else {
//           series = points.map((p) => ({
//             hour: Math.round(
//               (new Date(p.timestamp).getTime() - startMs) / (60 * 60 * 1000)
//             ),
//             tide: p.tideLevelFt ?? 0,
//           }));
//         }

//         // ensure array has entries for each hour 0..95 (interpolate missing hours simply by nearest previous)
//         const byHour = new Array<TidePoint>(WINDOW_HOURS)
//           .fill(null)
//           .map((_, h) => ({ hour: h, tide: 0 }));
//         series.forEach((s) => {
//           if (s.hour >= 0 && s.hour < WINDOW_HOURS)
//             byHour[s.hour] = { hour: s.hour, tide: s.tide };
//         });
//         // fill holes with previous valid tide to keep chart continuous
//         for (let i = 0; i < WINDOW_HOURS; i++) {
//           if (byHour[i].tide === 0 && i > 0) {
//             byHour[i].tide = byHour[i - 1].tide;
//           }
//         }

//         // detect peaks (same algorithm you had)
//         const out = byHour.map((p) => ({ ...p }));
//         for (let i = 1; i < byHour.length - 1; i++) {
//           const a = byHour[i - 1],
//             b = byHour[i],
//             c = byHour[i + 1];
//           if (b.tide > a.tide && b.tide >= c.tide)
//             out[i].isPeak = Number(b.tide.toFixed(1));
//           else if (b.tide < a.tide && b.tide <= c.tide)
//             out[i].isPeak = Number(b.tide.toFixed(1));
//         }

//         if (!cancelled) setData(out);

//         // shading & markers (sunrise/sunset) per day
//         const beach = await fetchBeachDetails(String(id));
//         const county = beach?.COUNTY;
//         if (county) {
//           const parseHM = (
//             s: string | null
//           ): { h: number; m: number } | null => {
//             if (!s) return null;
//             const m = /^(\d{1,2}):(\d{2})/.exec(s.trim());
//             if (!m) return null;
//             const h = Number(m[1]);
//             const mm = Number(m[2]);
//             if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
//             return { h, m: mm };
//           };

//           const daysArr: Date[] = [];
//           for (let i = 0; i < WINDOW_DAYS; i++) {
//             daysArr.push(new Date(startMs + 24 * i * 60 * 60 * 1000));
//           }

//           const dayAreasBuild: { x1: number; x2: number }[] = [];
//           const nightAreasBuild: { x1: number; x2?: number }[] = [];
//           const markers: number[] = [];

//           let nightStart = 0;
//           for (let di = 0; di < daysArr.length; di++) {
//             const cond = await fetchDailyConditions(county, daysArr[di]);
//             const rise = parseHM(cond?.sunrise ?? null);
//             const setv = parseHM(cond?.sunset ?? null);
//             if (!rise || !setv) {
//               // fallback: day is 6..18
//               dayAreasBuild.push({ x1: di * 24 + 6, x2: di * 24 + 18 });
//               nightAreasBuild.push({ x1: nightStart, x2: di * 24 + 6 });
//               nightStart = di * 24 + 18;
//               markers.push(di * 24 + 6, di * 24 + 18);
//               continue;
//             }
//             const offset = di * 24;
//             const rH = offset + rise.h;
//             const sH = offset + setv.h;
//             const dayStart = Math.min(rH, sH);
//             const dayEnd = Math.max(rH, sH);
//             dayAreasBuild.push({ x1: dayStart, x2: dayEnd });
//             nightAreasBuild.push({ x1: nightStart, x2: dayStart });
//             nightStart = dayEnd;
//             markers.push(rH, sH);
//           }
//           nightAreasBuild.push({ x1: nightStart });
//           if (!cancelled) {
//             setDayAreas(dayAreasBuild);
//             setNightAreas(nightAreasBuild);
//             setSunMarkers(markers);
//           }
//         } else {
//           if (!cancelled) {
//             setDayAreas([]);
//             setSunMarkers([]);
//           }
//         }
//       } catch (e) {
//         console.error("Failed load tide chart", e);
//       }
//     };

//     load();
//     return () => {
//       cancelled = true;
//     };
//   }, [beachId, date]);

//   // handle pointer-based dragging
//   const dragState = useRef({
//     pointerId: 0 as number | null,
//     startClientX: 0,
//     startTranslate: 0,
//     raf: 0 as number | null,
//   });

//   useEffect(() => {
//     return () => {
//       if (dragState.current.raf) cancelAnimationFrame(dragState.current.raf);
//     };
//   }, []);

//   const onPointerDown = (e: React.PointerEvent) => {
//     (e.target as HTMLElement).setPointerCapture(e.pointerId);
//     dragState.current.pointerId = e.pointerId;
//     dragState.current.startClientX = e.clientX;
//     dragState.current.startTranslate = translateX;
//     setIsDragging(true);
//   };

//   const onPointerMove = (e: React.PointerEvent) => {
//     if (dragState.current.pointerId !== e.pointerId) return;
//     const dx = e.clientX - dragState.current.startClientX;
//     const next = clampTranslate(dragState.current.startTranslate + dx);
//     // use RAF to batch updates
//     if (dragState.current.raf) cancelAnimationFrame(dragState.current.raf);
//     dragState.current.raf = requestAnimationFrame(() => {
//       setTranslateX(next);
//     });
//   };

//   const onPointerUp = (e: React.PointerEvent) => {
//     if (dragState.current.pointerId !== e.pointerId) return;
//     (e.target as HTMLElement).releasePointerCapture(e.pointerId);
//     dragState.current.pointerId = null;
//     setIsDragging(false);

//     // optional: snap to nearest hour or day boundary
//     if (perHourPx > 0) {
//       const hour = Math.round(Math.abs(translateX) / perHourPx);
//       // snap to day boundary (multiple of 24 hours)
//       const snapDay = Math.round(hour / 24) * 24;
//       const targetTranslate = -snapDay * perHourPx;
//       setTranslateX(clampTranslate(targetTranslate));
//     }
//   };

//   // Programmatic navigation: move left/right by 1 day (24 hours)
//   const handleNext = () => {
//     const nextHour = Math.min(
//       startHourIndex + 24,
//       WINDOW_HOURS - Math.ceil(containerWidth / perHourPx)
//     );
//     const t = -nextHour * perHourPx;
//     setTranslateX(clampTranslate(t));
//   };
//   const handleBack = () => {
//     const prevHour = Math.max(startHourIndex - 24, 0);
//     const t = -prevHour * perHourPx;
//     setTranslateX(clampTranslate(t));
//   };

//   // keyboard left/right
//   const onKeyNav = (e: React.KeyboardEvent) => {
//     if (e.key === "ArrowLeft") handleBack();
//     else if (e.key === "ArrowRight") handleNext();
//   };

//   // visible subset for tooltip/hit-tests. Recharts will still render whole wide chart but it's okay for 96 points.
//   const chartData = data; // full 96 points

//   // Day header labels (e.g., "Wed 8/15")
//   const dayLabels = useMemo(() => {
//     const startDate = startDateRef.current ?? new Date();
//     const arr: string[] = [];
//     for (let i = 0; i < WINDOW_DAYS; i++) {
//       const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
//       arr.push(
//         d.toLocaleDateString(undefined, {
//           weekday: "short",
//           month: "numeric",
//           day: "numeric",
//         })
//       );
//     }
//     return arr;
//   }, [startDateRef.current]);

//   return (
//     <div className="w-full">
//       {/* Controls */}
//       <div className="flex items-center justify-between mb-2">
//         <div>
//           <button
//             onClick={handleBack}
//             aria-label="Previous day"
//             className="px-3 py-1 rounded border hover:bg-gray-50"
//             disabled={startHourIndex <= 0}
//           >
//             ◀
//           </button>
//           <button
//             onClick={handleNext}
//             aria-label="Next day"
//             className="ml-2 px-3 py-1 rounded border hover:bg-gray-50"
//             disabled={
//               startHourIndex >=
//               WINDOW_HOURS - Math.ceil(containerWidth / perHourPx)
//             }
//           >
//             ▶
//           </button>
//         </div>
//         <div className="text-sm text-muted-foreground">
//           Showing {WINDOW_DAYS} days starting{" "}
//           {startDateRef.current
//             ? startDateRef.current.toLocaleDateString()
//             : ""}
//         </div>
//       </div>

//       {/* Chart outer viewport */}
//       <div
//         ref={outerRef}
//         className="relative w-full overflow-hidden touch-pan-y"
//         onKeyDown={onKeyNav}
//         tabIndex={0}
//         style={{ height: CHART_HEIGHT + 40 }} // header + chart
//       >
//         {/* Day headers aligned to inner chart columns */}
//         <div
//           className="absolute left-0 top-0 z-20 pointer-events-none"
//           style={{
//             width: innerWidth,
//             transform: `translateX(${translateX}px)`,
//             transition: isDragging
//               ? "none"
//               : "transform 250ms cubic-bezier(.2,.9,.2,1)",
//             display: "flex",
//           }}
//         >
//           {Array.from({ length: WINDOW_DAYS }).map((_, di) => (
//             <div
//               key={`day-label-${di}`}
//               style={{
//                 width: perDayPx,
//                 boxSizing: "border-box",
//                 padding: "6px 8px",
//                 borderRight: "1px solid rgba(0,0,0,0.03)",
//                 background:
//                   "linear-gradient(0deg, rgba(255,255,255,0.0), rgba(255,255,255,0.0))",
//                 textAlign: "center",
//                 fontSize: 13,
//                 fontWeight: 600,
//               }}
//             >
//               {dayLabels[di]}
//             </div>
//           ))}
//         </div>

//         {/* Interactive inner chart (large width) */}
//         <div
//           ref={innerRef}
//           onPointerDown={onPointerDown}
//           onPointerMove={onPointerMove}
//           onPointerUp={onPointerUp}
//           onPointerCancel={onPointerUp}
//           style={{
//             width: innerWidth,
//             height: CHART_HEIGHT,
//             transform: `translateX(${translateX}px)`,
//             transition: isDragging
//               ? "none"
//               : "transform 250ms cubic-bezier(.2,.9,.2,1)",
//             touchAction: "pan-y",
//             WebkitUserSelect: "none",
//             userSelect: "none",
//             cursor: isDragging ? "grabbing" : "grab",
//             position: "absolute",
//             left: 0,
//             top: 32, // leave space for day headers
//           }}
//         >
//           <ChartContainer
//             config={
//               { tide: { label: "Tide", color: "#6e6e6eff" } } as ChartConfig
//             }
//             className="h-full"
//             style={{ width: innerWidth }}
//           >
//             <LineChart
//               data={chartData}
//               width={innerWidth}
//               height={CHART_HEIGHT}
//               margin={{ left: -35, right: 15, bottom: 5, top: 20 }}
//             >
//               {/* Day / night shading */}
//               {dayAreas.map((a, idx) => (
//                 <ReferenceArea
//                   key={`day-${idx}`}
//                   x1={a.x1}
//                   x2={a.x2}
//                   fill="#FFE58F"
//                   fillOpacity={0.12}
//                 />
//               ))}
//               {nightAreas.map((a, idx) => (
//                 <ReferenceArea
//                   key={`night-${idx}`}
//                   x1={a.x1}
//                   x2={idx === nightAreas.length - 1 ? undefined : a.x2}
//                   fill="#c9c9c9"
//                   fillOpacity={0.06}
//                 />
//               ))}

//               {/* Day boundaries (every 24 hours) */}
//               {Array.from({ length: WINDOW_DAYS + 1 }).map((_, i) => (
//                 <ReferenceLine
//                   key={`boundary-${i}`}
//                   x={i * 24}
//                   stroke="#e6e6e6"
//                   strokeWidth={0.6}
//                 />
//               ))}

//               <CartesianGrid
//                 strokeDasharray="3 3"
//                 stroke="var(--foreground)"
//                 strokeWidth={0.08}
//                 vertical={false}
//               />
//               <XAxis
//                 dataKey="hour"
//                 tickLine={false}
//                 axisLine={false}
//                 tickMargin={8}
//                 minTickGap={0}
//                 fontSize={11}
//                 domain={[0, WINDOW_HOURS - 1]}
//                 tickFormatter={(v: number) =>
//                   v % 3 === 0 ? String(v % 12 === 0 ? 12 : v % 12) : ""
//                 }
//                 interval={0}
//               />
//               <YAxis
//                 dataKey="tide"
//                 tickLine={false}
//                 axisLine={false}
//                 tickMargin={8}
//                 fontSize={11}
//                 domain={[
//                   (dataMin: number) => Math.floor(dataMin) - 1,
//                   (dataMax: number) => Math.max(Math.ceil(dataMax) + 2, 8),
//                 ]}
//               />
//               <ChartTooltip content={<ChartTooltipContent />} />
//               <Line
//                 dataKey="tide"
//                 type="natural"
//                 stroke="var(--color-tide)"
//                 strokeWidth={2}
//                 dot={({ payload, cx, cy }: any) => {
//                   const hour = payload.hour as number;
//                   if (sunMarkers.includes(hour)) {
//                     return (
//                       <circle
//                         key={hour}
//                         cx={cx}
//                         cy={cy}
//                         r={3}
//                         fill="orange"
//                         stroke="var(--color-tide)"
//                         strokeWidth={1}
//                       />
//                     );
//                   } else if (
//                     payload.isPeak !== undefined &&
//                     payload.isPeak !== null
//                   ) {
//                     const isLow =
//                       typeof payload.isPeak === "number" &&
//                       payload.isPeak <= (payload.tide ?? 0) &&
//                       payload.isPeak <= 0;
//                     return (
//                       <circle
//                         key={hour}
//                         cx={cx}
//                         cy={cy}
//                         r={3}
//                         fill={isLow ? "#ef4444" : "#22c55e"}
//                         stroke="var(--color-tide)"
//                         strokeWidth={1}
//                       />
//                     );
//                   }
//                   return <g key={hour} />;
//                 }}
//               >
//                 <LabelList
//                   dataKey="tide"
//                   content={(props: any) => {
//                     const safeX = typeof props.x === "number" ? props.x : 0;
//                     const hour = chartData[props.index ?? -1]?.hour;
//                     return (
//                       <g>
//                         {hour != null && sunMarkers.includes(hour) ? (
//                           <Sun
//                             size={18}
//                             x={safeX - 9}
//                             y={-22}
//                             fill="#ff9946"
//                             color="#ff9946"
//                           />
//                         ) : null}
//                       </g>
//                     );
//                   }}
//                 />
//                 <LabelList
//                   dataKey="isPeak"
//                   content={(props: any) => {
//                     const safeX = typeof props.x === "number" ? props.x : 0;
//                     const safeY = typeof props.y === "number" ? props.y : 0;
//                     if (props.value && typeof props.index === "number") {
//                       const h = chartData[props.index]?.hour ?? 0;
//                       const lbl = `${h % 12 === 0 ? 12 : h % 12} ${
//                         h >= 12 ? "PM" : "AM"
//                       }`;
//                       return (
//                         <g>
//                           <text
//                             x={safeX}
//                             y={safeY - 32}
//                             fill="var(--foreground)"
//                             textAnchor="middle"
//                             dominantBaseline="middle"
//                             fontSize={10}
//                           >
//                             {lbl}
//                           </text>
//                           <text
//                             x={safeX}
//                             y={safeY - 17}
//                             fill="var(--foreground)"
//                             textAnchor="middle"
//                             fontWeight="bold"
//                             fontSize={12}
//                           >{`${props.value} ft`}</text>
//                         </g>
//                       );
//                     }
//                     return null;
//                   }}
//                 />
//               </Line>
//             </LineChart>
//           </ChartContainer>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ForecastTideChart;

// #################################################################################################################################

"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceArea,
  ReferenceLine,
  LabelList,
} from "recharts";
import { Sun } from "lucide-react";
import {
  fetchBeachByIdLoose,
  fetchBeachDetails,
  fetchDailyConditions,
  fetchBeachTides,
  fetchBeachForecast,
} from "@/lib/supabase";
import DaySlider from "../general/DaySlider";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

/**
 * Behaviour summary:
 * - Always show a 4-day viewport (VISIBLE_DAYS).
 * - Fetch FETCH_DAYS (VISIBLE_DAYS + 1).
 * - The inner chart is translated via transform; pointer moves update transform imperatively for smoothness.
 * - On release we snap to nearest day (and animate to it).
 */

const VISIBLE_DAYS = 4;
const HOURS_PER_DAY = 24;
const VISIBLE_HOURS = VISIBLE_DAYS * HOURS_PER_DAY;
const FETCH_DAYS = VISIBLE_DAYS; // fetch one extra day to allow forward pan
const MIN_DAY_PX = 250; // minimum pixels per day to keep UI usable on tiny screens

type Props = { beachId?: string; date?: Date };
type TidePoint = { hour: number; tide: number; isPeak?: number };

export default function ForecastTideChart({ beachId, date }: Props) {
  // data loaded for FETCH_DAYS days (hours)
  const [data, setData] = useState<TidePoint[]>([]);
  const [dayAreas, setDayAreas] = useState<{ x1: number; x2: number }[]>([]);
  const [nightAreas, setNightAreas] = useState<{ x1: number; x2?: number }[]>(
    []
  );
  const [sunMarkers, setSunMarkers] = useState<number[]>([]);

  // which day index (0..totalFetchedDays - VISIBLE_DAYS) is the first visible day
  const [dayOffset, setDayOffset] = useState(0);

  // layout
  const containerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Derived
  const totalFetchedDays = useMemo(() => FETCH_DAYS, []); // fixed for predictability
  const dayPx = useMemo(() => {
    if (!containerWidth) return MIN_DAY_PX;
    const fillPerDay = containerWidth / VISIBLE_DAYS;
    // clamp so days don't become tiny
    return Math.max(MIN_DAY_PX, Math.floor(fillPerDay));
  }, [containerWidth]);

  const chartInnerWidth = useMemo(
    () => totalFetchedDays * dayPx,
    [totalFetchedDays, dayPx]
  );
  const viewportWidth = useMemo(
    () => Math.min(containerWidth || 0, dayPx * VISIBLE_DAYS),
    [containerWidth, dayPx]
  );

  // Pointer & animation refs (imperative values to avoid re-renders)
  const currentTranslateRef = useRef(0); // px
  const pointerStateRef = useRef<{
    dragging: boolean;
    startX: number;
    startTranslate: number;
  } | null>(null);
  const rafRef = useRef<number | null>(null);

  // helpers: clamp translate (px)
  const clampTranslatePx = useCallback(
    (px: number) => {
      const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
      return Math.max(0, Math.min(px, maxTranslate));
    },
    [chartInnerWidth, viewportWidth]
  );

  // set transform imperatively (no setState)
  const setInnerTranslatePx = useCallback(
    (px: number, withTransition = false) => {
      const node = innerRef.current;
      if (!node) return;
      // apply transitions only when requested (snap/animate), otherwise immediate
      if (withTransition) {
        node.style.transition = "transform 360ms cubic-bezier(.2,.9,.2,1)";
      } else {
        node.style.transition = "none";
      }
      node.style.transform = `translate3d(-${px}px,0,0)`;
      currentTranslateRef.current = px;
    },
    []
  );

  // animate from currentTranslateRef to targetPx with RAF (smooth)
  const animateToPx = useCallback(
    (targetPx: number, onEnd?: () => void) => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const start = currentTranslateRef.current;
      const delta = targetPx - start;
      if (Math.abs(delta) < 1) {
        setInnerTranslatePx(targetPx, true);
        onEnd?.();
        return;
      }
      const duration = 320;
      const startTime = performance.now();

      const step = (t: number) => {
        const p = Math.min(1, (t - startTime) / duration);
        // easeOutCubic
        const ease = 1 - Math.pow(1 - p, 3);
        const v = start + delta * ease;
        setInnerTranslatePx(clampTranslatePx(v), false);
        if (p < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          // final snap with transition for crispness
          setInnerTranslatePx(clampTranslatePx(targetPx), true);
          rafRef.current = null;
          onEnd?.();
        }
      };

      rafRef.current = requestAnimationFrame(step);
    },
    [clampTranslatePx, setInnerTranslatePx]
  );

  // pointer handlers (imperative)
  const onPointerDown = (ev: React.PointerEvent) => {
    const node = ev.currentTarget as Element;
    node.setPointerCapture?.(ev.pointerId);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pointerStateRef.current = {
      dragging: true,
      startX: ev.clientX,
      startTranslate: currentTranslateRef.current,
    };
    // remove transition for immediate follow
    setInnerTranslatePx(currentTranslateRef.current, false);
    // prevent text selection
    document.body.style.userSelect = "none";
    document.body.style.touchAction = "none";
  };

  const onPointerMove = (ev: React.PointerEvent) => {
    const ps = pointerStateRef.current;
    if (!ps || !ps.dragging) return;
    const delta = ev.clientX - ps.startX;
    const next = clampTranslatePx(ps.startTranslate - delta);
    // update transform imperatively (no React state)
    setInnerTranslatePx(next, false);
  };

  const snapToNearestDayFromPx = useCallback(
    (px: number) => {
      const day = Math.round(px / dayPx);
      const dayClamped = Math.max(
        0,
        Math.min(day, totalFetchedDays - VISIBLE_DAYS)
      );
      return dayClamped;
    },
    [dayPx, totalFetchedDays]
  );

  const RoundToNearestDayFromPx = useCallback(
    (px: number) => {
      const day = Math.round(px / dayPx);
      const dayClamped = Math.max(
        0,
        Math.min(day, totalFetchedDays - VISIBLE_DAYS)
      );
      return dayClamped;
    },
    [dayPx, totalFetchedDays]
  );

  const onPointerUp = (ev: React.PointerEvent) => {
    const node = ev.currentTarget as Element;
    node.releasePointerCapture?.(ev.pointerId);
    const ps = pointerStateRef.current;
    if (!ps) return;
    pointerStateRef.current = null;
    document.body.style.userSelect = "";
    document.body.style.touchAction = "";
    // determine nearest day
    const finalPx = currentTranslateRef.current;
    // const nearestDay = snapToNearestDayFromPx(finalPx);
    const nearestDay = Math.ceil(finalPx / dayPx);
    const targetPx = nearestDay * dayPx;
    console.log(
      "OFFSETTING STUFF",
      finalPx,
      dayPx,
      nearestDay,
      targetPx,
      dayOffset,
      containerWidth,
      containerRef.current?.clientWidth,
      containerRef
    );
    // animate to target and update state on end
    // animateToPx(targetPx, () => {
    //   setDayOffset(nearestDay);
    // });
    // animateToPx(finalPx, () => {
    //   setDayOffset(nearestDay);
    // });
  };

  // Button controls: animate to next/prev by one day
  const handleNext = useCallback(() => {
    // const maxOffset = Math.max(0, totalFetchedDays - VISIBLE_DAYS);
    const maxOffset = Math.max(0, totalFetchedDays - 1);
    const newOffset = Math.min(maxOffset, dayOffset + 1);
    const targetPx = newOffset * dayPx;
    console.log("CURRENT OFFSET", maxOffset, newOffset, targetPx, dayOffset);
    animateToPx(targetPx, () => setDayOffset(newOffset));
  }, [animateToPx, dayOffset, dayPx, totalFetchedDays]);

  const handleBack = useCallback(() => {
    const newOffset = Math.max(0, dayOffset - 1);
    const targetPx = newOffset * dayPx;
    console.log("CURRENT OFFSET BACK", newOffset, targetPx, dayOffset);
    animateToPx(targetPx, () => setDayOffset(newOffset));
  }, [animateToPx, dayOffset, dayPx]);

  // Update inner transform when dayOffset or dayPx changes (unless user is actively dragging)
  useEffect(() => {
    // if user is dragging, avoid snapping
    if (pointerStateRef.current?.dragging) return;
    const px = clampTranslatePx(dayOffset * dayPx);
    // animate to logical position for programmatic changes
    setInnerTranslatePx(px, true);
  }, [dayOffset, dayPx, clampTranslatePx, setInnerTranslatePx]);

  // ResizeObserver for container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = Math.floor(e.contentRect.width);
        setContainerWidth(w);
      }
    });
    ro.observe(el);
    setContainerWidth(Math.floor(el.clientWidth));
    return () => ro.disconnect();
  }, []);

  // Fetch tide + day info for FETCH_DAYS
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!beachId) return;
      try {
        const resolved = await fetchBeachByIdLoose(beachId);
        const id = resolved?.id ?? beachId;

        const startInput = date instanceof Date ? new Date(date) : new Date();
        const startLocal = new Date(
          startInput.toLocaleString("en-US", {
            timeZone: "America/Los_Angeles",
          })
        );
        startLocal.setHours(0, 0, 0, 0);
        const startMs = startLocal.getTime();
        const fetchHours = FETCH_DAYS * HOURS_PER_DAY;
        const end = new Date(startMs + fetchHours * 60 * 60 * 1000);
        console.log("WINDOW WINDOW WINDOW", new Date(startMs), end);
        const points = await fetchBeachTides(id, new Date(startMs), end);
        let series: TidePoint[] = [];
        if (!points || points.length === 0) {
          const rows = await fetchBeachForecast(id, new Date(startMs), end);
          series = rows.map((r) => ({
            hour: Math.round(
              (new Date(r.timestamp).getTime() - startMs) / (60 * 60 * 1000)
            ),
            tide: r.conditions.tideLevel ?? 0,
          }));
        } else {
          series = points.map((p) => ({
            hour: Math.round(
              (new Date(p.timestamp).getTime() - startMs) / (60 * 60 * 1000)
            ),
            tide: p.tideLevelFt ?? 0,
          }));
        }

        series = series
          .filter((p) => p.hour >= 0 && p.hour <= fetchHours)
          .sort((a, b) => a.hour - b.hour);

        // peaks
        const out = series.map((p) => ({ ...p }));
        for (let i = 1; i < series.length - 1; i++) {
          const a = series[i - 1],
            b = series[i],
            c = series[i + 1];
          if (b.tide > a.tide && b.tide >= c.tide)
            out[i].isPeak = Number(b.tide.toFixed(1));
          else if (b.tide < a.tide && b.tide <= c.tide)
            out[i].isPeak = Number(b.tide.toFixed(1));
        }
        if (!cancelled) setData(out);

        // day/night/sun markers
        const beach = await fetchBeachDetails(String(id));
        const county = beach?.COUNTY;
        if (county) {
          const parseHM = (
            s: string | null
          ): { h: number; m: number } | null => {
            if (!s) return null;
            const m = /^(\d{1,2}):(\d{2})/.exec(s.trim());
            if (!m) return null;
            const h = Number(m[1]);
            const mm = Number(m[2]);
            if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
            return { h, m: mm };
          };

          const dayAreasBuild: { x1: number; x2: number }[] = [];
          const nightAreasBuild: { x1: number; x2?: number }[] = [];
          const markers: number[] = [];
          let nightStart = 0;
          for (let di = 0; di < FETCH_DAYS; di++) {
            const cond = await fetchDailyConditions(
              county,
              new Date(startMs + di * 24 * 60 * 60 * 1000)
            );
            const rise = parseHM(cond?.sunrise ?? null);
            const setv = parseHM(cond?.sunset ?? null);
            if (!rise || !setv) {
              // fallback mark whole day
              dayAreasBuild.push({ x1: di * 24, x2: di * 24 + 24 });
              nightAreasBuild.push({ x1: nightStart, x2: di * 24 });
              nightStart = di * 24 + 24;
              continue;
            }
            const offset = di * 24;
            const rH = offset + rise.h + Math.floor(rise.m / 60);
            const sH = offset + setv.h + Math.floor(setv.m / 60);
            const dayStart = Math.min(rH, sH);
            const dayEnd = Math.max(rH, sH);
            dayAreasBuild.push({ x1: dayStart, x2: dayEnd });
            nightAreasBuild.push({ x1: nightStart, x2: dayStart });
            nightStart = dayEnd;
            markers.push(rH, sH);
          }
          nightAreasBuild.push({ x1: nightStart });
          if (!cancelled) {
            setDayAreas(dayAreasBuild);
            setNightAreas(nightAreasBuild);
            setSunMarkers(markers);
          }
        } else {
          if (!cancelled) {
            setDayAreas([]);
            setNightAreas([]);
            setSunMarkers([]);
          }
        }
      } catch (e) {
        console.error("ForecastTideChart load error:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [beachId, date]);

  // Prepare day label texts for the *visible 4 days* starting at dayOffset
  const dayLabels = useMemo(() => {
    const base = date instanceof Date ? new Date(date) : new Date();
    const startLocal = new Date(
      base.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
    );
    startLocal.setHours(0, 0, 0, 0);
    const labels = [];
    for (let i = 0; i < VISIBLE_DAYS; i++) {
      const d = new Date(
        startLocal.getTime() + (dayOffset + i) * 24 * 60 * 60 * 1000
      );
      labels.push(
        d.toLocaleDateString(undefined, {
          weekday: "short",
          month: "numeric",
          day: "numeric",
        })
      );
    }
    return labels;
  }, [date]);

  // computed visible data (for tooltip & potential optimization)
  const visibleHourStart = dayOffset * HOURS_PER_DAY;
  const visibleHourEnd = visibleHourStart + VISIBLE_HOURS - 1;
  const visibleData = useMemo(
    () =>
      data.filter(
        (d) => d.hour >= visibleHourStart && d.hour <= visibleHourEnd
      ),
    [data, visibleHourStart, visibleHourEnd]
  );

  // Render
  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="relative w-full"
        style={{
          height: 290,
          overflow: "hidden",
          background: "transparent",
        }}
      >
        {/* prev/next buttons */}
        {/* <button
          aria-label="Back one day"
          onClick={handleBack}
          className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 z-50 rounded-full bg-highlight-7/90 p-2 shadow",
            dayOffset === 0 && "hidden"
          )}
          style={{ backdropFilter: "blur(5px)" }}
        >
          ◀
        </button>
        <button
          aria-label="Next one day"
          onClick={handleNext}
          className={cn(
            "absolute right-4 top-1/2 -translate-y-1/2 z-50 rounded-full bg-highlight-7/90 p-2 shadow",
            dayOffset === VISIBLE_DAYS - 1 && "hidden"
          )}
          style={{ backdropFilter: "blur(5px)" }}
        >
          ▶
        </button> */}

        {/* moving inner (chart + day separators) */}
        <div
          ref={innerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            marginTop: 30,
            position: "absolute",
            left: 0,
            // top: 60, // leave room for label bar
            width: chartInnerWidth,
            height: 250,
            display: "block",
            willChange: "transform",
            cursor: "grab",
            touchAction: "pan-y",
          }}
        >
          {/* create a small visual seam between the labels and chart so they feel connected */}
          {/* <div
            style={{
              height: 8,
              marginTop: -8,
              background: "linear-gradient(180deg,#fff,transparent)",
            }}
          /> */}
          {/* Day label bar (4 filled boxes) — fixed in viewport and aligned to visible days */}
          <div
            className="w-[97%] flex justify-between"
            style={{
              position: "absolute",
              zIndex: 40,
              left: "2%",
              top: -35,
              // gap: 8,
              // paddingLeft: 8,
              // paddingRight: 8,
              boxSizing: "border-box",
              pointerEvents: "none",
            }}
          >
            {dayLabels.map((label, idx) => (
              <div
                key={idx}
                className=""
                style={{
                  flex: 1,
                  minWidth: 0,
                  textAlign: "center",
                  // background: "linear-gradient(180deg,#f8fafc,#eef2ff)",
                  borderRadius: 8,
                  padding: "6px 6px",
                  // boxShadow: "0 1px 0 rgba(0,0,0,0.04)",
                  // border: "1px solid rgba(0,0,0,0.06)",
                  fontWeight: 700,
                  fontSize: 13,
                  color: "var(--foreground)",
                  pointerEvents: "none",
                }}
              >
                <div className="max-w-20 mx-auto p-1 rounded-sm bg-highlight-7 border border-border">
                  {label}
                </div>
              </div>
            ))}
          </div>
          <ChartContainer
            config={
              { tide: { label: "Tide", color: "#6e6e6eff" } } as ChartConfig
            }
            className="h-full w-full"
          >
            <LineChart
              width={chartInnerWidth}
              height={200}
              data={data}
              margin={{ left: -35, right: 15, bottom: 5, top: 6 }}
            >
              {dayAreas.map((a, idx) => (
                <ReferenceArea
                  key={`day-${idx}`}
                  x1={a.x1}
                  x2={a.x2}
                  fill="#FFE58F"
                  fillOpacity={0.18}
                />
              ))}
              {nightAreas.map((a, idx) => (
                <ReferenceArea
                  key={`night-${idx}`}
                  x1={idx === 0 ? undefined : a.x1}
                  x2={idx === nightAreas.length - 1 ? undefined : a.x2}
                  fill="#ccc1ffff"
                  fillOpacity={0.12}
                />
              ))}

              {/* vertical boundaries every day */}
              {Array.from({ length: totalFetchedDays + 1 }, (_, i) => {
                if (i !== 0 && i !== totalFetchedDays) {
                  console.log("HEREHERHEHREEHRE abc", i);
                  return (
                    <ReferenceLine
                      key={`boundary-${i}`}
                      x={i * 24}
                      stroke="#dadadaff"
                      strokeWidth={1}
                    />
                  );
                }
              })}

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--foreground)"
                strokeWidth={0.08}
                vertical={false}
              />
              <XAxis
                dataKey="hour"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={0}
                fontSize={11}
                domain={[0, totalFetchedDays * 24 - 1]}
                tickFormatter={(v: number) =>
                  v % 3 === 0 ? String(v % 12 === 0 ? 12 : v % 12) : ""
                }
              />
              <YAxis
                dataKey="tide"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
                domain={[
                  (dataMin: number) =>
                    Number.isFinite(dataMin) ? Math.floor(dataMin) - 1 : 0,
                  (dataMax: number) =>
                    Number.isFinite(dataMax)
                      ? Math.max(Math.ceil(dataMax) + 2, 8)
                      : 8,
                ]}
              />
              <ChartTooltip content={<ChartTooltipContent />} />

              <Line
                dataKey="tide"
                type="natural"
                stroke="var(--color-tide)"
                strokeWidth={2}
                dot={({ payload, cx, cy }: any) => {
                  const hour = payload.hour as number;
                  if (sunMarkers.includes(hour)) {
                    return (
                      <circle
                        key={hour}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill="orange"
                        stroke="var(--color-tide)"
                        strokeWidth={1}
                      />
                    );
                  } else if (
                    payload.isPeak !== undefined &&
                    payload.isPeak !== null
                  ) {
                    const isLow =
                      typeof payload.isPeak === "number" &&
                      payload.isPeak <= (payload.tide ?? 0) &&
                      payload.isPeak <= 0;
                    return (
                      <circle
                        key={hour}
                        cx={cx}
                        cy={cy}
                        r={3}
                        fill={isLow ? "#ef4444" : "#22c55e"}
                        stroke="var(--color-tide)"
                        strokeWidth={1}
                      />
                    );
                  }
                  return <g key={payload.hour} />;
                }}
              >
                <LabelList
                  dataKey="tide"
                  content={(props: any) => {
                    const safeX = typeof props.x === "number" ? props.x : 0;
                    const hour = data[props.index ?? -1]?.hour;
                    return (
                      <g>
                        {hour != null && sunMarkers.includes(hour) ? (
                          <Sun
                            size={18}
                            x={safeX - 9}
                            y={5}
                            fill="#ff9946ff"
                            color="#ff9946ff"
                          />
                        ) : null}
                      </g>
                    );
                  }}
                />
                <LabelList
                  dataKey="isPeak"
                  content={(props: any) => {
                    const safeX = typeof props.x === "number" ? props.x : 0;
                    const safeY = typeof props.y === "number" ? props.y : 0;
                    if (props.value && typeof props.index === "number") {
                      const h = data[props.index]?.hour ?? 0;
                      const safeH = h % 12 === 0 ? 12 : h % 12;
                      const lbl = `${safeH} ${h % 24 >= 12 ? "PM" : "AM"}`;
                      return (
                        <g>
                          <text
                            x={safeX}
                            y={safeY - 32}
                            fill="var(--foreground)"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize={10}
                          >
                            {lbl}
                          </text>
                          <text
                            x={safeX}
                            y={safeY - 17}
                            fill="var(--foreground)"
                            textAnchor="middle"
                            fontWeight="bold"
                            fontSize={12}
                          >
                            {`${props.value} ft`}
                          </text>
                        </g>
                      );
                    }
                    return null;
                  }}
                />
              </Line>
            </LineChart>
          </ChartContainer>
        </div>

        {/* invisible overlay (visual viewport) to prevent pointer events leaking to inner beyond boundaries */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 56,
            width: viewportWidth,
            height: 220,
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
