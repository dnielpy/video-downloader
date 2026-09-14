import { cleanupWorkspace } from "@/src/modules/downloads/server/download-service";
export async function DELETE(request: Request, { params }: { params: Promise<{ folderName: string }> }) {
  if (request.headers.get("x-home-server-internal-secret") !== process.env.HOME_SERVER_INTERNAL_SECRET) return new Response(null, { status: 404 });
  const folderName = (await params).folderName;
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(folderName)) return Response.json({ error: "Invalid workspace." }, { status: 400 });
  return Response.json({ removed: await cleanupWorkspace(folderName) });
}
