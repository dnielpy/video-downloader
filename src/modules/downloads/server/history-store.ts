import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Aria2Download, Aria2Snapshot } from "@/lib/aria2/types";
import {
  getDownloadFileName,
  getDownloadUrl,
} from "@/lib/aria2/client";
import type {
  Download,
  DownloadAttempt,
  DownloadStatus,
  DownloadsResponse,
} from "@/src/modules/downloads/types";

type HistoryManifest = {
  version: 1;
  downloads: Download[];
};

type TerminalEvent = {
  gid: string;
  status: Extract<DownloadStatus, "complete" | "error" | "removed">;
  filePath: string;
};

const TERMINAL_STATUSES = new Set<DownloadStatus>(["complete", "error", "removed"]);
const RECONCILE_WRITE_INTERVAL_MS = 30_000;
let writeQueue: Promise<void> = Promise.resolve();
let lastReconcileWriteAt = 0;
let lastReconcileStateDirectory = "";

function getStatePaths() {
  const stateDirectory = path.resolve(
    /* turbopackIgnore: true */ process.env.APP_STATE_DIR?.trim() || ".download-manager-state",
  );

  return {
    stateDirectory,
    manifestPath: path.join(stateDirectory, "downloads.json"),
    eventsDirectory: path.join(stateDirectory, "events"),
  };
}

function isDownloadStatus(value: unknown): value is DownloadStatus {
  return typeof value === "string" && ["waiting", "active", "paused", "complete", "error", "removed"].includes(value);
}

function isDownload(value: unknown): value is Download {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Download>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.gid === "string" &&
    typeof candidate.url === "string" &&
    (candidate.destinationPath === undefined || candidate.destinationPath === null || typeof candidate.destinationPath === "string") &&
    typeof candidate.fileName === "string" &&
    isDownloadStatus(candidate.status) &&
    Array.isArray(candidate.attempts)
  );
}

async function readManifestUnsafe(): Promise<HistoryManifest> {
  const { manifestPath } = getStatePaths();

  try {
    const parsed = JSON.parse(
      await readFile(/* turbopackIgnore: true */ manifestPath, "utf8"),
    ) as Partial<HistoryManifest>;

    if (parsed.version !== 1 || !Array.isArray(parsed.downloads) || !parsed.downloads.every(isDownload)) {
      throw new Error("The download history file has an unsupported format.");
    }

    return parsed as HistoryManifest;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: 1, downloads: [] };
    }

    if (error instanceof SyntaxError) {
      throw new Error("The download history file is not valid JSON.");
    }

    throw error;
  }
}

async function writeManifestUnsafe(manifest: HistoryManifest) {
  const { stateDirectory, eventsDirectory, manifestPath } = getStatePaths();
  await mkdir(eventsDirectory, { recursive: true });

  const temporaryPath = path.join(
    stateDirectory,
    `downloads.${process.pid}.${randomUUID()}.tmp`,
  );
  await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  await rename(temporaryPath, manifestPath);
}

function withWriteLock<T>(operation: () => Promise<T>) {
  const result = writeQueue.then(operation, operation);
  writeQueue = result.then(() => undefined, () => undefined);
  return result;
}

function parseNumber(value: string | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function createAttempt(gid: string, status: DownloadStatus, startedAt: string): DownloadAttempt {
  return {
    gid,
    startedAt,
    finishedAt: TERMINAL_STATUSES.has(status) ? startedAt : null,
    status,
    errorMessage: null,
  };
}

function updateAttempt(
  attempts: DownloadAttempt[],
  gid: string,
  status: DownloadStatus,
  errorMessage: string | null,
  updatedAt: string,
) {
  const existingAttempt = attempts.find((attempt) => attempt.gid === gid);

  if (!existingAttempt) {
    attempts.push(createAttempt(gid, status, updatedAt));
  }

  return attempts.map((attempt) =>
    attempt.gid === gid
      ? {
          ...attempt,
          status,
          errorMessage,
          finishedAt: TERMINAL_STATUSES.has(status) ? (attempt.finishedAt ?? updatedAt) : null,
        }
      : attempt,
  );
}

export function applyAria2Download(record: Download, ariaDownload: Aria2Download, now: string): Download {
  const totalBytes = parseNumber(ariaDownload.totalLength);
  const completedBytes = parseNumber(ariaDownload.completedLength);
  const speedBytesPerSecond = parseNumber(ariaDownload.downloadSpeed);
  const remainingBytes = Math.max(0, totalBytes - completedBytes);
  const errorMessage = ariaDownload.errorMessage?.trim() || null;

  return {
    ...record,
    url: getDownloadUrl(ariaDownload) || record.url,
    fileName: getDownloadFileName(ariaDownload, record.url) || record.fileName,
    totalBytes,
    completedBytes,
    progress: totalBytes > 0 ? Math.min(100, (completedBytes / totalBytes) * 100) : 0,
    speedBytesPerSecond,
    etaSeconds: speedBytesPerSecond > 0 ? Math.ceil(remainingBytes / speedBytesPerSecond) : null,
    status: ariaDownload.status,
    errorMessage,
    updatedAt: now,
    attempts: updateAttempt(record.attempts, record.gid, ariaDownload.status, errorMessage, now),
  };
}

function createRecordFromAria2(ariaDownload: Aria2Download, now: string): Download {
  const url = getDownloadUrl(ariaDownload);
  const emptyRecord: Download = {
    id: randomUUID(),
    gid: ariaDownload.gid,
    url,
    fileName: getDownloadFileName(ariaDownload, url),
    totalBytes: 0,
    completedBytes: 0,
    progress: 0,
    speedBytesPerSecond: 0,
    etaSeconds: null,
    status: ariaDownload.status,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
    attempts: [createAttempt(ariaDownload.gid, ariaDownload.status, now)],
  };

  return applyAria2Download(emptyRecord, ariaDownload, now);
}

async function readTerminalEvents(): Promise<TerminalEvent[]> {
  const { eventsDirectory } = getStatePaths();

  try {
    const entries = await readdir(/* turbopackIgnore: true */ eventsDirectory, { withFileTypes: true });
    const events = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry): Promise<TerminalEvent | null> => {
          const match = /^([0-9a-f]{16})\.(complete|error|removed)$/i.exec(entry.name);

          if (!match) {
            return null;
          }

          return {
            gid: match[1].toLowerCase(),
            status: match[2].toLowerCase() as TerminalEvent["status"],
            filePath: await readFile(
              /* turbopackIgnore: true */ path.join(eventsDirectory, entry.name),
              "utf8",
            ),
          };
        }),
    );

    return events.filter((event): event is TerminalEvent => event !== null);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export function createHistoryRecord(
  gid: string,
  url: string,
  now = new Date().toISOString(),
  destinationPath = "",
): Download {
  let fileName = "Untitled download";

  try {
    const candidate = path.basename(decodeURIComponent(new URL(url).pathname));
    fileName = candidate || fileName;
  } catch {
    // The URL was validated before reaching the history store.
  }

  return {
    id: randomUUID(),
    gid,
    url,
    destinationPath: destinationPath || null,
    fileName,
    totalBytes: 0,
    completedBytes: 0,
    progress: 0,
    speedBytesPerSecond: 0,
    etaSeconds: null,
    status: "waiting",
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
    attempts: [createAttempt(gid, "waiting", now)],
  };
}

export function saveNewHistoryRecord(record: Download) {
  return withWriteLock(async () => {
    const manifest = await readManifestUnsafe();
    const existingRecord = manifest.downloads.find((download) =>
      download.attempts.some((attempt) => attempt.gid === record.gid),
    );

    if (existingRecord) {
      return existingRecord;
    }

    manifest.downloads.unshift(record);
    await writeManifestUnsafe(manifest);
    return record;
  });
}

export function getHistoryRecord(id: string) {
  return readManifestUnsafe().then((manifest) => manifest.downloads.find((download) => download.id === id) ?? null);
}

export function updateHistoryRecord(id: string, update: (download: Download) => Download) {
  return withWriteLock(async () => {
    const manifest = await readManifestUnsafe();
    const index = manifest.downloads.findIndex((download) => download.id === id);

    if (index === -1) {
      return null;
    }

    const updatedRecord = update(manifest.downloads[index]);
    manifest.downloads[index] = updatedRecord;
    await writeManifestUnsafe(manifest);
    return updatedRecord;
  });
}

export function reconcileHistory(snapshot: Aria2Snapshot): Promise<DownloadsResponse> {
  return withWriteLock(async () => {
    const [manifest, events] = await Promise.all([readManifestUnsafe(), readTerminalEvents()]);
    const now = new Date().toISOString();
    const nowMs = Date.now();
    const { stateDirectory } = getStatePaths();
    const ariaDownloads = new Map(snapshot.downloads.map((download) => [download.gid, download]));
    const knownGids = new Set(
      manifest.downloads.flatMap((download) => download.attempts.map((attempt) => attempt.gid)),
    );

    let discoveredDownload = false;

    for (const ariaDownload of snapshot.downloads) {
      if (!knownGids.has(ariaDownload.gid)) {
        manifest.downloads.push(createRecordFromAria2(ariaDownload, now));
        discoveredDownload = true;
      }
    }

    let terminalStatusChanged = false;

    manifest.downloads = manifest.downloads.map((record) => {
      const ariaDownload = ariaDownloads.get(record.gid);
      let nextRecord = ariaDownload ? applyAria2Download(record, ariaDownload, now) : record;
      const terminalEvent = events.find((event) => event.gid === record.gid);

      if (ariaDownload && TERMINAL_STATUSES.has(ariaDownload.status) && ariaDownload.status !== record.status) {
        terminalStatusChanged = true;
      }

      if (terminalEvent && (!ariaDownload || ariaDownload.status === terminalEvent.status)) {
        if (terminalEvent.status !== record.status) {
          terminalStatusChanged = true;
        }
        const eventFileName = terminalEvent.filePath ? path.basename(terminalEvent.filePath) : nextRecord.fileName;
        nextRecord = {
          ...nextRecord,
          fileName: eventFileName || nextRecord.fileName,
          status: terminalEvent.status,
          speedBytesPerSecond: 0,
          etaSeconds: null,
          progress: terminalEvent.status === "complete" ? 100 : nextRecord.progress,
          completedBytes: terminalEvent.status === "complete" && nextRecord.totalBytes > 0
            ? nextRecord.totalBytes
            : nextRecord.completedBytes,
          updatedAt: now,
          attempts: updateAttempt(
            nextRecord.attempts,
            nextRecord.gid,
            terminalEvent.status,
            nextRecord.errorMessage,
            now,
          ),
        };
      }

      return nextRecord;
    });

    manifest.downloads.sort((first, second) => second.createdAt.localeCompare(first.createdAt));
    const shouldWriteManifest =
      discoveredDownload ||
      terminalStatusChanged ||
      stateDirectory !== lastReconcileStateDirectory ||
      nowMs - lastReconcileWriteAt >= RECONCILE_WRITE_INTERVAL_MS;

    if (shouldWriteManifest) {
      await writeManifestUnsafe(manifest);
      lastReconcileWriteAt = nowMs;
      lastReconcileStateDirectory = stateDirectory;
    }

    return {
      downloads: manifest.downloads,
      stats: {
        downloadSpeedBytesPerSecond: parseNumber(snapshot.stats.downloadSpeed),
        active: parseNumber(snapshot.stats.numActive),
        waiting: parseNumber(snapshot.stats.numWaiting),
        stopped: manifest.downloads.filter((download) => TERMINAL_STATUSES.has(download.status)).length,
      },
    };
  });
}
