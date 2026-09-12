"use client";

import { Inbox } from "lucide-react";
import type { Download, DownloadAction } from "@/src/modules/downloads/types";
import { DownloadCard } from "@/src/modules/downloads/components/download-card";

type DownloadListProps = {
  downloads: Download[];
  pendingActions: Record<string, DownloadAction>;
  onAction: (download: Download, action: DownloadAction) => void;
};

export function DownloadList({ downloads, pendingActions, onAction }: DownloadListProps) {
  if (downloads.length === 0) {
    return (
      <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-border bg-card/40 px-6 text-center">
        <div>
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Inbox className="size-5" />
          </span>
          <p className="mt-4 font-semibold">No downloads yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Paste a direct link above to start your first download.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {downloads.map((download) => (
        <DownloadCard
          download={download}
          key={download.id}
          onAction={onAction}
          pendingAction={pendingActions[download.id]}
        />
      ))}
    </div>
  );
}
