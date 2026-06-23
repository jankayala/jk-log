import { shouldUseColor } from "@/color-support";

export const COLOR_CODES = {
  black: [30, 39],
  red: [31, 39],
  green: [32, 39],
  yellow: [33, 39],
  blue: [34, 39],
  magenta: [35, 39],
  cyan: [36, 39],
  lightGrey: [37, 39],
  lightGray: [37, 39],
  grey: [90, 39],
  gray: [90, 39],
  redBright: [91, 39],
  greenBright: [92, 39],
  yellowBright: [93, 39],
  blueBright: [94, 39],
  magentaBright: [95, 39],
  cyanBright: [96, 39],
  white: [97, 39],
} as const;

export const BG_COLOR_CODES = {
  bgBlack: [40, 49],
  bgRed: [41, 49],
  bgGreen: [42, 49],
  bgYellow: [43, 49],
  bgBlue: [44, 49],
  bgMagenta: [45, 49],
  bgCyan: [46, 49],
  bgLightGrey: [47, 49],
  bgLightGray: [47, 49],
  bgGrey: [100, 49],
  bgGray: [100, 49],
  bgRedBright: [101, 49],
  bgGreenBright: [102, 49],
  bgYellowBright: [103, 49],
  bgBlueBright: [104, 49],
  bgMagentaBright: [105, 49],
  bgCyanBright: [106, 49],
  bgWhite: [107, 49],
} as const;

export const MODIFIER_CODES = {
  bold: [1, 22],
  dim: [2, 22],
  italic: [3, 23],
  underline: [4, 24],
  inverse: [7, 27],
  hidden: [8, 28],
  strikethrough: [9, 29],
  overline: [53, 55],
} as const;

export const ANSI_CODES: typeof COLOR_CODES & typeof BG_COLOR_CODES & typeof MODIFIER_CODES = {
  ...COLOR_CODES,
  ...BG_COLOR_CODES,
  ...MODIFIER_CODES,
};

export type ColorName = keyof typeof COLOR_CODES;
export type BgColorName = keyof typeof BG_COLOR_CODES;
export type ModifierName = keyof typeof MODIFIER_CODES;
export type StyleName = keyof typeof ANSI_CODES;

const COLOR_NAMES = new Set<string>(Object.keys(COLOR_CODES));
const BG_COLOR_NAMES = new Set<string>(Object.keys(BG_COLOR_CODES));

type TextStyleOptions =
  | {
      color?: ColorName;
      rgb?: never;
      hex?: never;
    }
  | {
      color?: never;
      rgb?: [number, number, number];
      hex?: never;
    }
  | {
      color?: never;
      rgb?: never;
      hex?: string;
    }
  | {
      color?: never;
      rgb?: never;
      hex?: never;
    };

type BackgroundStyleOptions =
  | {
      bgColor?: BgColorName;
      bgRgb?: never;
      bgHex?: never;
    }
  | {
      bgColor?: never;
      bgRgb?: [number, number, number];
      bgHex?: never;
    }
  | {
      bgColor?: never;
      bgRgb?: never;
      bgHex?: string;
    }
  | {
      bgColor?: never;
      bgRgb?: never;
      bgHex?: never;
    };

type TextStyleConflictMessage = {
  "Not allowed to define more than 1 text color style option": never;
};

type BackgroundStyleConflictMessage = {
  "Not allowed to define more than 1 background color style option": never;
};

type TextStyleConflict = {
  color?: ColorName;
  rgb?: [number, number, number];
  hex?: string;
} & TextStyleConflictMessage;

type BackgroundStyleConflict = {
  bgColor?: BgColorName;
  bgRgb?: [number, number, number];
  bgHex?: string;
} & BackgroundStyleConflictMessage;

export type StyleOptions = (TextStyleOptions | TextStyleConflict) &
  (BackgroundStyleOptions | BackgroundStyleConflict) & {
    modifiers?: ModifierName | ModifierName[];
  };

type RgbStyle = {
  kind: "rgb" | "bgRgb";
  values: [number, number, number];
};

type AppliedStyle = StyleName | RgbStyle;

type StyleAnalysis = {
  textStyles: string[];
  backgroundStyles: string[];
};

export type StyledChain<
  HasTextStyle extends boolean = false,
  HasBackgroundStyle extends boolean = false,
> = {
  (text: string): string;
  rgb: HasTextStyle extends true
    ? {
        "Not allowed to chain more than 1 text color style option": never;
      }
    : (red: number, green: number, blue: number) => StyledChain<true, HasBackgroundStyle>;
  bgRgb: HasBackgroundStyle extends true
    ? {
        "Not allowed to chain more than 1 background color style option": never;
      }
    : (red: number, green: number, blue: number) => StyledChain<HasTextStyle, true>;
  hex: HasTextStyle extends true
    ? {
        "Not allowed to chain more than 1 text color style option": never;
      }
    : (value: string) => StyledChain<true, HasBackgroundStyle>;
  bgHex: HasBackgroundStyle extends true
    ? {
        "Not allowed to chain more than 1 background color style option": never;
      }
    : (value: string) => StyledChain<HasTextStyle, true>;
} & {
  [K in ModifierName]: StyledChain<HasTextStyle, HasBackgroundStyle>;
} & {
  [K in ColorName]: HasTextStyle extends true
    ? {
        "Not allowed to chain more than 1 text color style option": never;
      }
    : StyledChain<true, HasBackgroundStyle>;
} & {
  [K in BgColorName]: HasBackgroundStyle extends true
    ? {
        "Not allowed to chain more than 1 background color style option": never;
      }
    : StyledChain<HasTextStyle, true>;
};

export type Styled = StyledChain;

function normalizeRgbValue(value: number): number {
  if (!Number.isFinite(value)) {
    throw new TypeError("RGB values must be finite numbers.");
  }

  return Math.max(0, Math.min(255, Math.round(value)));
}

function createRgbStyle(
  kind: RgbStyle["kind"],
  red: number,
  green: number,
  blue: number,
): RgbStyle {
  return {
    kind,
    values: [normalizeRgbValue(red), normalizeRgbValue(green), normalizeRgbValue(blue)],
  };
}

function parseHexColor(value: string): [number, number, number] {
  const normalized = value.trim().replace(/^#/, "");

  if (!/^[\da-f]{3}([\da-f]{3})?$/i.test(normalized)) {
    throw new TypeError(
      'Hex colors must be valid 3 or 6 digit hex values, e.g. "#abc" or "#aabbcc".',
    );
  }

  const fullHex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

  return [
    Number.parseInt(fullHex.slice(0, 2), 16),
    Number.parseInt(fullHex.slice(2, 4), 16),
    Number.parseInt(fullHex.slice(4, 6), 16),
  ];
}

function createHexStyle(kind: RgbStyle["kind"], value: string): RgbStyle {
  return createRgbStyle(kind, ...parseHexColor(value));
}

function formatStyleName(style: AppliedStyle): string {
  if (typeof style === "string") return style;

  const [red, green, blue] = style.values;
  return `${style.kind}(${red}, ${green}, ${blue})`;
}

function isTextStyle(style: AppliedStyle): boolean {
  return typeof style === "string" ? COLOR_NAMES.has(style) : style.kind === "rgb";
}

function isBackgroundStyle(style: AppliedStyle): boolean {
  return typeof style === "string" ? BG_COLOR_NAMES.has(style) : style.kind === "bgRgb";
}

function applyStyle(text: string, style: AppliedStyle): string {
  if (typeof style === "string") {
    const codes = ANSI_CODES[style];
    if (!codes) return text;

    const [open, close] = codes;
    return `\x1b[${open}m${text}\x1b[${close}m`;
  }

  const [red, green, blue] = style.values;
  const open =
    style.kind === "rgb" ? `38;2;${red};${green};${blue}` : `48;2;${red};${green};${blue}`;
  const close = style.kind === "rgb" ? 39 : 49;

  return `\x1b[${open}m${text}\x1b[${close}m`;
}

const EMPTY_ANALYSIS: StyleAnalysis = { textStyles: [], backgroundStyles: [] };

function extendAnalysis(analysis: StyleAnalysis, newStyle: AppliedStyle): StyleAnalysis {
  const formatted = formatStyleName(newStyle);
  if (isTextStyle(newStyle)) {
    return {
      textStyles: [...analysis.textStyles, formatted],
      backgroundStyles: analysis.backgroundStyles,
    };
  }
  if (isBackgroundStyle(newStyle)) {
    return {
      textStyles: analysis.textStyles,
      backgroundStyles: [...analysis.backgroundStyles, formatted],
    };
  }
  return analysis;
}

function createStyledWith(
  existing: AppliedStyle[],
  newStyle: AppliedStyle,
  analysis: StyleAnalysis,
): Styled {
  const next = new Array<AppliedStyle>(existing.length + 1);
  for (let i = 0; i < existing.length; i++) {
    next[i] = existing[i]!;
  }
  next[existing.length] = newStyle;
  return createStyled(next, extendAnalysis(analysis, newStyle));
}

function createStyled(
  styles: AppliedStyle[] = [],
  analysis: StyleAnalysis = EMPTY_ANALYSIS,
): Styled {
  const fn = ((text: string) => {
    if (!shouldUseColor()) {
      return text;
    }
    let result = text;
    for (let i = 0; i < styles.length; i++) {
      result = applyStyle(result, styles[i]!);
    }
    return result;
  }) as Styled;

  return new Proxy(fn, {
    get(_, prop: string | symbol) {
      if (typeof prop === "symbol") {
        return undefined;
      }

      if (prop === "rgb") {
        return (red: number, green: number, blue: number) => {
          const newStyle = createRgbStyle("rgb", red, green, blue);
          if (analysis.textStyles.length > 0) {
            throw new Error(
              `[styled] Cannot chain multiple foreground colors: [${analysis.textStyles.join(", ")}] and ${formatStyleName(
                newStyle,
              )}`,
            );
          }

          return createStyledWith(styles, newStyle, analysis);
        };
      }

      if (prop === "bgRgb") {
        return (red: number, green: number, blue: number) => {
          const newStyle = createRgbStyle("bgRgb", red, green, blue);
          if (analysis.backgroundStyles.length > 0) {
            throw new Error(
              `[styled] Cannot chain multiple background colors: [${analysis.backgroundStyles.join(", ")}] and ${formatStyleName(
                newStyle,
              )}`,
            );
          }

          return createStyledWith(styles, newStyle, analysis);
        };
      }

      if (prop === "hex") {
        return (value: string) => {
          const newStyle = createHexStyle("rgb", value);
          if (analysis.textStyles.length > 0) {
            throw new Error(
              `[styled] Cannot chain multiple foreground colors: [${analysis.textStyles.join(", ")}] and ${formatStyleName(
                newStyle,
              )}`,
            );
          }

          return createStyledWith(styles, newStyle, analysis);
        };
      }

      if (prop === "bgHex") {
        return (value: string) => {
          const newStyle = createHexStyle("bgRgb", value);
          if (analysis.backgroundStyles.length > 0) {
            throw new Error(
              `[styled] Cannot chain multiple background colors: [${analysis.backgroundStyles.join(", ")}] and ${formatStyleName(
                newStyle,
              )}`,
            );
          }

          return createStyledWith(styles, newStyle, analysis);
        };
      }

      if (typeof prop === "string" && prop in ANSI_CODES) {
        const newStyle = prop as StyleName;
        if (isTextStyle(newStyle) && analysis.textStyles.length > 0) {
          throw new Error(
            `[styled] Cannot chain multiple foreground colors: [${analysis.textStyles.join(", ")}] and ${formatStyleName(
              newStyle,
            )}`,
          );
        }

        if (isBackgroundStyle(newStyle) && analysis.backgroundStyles.length > 0) {
          throw new Error(
            `[styled] Cannot chain multiple background colors: [${analysis.backgroundStyles.join(", ")}] and ${formatStyleName(
              newStyle,
            )}`,
          );
        }

        return createStyledWith(styles, newStyle, analysis);
      }

      throw new Error(`Unknown style: ${String(prop)}`);
    },
  });
}

/**
 * Chainable ANSI string styling engine.
 *
 * Supports named colors (`red`, `blue`, …), background colors (`bgRed`, …),
 * modifiers (`bold`, `italic`, …), and custom colors via `rgb()`, `hex()`,
 * `bgRgb()`, and `bgHex()`. Enforces a single foreground and single background
 * color per chain at both the type level and runtime.
 *
 * When colors are disabled (e.g., `NO_COLOR` is set), returns plain unformatted text.
 *
 * @example
 * ```ts
 * styled.red.bold("Error!");          // bold red text
 * styled.hex("#ff8800")("Warning");   // custom hex color
 * styled.bgBlue.white("Highlight");   // white text on blue background
 * ```
 */
export const styled = createStyled() as StyledChain<false, false>;
