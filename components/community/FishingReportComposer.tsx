"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSessionContext, useSupabaseClient } from "@supabase/auth-helpers-react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock3,
  Droplets,
  Fish,
  Globe2,
  Loader2,
  LockKeyhole,
  MapPin,
  Shield,
  Thermometer,
  Waves,
  Wind,
  X,
} from "lucide-react";

import {
  OverviewCard,
  OverviewCardHeader,
  OverviewPill,
} from "@/components/general/overview/OverviewPrimitives";
import { Button } from "@/components/ui/button";
import { acquireInteractionLock } from "@/lib/uiInteractionLock";
import { cn } from "@/lib/utils";
import {
  ACCESS_STATUS_VALUES,
  BITE_ACTIVITY_VALUES,
  HAZARD_LEVEL_VALUES,
  PARKING_STATUS_VALUES,
  WATER_CLARITY_VALUES,
} from "@/lib/community/constants";
import type { FishingFeedItem, FishingRegionKey } from "@/lib/community/fishingIntelligenceMock";
import { FISHING_METHOD_LABELS, FISHING_SPECIES_LABELS } from "@/lib/community/fishingIntelligenceMock";
import {
  buildFishingFeedPreviewItem,
  buildFishingReportPayload,
  getInitialFishingComposerState,
  getUploadExtension,
  getVisibilityOptionsForReport,
  parseFishingComposerDraft,
  serializeFishingComposerDraft,
  shouldAddFishingReportToPublicFeed,
  stripImageFromFishingComposerState,
  type FishingAccessStatusValue,
  type FishingBiteActivityValue,
  type FishingComposerReportType,
  type FishingComposerState,
  type FishingHazardLevelValue,
  type FishingParkingStatusValue,
  type FishingWaterClarityValue,
  validateFishingComposerImage,
} from "@/lib/community/fishingReportComposer";

type RegionOption = {
  region: FishingRegionKey;
  label: string;
};

type UploadPrepareResponse = {
  success: boolean;
  data?: {
    bucket: string;
    objectPath: string;
    token: string;
  };
  error?: string;
};

type CreateReportResponse = {
  success: boolean;
  data?: {
    id?: string;
  };
  error?: string;
};

type SubmitNotice =
  | {
      tone: "success" | "error" | "info";
      text: string;
    }
  | null;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beachId: string;
  beachName?: string;
  regionalSignals: readonly RegionOption[];
  onPublicCreated: (item: FishingFeedItem) => void;
};

const speciesChoiceMeta: Record<
  keyof typeof FISHING_SPECIES_LABELS,
  { blurb: string; toneClass: string }
> = {
  halibut: {
    blurb: "Sand flats and trough edges",
    toneClass: "bg-emerald-500/15 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
  },
  corbina: {
    blurb: "Beach wash and light surf",
    toneClass: "bg-amber-500/15 text-amber-700 ring-amber-500/20 dark:text-amber-300",
  },
  calico_bass: {
    blurb: "Structure and kelp edges",
    toneClass: "bg-rose-500/15 text-rose-700 ring-rose-500/20 dark:text-rose-300",
  },
  perch: {
    blurb: "Nearshore pockets and foam",
    toneClass: "bg-violet-500/15 text-violet-700 ring-violet-500/20 dark:text-violet-300",
  },
};

const inputClassName =
  "h-11 w-full rounded-xl border border-border/25 bg-foreground/[0.04] px-3 text-sm text-foreground outline-none transition-colors focus:border-foreground/20 focus:ring-2 focus:ring-ring/30";
const textareaClassName =
  "min-h-[112px] w-full rounded-xl border border-border/25 bg-foreground/[0.04] px-3 py-3 text-sm text-foreground outline-none transition-colors focus:border-foreground/20 focus:ring-2 focus:ring-ring/30 resize-none";

const reportTypeMeta: Record<
  FishingComposerReportType,
  { label: string; icon: React.ComponentType<{ className?: string }>; blurb: string }
> = {
  catch_report: {
    label: "Catch report",
    icon: Fish,
    blurb: "Species, method, and outcome",
  },
  conditions_report: {
    label: "Conditions",
    icon: Droplets,
    blurb: "Clarity and bite read",
  },
  access_report: {
    label: "Access",
    icon: AlertTriangle,
    blurb: "Parking, closures, and hazards",
  },
};

const composerSteps = [
  {
    label: "Report",
    title: "What are you reporting?",
    description: "Choose the report type and the place/time context.",
  },
  {
    label: "Details",
    title: "Add the useful details",
    description: "Fill only the fields that matter for this report.",
  },
  {
    label: "Review",
    title: "Review and save",
    description: "Confirm privacy, attached context, and what will be saved.",
  },
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const prettyValue = (value: string) =>
  value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const formatOccurredAt = (occurredAt: string) => {
  const date = new Date(occurredAt);
  if (Number.isNaN(date.getTime())) return "Now";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const measureImage = (file: File) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      URL.revokeObjectURL(objectUrl);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read the selected image."));
    };

    image.src = objectUrl;
  });

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
}) {
  return (
    <label className="space-y-1.5 text-sm">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={inputClassName}
      />
    </label>
  );
}

function ChoiceChips<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-full border px-3 py-2 text-sm font-medium transition-colors",
            value === option.value
              ? "border-sky-500/25 bg-sky-500/12 text-sky-700 dark:text-sky-300"
              : "border-border/25 bg-foreground/[0.03] text-muted-foreground hover:bg-foreground/[0.05]",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ChoiceCards<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: ReadonlyArray<{
    value: T;
    label: string;
    icon?: React.ReactNode;
    blurb?: string;
  }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-[18px] border px-4 py-3 text-left transition-colors",
              active
                ? "border-sky-500/25 bg-sky-500/10"
                : "border-border/20 bg-background/45 hover:bg-foreground/[0.04]",
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-2xl ring-1",
                  active
                    ? "bg-sky-500/15 text-sky-700 ring-sky-500/20 dark:text-sky-300"
                    : "bg-foreground/[0.05] text-foreground/75 ring-border/25",
                )}
              >
                {option.icon ?? <Fish className="h-4.5 w-4.5" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {option.label}
                </p>
                {option.blurb ? (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {option.blurb}
                  </p>
                ) : null}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ComposerPanel({
  title,
  icon,
  children,
  className,
  headerAside,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerAside?: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-[20px] border border-border/20 bg-foreground/[0.03] p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="grid size-8 place-items-center rounded-full bg-foreground/5 text-foreground/80 ring-1 ring-border/25">
            {icon}
          </span>
          {title}
        </div>
        {headerAside ? <div className="shrink-0">{headerAside}</div> : null}
      </div>
      {children}
    </div>
  );
}

function NoticePill({ notice }: { notice: Exclude<SubmitNotice, null> }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm",
        notice.tone === "success"
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : notice.tone === "info"
            ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
            : "bg-rose-500/10 text-rose-700 dark:text-rose-300",
      )}
    >
      {notice.tone === "success" ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : notice.tone === "info" ? (
        <Shield className="h-4 w-4" />
      ) : (
        <AlertTriangle className="h-4 w-4" />
      )}
      {notice.text}
    </div>
  );
}

function ReadOnlySummaryPanel({
  title,
  icon,
  items,
  note,
}: {
  title: string;
  icon: React.ReactNode;
  items: ReadonlyArray<{
    icon: React.ReactNode;
    label: string;
    detail: string;
  }>;
  note?: string;
}) {
  return (
    <ComposerPanel
      title={title}
      icon={icon}
      className="border-border/24 bg-foreground/[0.035]"
      headerAside={
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Read-only
        </span>
      }
    >
      <div className="grid gap-2.5 md:grid-cols-2">
        {items.map((item) => (
          <div
            key={`${item.label}:${item.detail}`}
            className="flex items-start gap-3 rounded-[16px] border border-border/28 bg-background px-3.5 py-3"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground/[0.06] text-foreground/80 ring-1 ring-border/30">
              {item.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                {item.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
      {note ? (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{note}</p>
      ) : null}
    </ComposerPanel>
  );
}

export function FishingReportComposer({
  open,
  onOpenChange,
  beachId,
  beachName,
  regionalSignals,
  onPublicCreated,
}: Props) {
  const { session, isLoading: sessionLoading } = useSessionContext();
  const supabase = useSupabaseClient();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const defaultRegion = regionalSignals[0]?.region ?? "dana_point";
  const [mounted, setMounted] = React.useState(false);
  const [state, setState] = React.useState<FishingComposerState>(() =>
    getInitialFishingComposerState(defaultRegion),
  );
  const [notice, setNotice] = React.useState<SubmitNotice>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [draftRestored, setDraftRestored] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [reviewConfirmed, setReviewConfirmed] = React.useState(false);
  const scrollAreaRef = React.useRef<HTMLDivElement | null>(null);

  const draftStorageKey = React.useMemo(
    () => `waves-and-waders.fishing-report-draft.${beachId}`,
    [beachId],
  );
  const search = searchParams.toString();
  const loginHref = `/login?next=${encodeURIComponent(
    search ? `${pathname}?${search}` : pathname,
  )}`;

  const selectedRegionLabel =
    regionalSignals.find((region) => region.region === state.region)?.label ??
    regionalSignals[0]?.label ??
    "Regional waters";
  const visibilityOptions = React.useMemo(
    () => getVisibilityOptionsForReport(state.reportType),
    [state.reportType],
  );
  const activeReportMeta = reportTypeMeta[state.reportType];
  const activeStep = composerSteps[currentStep];
  const lastStepIndex = composerSteps.length - 1;
  const progressPercent = Math.round(
    ((currentStep + 1) / composerSteps.length) * 100,
  );
  const imagePreviewUrl = React.useMemo(
    () => (state.imageFile ? URL.createObjectURL(state.imageFile) : null),
    [state.imageFile],
  );

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  React.useEffect(() => {
    if (!open) return;

    const restored = parseFishingComposerDraft(
      typeof window !== "undefined"
        ? window.localStorage.getItem(draftStorageKey)
        : null,
      defaultRegion,
    );

    const initialDraft = JSON.stringify(
      stripImageFromFishingComposerState(getInitialFishingComposerState(defaultRegion)),
    );
    const restoredDraft = restored
      ? JSON.stringify(stripImageFromFishingComposerState(restored))
      : null;

    if (restored && restoredDraft !== initialDraft) {
      setState(restored);
      setDraftRestored(true);
    } else {
      setState(getInitialFishingComposerState(defaultRegion));
      setDraftRestored(false);
    }
    setCurrentStep(0);
    setReviewConfirmed(false);
    setNotice(null);
  }, [defaultRegion, draftStorageKey, open]);

  React.useEffect(() => {
    if (!open || typeof window === "undefined") return;
    window.localStorage.setItem(
      draftStorageKey,
      serializeFishingComposerDraft(state),
    );
  }, [draftStorageKey, open, state]);

  React.useEffect(() => {
    if (!open) return;
    const releaseInteractionLock = acquireInteractionLock({ lockScroll: true });
    const isWithinComposerScroll = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      Boolean(target.closest("[data-fishing-composer-scroll='true']"));
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onOpenChange(false);
        return;
      }
      const scrollKeys = [
        "ArrowUp",
        "ArrowDown",
        "PageUp",
        "PageDown",
        "Home",
        "End",
        " ",
      ];
      if (!scrollKeys.includes(event.key)) return;

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isEditable =
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        target?.isContentEditable;
      if (!isEditable && !isWithinComposerScroll(target)) {
        event.preventDefault();
      }
    };
    const blockBackgroundScroll = (event: Event) => {
      if (isWithinComposerScroll(event.target)) return;
      if (event.cancelable) {
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("wheel", blockBackgroundScroll, { passive: false });
    document.addEventListener("touchmove", blockBackgroundScroll, { passive: false });

    return () => {
      releaseInteractionLock();
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("wheel", blockBackgroundScroll);
      document.removeEventListener("touchmove", blockBackgroundScroll);
    };
  }, [isSubmitting, onOpenChange, open]);

  const setReportType = React.useCallback(
    (reportType: FishingComposerReportType) => {
      setState((current) => ({
        ...current,
        reportType,
        visibilityTier:
          reportType === "catch_report" ? "private" : "public_region",
      }));
      setNotice(null);
      setReviewConfirmed(false);
    },
    [],
  );

  const resetDraft = React.useCallback(() => {
    const next = getInitialFishingComposerState(defaultRegion);
    setState(next);
    setDraftRestored(false);
    setCurrentStep(0);
    setReviewConfirmed(false);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(draftStorageKey);
    }
  }, [defaultRegion, draftStorageKey]);

  const handleImageChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextFile = event.target.files?.[0] ?? null;
      if (!nextFile) return;

      const imageError = validateFishingComposerImage({
        name: nextFile.name,
        type: nextFile.type,
        size: nextFile.size,
      });

      if (imageError) {
        setNotice({ tone: "error", text: imageError });
        return;
      }

      setNotice(null);
      setState((current) => ({ ...current, imageFile: nextFile }));
    },
    [],
  );

  const handleClose = React.useCallback(() => {
    if (isSubmitting) return;
    onOpenChange(false);
  }, [isSubmitting, onOpenChange]);

  const goToNextStep = React.useCallback(() => {
    setNotice(null);
    setCurrentStep((current) => Math.min(current + 1, lastStepIndex));
  }, [lastStepIndex]);

  const goToPreviousStep = React.useCallback(() => {
    setNotice(null);
    setCurrentStep((current) => Math.max(current - 1, 0));
  }, []);

  React.useEffect(() => {
    if (currentStep !== lastStepIndex) {
      setReviewConfirmed(false);
    }
  }, [currentStep, lastStepIndex]);

  React.useEffect(() => {
    if (!open) return;
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = 0;
    }
  }, [currentStep, open]);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setNotice(null);

      if (currentStep !== lastStepIndex) {
        return;
      }

      if (!reviewConfirmed) {
        setNotice({
          tone: "info",
          text: "Review the details and confirm the privacy setting before posting.",
        });
        return;
      }

      if (!session) {
        setNotice({ tone: "error", text: "Sign in to save fishing reports." });
        return;
      }

      if (state.imageFile) {
        const imageError = validateFishingComposerImage({
          name: state.imageFile.name,
          type: state.imageFile.type,
          size: state.imageFile.size,
        });
        if (imageError) {
          setNotice({ tone: "error", text: imageError });
          return;
        }
      }

      setIsSubmitting(true);

      try {
        const payload = buildFishingReportPayload({
          state: stripImageFromFishingComposerState(state),
          beachId,
          beachName,
          regionLabel: selectedRegionLabel,
        });

        const createResponse = await fetch("/api/community/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const createJson = (await createResponse.json()) as unknown;
        if (!createResponse.ok) {
          const errorMessage =
            isRecord(createJson) && typeof createJson.error === "string"
              ? createJson.error
              : "Could not save this report.";
          throw new Error(errorMessage);
        }

        const createData: CreateReportResponse = isRecord(createJson)
          ? {
              success: Boolean(createJson.success),
              data: isRecord(createJson.data)
                ? {
                    id:
                      typeof createJson.data.id === "string"
                        ? createJson.data.id
                        : undefined,
                  }
                : undefined,
              error:
                typeof createJson.error === "string" ? createJson.error : undefined,
            }
          : { success: false, error: "Could not save this report." };

        const reportId = createData.data?.id;
        if (!reportId) {
          throw new Error("Report saved, but the server response was incomplete.");
        }

        if (state.imageFile) {
          const extension = getUploadExtension(state.imageFile.name);
          if (!extension) {
            throw new Error("Image type is not supported.");
          }

          const prepareResponse = await fetch("/api/community/uploads/prepare", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reportId,
              mimeType: state.imageFile.type,
              extension,
              byteSize: state.imageFile.size,
            }),
          });

          const prepareJson = (await prepareResponse.json()) as UploadPrepareResponse;
          if (!prepareResponse.ok || !prepareJson.data) {
            throw new Error(prepareJson.error ?? "Could not prepare image upload.");
          }

          const uploadResult = await supabase.storage
            .from(prepareJson.data.bucket)
            .uploadToSignedUrl(
              prepareJson.data.objectPath,
              prepareJson.data.token,
              state.imageFile,
              {
                cacheControl: "3600",
                contentType: state.imageFile.type,
              },
            );

          if (uploadResult.error) {
            throw new Error("Image upload failed.");
          }

          const dimensions = await measureImage(state.imageFile);
          const finalizeResponse = await fetch("/api/community/uploads/finalize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reportId,
              objectPath: prepareJson.data.objectPath,
              mimeType: state.imageFile.type,
              byteSize: state.imageFile.size,
              width: dimensions.width,
              height: dimensions.height,
            }),
          });

          if (!finalizeResponse.ok) {
            const finalizeJson = (await finalizeResponse.json()) as unknown;
            const message =
              isRecord(finalizeJson) && typeof finalizeJson.error === "string"
                ? finalizeJson.error
                : "Report saved, but the image could not be finalized.";
            throw new Error(message);
          }
        }

        if (shouldAddFishingReportToPublicFeed(state)) {
          const mediaSrc = state.imageFile ? URL.createObjectURL(state.imageFile) : undefined;
          onPublicCreated(
            buildFishingFeedPreviewItem({
              state: stripImageFromFishingComposerState(state),
              regionLabel: selectedRegionLabel,
              mediaSrc,
            }),
          );
        }

        if (typeof window !== "undefined") {
          window.localStorage.removeItem(draftStorageKey);
        }
        setNotice({
          tone: "success",
          text:
            state.visibilityTier === "public_region"
              ? "Report saved to regional signal."
              : "Report saved to your fishing logbook.",
        });
        resetDraft();
        onOpenChange(false);
      } catch (error) {
        setNotice({
          tone: "error",
          text:
            error instanceof Error
              ? error.message
              : "Could not save this report. Please try again.",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      beachId,
      beachName,
      currentStep,
      draftStorageKey,
      lastStepIndex,
      onOpenChange,
      onPublicCreated,
      resetDraft,
      selectedRegionLabel,
      session,
      state,
      supabase.storage,
      reviewConfirmed,
    ],
  );

  const renderReportStep = () => (
    <section className="space-y-4">
      <ComposerPanel
        title="Report type"
        icon={<activeReportMeta.icon className="h-4 w-4" />}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Pick one report type.</p>
          <OverviewPill className="border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300">
            Required
          </OverviewPill>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {(Object.keys(reportTypeMeta) as FishingComposerReportType[]).map(
            (reportType) => {
              const meta = reportTypeMeta[reportType];
              const Icon = meta.icon;
              const active = state.reportType === reportType;

              return (
                <button
                  key={reportType}
                  type="button"
                  onClick={() => setReportType(reportType)}
                  className={cn(
                    "rounded-[20px] border px-4 py-4 text-left transition-colors",
                    active
                      ? "border-sky-500/25 bg-sky-500/10"
                      : "border-border/20 bg-background/45 hover:bg-foreground/[0.04]",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "grid size-10 place-items-center rounded-2xl ring-1",
                        active
                          ? "bg-sky-500/15 text-sky-700 ring-sky-500/20 dark:text-sky-300"
                          : "bg-foreground/[0.05] text-foreground/75 ring-border/25",
                      )}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {meta.label}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {meta.blurb}
                      </p>
                    </div>
                  </div>
                </button>
              );
            },
          )}
        </div>
      </ComposerPanel>

      <ComposerPanel title="Where and when" icon={<Clock3 className="h-4 w-4" />}>
        <div className="grid gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Region
              </p>
              <OverviewPill className="border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300">
                Required
              </OverviewPill>
            </div>
            <ChoiceCards
              value={state.region}
              onChange={(value) =>
                setState((current) => ({
                  ...current,
                  region: value as FishingRegionKey,
                }))
              }
              options={regionalSignals.map((region) => ({
                value: region.region,
                label: region.label,
                icon: <MapPin className="h-4.5 w-4.5" />,
              }))}
            />
          </div>
          <TextField
            label="Time"
            type="datetime-local"
            value={state.occurredAt}
            onChange={(value) =>
              setState((current) => ({ ...current, occurredAt: value }))
            }
          />
        </div>
      </ComposerPanel>

    </section>
  );

  const renderDetailsStep = () => (
    <section className="space-y-4">
      <ComposerPanel
        title="Main details"
        icon={<activeReportMeta.icon className="h-4 w-4" />}
      >
        <div className="space-y-4">
          {state.reportType === "catch_report" ? (
            <>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Species
                </p>
                <ChoiceCards
                  value={state.catch.species}
                  onChange={(value) =>
                    setState((current) => ({
                      ...current,
                      catch: { ...current.catch, species: value },
                    }))
                  }
                  options={(Object.entries(FISHING_SPECIES_LABELS) as Array<
                    [keyof typeof FISHING_SPECIES_LABELS, string]
                  >).map(([value, label]) => ({
                    value,
                    label,
                    blurb: speciesChoiceMeta[value].blurb,
                    icon: (
                      <div
                        className={cn(
                          "grid size-8 place-items-center rounded-xl ring-1",
                          speciesChoiceMeta[value].toneClass,
                        )}
                      >
                        <Fish className="h-4 w-4" />
                      </div>
                    ),
                  }))}
                />
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Method
                </p>
                <ChoiceChips
                  value={state.catch.method}
                  onChange={(value) =>
                    setState((current) => ({
                      ...current,
                      catch: { ...current.catch, method: value },
                    }))
                  }
                  options={(
                    Object.entries(FISHING_METHOD_LABELS) as Array<
                      [keyof typeof FISHING_METHOD_LABELS, string]
                    >
                  ).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Outcome
                </p>
                <ChoiceChips
                  value={state.catch.outcome}
                  onChange={(value) =>
                    setState((current) => ({
                      ...current,
                      catch: { ...current.catch, outcome: value },
                    }))
                  }
                  options={[
                    { value: "released", label: "Released" },
                    { value: "kept", label: "Kept" },
                  ]}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  label="Length (optional)"
                  type="number"
                  placeholder="24"
                  value={state.catch.lengthValue}
                  onChange={(value) =>
                    setState((current) => ({
                      ...current,
                      catch: { ...current.catch, lengthValue: value },
                    }))
                  }
                />
                <TextField
                  label="Weight (optional)"
                  type="number"
                  placeholder="4.5"
                  value={state.catch.weightValue}
                  onChange={(value) =>
                    setState((current) => ({
                      ...current,
                      catch: { ...current.catch, weightValue: value },
                    }))
                  }
                />
              </div>
            </>
          ) : null}

          {state.reportType === "conditions_report" ? (
            <>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Water clarity
                </p>
                <ChoiceChips
                  value={state.conditions.waterClarity || ""}
                  onChange={(value) =>
                    setState((current) => ({
                      ...current,
                      conditions: {
                        ...current.conditions,
                        waterClarity: value as "" | FishingWaterClarityValue,
                      },
                    }))
                  }
                  options={[
                    { value: "", label: "Not sure" },
                    ...WATER_CLARITY_VALUES.map((value) => ({
                      value,
                      label: prettyValue(value),
                    })),
                  ]}
                />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Bite activity
                </p>
                <ChoiceChips
                  value={state.conditions.biteActivity || ""}
                  onChange={(value) =>
                    setState((current) => ({
                      ...current,
                      conditions: {
                        ...current.conditions,
                        biteActivity: value as "" | FishingBiteActivityValue,
                      },
                    }))
                  }
                  options={[
                    { value: "", label: "Not sure" },
                    ...BITE_ACTIVITY_VALUES.map((value) => ({
                      value,
                      label: prettyValue(value),
                    })),
                  ]}
                />
              </div>
            </>
          ) : null}

          {state.reportType === "access_report" ? (
            <>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Issue
                </p>
                <ChoiceChips
                  value={state.access.accessStatus}
                  onChange={(value) =>
                    setState((current) => ({
                      ...current,
                      access: { ...current.access, accessStatus: value },
                    }))
                  }
                  options={ACCESS_STATUS_VALUES.map((value) => ({
                    value,
                    label: prettyValue(value),
                  }))}
                />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Parking
                </p>
                <ChoiceChips
                  value={state.access.parkingStatus || ""}
                  onChange={(value) =>
                    setState((current) => ({
                      ...current,
                      access: {
                        ...current.access,
                        parkingStatus: value as "" | FishingParkingStatusValue,
                      },
                    }))
                  }
                  options={[
                    { value: "", label: "Not sure" },
                    ...PARKING_STATUS_VALUES.map((value) => ({
                      value,
                      label: prettyValue(value),
                    })),
                  ]}
                />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Hazard
                </p>
                <ChoiceChips
                  value={state.access.hazardLevel || ""}
                  onChange={(value) =>
                    setState((current) => ({
                      ...current,
                      access: {
                        ...current.access,
                        hazardLevel: value as "" | FishingHazardLevelValue,
                      },
                    }))
                  }
                  options={[
                    { value: "", label: "No hazard" },
                    ...HAZARD_LEVEL_VALUES.map((value) => ({
                      value,
                      label: prettyValue(value),
                    })),
                  ]}
                />
              </div>
            </>
          ) : null}
        </div>
      </ComposerPanel>

      <ComposerPanel
        title="Privacy"
        icon={<Shield className="h-4 w-4" />}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Choose who can see this report.</p>
          <OverviewPill className="border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300">
            Required
          </OverviewPill>
        </div>
        <div className="space-y-3">
          {visibilityOptions.map((option) => {
            const active = state.visibilityTier === option.value;
            const Icon =
              option.value === "private"
                ? LockKeyhole
                : option.value === "spot_name"
                  ? MapPin
                  : Globe2;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setState((current) => ({
                    ...current,
                    visibilityTier: option.value,
                  }))
                }
                className={cn(
                  "w-full rounded-[18px] border px-4 py-3 text-left transition-colors",
                  active
                    ? "border-sky-500/25 bg-sky-500/10"
                    : "border-border/20 bg-background/45 hover:bg-foreground/[0.04]",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 grid size-9 place-items-center rounded-full ring-1",
                      active
                        ? "bg-sky-500/15 text-sky-700 ring-sky-500/20 dark:text-sky-300"
                        : "bg-foreground/[0.05] text-foreground/70 ring-border/25",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {option.label}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Exact fishing coordinates stay private. Public fishing signal is always coarse.
        </p>
      </ComposerPanel>

      <ComposerPanel title="Photo" icon={<Camera className="h-4 w-4" />}>
        <label className="block cursor-pointer">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={handleImageChange}
          />
          <div className="overflow-hidden rounded-[20px] border border-dashed border-border/30 bg-foreground/[0.035]">
            {imagePreviewUrl ? (
              <div className="relative aspect-[16/9]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreviewUrl}
                  alt="Selected report preview"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="grid min-h-[200px] place-items-center px-4 py-6 text-center">
                <div className="space-y-3">
                  <div className="mx-auto grid size-12 place-items-center rounded-full bg-foreground/[0.06] text-foreground/70">
                    <Camera className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Add one image
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      JPG, PNG, or WEBP up to 5MB
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </label>
        {state.imageFile ? (
          <div className="mt-3 flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-muted-foreground">
              {state.imageFile.name}
            </span>
            <button
              type="button"
              onClick={() =>
                setState((current) => ({ ...current, imageFile: null }))
              }
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Remove
            </button>
          </div>
        ) : null}
      </ComposerPanel>

      <ComposerPanel title="Notes" icon={<Clock3 className="h-4 w-4" />}>
        <label className="space-y-1.5 text-sm">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Optional note
          </span>
          <textarea
            value={state.notes}
            onChange={(event) =>
              setState((current) => ({
                ...current,
                notes: event.target.value,
              }))
            }
            className={textareaClassName}
            placeholder="Keep it short and practical."
            maxLength={600}
          />
        </label>
      </ComposerPanel>

    </section>
  );

  const renderReviewStep = () => (
    <section className="space-y-4">
      <ComposerPanel
        title="Report summary"
        icon={<activeReportMeta.icon className="h-4 w-4" />}
      >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[18px] border border-border/20 bg-background/45 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Report
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {activeReportMeta.label}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeReportMeta.blurb}
              </p>
            </div>
            <div className="rounded-[18px] border border-border/20 bg-background/45 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Visibility
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {
                  visibilityOptions.find(
                    (option) => option.value === state.visibilityTier,
                  )?.label
                }
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {
                  visibilityOptions.find(
                    (option) => option.value === state.visibilityTier,
                  )?.description
                }
              </p>
            </div>
            <div className="rounded-[18px] border border-border/20 bg-background/45 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Region
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {selectedRegionLabel}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {beachName ?? "Current spot context"}
              </p>
            </div>
            <div className="rounded-[18px] border border-border/20 bg-background/45 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Time
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {formatOccurredAt(state.occurredAt)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Attached to this report
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {state.reportType === "catch_report" ? (
              <>
                <div className="rounded-[18px] border border-border/20 bg-background/45 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Species
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {FISHING_SPECIES_LABELS[state.catch.species]}
                  </p>
                </div>
                <div className="rounded-[18px] border border-border/20 bg-background/45 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Method
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {FISHING_METHOD_LABELS[state.catch.method]}
                  </p>
                </div>
              </>
            ) : null}

            {state.reportType === "conditions_report" ? (
              <>
                <div className="rounded-[18px] border border-border/20 bg-background/45 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Water clarity
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {state.conditions.waterClarity
                      ? prettyValue(state.conditions.waterClarity)
                      : "Not sure"}
                  </p>
                </div>
                <div className="rounded-[18px] border border-border/20 bg-background/45 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Bite activity
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {state.conditions.biteActivity
                      ? prettyValue(state.conditions.biteActivity)
                      : "Not sure"}
                  </p>
                </div>
              </>
            ) : null}

            {state.reportType === "access_report" ? (
              <>
                <div className="rounded-[18px] border border-border/20 bg-background/45 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Issue
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {prettyValue(state.access.accessStatus)}
                  </p>
                </div>
                <div className="rounded-[18px] border border-border/20 bg-background/45 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Parking / hazard
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {[
                      state.access.parkingStatus
                        ? prettyValue(state.access.parkingStatus)
                        : null,
                      state.access.hazardLevel
                        ? prettyValue(state.access.hazardLevel)
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" • ") || "No extra flags"}
                  </p>
                </div>
              </>
            ) : null}
          </div>

          {state.notes.trim() ? (
            <div className="mt-4 rounded-[18px] border border-border/20 bg-background/45 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Note
              </p>
              <p className="mt-1 text-sm text-foreground">{state.notes.trim()}</p>
            </div>
          ) : null}
      </ComposerPanel>

      {imagePreviewUrl ? (
        <ComposerPanel title="Media" icon={<Camera className="h-4 w-4" />}>
          <div className="overflow-hidden rounded-[18px] border border-border/20 bg-background/45">
            <div className="aspect-[16/10]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreviewUrl}
                alt="Selected report preview"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="px-4 py-3 text-sm text-muted-foreground">
              {state.imageFile?.name}
            </div>
          </div>
        </ComposerPanel>
      ) : null}

      <ReadOnlySummaryPanel
        title="Included on save"
        icon={<Waves className="h-4 w-4" />}
        note="Public fishing signal remains coarse even when these context values are attached."
        items={[
          {
            icon: <Waves className="h-4 w-4" />,
            label: "Tide and swell snapshot",
            detail: "Added when available from this page",
          },
          {
            icon: <Wind className="h-4 w-4" />,
            label: "Wind context",
            detail: "Attached from the page conditions",
          },
          {
            icon: <Thermometer className="h-4 w-4" />,
            label: "Water temperature snapshot",
            detail: "Saved with the report context",
          },
          {
            icon: <Droplets className="h-4 w-4" />,
            label: "Region or spot scope",
            detail: "Included with the saved report record",
          },
        ]}
      />

      <ComposerPanel
        title="Final check"
        icon={<Shield className="h-4 w-4" />}
        className="border-sky-500/15 bg-sky-500/[0.05]"
        headerAside={
          <OverviewPill className="border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300">
            Required
          </OverviewPill>
        }
      >
        <p className="text-sm font-semibold text-foreground">
          {
            visibilityOptions.find(
              (option) => option.value === state.visibilityTier,
            )?.label
          }
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {
            visibilityOptions.find(
              (option) => option.value === state.visibilityTier,
            )?.description
          }
        </p>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Exact fishing coordinates stay private. Public fishing signal stays coarse even when this report contributes to community intel.
        </p>
        <button
          type="button"
          onClick={() => setReviewConfirmed((current) => !current)}
          className={cn(
            "mt-4 flex w-full items-start gap-3 rounded-[18px] border px-4 py-3 text-left transition-colors",
            reviewConfirmed
              ? "border-sky-500/25 bg-sky-500/10"
              : "border-sky-500/20 bg-background/45 hover:bg-sky-500/[0.05]",
          )}
        >
          <div
            className={cn(
              "mt-0.5 grid size-9 shrink-0 place-items-center rounded-full ring-1",
              reviewConfirmed
                ? "bg-sky-500/15 text-sky-700 ring-sky-500/20 dark:text-sky-300"
                : "bg-foreground/[0.05] text-muted-foreground ring-border/25",
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              I reviewed the report details and visibility
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Confirm before this report is saved to your logbook or shared to the regional signal.
            </p>
          </div>
        </button>
        {!reviewConfirmed ? (
          <p className="mt-3 text-sm font-medium text-sky-700 dark:text-sky-300">
            Select this confirmation to enable Save report.
          </p>
        ) : null}
      </ComposerPanel>
    </section>
  );

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000006]">
      <button
        type="button"
        aria-label="Close report composer"
        className="absolute inset-0 bg-background/75 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="absolute inset-0 flex items-end justify-center p-0 @min-lg:p-6">
        <OverviewCard className="relative flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-none border-border/35 bg-background/95 shadow-2xl supports-[backdrop-filter]:bg-background/88 @min-lg:h-auto @min-lg:max-h-[calc(100vh-3rem)] @min-lg:rounded-[28px]">
          <header className="border-b border-border/15 px-4 py-4 @min-lg:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sky-500/12 text-sky-700 ring-1 ring-sky-500/20 dark:text-sky-300">
                  <Fish className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">
                      New fishing report
                    </h2>
                    {draftRestored ? (
                      <OverviewPill className="border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300">
                        Draft restored
                      </OverviewPill>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Structured catch, conditions, and access signal with privacy-first sharing.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={handleClose}
                aria-label="Close report composer"
              >
                <X className="h-4.5 w-4.5" />
              </Button>
            </div>
          </header>

          <div
            ref={scrollAreaRef}
            data-fishing-composer-scroll="true"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            {sessionLoading ? (
              <div className="flex min-h-[420px] items-center justify-center">
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading your fishing tools
                </div>
              </div>
            ) : !session ? (
              <div className="p-4 @min-lg:p-6">
                <OverviewCard>
                  <div className="space-y-4 px-5 py-5">
                    <OverviewCardHeader
                      title="Sign in to post fishing reports"
                      icon={<LockKeyhole className="h-4.5 w-4.5" />}
                    />
                    <div className="px-4 pb-5 text-sm text-muted-foreground">
                      Save private logbook entries, share coarse regional intel, and attach fishing context securely from your account.
                    </div>
                    <div className="px-4 pb-5">
                      <Button asChild className="rounded-full px-5">
                        <Link href={loginHref}>Sign in to continue</Link>
                      </Button>
                    </div>
                  </div>
                </OverviewCard>
              </div>
            ) : (
              <form
                id="fishing-report-composer-form"
                onSubmit={handleSubmit}
                className="p-4 md:p-6"
              >
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
                  <section className="rounded-[24px] border border-border/24 bg-foreground/[0.03] p-4 supports-[backdrop-filter]:bg-background/70 supports-[backdrop-filter]:backdrop-blur-md md:p-5">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Step {currentStep + 1} of {composerSteps.length} - {activeStep.label}
                          </p>
                          <h3 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                            {activeStep.title}
                          </h3>
                          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                            {activeStep.description}
                          </p>
                        </div>
                      </div>

                      <div className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
                        <div
                          className="h-full rounded-full bg-sky-500 transition-[width] duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>

                      <div className="grid gap-2 md:grid-cols-3">
                        {composerSteps.map((step, index) => {
                          const active = index === currentStep;
                          const complete = index < currentStep;

                          return (
                            <div
                              key={step.label}
                              className={cn(
                                "rounded-[16px] border px-3 py-2.5 transition-colors",
                                active
                                  ? "border-sky-500/22 bg-sky-500/[0.08]"
                                : complete
                                  ? "border-emerald-500/18 bg-emerald-500/[0.06]"
                                  : "border-border/18 bg-background/40",
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    "grid size-7 shrink-0 place-items-center rounded-full text-sm font-semibold ring-1",
                                    active
                                      ? "bg-sky-500/15 text-sky-700 ring-sky-500/25 dark:text-sky-300"
                                      : complete
                                        ? "bg-emerald-500/15 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300"
                                        : "bg-foreground/[0.05] text-muted-foreground ring-border/25",
                                  )}
                                >
                                  {complete ? (
                                    <CheckCircle2 className="h-4 w-4" />
                                  ) : (
                                    index + 1
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-foreground">
                                    {step.label}
                                  </p>
                                  <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                                    {active ? "Current step" : complete ? "Done" : "Up next"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                  {currentStep === 0 ? renderReportStep() : null}
                  {currentStep === 1 ? renderDetailsStep() : null}
                  {currentStep === 2 ? renderReviewStep() : null}
                </div>
              </form>
            )}
          </div>

          <footer className="border-t border-border/15 px-4 py-4 md:px-6">
            <div className="space-y-3">
              {notice ? (
                <div className="min-h-6">{<NoticePill notice={notice} />}</div>
              ) : currentStep === lastStepIndex && !reviewConfirmed ? (
                <div className="min-h-6">
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4 text-sky-500" />
                    Confirm the final check to enable saving.
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full border border-rose-500/20 bg-rose-500/8 text-rose-700 hover:bg-rose-500/12 hover:text-rose-800 dark:text-rose-300 dark:hover:text-rose-200"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <div className="flex items-center gap-2">
                  {currentStep > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="rounded-full"
                      onClick={goToPreviousStep}
                      disabled={isSubmitting}
                    >
                      Back
                    </Button>
                  ) : null}
                  {currentStep < lastStepIndex ? (
                    <Button
                      type="button"
                      className="rounded-full px-5"
                      onClick={goToNextStep}
                      disabled={isSubmitting || sessionLoading || !session}
                    >
                      Continue
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      form="fishing-report-composer-form"
                      className="rounded-full px-5"
                      disabled={
                        isSubmitting || sessionLoading || !session || !reviewConfirmed
                      }
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving
                        </>
                      ) : (
                        "Save report"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </footer>
        </OverviewCard>
      </div>
    </div>,
    document.body,
  );
}
