import {
  styled,
  ANSI_CODES,
  type StyleName,
  type ColorName,
  type BgColorName,
  type ModifierName,
} from "@/styled";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error";
type MethodLogLevel = LogLevel | "log";

export type LogFormat = "plain" | "json";

export type LoggerLevelColors = Record<LogLevel, ColorName>;

export type LoggerLevelLabels = Record<LogLevel, string>;

export type LoggerLevelColorOverrides = Partial<LoggerLevelColors>;

export type LoggerLevelLabelOverrides = Partial<LoggerLevelLabels>;

export type LoggerOptions = {
  showTime?: boolean;
  format?: LogFormat;
  logLevel?: LogLevel;
  levelColors?: LoggerLevelColorOverrides;
  levelLabels?: LoggerLevelLabelOverrides;
};

type LoggerTextStyleOptions =
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

type LoggerBackgroundStyleOptions =
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

type LoggerTextStyleConflictMessage = {
  "Not allowed to define more than 1 text color style option": never;
};

type LoggerBackgroundStyleConflictMessage = {
  "Not allowed to define more than 1 background color style option": never;
};

type LoggerTextStyleConflict = {
  color?: ColorName;
  rgb?: [number, number, number];
  hex?: string;
} & LoggerTextStyleConflictMessage;

type LoggerBackgroundStyleConflict = {
  bgColor?: BgColorName;
  bgRgb?: [number, number, number];
  bgHex?: string;
} & LoggerBackgroundStyleConflictMessage;

type JsonLogOutput = {
  level: Exclude<MethodLogLevel, "log">;
  timestamp?: string;
  message?: string;
  messages?: unknown[];
  data?: unknown;
};

export type LoggerLogOptions = (LoggerTextStyleOptions | LoggerTextStyleConflict) &
  (LoggerBackgroundStyleOptions | LoggerBackgroundStyleConflict) & {
    modifiers?: ModifierName | ModifierName[];
  };

export const DEFAULT_LEVEL_COLORS: LoggerLevelColors = {
  trace: "grey",
  debug: "cyan",
  info: "blue",
  warn: "yellow",
  error: "red",
};

export const DEFAULT_LEVEL_LABELS: LoggerLevelLabels = {
  trace: "[TRACE]",
  debug: "[DEBUG]",
  info: "[INFO]",
  warn: "[WARN]",
  error: "[ERROR]",
};

export type Logger = {
  log: (...args: unknown[]) => void;
  trace: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  setLevel: (level: LogLevel) => void;
} & typeof styled;

function createSimpleStyled(loggerLog: (s: string) => void, currentStyle: typeof styled = styled) {
  const fn = (text: string) => {
    // styled already respects shouldUseColor() internally
    loggerLog(currentStyle(text));
  };

  const styleFns = new Set(["rgb", "bgRgb", "hex", "bgHex"]);

  return new Proxy(fn as unknown as typeof styled, {
    get(_, prop: string | symbol) {
      if (typeof prop === "string") {
        if (styleFns.has(prop)) {
          return (...args: any[]) =>
            createSimpleStyled(loggerLog, (currentStyle as any)[prop](...args));
        }

        if (prop in ANSI_CODES) {
          return createSimpleStyled(loggerLog, (currentStyle as any)[prop as StyleName]);
        }
      }

      return undefined;
    },
  }) as unknown as typeof styled;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRgbTuple(value: unknown): value is [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((item) => typeof item === "number" && Number.isFinite(item))
  );
}

function countDefined(values: unknown[]): number {
  return values.filter((value) => value !== undefined).length;
}

function stringifyJsonLog(payload: JsonLogOutput): string {
  const seen = new WeakSet<object>();

  try {
    return JSON.stringify(payload, (_key, value: unknown) => {
      if (typeof value === "bigint") return value.toString();

      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) return "[Circular]";
        seen.add(value);
      }

      return value;
    });
  } catch {
    return JSON.stringify({
      level: payload.level,
      timestamp: payload.timestamp,
      message: "[Unserializable log payload]",
    });
  }
}

function isLoggerLogOptions(value: unknown): value is LoggerLogOptions {
  if (!isPlainObject(value)) return false;

  const hasKnownKey =
    "modifiers" in value ||
    "color" in value ||
    "rgb" in value ||
    "hex" in value ||
    "bgColor" in value ||
    "bgRgb" in value ||
    "bgHex" in value;
  if (!hasKnownKey) return false;

  if ("color" in value && value.color !== undefined && typeof value.color !== "string")
    return false;
  if ("rgb" in value && value.rgb !== undefined && !isRgbTuple(value.rgb)) return false;
  if ("hex" in value && value.hex !== undefined && typeof value.hex !== "string") return false;

  if ("bgColor" in value && value.bgColor !== undefined && typeof value.bgColor !== "string")
    return false;
  if ("bgRgb" in value && value.bgRgb !== undefined && !isRgbTuple(value.bgRgb)) return false;
  if ("bgHex" in value && value.bgHex !== undefined && typeof value.bgHex !== "string")
    return false;

  if (countDefined([value.color, value.rgb, value.hex]) > 1) return false;
  if (countDefined([value.bgColor, value.bgRgb, value.bgHex]) > 1) return false;

  if ("modifiers" in value && value.modifiers !== undefined) {
    const mods = value.modifiers;
    if (
      typeof mods !== "string" &&
      !(Array.isArray(mods) && mods.every((m) => typeof m === "string"))
    ) {
      return false;
    }
  }

  return true;
}

function applyLogOptions(text: string, options: LoggerLogOptions[]): string {
  let styleFn = styled;

  const mergedModifiers: ModifierName[] = [];
  let mergedColor: ColorName | undefined;
  let mergedRgb: [number, number, number] | undefined;
  let mergedHex: string | undefined;
  let mergedBgColor: BgColorName | undefined;
  let mergedBgRgb: [number, number, number] | undefined;
  let mergedBgHex: string | undefined;

  for (const option of options) {
    const mods =
      option.modifiers === undefined
        ? []
        : Array.isArray(option.modifiers)
          ? option.modifiers
          : [option.modifiers];
    mergedModifiers.push(...mods);
    if (option.color !== undefined) mergedColor = option.color;
    if (option.rgb !== undefined) mergedRgb = option.rgb;
    if (option.hex !== undefined) mergedHex = option.hex;
    if (option.bgColor !== undefined) mergedBgColor = option.bgColor;
    if (option.bgRgb !== undefined) mergedBgRgb = option.bgRgb;
    if (option.bgHex !== undefined) mergedBgHex = option.bgHex;
  }

  for (const mod of mergedModifiers) {
    styleFn = (styleFn as any)[mod];
  }

  if (mergedHex !== undefined) {
    styleFn = (styleFn as any).hex(mergedHex);
  } else if (mergedRgb !== undefined) {
    styleFn = (styleFn as any).rgb(...mergedRgb);
  } else if (mergedColor !== undefined) {
    styleFn = (styleFn as any)[mergedColor];
  }

  if (mergedBgHex !== undefined) {
    styleFn = (styleFn as any).bgHex(mergedBgHex);
  } else if (mergedBgRgb !== undefined) {
    styleFn = (styleFn as any).bgRgb(...mergedBgRgb);
  } else if (mergedBgColor !== undefined) {
    styleFn = (styleFn as any)[mergedBgColor];
  }

  return styleFn(text);
}

// Numeric weights for config levels plus the log() method level.
const ALL_LEVEL_WEIGHTS: Record<MethodLogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  log: 35,
  warn: 40,
  error: 50,
};

export function createLogger(options?: LoggerOptions): Logger {
  const rawEnv = (globalThis as any).process?.env?.LOG_LEVEL as string | undefined;
  const envLevel = rawEnv?.toLowerCase();
  const showTime = options?.showTime === true;
  const format = options?.format ?? "plain";
  const levelColors: LoggerLevelColors = {
    ...DEFAULT_LEVEL_COLORS,
    ...options?.levelColors,
  };
  const levelLabels: LoggerLevelLabels = {
    ...DEFAULT_LEVEL_LABELS,
    ...options?.levelLabels,
  };

  const isConfigLevel = (value: string): value is LogLevel =>
    Object.prototype.hasOwnProperty.call(DEFAULT_LEVEL_LABELS, value);

  const resolve = (opt?: string): LogLevel => {
    if (typeof opt === "string" && isConfigLevel(opt)) return opt;
    if (typeof envLevel === "string" && isConfigLevel(envLevel)) return envLevel;
    return "info" as LogLevel;
  };

  let currentLevel = resolve(options?.logLevel);
  let min = ALL_LEVEL_WEIGHTS[currentLevel];
  const isEnabled = (method: MethodLogLevel) => ALL_LEVEL_WEIGHTS[method] >= min;

  const formatArg = (value: unknown): string => {
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
      return String(value);
    }
    if (value instanceof Error) return value.stack ?? value.message;
    if (value === null || value === undefined) return String(value);
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  const withPrefix = (method: LogLevel, args: unknown[]): unknown[] => {
    if (format === "json") {
      const jsonOutput: JsonLogOutput = {
        level: method,
      };
      if (showTime) {
        jsonOutput.timestamp = new Date().toISOString();
      }
      if (args.length === 1 && typeof args[0] === "string") {
        jsonOutput.message = args[0];
      } else if (args.length > 1) {
        jsonOutput.messages = args;
      } else if (args.length === 1) {
        jsonOutput.data = args[0];
      }
      return [stringifyJsonLog(jsonOutput)];
    }

    const label = levelLabels[method];
    const coloredLabel = styled[levelColors[method]](label);
    const message = args.map(formatArg).join(" ");
    const prefix = showTime ? `${new Date().toISOString()} ${coloredLabel}` : coloredLabel;
    const prefixed = message.length > 0 ? `${prefix} ${message}` : prefix;
    return [prefixed];
  };

  const setLevel = (level?: LogLevel) => {
    const resolved = resolve(level as any);
    currentLevel = resolved;
    min = ALL_LEVEL_WEIGHTS[resolved];
  };

  // helper log functions that respect configured level
  const callLog = (method: MethodLogLevel, fn: (...args: unknown[]) => void, args: unknown[]) => {
    if (!isEnabled(method)) return;
    if (args.length === 0) {
      // @ts-ignore - console methods may have slightly different signatures
      fn();
      return;
    }

    // @ts-ignore
    fn(...(args as any[]));
  };

  const base = {
    log(...args: unknown[]) {
      if (typeof args[0] === "string" && args.length > 1) {
        const optionArgs = args.slice(1);
        if (optionArgs.every((arg) => isLoggerLogOptions(arg))) {
          const styledText = applyLogOptions(args[0], optionArgs);
          callLog("log", console.log.bind(console), [styledText]);
          return;
        }
      }

      callLog("log", console.log.bind(console), args);
    },
    trace(...args: unknown[]) {
      callLog("trace", console.trace.bind(console), withPrefix("trace", args));
    },
    debug(...args: unknown[]) {
      callLog("debug", console.debug.bind(console), withPrefix("debug", args));
    },
    info(...args: unknown[]) {
      callLog("info", console.info.bind(console), withPrefix("info", args));
    },
    warn(...args: unknown[]) {
      callLog("warn", console.warn.bind(console), withPrefix("warn", args));
    },
    error(...args: unknown[]) {
      callLog("error", console.error.bind(console), withPrefix("error", args));
    },
    setLevel(level?: LogLevel) {
      setLevel(level);
    },
  };

  return new Proxy(base as unknown as Logger, {
    get(target, prop: string | symbol) {
      if (typeof prop === "string" && prop in target) {
        const value = (target as any)[prop as string];
        return typeof value === "function" ? value.bind(target) : value;
      }
      if (typeof prop === "string") {
        if (prop in ANSI_CODES) {
          return createSimpleStyled(
            (s: string) => callLog("log", console.log.bind(console), [s]),
            (styled as any)[prop as StyleName],
          );
        }

        // rgb/bgRgb/hex/bgHex are functions on `styled` that accept args
        const styleFns = new Set(["rgb", "bgRgb", "hex", "bgHex"]);
        if (styleFns.has(prop)) {
          return (...args: any[]) =>
            createSimpleStyled(
              (s: string) => callLog("log", console.log.bind(console), [s]),
              (styled as any)[prop](...args),
            );
        }
      }

      return undefined;
    },
  }) as Logger;
}

export const logger = createLogger();
