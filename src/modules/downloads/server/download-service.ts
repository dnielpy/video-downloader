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
import { validateDestinationPath, validateDownloadUrl } from "@/src/modules/downloads/utils/validation";
import {
  createHistoryRecord,
  getHistoryRecord,
  reconcileHistory,
  saveNewHistoryRecord,
  updateHistoryRecord,
} from "@/src/modules/downloads/server/history-store";

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

async function requireRecord(id: string, action: DownloadAction) {
  const record = await getHistoryRecord(id);

  if (!record) {
    throw new DownloadServiceError("DOWNLOAD_NOT_FOUND", "Download not found.", 404);
  }

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

export async function getDownloadsDashboard() {
  return reconcileHistory(await getAria2Snapshot());
}

export async function createDownload(urlValue: unknown, destinationPathValue?: unknown) {
  const url = validateDownloadUrl(urlValue);
  const destinationPath = validateDestinationPath(destinationPathValue);
  const gid = await addAria2Download(url, undefined, destinationPath);
  const record = await saveNewHistoryRecord(createHistoryRecord(gid, url, undefined, destinationPath));
  await persistSessionBestEffort();
  return record;
}

export async function pauseDownload(id: string) {
  const record = await requireRecord(id, "pause");
  await pauseAria2Download(record.gid);
  const updated = await updateHistoryRecord(id, (current) => createUpdatedRecord(current, "paused"));
  await persistSessionBestEffort();
  return updated;
}

export async function resumeDownload(id: string) {
  const record = await requireRecord(id, "resume");
  await resumeAria2Download(record.gid);
  const updated = await updateHistoryRecord(id, (current) => createUpdatedRecord(current, "waiting"));
  await persistSessionBestEffort();
  return updated;
}

export async function cancelDownload(id: string) {
  const record = await requireRecord(id, "cancel");
  await removeAria2Download(record.gid);
  const updated = await updateHistoryRecord(id, (current) => createUpdatedRecord(current, "removed"));
  await persistSessionBestEffort();
  return updated;
}

export async function retryDownload(id: string) {
  const record = await requireRecord(id, "retry");
  const destinationPath = validateDestinationPath(record.destinationPath);
  const gid = await addAria2Download(record.url, record.fileName, destinationPath);
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
