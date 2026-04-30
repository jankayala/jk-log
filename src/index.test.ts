import { describe, it, expect } from "vitest";
import * as index from "@/index";

describe("index re-exports", () => {
  it("exports color-support", () => {
    expect(index.shouldUseColor).toBeDefined();
    expect(index.stripAnsi).toBeDefined();

    expect(typeof index.shouldUseColor).toBe("function");
    expect(typeof index.stripAnsi).toBe("function");
  });

  it("exports logger", () => {
    expect(index.logger).toBeDefined();

    // `logger` is a proxy object with a `log` method and chainable style
    // helpers; it's not a raw function, so assert it's an object and that
    // the `log` method exists and is a function.
    expect(typeof index.logger).toBe("object");
    expect(typeof (index.logger as any).log).toBe("function");
  });

  it("exports styled", () => {
    expect(index.styled).toBeDefined();

    expect(typeof index.styled).toBe("function");
  });

  it("does not expose a default export", () => {
    expect(index).not.toHaveProperty("default");
  });

  it("exports the coverage marker", () => {
    // Marker is a simple value added to ensure this module has statements
    // that can be measured by coverage tooling.
    expect(index).toHaveProperty("__index_marker");
    expect(index.__index_marker).toBe(true);
  });
});
