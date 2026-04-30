import { styled, ANSI_CODES, type StyleName } from "@/styled";

export type SimpleLogger = { log: (...args: unknown[]) => void } & typeof styled;

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

function createSimpleLogger(): SimpleLogger {
  const base = {
    log(...args: unknown[]) {
      // behave like console.log by default
      if (args.length === 0) {
        console.log();
        return;
      }

      console.log(...(args as any[]));
    },
  };

  return new Proxy(base as unknown as SimpleLogger, {
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
  }) as SimpleLogger;
}

export const logger = createSimpleLogger();
