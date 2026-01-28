"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"];
}) {
  const uniqueId = React.useId();
  const chartSeed = String(id ?? uniqueId);
  const chartId = `chart-${chartSeed
    .replace(/[^a-z0-9_-]/gi, "")
    .toLowerCase()}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config)
    .filter(([, config]) => config.theme || config.color)
    .sort(([a], [b]) => a.localeCompare(b));

  if (!colorConfig.length) {
    return null;
  }

  const cssText = (["light", "dark"] as const)
    .map((theme) => {
      const prefix = THEMES[theme];
      const vars = colorConfig
        .map(([key, itemConfig]) => {
          const color =
            itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
            itemConfig.color;
          return color ? `  --color-${key}: ${color};` : null;
        })
        .filter(Boolean)
        .join("\n");

      return `
${prefix} [data-chart="${id}"] {
${vars}
}
`;
    })
    .join("\n");

  return (
    <style>{cssText}</style>
  );
};

const ChartTooltip = RechartsPrimitive.Tooltip;

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<"div"> & {
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "line" | "dot" | "dashed";
    nameKey?: string;
    labelKey?: string;
  }) {
  const { config } = useChart();
  const isDarkMode =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  const resolveConfigColor = React.useCallback(
    (itemConfig: ReturnType<typeof getPayloadConfigFromPayload>) => {
      if (!itemConfig) return undefined;
      if ("theme" in itemConfig && itemConfig.theme) {
        return itemConfig.theme[isDarkMode ? "dark" : "light"];
      }
      if ("color" in itemConfig) {
        return itemConfig.color;
      }
      return undefined;
    },
    [isDarkMode]
  );

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null;
    }

    const [item] = payload;
    const key = `${labelKey || item?.dataKey || item?.name || "value"}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const value =
      !labelKey && typeof label === "string"
        ? config[label as keyof typeof config]?.label || label
        : itemConfig?.label;

    if (labelFormatter) {
      return (
        <div
          className={cn(
            "text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-foreground/80",
            labelClassName
          )}
        >
          {labelFormatter(value, payload)}
        </div>
      );
    }

    if (!value) {
      return null;
    }
    if (
      item.name === "tide" ||
      item.name === "surf" ||
      item.name === "energy" ||
      item.name === "wind"
    ) {
      const payload = (item as { payload?: Record<string, unknown> }).payload;
      const x: unknown = payload?.x;
      const hourSource: unknown = payload?.hour;
      let hourNum: number | null = null;
      if (typeof x === "number") {
        hourNum = new Date(x).getHours();
      } else if (typeof hourSource === "number") {
        hourNum = hourSource;
      }
      const hour =
        hourNum !== null ? (hourNum % 12 === 0 ? 12 : hourNum % 12) : null;
      const amPm = hourNum !== null ? (hourNum % 24 >= 12 ? "PM" : "AM") : "";
      return (
        <div
          className={cn(
            "text-[0.72rem] font-bold uppercase tracking-[0.2em] text-foreground/80",
            labelClassName
          )}
        >
          {hour !== null ? `${hour} ${amPm}` : value}
        </div>
      );
    }
    return (
      <div
        className={cn(
          "text-[0.72rem] font-bold uppercase tracking-[0.2em] text-foreground/80",
          labelClassName
        )}
      >
        {value}
      </div>
    );
  }, [
    label,
    labelFormatter,
    payload,
    hideLabel,
    labelClassName,
    config,
    labelKey,
  ]);

  if (!active || !payload?.length) {
    return null;
  }

  const nestLabel = payload.length === 1 && indicator !== "dot";

  return (
    <div
      className={cn(
        "relative grid min-w-[9.5rem] items-start gap-2 overflow-hidden rounded-2xl border border-border/60 bg-background/90 px-2 py-2 text-xs shadow-[0_18px_45px_rgba(0,0,0,0.25)] ring-1 ring-white/10 backdrop-blur-md motion-safe:animate-in motion-safe:fade-in-0 before:pointer-events-none before:absolute before:inset-0 before:opacity-90 [@media(hover:none)_and_(pointer:coarse)]:min-w-[9.5rem] [@media(hover:none)_and_(pointer:coarse)]:px-2 [@media(hover:none)_and_(pointer:coarse)]:py-2",
        className
      )}
    >
      {!nestLabel && tooltipLabel ? (
        <div className="border-border/40 border-b pb-1">{tooltipLabel}</div>
      ) : null}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = `${nameKey || item.name || item.dataKey || "value"}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);
          const configColor = resolveConfigColor(itemConfig);
          const payloadEntry = (item?.payload ?? {}) as Record<string, unknown>;
          const rawIndicatorColor =
            color ||
            (payloadEntry.fill as string | undefined) ||
            (payloadEntry.stroke as string | undefined) ||
            item.color;
          const indicatorColor =
            typeof rawIndicatorColor === "string" &&
            rawIndicatorColor.startsWith("url(")
              ? configColor
              : rawIndicatorColor || configColor;
          const iconColor = configColor || indicatorColor;
          const swellBadgeNumber =
            key === "primary"
              ? 1
              : key === "secondary"
              ? 2
              : key === "tertiary"
              ? 3
              : null;
          const formattedValue =
            formatter && item?.value !== undefined && item.name
              ? formatter(item.value, item.name, item, index, item.payload)
              : null;
          const showFormatted =
            formattedValue !== null && formattedValue !== undefined;
          const isRichFormatted =
            showFormatted && React.isValidElement(formattedValue);
          const unit =
            key === "tide" ||
            key === "surf" ||
            key === "tide1" ||
            key === "tide2" ||
            key === "tide3"
              ? "ft"
              : key === "energy"
              ? "kJ"
              : key === "wind" ||
                key === "wind1" ||
                key === "wind2" ||
                key === "wind3"
              ? "mph"
              : "";

          const rawValue = item.value;
          const valueText =
            typeof rawValue === "number" && Number.isFinite(rawValue)
              ? rawValue.toLocaleString(undefined, {
                  minimumFractionDigits: Number.isInteger(rawValue) ? 0 : 1,
                  maximumFractionDigits: Number.isInteger(rawValue) ? 0 : 1,
                })
              : rawValue != null
              ? String(rawValue)
              : "--";

          const rowAlign =
            !isRichFormatted && indicator === "dot"
              ? typeof swellBadgeNumber === "number"
                ? "items-start"
                : "items-center"
              : undefined;

          return (
            <div
              key={`${key}-${index}`}
              className={cn(
                "[&>svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-3.5 [&>svg]:w-3.5 [@media(hover:none)_and_(pointer:coarse)]:gap-1.5",
                isRichFormatted && "items-start",
                rowAlign
              )}
            >
              {typeof swellBadgeNumber === "number" ? (
                <div
                  className={cn(
                    "text-white flex h-5 w-5 shrink-0 items-center justify-center rounded-full border shadow-sm ring-1 ring-background/70 text-[0.68rem] font-semibold tabular-nums leading-none self-start",
                    isRichFormatted && "mt-0",
                    "[@media(hover:none)_and_(pointer:coarse)]:h-5 [@media(hover:none)_and_(pointer:coarse)]:w-5 [@media(hover:none)_and_(pointer:coarse)]:text-[0.68rem]"
                  )}
                  style={
                    indicatorColor
                      ? ({
                          backgroundColor: indicatorColor,
                          borderColor: `color-mix(in srgb, ${indicatorColor} 60%, transparent)`,
                        } as React.CSSProperties)
                      : undefined
                  }
                >
                  <span className="mt-0.5">{swellBadgeNumber}</span>
                </div>
              ) : itemConfig?.icon ? (
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border shadow-sm ring-1 ring-background/70 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-current",
                    isRichFormatted && "items-start pt-1",
                    "[@media(hover:none)_and_(pointer:coarse)]:h-6 [@media(hover:none)_and_(pointer:coarse)]:w-6"
                  )}
                  // style={
                  //   iconColor
                  //     ? ({
                  //         color: iconColor,
                  //         backgroundColor: `color-mix(in srgb, ${iconColor} 18%, transparent)`,
                  //         borderColor: `color-mix(in srgb, ${iconColor} 38%, transparent)`,
                  //       } as React.CSSProperties)
                  //     : undefined
                  // }
                >
                  <itemConfig.icon />
                </div>
              ) : (
                !hideIndicator && (
                  <div
                    className={cn(
                      "shrink-0 rounded-full border-(--color-border) bg-(--color-bg) shadow-sm ring-2 ring-background/80",
                      isRichFormatted && "mt-1.5",
                      {
                        "h-2.5 w-2.5": indicator === "dot",
                        "w-1": indicator === "line",
                        "w-0 border-[1.5px] border-dashed bg-transparent":
                          indicator === "dashed",
                        "my-0.5": nestLabel && indicator === "dashed",
                      }
                    )}
                    style={
                      {
                        "--color-bg": indicatorColor,
                        "--color-border": indicatorColor,
                      } as React.CSSProperties
                    }
                  />
                )
              )}
              <div
                className={cn(
                  "flex flex-1 items-center justify-between gap-2 leading-none",
                  nestLabel
                    ? "items-end"
                    : isRichFormatted
                    ? "items-start"
                    : "items-center"
                )}
              >
                <div
                  className={cn("grid gap-1.5", isRichFormatted && "pt-1.5")}
                >
                  {nestLabel ? tooltipLabel : null}
                  <span className="text-muted-foreground hidden">
                    {itemConfig?.label || item.name}
                  </span>
                </div>
                {showFormatted ? (
                  <div className="text-right">
                    {React.isValidElement(formattedValue) ? (
                      formattedValue
                    ) : (
                      <span className="bg-foreground/10 text-foreground inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium tabular-nums">
                        <span className="text-xs font-semibold leading-none">
                          {formattedValue}
                        </span>
                      </span>
                    )}
                  </div>
                ) : (
                  rawValue !== undefined &&
                  rawValue !== null && (
                    <span className="bg-foreground/10 text-foreground inline-flex items-baseline gap-1.5 rounded-md px-2 py-1 font-medium tabular-nums">
                      <span className="text-xs font-semibold leading-none">
                        {valueText}
                      </span>
                      {unit ? (
                        <span className="text-[0.68rem] font-medium leading-none text-muted-foreground">
                          {unit}
                        </span>
                      ) : null}
                    </span>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type TooltipViewport = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function ChartTooltipViewportContent({
  viewport,
  offset = 10,
  ...props
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<"div"> & {
    viewport: TooltipViewport;
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "line" | "dot" | "dashed";
    nameKey?: string;
    labelKey?: string;
  }) {
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const lastSizeRef = React.useRef<{ width: number; height: number } | null>(
    null
  );
  const lastCoordinateRef = React.useRef<{ x?: number; y?: number } | null>(
    null
  );
  const isActive = Boolean(props.active && props.payload?.length);

  React.useLayoutEffect(() => {
    if (!isActive) return;
    const node = contentRef.current;
    if (!node) return;

    const update = () => {
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      lastSizeRef.current = { width: rect.width, height: rect.height };
      setSize((prev) =>
        prev.width !== rect.width || prev.height !== rect.height
          ? { width: rect.width, height: rect.height }
          : prev
      );
    };

    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => update());
    ro.observe(node);
    return () => ro.disconnect();
  }, [isActive, props.payload, props.label]);

  React.useLayoutEffect(() => {
    if (!isActive) {
      lastCoordinateRef.current = null;
      return;
    }

    const x =
      typeof props.coordinate?.x === "number" ? props.coordinate.x : undefined;
    const y =
      typeof props.coordinate?.y === "number" ? props.coordinate.y : undefined;

    if (x === undefined && y === undefined) return;

    const prev = lastCoordinateRef.current ?? {};
    const next = {
      x: x ?? prev.x,
      y: y ?? prev.y,
    };

    lastCoordinateRef.current = next;
  }, [isActive, props.coordinate?.x, props.coordinate?.y]);

  if (!isActive) {
    return null;
  }

  const coordX = (() => {
    if (typeof props.coordinate?.x === "number") return props.coordinate.x;
    const last = lastCoordinateRef.current;
    if (last && typeof last.x === "number") return last.x;
    return viewport.x;
  })();

  const coordY = (() => {
    if (typeof props.coordinate?.y === "number") return props.coordinate.y;
    const last = lastCoordinateRef.current;
    if (last && typeof last.y === "number") return last.y;
    return viewport.y;
  })();

  const fallbackWidth = 260;
  const fallbackHeight = 220;
  const width =
    size.width || lastSizeRef.current?.width || Math.min(fallbackWidth, viewport.width);
  const height =
    size.height ||
    lastSizeRef.current?.height ||
    Math.min(fallbackHeight, viewport.height);

  let x = coordX + offset;
  if (x + width > viewport.x + viewport.width) {
    x = coordX - offset - width;
  }
  x = Math.max(viewport.x, Math.min(x, viewport.x + viewport.width - width));

  let y = coordY - offset - height;
  if (y < viewport.y) {
    y = coordY + offset;
  }
  y = Math.max(viewport.y, Math.min(y, viewport.y + viewport.height - height));

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        transform: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`,
      }}
    >
      <div ref={contentRef}>
        <ChartTooltipContent {...props} />
      </div>
    </div>
  );
}

const ChartLegend = RechartsPrimitive.Legend;

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}: React.ComponentProps<"div"> &
  Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & {
    hideIcon?: boolean;
    nameKey?: string;
  }) {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  const isDarkMode =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  const resolveConfigColor = (
    itemConfig: ReturnType<typeof getPayloadConfigFromPayload>
  ) => {
    if (!itemConfig) return undefined;
    if ("theme" in itemConfig && itemConfig.theme) {
      return itemConfig.theme[isDarkMode ? "dark" : "light"];
    }
    if ("color" in itemConfig) {
      return itemConfig.color;
    }
    return undefined;
  };

  return (
    <div
      className={cn(
        "flex items-center justify-end gap-4 mr-2",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className
      )}
    >
      {payload.map((item, index) => {
        const key = `${nameKey || item.dataKey || "value"}`;
        const itemConfig = getPayloadConfigFromPayload(config, item, key);
        const configColor = resolveConfigColor(itemConfig);
        const indicatorColor = item.color;
        const iconColor = configColor || indicatorColor;

        return (
          <div
            key={`${key}-${index}`}
            className={cn(
              "[&>svg]:text-muted-foreground flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3"
            )}
          >
            {itemConfig?.icon && !hideIcon ? (
              <div
                className="flex h-6 w-6 items-center justify-center rounded-md border shadow-sm ring-1 ring-background/70 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-current"
                style={
                  iconColor
                    ? ({
                        color: iconColor,
                        backgroundColor: `color-mix(in srgb, ${iconColor} 18%, transparent)`,
                        borderColor: `color-mix(in srgb, ${iconColor} 38%, transparent)`,
                      } as React.CSSProperties)
                    : undefined
                }
              >
                <itemConfig.icon />
              </div>
            ) : (
              <div
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{
                  backgroundColor: item.color,
                }}
              />
            )}
            {itemConfig?.label}
          </div>
        );
      })}
    </div>
  );
}

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string
) {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const payloadPayload =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? payload.payload
      : undefined;

  let configLabelKey: string = key;

  if (
    key in payload &&
    typeof payload[key as keyof typeof payload] === "string"
  ) {
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[
      key as keyof typeof payloadPayload
    ] as string;
  }

  return configLabelKey in config
    ? config[configLabelKey]
    : config[key as keyof typeof config];
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartTooltipViewportContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
};
