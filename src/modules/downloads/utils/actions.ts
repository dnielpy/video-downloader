import type { DownloadAction, DownloadStatus } from "@/src/modules/downloads/types";

const ALLOWED_ACTIONS: Record<DownloadStatus, DownloadAction[]> = {
  active: ["pause", "cancel"],
  waiting: ["pause", "cancel"],
  paused: ["resume", "cancel"],
  complete: [],
  error: ["retry"],
  removed: ["retry"],
};

export function getAllowedActions(status: DownloadStatus) {
  return ALLOWED_ACTIONS[status];
}

export function isActionAllowed(status: DownloadStatus, action: DownloadAction) {
  return ALLOWED_ACTIONS[status].includes(action);
}
