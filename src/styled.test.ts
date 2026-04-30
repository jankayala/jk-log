import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  styled,
  type ColorName,
  type BgColorName,
  type ModifierName,
  type StyleOptions,
  ANSI_CODES,
  COLOR_CODES,
  BG_COLOR_CODES,
  MODIFIER_CODES,
} from "@/styled";

const validStyleOptionsSamples: StyleOptions[] = [
  { color: "red" },
  { rgb: [1, 2, 3], bgHex: "#abcdef" },
  { hex: "#123456", bgColor: "bgBlue", modifiers: "bold" },
];

void validStyleOptionsSamples;

// @ts-expect-error `color` and `rgb` are mutually exclusive.
const invalidForegroundRgbOptions: StyleOptions = {
  color: "red",
  rgb: [1, 2, 3] as [number, number, number],
};

// @ts-expect-error `color` and `hex` are mutually exclusive.
const invalidForegroundHexOptions: StyleOptions = {
  color: "red",
  hex: "#ff0000",
};

// @ts-expect-error `bgColor` and `bgRgb` are mutually exclusive.
const invalidBackgroundRgbOptions: StyleOptions = {
  bgColor: "bgRed",
  bgRgb: [4, 5, 6] as [number, number, number],
};

// @ts-expect-error `bgRgb` and `bgHex` are mutually exclusive.
const invalidBackgroundHexOptions: StyleOptions = {
  bgRgb: [4, 5, 6] as [number, number, number],
  bgHex: "#040506",
};

void [
  invalidForegroundRgbOptions,
  invalidForegroundHexOptions,
  invalidBackgroundRgbOptions,
  invalidBackgroundHexOptions,
];

describe("styled", () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    process.env["FORCE_COLOR"] = "1";
    delete process.env["NO_COLOR"];
  });

  afterAll(() => {
    delete process.env["FORCE_COLOR"];
  });

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
  describe("color application", () => {
    it("should apply single color with dot notation", () => {
      const result = styled.red("Hello");
      expect(result).toBe("\x1b[31mHello\x1b[39m");
    });

    it("should apply single color with bracket notation", () => {
      const result = styled["red"]("Hello");
      expect(result).toBe("\x1b[31mHello\x1b[39m");
    });

    const colorCases = Object.entries(COLOR_CODES).map(
      ([color, [open, close]]) => [color, open, close] as [ColorName, number, number],
    );

    it.each(colorCases)(
      "should apply for color %s the codes %i and %i",
      (color: ColorName, codeOpen: number, codeClose: number) => {
        const result = styled[color]("Text");
        expect(result).toBe(`\x1b[${codeOpen}mText\x1b[${codeClose}m`);
      },
    );

    it("should warn when multiple foreground colors are applied", () => {
      styled.red.blue("Hello");
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it("should warn when multiple foreground colors are applied", () => {
      styled.red.rgb(50, 50, 50)("Hello");
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it("should apply rgb foreground colors", () => {
      expect(styled.rgb(50, 50, 50)("Hello")).toBe("\x1b[38;2;50;50;50mHello\x1b[39m");
    });

    it("should apply hex foreground colors", () => {
      expect(styled.hex("#336699")("Hello")).toBe("\x1b[38;2;51;102;153mHello\x1b[39m");
    });

    it("should expand shorthand hex foreground colors", () => {
      expect(styled.hex("#abc")("Hello")).toBe("\x1b[38;2;170;187;204mHello\x1b[39m");
    });

    it("should reject invalid rgb and hex inputs", () => {
      expect(() => styled.rgb(Number.POSITIVE_INFINITY, 0, 0)).toThrow(
        "RGB values must be finite numbers.",
      );
      expect(() => styled.hex("#xyz")).toThrow(
        'Hex colors must be valid 3 or 6 digit hex values, e.g. "#abc" or "#aabbcc".',
      );
    });
  });

  describe("bgColor application", () => {
    it("should apply single color with dot notation", () => {
      const result = styled.bgRed("Hello");
      expect(result).toBe("\x1b[41mHello\x1b[49m");
    });

    it("should apply single color with bracket notation", () => {
      const result = styled["bgRed"]("Hello");
      expect(result).toBe("\x1b[41mHello\x1b[49m");
    });

    const bgColorCases = Object.entries(BG_COLOR_CODES).map(
      ([bgColor, [open, close]]) => [bgColor, open, close] as [BgColorName, number, number],
    );

    it.each(bgColorCases)(
      "should apply for bgColor %s the codes %i and %i",
      (bgColor: BgColorName, codeOpen: number, codeClose: number) => {
        const result = styled[bgColor]("Text");
        expect(result).toBe(`\x1b[${codeOpen}mText\x1b[${codeClose}m`);
      },
    );

    it("should warn when multiple background colors are applied", () => {
      styled.bgRed.bgBlue("Hello");
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it("should warn when multiple background colors are applied", () => {
      styled.bgRed.bgRgb(10, 20, 30)("Hello");
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it("should apply rgb background colors", () => {
      expect(styled.bgRgb(10, 20, 30)("Hello")).toBe("\x1b[48;2;10;20;30mHello\x1b[49m");
    });

    it("should apply hex background colors", () => {
      expect(styled.bgHex("#102030")("Hello")).toBe("\x1b[48;2;16;32;48mHello\x1b[49m");
    });
  });

  describe("modifier application", () => {
    it("should apply single modifier with dot notation", () => {
      const result = styled.bold("Hello");
      expect(result).toBe("\x1b[1mHello\x1b[22m");
    });

    const modifierCases = Object.entries(MODIFIER_CODES).map(
      ([modifier, [open, close]]) => [modifier, open, close] as [ModifierName, number, number],
    );

    it.each(modifierCases)(
      "should apply for modifier %s the codes %i and %i",
      (modifier: ModifierName, codeOpen: number, codeClose: number) => {
        const result = styled[modifier]("Text");
        expect(result).toBe(`\x1b[${codeOpen}mText\x1b[${codeClose}m`);
      },
    );

    it("should NOT warn when multiple modifiers are applied", () => {
      styled.bold.underline("Hello");
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });
});

describe("styled proxy additional coverage", () => {
  beforeAll(() => {
    process.env["FORCE_COLOR"] = "1";
    delete process.env["NO_COLOR"];
  });

  afterAll(() => {
    delete process.env["FORCE_COLOR"];
  });

  it("returns the original text when a style mapping is missing", () => {
    const originalRed = (ANSI_CODES as any).red;
    (ANSI_CODES as any).red = undefined;

    try {
      expect(styled.red("Hello")).toBe("Hello");
    } finally {
      (ANSI_CODES as any).red = originalRed;
    }
  });

  it("throws error for unknown styles", () => {
    expect(() => (styled as any).unknown).toThrow("Unknown style: unknown");
  });

  it("handles Symbol props in styled proxy (branch coverage)", () => {
    expect(() => (styled as any)[Symbol("test")]).toThrow();
  });
});
