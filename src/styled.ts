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

export const ANSI_CODES = {
  ...COLOR_CODES,
  ...BG_COLOR_CODES,
  ...MODIFIER_CODES,
} as const;

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

export type StyleOptions = TextStyleOptions &
  BackgroundStyleOptions & {
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

type Styled = {
  (text: string): string;
  rgb: (red: number, green: number, blue: number) => Styled;
  bgRgb: (red: number, green: number, blue: number) => Styled;
  hex: (value: string) => Styled;
  bgHex: (value: string) => Styled;
} & {
  [K in StyleName]: Styled;
};

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
  if (!shouldUseColor()) {
    return text;
  }

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

function analyzeStyles(styles: AppliedStyle[]): StyleAnalysis {
  const foregrounds: string[] = [];
  const backgroundStyles: string[] = [];

  for (const style of styles) {
    const formatted = formatStyleName(style);
    if (isTextStyle(style)) foregrounds.push(formatted);
    if (isBackgroundStyle(style)) backgroundStyles.push(formatted);
  }

  return { textStyles: foregrounds, backgroundStyles: backgroundStyles };
}

function createStyled(
  styles: AppliedStyle[] = [],
  analysis: StyleAnalysis = analyzeStyles(styles),
): Styled {
  const fn = ((text: string) => {
    return styles.reduce((acc, style) => applyStyle(acc, style), text);
  }) as Styled;

  return new Proxy(fn, {
    get(_, prop: string | symbol) {
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

          return createStyled([...styles, newStyle]);
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

          return createStyled([...styles, newStyle]);
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

          return createStyled([...styles, newStyle]);
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

          return createStyled([...styles, newStyle]);
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

        return createStyled([...styles, newStyle]);
      }

      throw new Error(`Unknown style: ${String(prop)}`);
    },
  });
}

export const styled = createStyled();
