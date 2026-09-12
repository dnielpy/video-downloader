import { Aria2RpcError } from "@/lib/aria2/client";
import { createDownload, DownloadServiceError, getDownloadsDashboard } from "@/src/modules/downloads/server/download-service";
import { DownloadValidationError } from "@/src/modules/downloads/utils/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  if (error instanceof DownloadValidationError) {
    return Response.json({ error: { code: "INVALID_URL", message: error.message } }, { status: 400 });
  }

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

export async function GET() {
  try {
    return Response.json(await getDownloadsDashboard(), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: unknown };
    return Response.json({ download: await createDownload(body.url) }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } }, { status: 400 });
    }

    return errorResponse(error);
  }
}
