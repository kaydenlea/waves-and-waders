"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bike,
  Building2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Filter,
  Trash2,
  TreePine,
  Waves,
  X,
} from "lucide-react";

import { FEATURE_CATEGORIES, getFeatureDisplayName } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type FeatureOption = {
  key: string;
  label: string;
};

type FeatureSection = {
  key: string;
  label: string;
  features: FeatureOption[];
};

type Props = {
  open?: boolean;
  appliedFilters: Set<string>;
  onApply: (next: Set<string>) => void;
  onClose?: () => void;
  className?: string;
};

const getSectionIcon = (label: string) => {
  const l = label.toLowerCase();
  if (l.includes("activities"))
    return <Bike className="w-6 h-6 text-red-300" />;
  if (l.includes("trails") || l.includes("nature")) {
    return <TreePine className="w-6 h-6 text-green-500 dark:text-green-400" />;
  }
  if (l.includes("beach")) {
    return <Waves className="w-6 h-6 text-cyan-400 dark:text-cyan-300" />;
  }
  if (l.includes("facilities") || l.includes("amenities")) {
    return <Building2 className="w-6 h-6 text-gray-500 dark:text-gray-300" />;
  }
  if (l.includes("access") || l.includes("fees")) {
    return (
      <CreditCard className="w-6 h-6 text-purple-400 dark:text-purple-300" />
    );
  }
  return <Waves className="w-6 h-6 text-sky-300 opacity-70" />;
};

const FEATURE_SECTIONS: FeatureSection[] = Object.entries(
  FEATURE_CATEGORIES
).map(([key, cat]) => ({
  key,
  label: (cat as { label?: string }).label || key,
  features: (cat as { features: readonly string[] }).features.map(
    (feature) => ({
      key: feature,
      label: getFeatureDisplayName(feature) || feature,
    })
  ),
}));

const FEATURE_TO_SECTION = FEATURE_SECTIONS.reduce<Record<string, string>>(
  (acc, section) => {
    section.features.forEach((feature) => {
      acc[feature.key] = section.key;
    });
    return acc;
  },
  {}
);

const EMPTY_SECTION_SELECTIONS = FEATURE_SECTIONS.reduce<
  Record<string, number>
>((acc, section) => {
  acc[section.key] = 0;
  return acc;
}, {});

const FeatureOptionRow = React.memo(
  ({
    checked,
    label,
    featureKey,
    onToggle,
  }: {
    checked: boolean;
    label: string;
    featureKey: string;
    onToggle: (key: string) => void;
  }) => (
    <label
      className={cn(
        "flex items-center gap-3 px-3 py-1.5 rounded-lg cursor-pointer select-none transition-colors border border-transparent",
        checked
          ? "bg-sky-50 dark:bg-sky-900/30 text-foreground border-sky-100 dark:border-sky-800"
          : "hover:bg-highlight-5 text-muted-foreground"
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(featureKey)}
        className="w-4 h-4 accent-sky-300 rounded-sm flex-shrink-0"
      />
      <span className="text-[13px] leading-tight text-foreground">{label}</span>
    </label>
  )
);

FeatureOptionRow.displayName = "FeatureOptionRow";

export default function FiltersPanel({
  open = true,
  appliedFilters,
  onApply,
  onClose,
  className,
}: Props) {
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    Object.keys(FEATURE_CATEGORIES).forEach((key) => {
      initial[key] = false;
    });
    return initial;
  });

  const [tempFilters, setTempFilters] = useState<Set<string>>(
    () => new Set(appliedFilters)
  );

  useEffect(() => {
    if (!open) return;
    setTempFilters(new Set(appliedFilters));
  }, [open, appliedFilters]);

  const sectionSelections = useMemo(() => {
    const result = { ...EMPTY_SECTION_SELECTIONS };
    tempFilters.forEach((key) => {
      const sectionKey = FEATURE_TO_SECTION[key];
      if (!sectionKey) return;
      result[sectionKey] = (result[sectionKey] ?? 0) + 1;
    });
    return result;
  }, [tempFilters]);

  const handleTempToggle = useCallback((key: string) => {
    setTempFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleSection = useCallback(
    (key: string) =>
      setExpandedSections((prev) => ({
        ...prev,
        [key]: !(prev?.[key] ?? true),
      })),
    []
  );

  return (
    <div
      className={cn(
        "h-full rounded-3xl border border-border/30 bg-background/95",
        "supports-[backdrop-filter]:backdrop-blur-sm",
        "overflow-hidden flex flex-col",
        className
      )}
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/20">
        <div className="flex items-center gap-2">
          <Filter className="w-6 h-6 text-sky-400" aria-hidden="true" />
          <h2 className="text-base font-semibold text-foreground">Filters</h2>
          {appliedFilters.size > 0 && (
            <span className="text-xs font-medium bg-sky-400 text-white rounded-full px-2 py-1">
              {appliedFilters.size}
            </span>
          )}
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-highlight-5 transition"
            aria-label="Close filters"
          >
            <X className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto pl-5 pr-2 py-4 space-y-4"
        style={{
          WebkitOverflowScrolling: "touch",
          scrollbarGutter: "stable",
        }}
      >
        {FEATURE_SECTIONS.map((section) => {
          const catKey = section.key;
          const label = section.label;
          const selectedCount = sectionSelections[catKey] ?? 0;
          const isOpen = expandedSections[catKey] ?? true;
          return (
            <section key={catKey} aria-labelledby={`cat-${catKey}`}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`filters-cat-${catKey}`}
                onClick={() => toggleSection(catKey)}
                className="flex w-full items-center justify-between gap-2 mb-2 bg-highlight-5 rounded-2xl px-2 py-2 hover:bg-highlight-4 transition"
              >
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 flex items-center justify-center">
                    {getSectionIcon(label)}
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <h3
                      id={`cat-${catKey}`}
                      className="text-base font-semibold text-foreground leading-tight"
                    >
                      {label}
                    </h3>
                    {selectedCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {selectedCount} selected
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-1 rounded-full bg-background/60 text-muted-foreground">
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="w-4 h-4" aria-hidden="true" />
                  )}
                </div>
              </button>

              <div
                id={`filters-cat-${catKey}`}
                className={cn(
                  "overflow-hidden transition-[max-height,opacity] duration-150 ease-in-out",
                  isOpen ? "max-h-[700px] opacity-100" : "max-h-0 opacity-0"
                )}
              >
                <div className="grid grid-cols-1 gap-1">
                  {section.features.map((feature) => (
                    <FeatureOptionRow
                      key={feature.key}
                      checked={tempFilters.has(feature.key)}
                      label={feature.label}
                      featureKey={feature.key}
                      onToggle={handleTempToggle}
                    />
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <div className="border-t border-border/20 px-5 py-3 bg-background/95 backdrop-blur-sm flex justify-between items-center gap-3">
        <button
          type="button"
          onClick={() => {
            const cleared = new Set<string>();
            setTempFilters(cleared);
            onApply(cleared);
          }}
          disabled={tempFilters.size === 0}
          className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition",
            tempFilters.size > 0
              ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 hover:bg-red-100/60"
              : "text-muted-foreground opacity-60 cursor-not-allowed"
          )}
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
          Clear Filters
        </button>

        <button
          type="button"
          onClick={() => {
            onApply(new Set(tempFilters));
            onClose?.();
          }}
          className="flex items-center gap-2 px-5 py-1.5 rounded-full text-sm font-semibold text-white bg-sky-400 hover:bg-sky-600 dark:bg-sky-400 dark:hover:bg-sky-300 transition"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}
