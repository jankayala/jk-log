import { styled, ANSI_CODES, type StyleName } from "@/styled";

export type Logger = {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  trace: (...args: unknown[]) => void;
} & typeof styled;

function createSimpleStyled(currentStyle: typeof styled = styled) {
  const fn = (text: string) => {
    // styled already respects shouldUseColor() internally
    console.log(currentStyle(text));
  };

  return new Proxy(fn as unknown as typeof styled, {
    get(_, prop: string | symbol) {
      if (prop === "rgb") {
        return (r: number, g: number, b: number) => createSimpleStyled(currentStyle.rgb(r, g, b));
      }

      if (prop === "bgRgb") {
        return (r: number, g: number, b: number) => createSimpleStyled(currentStyle.bgRgb(r, g, b));
      }

      if (prop === "hex") {
        return (v: string) => createSimpleStyled(currentStyle.hex(v));
      }

      if (prop === "bgHex") {
        return (v: string) => createSimpleStyled(currentStyle.bgHex(v));
      }

      if (typeof prop === "string" && prop in ANSI_CODES) {
        return createSimpleStyled((currentStyle as any)[prop as StyleName]);
      }

      return undefined;
    },
  }) as unknown as typeof styled;
}

function createLogger(): Logger {
  const base = {
    log(...args: unknown[]) {
      if (args.length === 0) {
        console.log();
        return;
      }

      console.log(...(args as any[]));
    },
    trace(...args: unknown[]) {
      if (args.length === 0) {
        console.trace();
        return;
      }

      console.trace(...(args as any[]));
    },
    debug(...args: unknown[]) {
      if (args.length === 0) {
        console.debug();
        return;
      }

      console.debug(...(args as any[]));
    },

    info(...args: unknown[]) {
      if (args.length === 0) {
        console.info();
        return;
      }

      console.info(...(args as any[]));
    },
    warn(...args: unknown[]) {
      if (args.length === 0) {
        console.warn();
        return;
      }

      console.warn(...(args as any[]));
    },
    error(...args: unknown[]) {
      if (args.length === 0) {
        console.error();
        return;
      }

      console.error(...(args as any[]));
    },
  };

  return new Proxy(base as unknown as Logger, {
    get(target, prop: string | symbol) {
      if (typeof prop === "string" && prop in target) {
        const value = (target as any)[prop as string];
        return typeof value === "function" ? value.bind(target) : value;
      }

      if (prop === "rgb") {
        return (r: number, g: number, b: number) => createSimpleStyled(styled.rgb(r, g, b));
      }

      if (prop === "bgRgb") {
        return (r: number, g: number, b: number) => createSimpleStyled(styled.bgRgb(r, g, b));
      }

      if (prop === "hex") {
        return (v: string) => createSimpleStyled(styled.hex(v));
      }

      if (prop === "bgHex") {
        return (v: string) => createSimpleStyled(styled.bgHex(v));
      }

      if (typeof prop === "string" && prop in ANSI_CODES) {
        return createSimpleStyled((styled as any)[prop as StyleName]);
      }

      return undefined;
    },
  }) as Logger;
}

export const logger = createLogger();
