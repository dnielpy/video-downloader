import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pauseDownload } from "@/lib/aria2/client";

beforeEach(() => {
  process.env.ARIA2_RPC_URL = "http://aria2:6800/jsonrpc";
  process.env.ARIA2_RPC_SECRET = "server-secret";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.ARIA2_RPC_URL;
  delete process.env.ARIA2_RPC_SECRET;
});

describe("aria2 RPC client", () => {
  it("injects the server-side token as the first JSON-RPC parameter", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
      jsonrpc: "2.0",
      id: "response",
      result: "0123456789abcdef",
    })));
    vi.stubGlobal("fetch", fetchMock);

    await pauseDownload("0123456789abcdef");

    const request = fetchMock.mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(request.body as string) as { method: string; params: string[] };
    expect(body.method).toBe("aria2.pause");
    expect(body.params).toEqual(["token:server-secret", "0123456789abcdef"]);
  });

  it("turns JSON-RPC failures into typed errors", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
      jsonrpc: "2.0",
      id: "response",
      error: { code: 1, message: "GID not found" },
    }))));

    await expect(pauseDownload("0123456789abcdef")).rejects.toMatchObject({
      name: "Aria2RpcError",
      message: "GID not found",
      rpcCode: 1,
    });
  });
});
