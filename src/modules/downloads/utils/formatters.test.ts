import { describe, expect, it } from "vitest";
import { formatBytes, formatEta, formatPercentage, formatSpeed } from "@/src/modules/downloads/utils/formatters";

describe("download formatters", () => {
  it("formats byte quantities and speeds", () => {
    expect(formatBytes(8_462_349_102)).toBe("7.88 GB");
    expect(formatSpeed(5_242_880)).toBe("5 MB/s");
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats progress and ETA", () => {
    expect(formatPercentage(72.4)).toBe("72%");
    expect(formatPercentage(0.4)).toBe("0.4%");
    expect(formatEta(3_661)).toBe("1h 1m remaining");
    expect(formatEta(null)).toBe("Calculating…");
  });
});
