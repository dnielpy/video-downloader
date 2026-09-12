export const DOWNLOAD_STATUSES = [
  "waiting",
  "active",
  "paused",
  "complete",
  "error",
  "removed",
] as const;

export type DownloadStatus = (typeof DOWNLOAD_STATUSES)[number];

export type DownloadAttempt = {
  gid: string;
  startedAt: string;
  finishedAt: string | null;
  status: DownloadStatus;
  errorMessage: string | null;
};

export type Download = {
  id: string;
  gid: string;
  url: string;
  fileName: string;
  totalBytes: number;
  completedBytes: number;
  progress: number;
  speedBytesPerSecond: number;
  etaSeconds: number | null;
  status: DownloadStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  attempts: DownloadAttempt[];
};

export type DownloadStats = {
  downloadSpeedBytesPerSecond: number;
  active: number;
  waiting: number;
  stopped: number;
};

export type DownloadsResponse = {
  downloads: Download[];
  stats: DownloadStats;
};

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};

export type DownloadAction = "pause" | "resume" | "retry" | "cancel";
