import { describe, expect, it } from "vitest";
import { getAllowedActions, isActionAllowed } from "@/src/modules/downloads/utils/actions";

describe("download action rules", () => {
  it("exposes actions for live downloads", () => {
    expect(getAllowedActions("active")).toEqual(["pause", "cancel"]);
    expect(getAllowedActions("paused")).toEqual(["resume", "cancel"]);
  });

  it("only retries terminal failures and removals", () => {
    expect(getAllowedActions("error")).toEqual(["retry"]);
    expect(getAllowedActions("removed")).toEqual(["retry"]);
    expect(isActionAllowed("complete", "retry")).toBe(false);
  });
});
