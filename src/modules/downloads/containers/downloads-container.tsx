import { DownloadsView } from "@/src/modules/downloads/downloads-view";
import { getDownloadsDashboard } from "@/src/modules/downloads/server/download-service";
import type { DownloadsResponse } from "@/src/modules/downloads/types";

export async function DownloadsContainer() {
  let initialData: DownloadsResponse | null = null;
  let initialError: string | undefined;

  try {
    initialData = await getDownloadsDashboard();
  } catch (error) {
    initialError = error instanceof Error ? error.message : "Unable to connect to aria2.";
  }

  return <DownloadsView initialData={initialData} initialError={initialError} />;
}
