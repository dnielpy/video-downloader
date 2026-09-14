import { DownloadsView } from "@/src/modules/downloads/downloads-view";
import { getDownloadsDashboard } from "@/src/modules/downloads/server/download-service";
import type { DownloadsResponse } from "@/src/modules/downloads/types";
import { parseHomeServerIdentity } from "@home-server/contracts";
import { headers } from "next/headers";

export async function DownloadsContainer() {
  let initialData: DownloadsResponse | null = null;
  let initialError: string | undefined;

  try {
    const identity = parseHomeServerIdentity(await headers());
    if (!identity) throw new Error("Authentication required.");
    initialData = await getDownloadsDashboard(identity.workspaceFolder);
  } catch (error) {
    initialError = error instanceof Error ? error.message : "Unable to connect to aria2.";
  }

  return <DownloadsView initialData={initialData} initialError={initialError} />;
}
