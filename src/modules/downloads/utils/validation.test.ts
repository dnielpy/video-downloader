import { describe, expect, it } from "vitest";
import { validateDownloadUrl } from "@/src/modules/downloads/utils/validation";

describe("validateDownloadUrl", () => {
  it("accepts HTTP and HTTPS URLs", () => {
    expect(validateDownloadUrl(" https://example.com/file.zip ")).toBe("https://example.com/file.zip");
    expect(validateDownloadUrl("http://example.com/a")).toBe("http://example.com/a");
  });

  it("rejects unsupported and credential-bearing URLs", () => {
    expect(() => validateDownloadUrl("file:///tmp/file")).toThrow("Only HTTP and HTTPS");
    expect(() => validateDownloadUrl("https://user:pass@example.com/file")).toThrow("Credentials");
    expect(() => validateDownloadUrl("not a url")).toThrow("valid URL");
  });
});
