"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
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

type FeatureSection = {
  key: string;
  label: string;
  features: readonly string[];
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
  if (l.includes("activities")) return <Bike className="w-6 h-6 text-red-300" />;
  if (l.includes("trails") || l.includes("nature")) {
    return (
      <TreePine className="w-6 h-6 text-green-500 dark:text-green-400" />
    );
  }
  if (l.includes("beach")) {
    return <Waves className="w-6 h-6 text-cyan-400 dark:text-cyan-300" />;
  }
  if (l.includes("facilities") || l.includes("amenities")) {
    return (
      <Building2 className="w-6 h-6 text-gray-500 dark:text-gray-300" />
    );
  }
  if (l.includes("access") || l.includes("fees")) {
    return (
      <CreditCard className="w-6 h-6 text-purple-400 dark:text-purple-300" />
    );
  }
  return <Waves className="w-6 h-6 text-sky-300 opacity-70" />;
};

export default function FiltersPanel({
  open = true,
  appliedFilters,
  onApply,
  onClose,
  className,
}: Props) {
  const featureSections = useMemo<FeatureSection[]>(
    () =>
      Object.entries(FEATURE_CATEGORIES).map(([key, cat]) => ({
        key,
        label: (cat as any).label || key,
        features: (cat as any).features as readonly string[],
      })),
    []
  );

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
    const result: Record<string, number> = {};
    featureSections.forEach((section) => {
      result[section.key] = section.features.reduce(
        (count, key) => count + (tempFilters.has(key) ? 1 : 0),
        0
      );
    });
    return result;
  }, [featureSections, tempFilters]);

  const handleTempToggle = (key: string) => {
    setTempFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !(prev?.[key] ?? true),
    }));

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
        className="overflow-y-auto px-5 py-4 space-y-4"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {featureSections.map((section) => {
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

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={`filters-cat-${catKey}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.12, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 gap-1">
                      {section.features.map((key) => {
                        const checked = tempFilters.has(key);
                        const display = getFeatureDisplayName(key) || key;
                        return (
                          <label
                            key={key}
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
                              onChange={() => handleTempToggle(key)}
                              className="w-4 h-4 accent-sky-300 rounded-sm flex-shrink-0"
                            />
                            <span className="text-[13px] leading-tight text-foreground">
                              {display}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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

