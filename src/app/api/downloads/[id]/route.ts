import { handleDownloadAction } from "@/src/modules/downloads/server/route-response";
import { cancelDownload } from "@/src/modules/downloads/server/download-service";

export const runtime = "nodejs";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  return handleDownloadAction(context, cancelDownload);
}
