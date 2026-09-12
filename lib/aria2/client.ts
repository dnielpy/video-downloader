import path from "node:path";
import type {
  Aria2Download,
  Aria2GlobalStat,
  Aria2Snapshot,
} from "@/lib/aria2/types";

const DOWNLOAD_KEYS = [
  "gid",
  "status",
  "totalLength",
  "completedLength",
  "downloadSpeed",
  "dir",
  "errorCode",
  "errorMessage",
  "files",
] as const;
const RPC_TIMEOUT_MS = 8_000;

type JsonRpcSuccess<T> = {
  jsonrpc: "2.0";
  id: string;
  result: T;
};

type JsonRpcFailure = {
  jsonrpc: "2.0";
  id: string;
  error: {
    code: number;
    message: string;
  };
};

export class Aria2RpcError extends Error {
  readonly rpcCode: number | null;

  constructor(message: string, rpcCode: number | null = null) {
    super(message);
    this.name = "Aria2RpcError";
    this.rpcCode = rpcCode;
  }
}

function getRpcConfig() {
  const url = process.env.ARIA2_RPC_URL?.trim();
  const secret = process.env.ARIA2_RPC_SECRET?.trim();

  if (!url) {
    throw new Aria2RpcError("ARIA2_RPC_URL is not configured.");
  }

  if (!secret) {
    throw new Aria2RpcError("ARIA2_RPC_SECRET is not configured.");
  }

  return { url, token: `token:${secret}` };
}

async function callRpc<T>(method: string, params: unknown[] = []) {
  const { url, token } = getRpcConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method,
        params: [token, ...params],
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Aria2RpcError(`aria2 returned HTTP ${response.status}.`);
    }

    const payload = (await response.json()) as JsonRpcSuccess<T> | JsonRpcFailure;

    if ("error" in payload) {
      throw new Aria2RpcError(payload.error.message, payload.error.code);
    }

    return payload.result;
  } catch (error) {
    if (error instanceof Aria2RpcError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new Aria2RpcError("aria2 did not respond in time.");
    }

    throw new Aria2RpcError("Unable to connect to aria2.");
  } finally {
    clearTimeout(timeout);
  }
}

export async function addDownload(url: string, outputName?: string, destinationPath = "") {
  const options: Record<string, string> = { continue: "true" };

  if (outputName) {
    options.out = path.basename(outputName);
  }

  if (destinationPath) {
    const downloadRoot = process.env.DOWNLOAD_DIR?.trim() || "/downloads";
    options.dir = path.posix.join(downloadRoot, destinationPath);
  }

  return callRpc<string>("aria2.addUri", [[url], options]);
}

export async function getAria2Snapshot(): Promise<Aria2Snapshot> {
  const [active, waiting, stopped, stats] = await Promise.all([
    callRpc<Aria2Download[]>("aria2.tellActive", [DOWNLOAD_KEYS]),
    callRpc<Aria2Download[]>("aria2.tellWaiting", [0, 1_000, DOWNLOAD_KEYS]),
    callRpc<Aria2Download[]>("aria2.tellStopped", [0, 1_000, DOWNLOAD_KEYS]),
    callRpc<Aria2GlobalStat>("aria2.getGlobalStat"),
  ]);

  return { downloads: [...active, ...waiting, ...stopped], stats };
}

export function pauseDownload(gid: string) {
  return callRpc<string>("aria2.pause", [gid]);
}

export function resumeDownload(gid: string) {
  return callRpc<string>("aria2.unpause", [gid]);
}

export function removeDownload(gid: string) {
  return callRpc<string>("aria2.remove", [gid]);
}

export function saveAria2Session() {
  return callRpc<"OK">("aria2.saveSession");
}

export function getDownloadUrl(download: Aria2Download) {
  for (const file of download.files) {
    const uri = file.uris.find((candidate) => candidate.status === "used") ?? file.uris[0];

    if (uri) {
      return uri.uri;
    }
  }

  return "";
}

export function getDownloadFileName(download: Aria2Download, fallbackUrl = "") {
  const filePath = download.files.find((file) => file.path)?.path;

  if (filePath) {
    return path.basename(filePath);
  }

  try {
    const pathname = new URL(fallbackUrl).pathname;
    const candidate = path.basename(decodeURIComponent(pathname));
    return candidate || "Untitled download";
  } catch {
    return "Untitled download";
  }
}
