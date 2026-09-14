import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHistoryRecord, reconcileHistory, saveNewHistoryRecord } from "@/src/modules/downloads/server/history-store";

let stateRoot = "";

beforeEach(async () => {
  stateRoot = await mkdtemp(path.join(os.tmpdir(), "download-history-"));
  process.env.APP_STATE_DIR = stateRoot;
});

afterEach(async () => {
  delete process.env.APP_STATE_DIR;
  await rm(stateRoot, { recursive: true, force: true });
});

describe("workspace download history", () => {
  it("persists destination and isolates workspaces", async () => {
    const daniel = createHistoryRecord("0123456789abcdef", "https://example.test/movie.mp4", "daniel", "streamlt");
    const admin = createHistoryRecord("fedcba9876543210", "https://example.test/photo.webp", "admin", "lgallery");
    await saveNewHistoryRecord(daniel);
    await saveNewHistoryRecord(admin);

    const dashboard = await reconcileHistory({ downloads: [], stats: { downloadSpeed: "0", uploadSpeed: "0", numActive: "0", numWaiting: "0", numStopped: "0", numStoppedTotal: "0" } }, "daniel");
    expect(dashboard.downloads).toHaveLength(1);
    expect(dashboard.downloads[0]).toMatchObject({ ownerFolder: "daniel", destination: "streamlt" });
  });
});
