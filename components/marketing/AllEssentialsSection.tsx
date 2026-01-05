import Image from "next/image";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import {
  CalendarClock,
  Compass,
  Droplet,
  Gauge,
  ShieldCheck,
  Timer,
  Waves,
  Wind,
} from "lucide-react";
import InViewOnce from "@/components/marketing/InViewOnce";
import styles from "@/components/marketing/AllEssentialsSection.module.css";

function InputNode({
  icon: Icon,
  label,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
}) {
  return (
    <div className={styles.inputNode}>
      <span className={styles.inputIcon} aria-hidden="true">
        <Icon className="h-4 w-4" />
      </span>
      <div className={styles.inputText}>
        <div className={styles.inputValue}>{label}</div>
      </div>
    </div>
  );
}

function ProviderBadge({
  name,
  detail,
  href,
  logoSrc,
  monogram,
}: {
  name: string;
  detail: string;
  href: string;
  logoSrc?: string;
  monogram?: string;
}) {
  const content = (
    <span className={styles.providerBadge} title={`${name} — ${detail}`}>
      <span className={styles.providerIcon} aria-hidden="true">
        {logoSrc ? (
          <Image
            src={logoSrc}
            alt=""
            width={22}
            height={22}
            className={[
              "h-[22px] w-[22px] rounded-full object-contain",
              styles.providerLogo,
            ].join(" ")}
          />
        ) : (
          <span className="text-[12px] font-bold tracking-wider text-foreground/70">
            {(monogram ?? name.slice(0, 1)).toUpperCase()}
          </span>
        )}
      </span>
      <span className={styles.providerText}>
        <span className={styles.providerName}>{name}</span>
        <span className={styles.providerHint}>{detail}</span>
      </span>
    </span>
  );

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`Learn more about ${name}`}
      className="rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {content}
    </a>
  );
}

function EssentialsItem({
  icon: Icon,
  label,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
}) {
  return (
    <div className={styles.item}>
      <span className={styles.itemIcon} aria-hidden="true">
        <Icon className="h-4 w-4" />
      </span>
      <span className={styles.itemLabel}>{label}</span>
    </div>
  );
}

function TrustPoint({
  icon: Icon,
  title,
  text,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  text: string;
}) {
  return (
    <div className={styles.trustPoint}>
      <span className={styles.itemIcon} aria-hidden="true">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <div className={styles.trustTitle}>{title}</div>
        <div className={styles.trustText}>{text}</div>
      </div>
    </div>
  );
}

export default function AllEssentialsSection() {
  return (
    <section
      id="why"
      aria-labelledby="essentials-title"
      className="mx-auto max-w-3xl xl:max-w-7xl px-4 sm:px-6 py-16 sm:py-20 scroll-mt-28"
    >
      <header className="mx-auto max-w-3xl text-center">
        <h2
          id="essentials-title"
          className="text-balance text-foreground text-4xl sm:text-5xl font-semibold tracking-tight"
        >
          All the essentials
        </h2>
        <p className="mt-2 text-pretty text-muted-foreground text-lg">
          Trusted sources, organized for fast coastal planning.
        </p>
      </header>

      <div
        data-essentials-root
        data-inview="false"
        className={[
          styles.root,
          "relative mt-10 overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-b from-foreground/[0.035] to-foreground/[0.015] p-5 shadow-sm sm:p-8",
        ].join(" ")}
      >
        <InViewOnce rootAttr="data-essentials-root" />

        <div
          className={[styles.visual, styles.reveal].join(" ")}
          style={{ ["--delay" as any]: "40ms" }}
          role="img"
          aria-label="A session planning snapshot showing essentials, timing, and direction cues"
        >
          <div className={styles.visualBackdrop} aria-hidden="true" />

          <div className={styles.window}>
            <div className={styles.windowBar}>
              <div className={styles.dots} aria-hidden="true">
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </div>
              <div className={styles.windowTitle}>
                Session planning snapshot
              </div>
              <div className={styles.tag}>Today</div>
            </div>

            <div className={styles.snapshot}>
              <div className={styles.shine} aria-hidden="true" />
              <div className={styles.diagram} aria-label="Essentials flow">
                <div className={[styles.node, styles.nodeInputs].join(" ")}>
                  <div className={styles.nodeTitle}>Essentials</div>
                  <div className={styles.inputsGrid} aria-label="Inputs">
                    <InputNode icon={Wind} label="Wind" />
                    <InputNode icon={Droplet} label="Tide" />
                    <InputNode icon={Compass} label="Swell" />
                    <InputNode icon={Waves} label="Surf" />
                  </div>
                </div>

                <div className={styles.connector} aria-hidden="true" />

                <div className={[styles.node, styles.nodeTime].join(" ")}>
                  <div className={styles.nodeTitle}>Time</div>
                  <div className={styles.timeRail} aria-label="Time rail">
                    <div className={styles.track} aria-hidden="true">
                      <div className={styles.ticks}>
                        {Array.from({ length: 12 }).map((_, idx) => (
                          <span key={idx} className={styles.tick} />
                        ))}
                      </div>
                      <div className={styles.cursor} aria-hidden="true">
                        <span className={styles.cursorLine} />
                        <span className={styles.cursorLabel}>
                          <span className={styles.cursorT1}>6 AM</span>
                          <span className={styles.cursorT2}>12 PM</span>
                          <span className={styles.cursorT3}>6 PM</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.connector} aria-hidden="true" />

                <div className={[styles.node, styles.nodeRing].join(" ")}>
                  <div className={styles.nodeTitle}>Directions</div>
                  <div className={styles.ringWrap} aria-label="Direction ring">
                    <div className={styles.ring} aria-hidden="true">
                      <div className={styles.ringCenter}>NW</div>
                      <div className={styles.ringMotion}>
                        <div className={styles.ringArc} />
                        <div className={styles.ringArrow} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.connector} aria-hidden="true" />

                <div className={[styles.node, styles.nodePlan].join(" ")}>
                  <div className={styles.nodeTitle}>Plan</div>
                  <div className={styles.planStack}>
                    <div className={styles.planRow}>
                      <div className={styles.planText}>
                        Pick your best window.
                      </div>
                    </div>
                    <div className={styles.planMini} aria-hidden="true">
                      <span
                        className={[styles.planSeg, styles.planSegBad].join(
                          " "
                        )}
                      />
                      <span
                        className={[styles.planSeg, styles.planSegOk].join(" ")}
                      />
                      <span
                        className={[
                          styles.planSeg,
                          styles.planSegGood,
                          styles.planSegActive,
                        ].join(" ")}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={[styles.contentGrid, "mt-8"].join(" ")}>
          <div
            className={[styles.groupPanel, styles.reveal].join(" ")}
            style={{ ["--delay" as any]: "220ms" }}
          >
            <div className={styles.groupTitle}>What you get</div>
            <div className={styles.itemsGrid} aria-label="What you get">
              <EssentialsItem icon={Wind} label="Wind & direction" />
              <EssentialsItem icon={Compass} label="Swell direction" />
              <EssentialsItem icon={Droplet} label="Tide" />
              <EssentialsItem icon={Timer} label="Period" />
              <EssentialsItem icon={CalendarClock} label="By the hour" />
              <EssentialsItem icon={Gauge} label="Conditions summary" />
            </div>

            <div
              className={[styles.reveal, styles.providerBlock].join(" ")}
              style={{ ["--delay" as any]: "260ms" }}
            >
              <div className={styles.providerLabel}>
                Powered by public data from
              </div>
              <div className={styles.providers} aria-label="Providers">
                <ProviderBadge
                  name="NOAA"
                  detail="Marine"
                  href="https://www.noaa.gov/"
                  logoSrc="/noaa.png"
                />
                <ProviderBadge
                  name="NDBC"
                  detail="Buoys"
                  href="https://www.ndbc.noaa.gov/"
                  monogram="N"
                />
              </div>
            </div>
          </div>

          <div
            className={[styles.groupPanel, styles.reveal].join(" ")}
            style={{ ["--delay" as any]: "280ms" }}
          >
            <div className={styles.groupTitle}>Reliable by design</div>
            <div className={styles.trustList} aria-label="Why it's trustworthy">
              <TrustPoint
                icon={ShieldCheck}
                title="Public sources"
                text="Sourced from NOAA/NDBC buoys and tide stations."
              />
              <TrustPoint
                icon={Gauge}
                title="Built for scanning"
                text="Clear cues like rings and time rails help you make quick calls."
              />
              <TrustPoint
                icon={Waves}
                title="Surf-first context"
                text="Designed around swell, wind, tide, and timing — not generic weather."
              />
            </div>

            <div
              className={[
                styles.reveal,
                "mt-auto flex flex-wrap justify-center gap-3",
              ].join(" ")}
              style={{ ["--delay" as any]: "340ms" }}
            >
              <Link
                href="/overview"
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-sm transition hover:opacity-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none"
              >
                See your forecast
              </Link>
              <Link
                href="/beaches"
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-4 py-2.5 text-sm font-medium text-foreground/90 shadow-xs transition hover:bg-background/60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none"
              >
                Explore beaches
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
