import { Activity, CircleCheck, Gauge, ListTodo } from "lucide-react";
import type { DownloadStats } from "@/src/modules/downloads/types";
import { formatSpeed } from "@/src/modules/downloads/utils/formatters";

type GlobalStatsProps = {
  stats: DownloadStats;
};

export function GlobalStats({ stats }: GlobalStatsProps) {
  const items = [
    { label: "Download speed", value: formatSpeed(stats.downloadSpeedBytesPerSecond), icon: Gauge },
    { label: "Active", value: stats.active.toLocaleString(), icon: Activity },
    { label: "Waiting", value: stats.waiting.toLocaleString(), icon: ListTodo },
    { label: "Finished", value: stats.stopped.toLocaleString(), icon: CircleCheck },
  ];

  return (
    <dl className="grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm sm:grid-cols-4 sm:divide-y-0">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div className="p-4 sm:px-5" key={item.label}>
            <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Icon className="size-3.5" /> {item.label}
            </dt>
            <dd className="mt-2 text-xl font-semibold tracking-[-0.03em]">{item.value}</dd>
          </div>
        );
      })}
    </dl>
  );
}
