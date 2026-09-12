import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Aria2Download, Aria2Snapshot } from "@/lib/aria2/types";
import {
  applyAria2Download,
  createHistoryRecord,
  reconcileHistory,
  saveNewHistoryRecord,
} from "@/src/modules/downloads/server/history-store";

const gid = "0123456789abcdef";
let stateDirectory = "";

function ariaDownload(overrides: Partial<Aria2Download> = {}): Aria2Download {
  return {
    gid,
    status: "active",
    totalLength: "1000",
    completedLength: "250",
    downloadSpeed: "50",
    files: [{
      index: "1",
      path: "/downloads/archive.zip",
      length: "1000",
      completedLength: "250",
      selected: "true",
      uris: [{ uri: "https://example.com/archive.zip", status: "used" }],
    }],
    ...overrides,
  };
}

function snapshot(downloads: Aria2Download[]): Aria2Snapshot {
  return {
    downloads,
    stats: {
      downloadSpeed: "50",
      uploadSpeed: "0",
      numActive: "1",
      numWaiting: "0",
      numStopped: "0",
      numStoppedTotal: "0",
    },
  };
}

beforeEach(async () => {
  stateDirectory = await mkdtemp(path.join(os.tmpdir(), "download-manager-test-"));
  process.env.APP_STATE_DIR = stateDirectory;
});

afterEach(async () => {
  delete process.env.APP_STATE_DIR;
  await rm(stateDirectory, { recursive: true, force: true });
});

describe("history store", () => {
  it("maps aria2 progress and ETA", () => {
    const record = createHistoryRecord(gid, "https://example.com/archive.zip", "2026-01-01T00:00:00.000Z");
    const mapped = applyAria2Download(record, ariaDownload(), "2026-01-01T00:00:01.000Z");

    expect(mapped.fileName).toBe("archive.zip");
    expect(mapped.progress).toBe(25);
    expect(mapped.etaSeconds).toBe(15);
    expect(mapped.status).toBe("active");
  });

  it("persists terminal events when aria2 no longer reports the download", async () => {
    const record = createHistoryRecord(gid, "https://example.com/archive.zip");
    await saveNewHistoryRecord(record);
    await mkdir(path.join(stateDirectory, "events"), { recursive: true });
    await writeFile(path.join(stateDirectory, "events", `${gid}.complete`), "/downloads/archive.zip");

    const firstRead = await reconcileHistory(snapshot([]));
    const secondRead = await reconcileHistory(snapshot([]));

    expect(firstRead.downloads[0].status).toBe("complete");
    expect(firstRead.downloads[0].progress).toBe(100);
    expect(secondRead.downloads[0].status).toBe("complete");
    expect(secondRead.stats.stopped).toBe(1);
  });
});
