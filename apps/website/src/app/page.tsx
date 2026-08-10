"use client";

import { ModeToggle } from "@/components/mode-toggle";
import { cn } from "@/lib/utils";
import {
  RiCheckboxCircleFill,
  RiCloseCircleFill,
  RiDatabase2Line,
  RiGlobalLine,
  RiMapPin2Line,
  RiPulseLine,
  RiRefreshLine,
  RiServerLine,
} from "@remixicon/react";
import {
  useHealthCheckQuery,
  useProvincesListQuery,
  useRegionsListQuery,
} from "@repo/store";

// Bento tile wrapper — shared card chrome for the dashboard grid below.
function BentoCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CardHeader({
  icon: Icon,
  title,
}: {
  icon: typeof RiServerLine;
  title: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
      <Icon className="size-4" />
      {title}
    </div>
  );
}

export default function Home() {
  const {
    data: health,
    isLoading: healthLoading,
    isError: healthError,
    refetch: refetchHealth,
  } = useHealthCheckQuery();
  const { data: regions, isLoading: regionsLoading } = useRegionsListQuery();
  const { data: provinces, isLoading: provincesLoading } =
    useProvincesListQuery({});

  const isUp = health?.results.status === "ok";

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Matchator — Server Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Showcase only — live status pulled from the backend API.
            </p>
          </div>
          <ModeToggle />
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Health status — spans 2 cols on large screens */}
          <BentoCard className="lg:col-span-2">
            <div className="flex items-center justify-between">
              <CardHeader icon={RiPulseLine} title="Backend health" />
              <button
                onClick={() => refetchHealth()}
                aria-label="Refresh health"
                className="text-muted-foreground hover:text-foreground"
              >
                <RiRefreshLine className="size-4" />
              </button>
            </div>
            {healthLoading ? (
              <p className="text-sm text-muted-foreground">Checking…</p>
            ) : healthError ? (
              <div className="flex items-center gap-2 text-destructive">
                <RiCloseCircleFill className="size-6" />
                <span className="text-lg font-semibold">Unreachable</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {isUp ? (
                  <RiCheckboxCircleFill className="size-6 text-emerald-500" />
                ) : (
                  <RiCloseCircleFill className="size-6 text-destructive" />
                )}
                <span className="text-lg font-semibold capitalize">
                  {health?.results.status}
                </span>
              </div>
            )}
            {health?.results.details && (
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {Object.entries(health.results.details).map(
                  ([name, indicator]) => (
                    <li key={name} className="flex items-center gap-1.5">
                      <RiDatabase2Line className="size-3.5" />
                      <span className="capitalize">{name}</span>
                      <span
                        className={cn(
                          "ml-auto font-medium",
                          indicator.status === "up"
                            ? "text-emerald-500"
                            : "text-destructive",
                        )}
                      >
                        {indicator.status}
                      </span>
                    </li>
                  ),
                )}
              </ul>
            )}
          </BentoCard>

          {/* Regions count */}
          <BentoCard>
            <CardHeader icon={RiGlobalLine} title="Regions" />
            <p className="text-3xl font-semibold tabular-nums">
              {regionsLoading ? "…" : (regions?.results?.length ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">geography/regions</p>
          </BentoCard>

          {/* Provinces count */}
          <BentoCard>
            <CardHeader icon={RiMapPin2Line} title="Provinces" />
            <p className="text-3xl font-semibold tabular-nums">
              {provincesLoading ? "…" : (provinces?.results?.length ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">geography/provinces</p>
          </BentoCard>

          {/* Region list preview — spans full width */}
          <BentoCard className="sm:col-span-2 lg:col-span-3">
            <CardHeader icon={RiServerLine} title="Regions preview" />
            <div className="flex flex-wrap gap-2">
              {regions?.results?.slice(0, 12).map((region) => (
                <span
                  key={region.code}
                  className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                >
                  {region.name}
                </span>
              ))}
            </div>
          </BentoCard>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Press{" "}
          <kbd className="rounded border border-border px-1.5 py-0.5">d</kbd> to
          toggle dark mode.
        </p>
      </main>
    </div>
  );
}
