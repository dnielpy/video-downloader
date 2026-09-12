"use client";

import { FileDown, LoaderCircle, Pause, RotateCcw, Trash2, Play } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import type { Download, DownloadAction } from "@/src/modules/downloads/types";
import { getAllowedActions } from "@/src/modules/downloads/utils/actions";
import { formatBytes, formatEta, formatPercentage, formatSpeed } from "@/src/modules/downloads/utils/formatters";
import { StatusBadge } from "@/src/modules/downloads/components/status-badge";

type DownloadCardProps = {
  download: Download;
  pendingAction?: DownloadAction;
  onAction: (download: Download, action: DownloadAction) => void;
};

const actionPresentation = {
  pause: { label: "Pause", icon: Pause, variant: "secondary" as const },
  resume: { label: "Resume", icon: Play, variant: "secondary" as const },
  retry: { label: "Retry", icon: RotateCcw, variant: "secondary" as const },
  cancel: { label: "Cancel", icon: Trash2, variant: "destructive" as const },
};

export function DownloadCard({ download, pendingAction, onAction }: DownloadCardProps) {
  const actions = getAllowedActions(download.status);
  const secondaryLine = download.status === "complete"
    ? `${formatBytes(download.totalBytes)} downloaded`
    : `${formatBytes(download.completedBytes)} of ${download.totalBytes > 0 ? formatBytes(download.totalBytes) : "unknown"}`;

  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex min-w-0 items-start gap-3.5">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
          <FileDown className="size-[19px]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="block max-w-full truncate text-[15px] font-semibold tracking-[-0.015em]" title={download.fileName}>
                {download.fileName}
              </h2>
              <p className="mt-1 block max-w-full truncate text-xs text-muted-foreground" title={download.url}>{download.url}</p>
            </div>
            <StatusBadge status={download.status} />
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted" aria-label={`${formatPercentage(download.progress)} downloaded`}>
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${Math.min(100, Math.max(0, download.progress))}%` }}
            />
          </div>

          <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p><span className="font-semibold text-foreground">{formatPercentage(download.progress)}</span> · {secondaryLine}</p>
            {download.status === "active" && (
              <p>{formatSpeed(download.speedBytesPerSecond)} · {formatEta(download.etaSeconds)}</p>
            )}
            {download.status === "paused" && <p>Paused</p>}
            {download.status === "waiting" && <p>Waiting to start</p>}
            {download.status === "complete" && <p>Completed</p>}
          </div>

          {download.errorMessage && (
            <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
              {download.errorMessage}
            </p>
          )}

          {actions.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
              {actions.map((action) => {
                const presentation = actionPresentation[action];
                const Icon = presentation.icon;
                const isPending = pendingAction === action;
                return (
                  <Button
                    disabled={Boolean(pendingAction)}
                    key={action}
                    onClick={() => onAction(download, action)}
                    size="small"
                    variant={presentation.variant}
                  >
                    {isPending ? <LoaderCircle className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}
                    {isPending ? `${presentation.label}…` : presentation.label}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
