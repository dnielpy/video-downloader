import type { DownloadStatus } from "@/src/modules/downloads/types";
import { cn } from "@/lib/utils";

const statusStyles: Record<DownloadStatus, string> = {
  active: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  waiting: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
  paused: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  complete: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  error: "bg-red-500/12 text-red-600 dark:text-red-400",
  removed: "bg-zinc-500/12 text-muted-foreground",
};

export function StatusBadge({ status }: { status: DownloadStatus }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em]", statusStyles[status])}>
      {status}
    </span>
  );
}
