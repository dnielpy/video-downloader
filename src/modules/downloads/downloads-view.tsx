"use client";

import { AlertCircle, ServerOff, X } from "lucide-react";
import type { DownloadsResponse } from "@/src/modules/downloads/types";
import { useDownloads } from "@/src/modules/downloads/hooks/use-downloads";
import { DownloadForm } from "@/src/modules/downloads/components/download-form";
import { DownloadList } from "@/src/modules/downloads/components/download-list";
import { GlobalStats } from "@/src/modules/downloads/components/global-stats";

type DownloadsViewProps = {
  initialData: DownloadsResponse | null;
  initialError?: string;
};

export function DownloadsView({ initialData, initialError }: DownloadsViewProps) {
  const {
    data,
    connectionError,
    operationError,
    isCreating,
    pendingActions,
    add,
    runAction,
    dismissOperationError,
  } = useDownloads(initialData, initialError);

  return (
    <section className="mx-auto max-w-[1060px]">
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Personal workspace</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.055em] sm:text-4xl">Downloads</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Add a direct link and aria2 will keep it moving—even after you close this page.
        </p>
      </div>

      <div className="mt-7 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <DownloadForm isSubmitting={isCreating} onSubmit={add} />
      </div>

      {(connectionError || operationError) && (
        <div className="mt-4 grid gap-2" aria-live="polite">
          {connectionError && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
              <ServerOff className="mt-0.5 size-4 shrink-0" />
              <div><strong>aria2 is unavailable.</strong> {connectionError} Existing downloads continue independently.</div>
            </div>
          )}
          {operationError && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span className="flex-1">{operationError}</span>
              <button aria-label="Dismiss error" onClick={dismissOperationError} type="button"><X className="size-4" /></button>
            </div>
          )}
        </div>
      )}

      <div className="mt-5">
        <GlobalStats stats={data.stats} />
      </div>

      <div className="mb-3 mt-9 flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-[-0.02em]">All downloads</h2>
        <span className="text-xs font-medium text-muted-foreground">{data.downloads.length} total</span>
      </div>
      <DownloadList downloads={data.downloads} onAction={(download, action) => void runAction(download, action)} pendingActions={pendingActions} />
    </section>
  );
}
