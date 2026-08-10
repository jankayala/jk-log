import { describe, expect, it } from "vitest";
import { invalidateColorCache, isBrowser, shouldUseColor, stripAnsi } from "@/color-support";
import { styled } from "@/styled";
import { withColors } from "@/test-utils";

// ─── shouldUseColor ───────────────────────────────────────────────────────────

describe("shouldUseColor", () => {
  it("returns false when NO_COLOR is set to a non-empty string", () => {
    withColors({ noColor: true }, () => expect(shouldUseColor()).toBe(false));
  });

  it("returns false when NO_COLOR is set regardless of its value", () => {
    withColors({ noColor: true }, () => expect(shouldUseColor()).toBe(false));
  });

  it("returns true even in non-TTY when FORCE_COLOR is set", () => {
    withColors({ force: true, isTTY: false }, () => expect(shouldUseColor()).toBe(true));
  });

  it("NO_COLOR takes precedence over FORCE_COLOR", () => {
    withColors({ force: true, noColor: true }, () => expect(shouldUseColor()).toBe(false));
  });

  it("returns true in a TTY environment without env overrides", () => {
    withColors({ isTTY: true }, () => expect(shouldUseColor()).toBe(true));
  });

  it("returns false in a non-TTY environment without env overrides", () => {
    withColors({ isTTY: false }, () => expect(shouldUseColor()).toBe(false));
  });

  it("returns false when isTTY is undefined and no env overrides", () => {
    withColors({ isTTY: undefined }, () => expect(shouldUseColor()).toBe(false));
  });

  it("returns false when process.stdout is missing and no env overrides", () => {
    const originalStdout = process.stdout;
    Object.defineProperty(process, "stdout", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    invalidateColorCache();

    try {
      delete process.env["NO_COLOR"];
      delete process.env["FORCE_COLOR"];
      expect(shouldUseColor()).toBe(false);
    } finally {
      Object.defineProperty(process, "stdout", {
        value: originalStdout,
        writable: true,
        configurable: true,
      });
      invalidateColorCache();
    }
  });

  it("returns false when NO_COLOR is empty string (empty = not set)", () => {
    // Empty string is treated the same as absent per the spec
    withColors({ isTTY: false }, () => {
      process.env["NO_COLOR"] = "";
      invalidateColorCache();
      expect(shouldUseColor()).toBe(false);
    });
  });
});

// ─── stripAnsi ────────────────────────────────────────────────────────────────

describe("stripAnsi", () => {
  it("removes simple SGR sequences", () => {
    expect(stripAnsi("\x1b[31mHello\x1b[39m")).toBe("Hello");
  });

  it("removes bold / reset sequences", () => {
    expect(stripAnsi("\x1b[1mBold\x1b[22m")).toBe("Bold");
  });

  it("removes 24-bit RGB color sequences", () => {
    expect(stripAnsi("\x1b[38;2;50;50;50mText\x1b[39m")).toBe("Text");
  });

  it("is a no-op for plain strings", () => {
    expect(stripAnsi("plain text")).toBe("plain text");
  });

  it("removes multiple sequences in one string", () => {
    expect(stripAnsi("\x1b[1m\x1b[31mBold Red\x1b[39m\x1b[22m")).toBe("Bold Red");
  });

  it("returns empty string unchanged", () => {
    expect(stripAnsi("")).toBe("");
  });
});

// ─── styled respects color policy ─────────────────────────────────────────────

describe("styled – color policy integration", () => {
  it("strips ANSI codes when NO_COLOR=1", () => {
    withColors({ noColor: true }, () => {
      expect(styled.red("Hello")).toBe("Hello");
    });
  });

  it("strips ANSI codes in non-TTY without FORCE_COLOR", () => {
    withColors({ isTTY: false }, () => {
      expect(styled.bold("Hello")).toBe("Hello");
    });
  });

  it("applies ANSI codes when FORCE_COLOR=1 in non-TTY", () => {
    withColors({ force: true, isTTY: false }, () => {
      expect(styled.red("Hello")).toBe("\x1b[31mHello\x1b[39m");
    });
  });

  it("applies ANSI codes in TTY without env overrides", () => {
    withColors({ isTTY: true }, () => {
      expect(styled.red("Hello")).toBe("\x1b[31mHello\x1b[39m");
    });
  });

  it("rgb returns plain text when colors disabled", () => {
    withColors({ noColor: true }, () => {
      expect(styled.rgb(50, 100, 150)("Hi")).toBe("Hi");
    });
  });

  it("bgHex returns plain text when colors disabled", () => {
    withColors({ noColor: true }, () => {
      expect(styled.bgHex("#102030")("Hi")).toBe("Hi");
    });
  });
});

// ─── isBrowser ────────────────────────────────────────────────────────────────

describe("isBrowser", () => {
  it("returns false in Node.js environment", () => {
    expect(isBrowser()).toBe(false);
  });

  it("returns true when window and document exist and process.versions.node is absent", () => {
    const originalVersions = process.versions;
    (globalThis as any).window = {};
    (globalThis as any).document = {};
    Object.defineProperty(process, "versions", {
      value: {},
      writable: true,
      configurable: true,
    });

    try {
      expect(isBrowser()).toBe(true);
    } finally {
      delete (globalThis as any).window;
      delete (globalThis as any).document;
      Object.defineProperty(process, "versions", {
        value: originalVersions,
        writable: true,
        configurable: true,
      });
    }
  });
});

// ─── invalidateColorCache ─────────────────────────────────────────────────────

describe("invalidateColorCache", () => {
  it("causes shouldUseColor to re-evaluate after env change", () => {
    withColors({ force: true }, () => {
      expect(shouldUseColor()).toBe(true);
    });

    withColors({ noColor: true }, () => {
      // Without invalidation, the result from the previous block would still be cached
      expect(shouldUseColor()).toBe(false);
    });
  });
});
