import {
  addDownload as addAria2Download,
  getAria2Snapshot,
  pauseDownload as pauseAria2Download,
  removeDownload as removeAria2Download,
  resumeDownload as resumeAria2Download,
  saveAria2Session,
} from "@/lib/aria2/client";
import type { Download, DownloadAction, DownloadStatus } from "@/src/modules/downloads/types";
import { isActionAllowed } from "@/src/modules/downloads/utils/actions";
import { validateDownloadUrl } from "@/src/modules/downloads/utils/validation";
import {
  createHistoryRecord,
  getHistoryRecord,
  reconcileHistory,
  saveNewHistoryRecord,
  updateHistoryRecord,
  removeWorkspaceHistory,
} from "@/src/modules/downloads/server/history-store";
import path from "node:path";
import type { DownloadDestination } from "@/src/modules/downloads/types";

export class DownloadServiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "DownloadServiceError";
    this.code = code;
    this.status = status;
  }
}

function createUpdatedRecord(record: Download, status: DownloadStatus): Download {
  const now = new Date().toISOString();

  return {
    ...record,
    status,
    speedBytesPerSecond: 0,
    etaSeconds: null,
    errorMessage: null,
    updatedAt: now,
    attempts: record.attempts.map((attempt) =>
      attempt.gid === record.gid
        ? {
            ...attempt,
            status,
            errorMessage: null,
            finishedAt: status === "removed" ? now : null,
          }
        : attempt,
    ),
  };
}

async function requireRecord(id: string, action: DownloadAction, ownerFolder: string) {
  const record = await getHistoryRecord(id);

  if (!record) {
    throw new DownloadServiceError("DOWNLOAD_NOT_FOUND", "Download not found.", 404);
  }
  if (record.ownerFolder !== ownerFolder) throw new DownloadServiceError("DOWNLOAD_NOT_FOUND", "Download not found.", 404);

  if (!isActionAllowed(record.status, action)) {
    const actionLabel: Record<DownloadAction, string> = {
      pause: "paused",
      resume: "resumed",
      retry: "retried",
      cancel: "cancelled",
    };
    throw new DownloadServiceError(
      "INVALID_DOWNLOAD_STATE",
      `This download cannot be ${actionLabel[action]} while it is ${record.status}.`,
      409,
    );
  }

  return record;
}

async function persistSessionBestEffort() {
  try {
    await saveAria2Session();
  } catch {
    // aria2 also saves periodically; a transient save failure should not undo a successful action.
  }
}

export async function getDownloadsDashboard(ownerFolder: string) {
  return reconcileHistory(await getAria2Snapshot(), ownerFolder);
}

function destinationDirectory(ownerFolder: string, destination: DownloadDestination) {
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(ownerFolder)) throw new DownloadServiceError("INVALID_WORKSPACE", "Invalid workspace.", 400);
  return path.join(path.resolve(process.env.HOME_SERVER_DATA_PATH?.trim() || "/data"), ownerFolder, destination);
}

export async function createDownload(urlValue: unknown, destinationValue: unknown, ownerFolder: string) {
  const url = validateDownloadUrl(urlValue);
  if (destinationValue !== "streamlt" && destinationValue !== "lgallery") throw new DownloadServiceError("INVALID_DESTINATION", "Choose Streamlt or LGallery.", 400);
  const destination = destinationValue as DownloadDestination;
  const gid = await addAria2Download(url, undefined, destinationDirectory(ownerFolder, destination));
  const record = await saveNewHistoryRecord(createHistoryRecord(gid, url, ownerFolder, destination));
  await persistSessionBestEffort();
  return record;
}

export async function pauseDownload(id: string, ownerFolder: string) {
  const record = await requireRecord(id, "pause", ownerFolder);
  await pauseAria2Download(record.gid);
  const updated = await updateHistoryRecord(id, (current) => createUpdatedRecord(current, "paused"));
  await persistSessionBestEffort();
  return updated;
}

export async function resumeDownload(id: string, ownerFolder: string) {
  const record = await requireRecord(id, "resume", ownerFolder);
  await resumeAria2Download(record.gid);
  const updated = await updateHistoryRecord(id, (current) => createUpdatedRecord(current, "waiting"));
  await persistSessionBestEffort();
  return updated;
}

export async function cancelDownload(id: string, ownerFolder: string) {
  const record = await requireRecord(id, "cancel", ownerFolder);
  await removeAria2Download(record.gid);
  const updated = await updateHistoryRecord(id, (current) => createUpdatedRecord(current, "removed"));
  await persistSessionBestEffort();
  return updated;
}

export async function retryDownload(id: string, ownerFolder: string) {
  const record = await requireRecord(id, "retry", ownerFolder);
  const gid = await addAria2Download(record.url, record.fileName, destinationDirectory(ownerFolder, record.destination));
  const now = new Date().toISOString();
  const updated = await updateHistoryRecord(id, (current) => ({
    ...current,
    gid,
    totalBytes: 0,
    completedBytes: 0,
    progress: 0,
    speedBytesPerSecond: 0,
    etaSeconds: null,
    status: "waiting",
    errorMessage: null,
    updatedAt: now,
    attempts: [
      ...current.attempts,
      {
        gid,
        startedAt: now,
        finishedAt: null,
        status: "waiting",
        errorMessage: null,
      },
    ],
  }));
  await persistSessionBestEffort();
  return updated;
}

export async function cleanupWorkspace(ownerFolder: string) {
  const records = await removeWorkspaceHistory(ownerFolder);
  await Promise.all(records.filter((record) => record.status === "active" || record.status === "waiting" || record.status === "paused").map((record) => removeAria2Download(record.gid).catch(() => undefined)));
  await persistSessionBestEffort();
  return records.length;
}
