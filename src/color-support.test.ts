import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { shouldUseColor, stripAnsi } from "@/color-support";
import { styled } from "@/styled";

// ─── helpers ──────────────────────────────────────────────────────────────────

function withEnv(overrides: Record<string, string | undefined>, fn: () => void) {
  const saved: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(overrides)) {
    saved[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

// ─── shouldUseColor ───────────────────────────────────────────────────────────

describe("shouldUseColor", () => {
  const originalIsTTY = process.stdout.isTTY;

  afterEach(() => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: originalIsTTY,
      writable: true,
      configurable: true,
    });
  });

  it("returns false when NO_COLOR is set to a non-empty string", () => {
    withEnv({ NO_COLOR: "1", FORCE_COLOR: undefined }, () => expect(shouldUseColor()).toBe(false));
  });

  it("returns false when NO_COLOR is set regardless of its value", () => {
    withEnv({ NO_COLOR: "true", FORCE_COLOR: undefined }, () =>
      expect(shouldUseColor()).toBe(false),
    );
  });

  it("returns true even in non-TTY when FORCE_COLOR is set", () => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: false,
      writable: true,
      configurable: true,
    });
    withEnv({ NO_COLOR: undefined, FORCE_COLOR: "1" }, () => expect(shouldUseColor()).toBe(true));
  });

  it("NO_COLOR takes precedence over FORCE_COLOR", () => {
    withEnv({ NO_COLOR: "1", FORCE_COLOR: "1" }, () => expect(shouldUseColor()).toBe(false));
  });

  it("returns true in a TTY environment without env overrides", () => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      writable: true,
      configurable: true,
    });
    withEnv({ NO_COLOR: undefined, FORCE_COLOR: undefined }, () =>
      expect(shouldUseColor()).toBe(true),
    );
  });

  it("returns false in a non-TTY environment without env overrides", () => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: false,
      writable: true,
      configurable: true,
    });
    withEnv({ NO_COLOR: undefined, FORCE_COLOR: undefined }, () =>
      expect(shouldUseColor()).toBe(false),
    );
  });

  it("returns false when isTTY is undefined and no env overrides", () => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    withEnv({ NO_COLOR: undefined, FORCE_COLOR: undefined }, () =>
      expect(shouldUseColor()).toBe(false),
    );
  });

  it("returns false when NO_COLOR is empty string (empty = not set)", () => {
    // Empty string is treated the same as absent per the spec
    withEnv({ NO_COLOR: "", FORCE_COLOR: undefined }, () => {
      // With empty NO_COLOR and non-TTY → false
      Object.defineProperty(process.stdout, "isTTY", {
        value: false,
        writable: true,
        configurable: true,
      });
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
  const originalIsTTY = process.stdout.isTTY;

  beforeEach(() => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: false,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: originalIsTTY,
      writable: true,
      configurable: true,
    });
    delete process.env["NO_COLOR"];
    delete process.env["FORCE_COLOR"];
  });

  it("strips ANSI codes when NO_COLOR=1", () => {
    process.env["NO_COLOR"] = "1";
    expect(styled.red("Hello")).toBe("Hello");
  });

  it("strips ANSI codes in non-TTY without FORCE_COLOR", () => {
    expect(styled.bold("Hello")).toBe("Hello");
  });

  it("applies ANSI codes when FORCE_COLOR=1 in non-TTY", () => {
    process.env["FORCE_COLOR"] = "1";
    expect(styled.red("Hello")).toBe("\x1b[31mHello\x1b[39m");
  });

  it("applies ANSI codes in TTY without env overrides", () => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      writable: true,
      configurable: true,
    });
    expect(styled.red("Hello")).toBe("\x1b[31mHello\x1b[39m");
  });

  it("rgb returns plain text when colors disabled", () => {
    process.env["NO_COLOR"] = "1";
    expect(styled.rgb(50, 100, 150)("Hi")).toBe("Hi");
  });

  it("bgHex returns plain text when colors disabled", () => {
    process.env["NO_COLOR"] = "1";
    expect(styled.bgHex("#102030")("Hi")).toBe("Hi");
  });
});
