import { describe, it, expect } from "vitest";
import * as index from "@/index";

describe("index re-exports", () => {
  it("exports color-support", () => {
    expect(index.shouldUseColor).toBeDefined();
    expect(index.stripAnsi).toBeDefined();
  });

  it("does not expose a default export", () => {
    expect(index).not.toHaveProperty("default");
  });
});
