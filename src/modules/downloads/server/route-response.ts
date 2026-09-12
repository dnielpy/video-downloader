import { Aria2RpcError } from "@/lib/aria2/client";
import type { Download } from "@/src/modules/downloads/types";
import { DownloadServiceError } from "@/src/modules/downloads/server/download-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function handleDownloadAction(
  context: RouteContext,
  action: (id: string) => Promise<Download | null>,
) {
  try {
    const { id } = await context.params;
    const download = await action(id);

    if (!download) {
      return Response.json(
        { error: { code: "HISTORY_WRITE_FAILED", message: "The download changed before its state could be saved." } },
        { status: 500 },
      );
    }

    return Response.json({ download });
  } catch (error) {
    if (error instanceof DownloadServiceError) {
      return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    }

    if (error instanceof Aria2RpcError) {
      return Response.json({ error: { code: "ARIA2_UNAVAILABLE", message: error.message } }, { status: 502 });
    }

    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unexpected server error." } },
      { status: 500 },
    );
  }
}
