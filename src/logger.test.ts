import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { createLogger, logger, DEFAULT_LEVEL_LABELS, DEFAULT_LEVEL_COLORS } from "@/logger";

describe("logger.ts)", () => {
  const originalForce = process.env["FORCE_COLOR"];
  const originalNoColor = process.env["NO_COLOR"];

  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    // Ensure colors are enabled for styling expectations
    process.env["FORCE_COLOR"] = "1";
    delete process.env["NO_COLOR"];
  });

  afterAll(() => {
    if (originalForce === undefined) delete process.env["FORCE_COLOR"];
    else process.env["FORCE_COLOR"] = originalForce;

    if (originalNoColor === undefined) delete process.env["NO_COLOR"];
    else process.env["NO_COLOR"] = originalNoColor;
  });

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("log() forwards arguments to console.log unchanged", () => {
    logger.log("arg1", 2, { three: 3 });
    expect(logSpy).toHaveBeenCalledWith("arg1", 2, { three: 3 });
  });

  it("log() supports StyleOptions-like fields", () => {
    const logOptions = {
      color: "cyan" as const,
      bgHex: "#102030",
      modifiers: ["bold", "underline"] as const,
    };

    logger.log("This is a log", logOptions, logOptions);
    expect(logSpy).toHaveBeenCalledTimes(1);
    const called = logSpy.mock.calls[0]![0] as string;
    expect(called).toContain("This is a log");
    expect(called).toContain("\x1b[36m"); // cyan
    expect(called).toContain("\x1b[48;2;16;32;48m"); // bgHex #102030
    expect(called).toContain("\x1b[1m"); // bold
    expect(called).toContain("\x1b[4m"); // underline
  });

  it("log() supports rgb/hex/bgRgb/bgColor options", () => {
    logger.log("rgb text", { rgb: [1, 2, 3] });
    expect(logSpy.mock.calls[0]![0]).toContain("\x1b[38;2;1;2;3m");

    logger.log("hex text", { hex: "#112233" });
    expect(logSpy.mock.calls[1]![0]).toContain("\x1b[38;2;17;34;51m");

    logger.log("bgRgb text", { bgRgb: [4, 5, 6] });
    expect(logSpy.mock.calls[2]![0]).toContain("\x1b[48;2;4;5;6m");

    logger.log("bgColor text", { bgColor: "bgBlue" });
    expect(logSpy.mock.calls[3]![0]).toContain("\x1b[44m");
  });

  it("log() supports modifier as a single string", () => {
    logger.log("mod text", { modifiers: "bold" });
    const called = logSpy.mock.calls[0]![0] as string;
    expect(called).toContain("mod text");
    expect(called).toContain("\x1b[1m");
  });

  it("log() falls back to regular logging for invalid style options", () => {
    const invalidCases: unknown[] = [
      { color: 123 },
      { rgb: [1, 2, Number.POSITIVE_INFINITY] },
      { hex: 123 },
      { bgColor: 123 },
      { bgRgb: [1, 2] },
      { bgHex: 123 },
      { color: "red", hex: "#112233" },
      { bgColor: "bgBlue", bgRgb: [1, 2, 3] },
      { modifiers: ["bold", 1] },
    ];

    for (const invalid of invalidCases) {
      logger.log("invalid", invalid);
      expect(logSpy).toHaveBeenLastCalledWith("invalid", invalid);
    }
  });

  it("log() ignores legacy text/background fields", () => {
    const legacyOptions = {
      text: "cyan",
      background: { kind: "bgHex", value: "#102030" },
      modifiers: ["bold", "underline"],
    };

    logger.log("This is a log", legacyOptions);
    expect(logSpy).toHaveBeenCalledTimes(1);
    const called = logSpy.mock.calls[0]![0] as string;
    expect(called).toContain("This is a log");
    expect(called).toContain("\x1b[1m"); // bold still applies
    expect(called).toContain("\x1b[4m"); // underline still applies
    expect(called).not.toContain("\x1b[36m"); // legacy text is ignored
    expect(called).not.toContain("\x1b[48;2;16;32;48m"); // legacy background is ignored
  });

  it("log() keeps old behavior for non-style objects", () => {
    const meta = { three: 3 };
    logger.log("arg1", meta);
    expect(logSpy).toHaveBeenCalledWith("arg1", meta);
  });

  it("trace() is suppressed by default (info level)", () => {
    const traceSpy = vi.spyOn(console, "trace").mockImplementation(() => {});
    logger.trace("trace1", 2, { three: 3 });
    expect(traceSpy).not.toHaveBeenCalled();
    traceSpy.mockRestore();
  });

  it("debug() is suppressed by default (info level)", () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    logger.debug("debug1", 2, { three: 3 });
    expect(debugSpy).not.toHaveBeenCalled();
    debugSpy.mockRestore();
  });

  it("info() prefixes output with [INFO]", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    logger.info("info1", 2, { three: 3 });
    expect(infoSpy).toHaveBeenCalledTimes(1);
    const called = infoSpy.mock.calls[0]![0] as string;
    expect(called).toContain("[INFO]");
    expect(called).toContain("info1");
    infoSpy.mockRestore();
  });

  it("warn() prefixes output with [WARN]", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn("warn1", 2, { three: 3 });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const called = warnSpy.mock.calls[0]![0] as string;
    expect(called).toContain("[WARN]");
    expect(called).toContain("warn1");
    warnSpy.mockRestore();
  });

  it("error() prefixes output with [ERROR]", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("err1", 2, { three: 3 });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const called = errorSpy.mock.calls[0]![0] as string;
    expect(called).toContain("[ERROR]");
    expect(called).toContain("err1");
    errorSpy.mockRestore();
  });

  it("log() with no arguments still calls console.log", () => {
    logger.log();
    expect(logSpy).toHaveBeenCalled();
  });

  it("trace() with no arguments is suppressed by default (info level)", () => {
    const traceSpy = vi.spyOn(console, "trace").mockImplementation(() => {});
    logger.trace();
    expect(traceSpy).not.toHaveBeenCalled();
    traceSpy.mockRestore();
  });

  it("debug() with no arguments is suppressed by default (info level)", () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    logger.debug();
    expect(debugSpy).not.toHaveBeenCalled();
    debugSpy.mockRestore();
  });

  it("info() with no arguments still calls console.info", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    logger.info();
    expect(infoSpy).toHaveBeenCalled();
    infoSpy.mockRestore();
  });

  it("warn() with no arguments still calls console.warn", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("error() with no arguments still calls console.error", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("supports simple color chaining like logger.red(text)", () => {
    logger.red("styled text");
    expect(logSpy).toHaveBeenCalled();
    const called = logSpy.mock.calls[0]![0] as string;
    expect(called).toContain("styled text");
    expect(called).toContain("\x1b[31m"); // red
  });

  it("supports chaining multiple styles like logger.red.bgBlack(text)", () => {
    logger.red.bgBlack("chained");
    const called = logSpy.mock.calls[0]![0] as string;
    expect(called).toContain("chained");
    expect(called).toContain("\x1b[31m"); // red
    expect(called).toContain("\x1b[40m"); // bgBlack
  });

  it("supports modifier chaining like logger.bold.red(text)", () => {
    logger.bold.red("mod text");
    const called = logSpy.mock.calls[0]![0] as string;
    expect(called).toContain("mod text");
    expect(called).toContain("\x1b[1m"); // bold
    expect(called).toContain("\x1b[31m"); // red
  });

  it("supports rgb and bgRgb chainables", () => {
    logger.rgb(50, 51, 52)("rgb text");
    expect(logSpy).toHaveBeenCalledWith("\x1b[38;2;50;51;52mrgb text\x1b[39m");

    logger.bgRgb(4, 5, 6)("bg rgb");
    expect(logSpy).toHaveBeenCalledWith("\x1b[48;2;4;5;6mbg rgb\x1b[49m");
  });

  it("supports rgb/hex chain after an initial style (exercises createSimpleStyled branches)", () => {
    // chaining a hex text style after an existing text style should now throw
    // @ts-ignore
    expect(() => logger.red.rgb(1, 2, 3)("chained rgb")).toThrow();

    // chaining a bgHex after a modifier (no foreground conflict) is allowed
    logger.bold.bgHex("#040506")("chained bgHex");
    const calledBgHex = logSpy.mock.calls[logSpy.mock.calls.length - 1][0] as string;
    expect(calledBgHex).toContain("chained bgHex");
    expect(calledBgHex).toContain("\x1b[48;2;4;5;6m");
  });

  it("supports bgRgb/hex chain after an initial style (remaining createSimpleStyled branches)", () => {
    // chaining a background rgb after a foreground is allowed
    logger.red.bgRgb(7, 8, 9)("chained bgRgb");
    const calledBgRgb = logSpy.mock.calls[logSpy.mock.calls.length - 1][0] as string;
    expect(calledBgRgb).toContain("chained bgRgb");
    expect(calledBgRgb).toContain("\x1b[48;2;7;8;9m");

    // chaining a hex text style after an existing text style should now throw
    // @ts-ignore
    expect(() => logger.red.hex("#112233")("chained hex")).toThrow();
  });

  it("supports hex and bgHex chainables", () => {
    logger.hex("#112233")("hex text");
    expect(logSpy).toHaveBeenCalledWith("\x1b[38;2;17;34;51mhex text\x1b[39m");

    logger.bgHex("#102030")("hex bg");
    expect(logSpy).toHaveBeenCalledWith("\x1b[48;2;16;32;48mhex bg\x1b[49m");
  });

  it("returns undefined for unknown chained properties", () => {
    // Accessing unknown properties on the chained proxy should be undefined
    const chained = (logger as any).red;
    expect((chained as any)._nonExistent).toBeUndefined();
    expect((logger as any)._anotherNonExistent).toBeUndefined();
  });

  it("exposes non-function properties set on the proxy target", () => {
    // Assigning to the proxy should create the property on the target object
    (logger as any).meta = { source: "test" };
    expect((logger as any).meta).toEqual({ source: "test" });
  });
});

describe("createLogger and LOG_LEVEL behavior", () => {
  const originalLogLevel = process.env["LOG_LEVEL"];

  afterEach(() => {
    if (originalLogLevel === undefined) delete process.env["LOG_LEVEL"];
    else process.env["LOG_LEVEL"] = originalLogLevel;
    vi.restoreAllMocks();
  });

  it("default export (createLogger) is a function", () => {
    expect(typeof createLogger).toBe("function");
  });

  it("options.logLevel overrides LOG_LEVEL env var", () => {
    process.env["LOG_LEVEL"] = "error";
    const l = createLogger({ logLevel: "info" });
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    l.info("should print");
    expect(infoSpy).toHaveBeenCalled();
    infoSpy.mockRestore();
  });

  it("reads LOG_LEVEL from environment when no option provided", () => {
    process.env["LOG_LEVEL"] = "error";
    const l = createLogger();
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    l.info("won't print");
    expect(infoSpy).not.toHaveBeenCalled();

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    l.error("will print");
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("LOG_LEVEL is case-insensitive", () => {
    process.env["LOG_LEVEL"] = "ERROR";
    const l = createLogger();
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    l.info("won't print");
    expect(infoSpy).not.toHaveBeenCalled();

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    l.error("will print");
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("prototype properties are not accepted as LOG_LEVEL", () => {
    process.env["LOG_LEVEL"] = "toString";
    const l = createLogger();
    const traceSpy = vi.spyOn(console, "trace").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    l.trace("should be suppressed because fallback is info");
    l.info("should print because fallback is info");

    expect(traceSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();

    traceSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it("invalid LOG_LEVEL falls back to default (info)", () => {
    process.env["LOG_LEVEL"] = "not-a-level";
    const l = createLogger();
    const traceSpy = vi.spyOn(console, "trace").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    l.trace("should be suppressed because fallback is info");
    l.info("should print because fallback is info");
    expect(traceSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();
    traceSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it("invalid options.logLevel falls back to default (info)", () => {
    const l = createLogger({ logLevel: "not-a-level" as any });
    const traceSpy = vi.spyOn(console, "trace").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    l.trace("should be suppressed because fallback is info");
    l.info("should print because fallback is info");
    expect(traceSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();
    traceSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it("styled chainables respect configured level (suppressed at error level)", () => {
    const l = createLogger({ logLevel: "error" });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    (l as any).red("nope");
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("logger.setLevel changes behavior at runtime", () => {
    const l = createLogger({ logLevel: "debug" });
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    l.debug("here");
    expect(debugSpy).toHaveBeenCalled();
    debugSpy.mockRestore();

    // now suppress
    l.setLevel("error");
    const debugSpy2 = vi.spyOn(console, "debug").mockImplementation(() => {});
    l.debug("nope");
    expect(debugSpy2).not.toHaveBeenCalled();
    debugSpy2.mockRestore();
  });

  it("showTime=true prefixes info output with ISO timestamp and [INFO]", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2023-11-07T14:20:35.123Z"));

    const l = createLogger({ showTime: true });
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    l.info("Text");

    expect(infoSpy).toHaveBeenCalledWith("2023-11-07T14:20:35.123Z [INFO] Text");

    infoSpy.mockRestore();
    vi.useRealTimers();
  });

  it("showTime=false still prefixes info output with [INFO]", () => {
    const originalForce = process.env["FORCE_COLOR"];
    const originalNoColor = process.env["NO_COLOR"];
    delete process.env["FORCE_COLOR"];
    process.env["NO_COLOR"] = "1";

    const l = createLogger({ showTime: false });
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    l.info("Text");

    expect(infoSpy).toHaveBeenCalledWith("[INFO] Text");

    infoSpy.mockRestore();
    if (originalForce === undefined) delete process.env["FORCE_COLOR"];
    else process.env["FORCE_COLOR"] = originalForce;

    if (originalNoColor === undefined) delete process.env["NO_COLOR"];
    else process.env["NO_COLOR"] = originalNoColor;
  });

  it("showTime=true colors the label based on level", () => {
    const originalForce = process.env["FORCE_COLOR"];
    const originalNoColor = process.env["NO_COLOR"];
    process.env["FORCE_COLOR"] = "1";
    delete process.env["NO_COLOR"];

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2023-11-07T14:20:35.123Z"));

    const l = createLogger({ showTime: true });
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    l.info("Text");

    expect(infoSpy).toHaveBeenCalledWith("2023-11-07T14:20:35.123Z \x1b[34m[INFO]\x1b[39m Text");

    infoSpy.mockRestore();
    vi.useRealTimers();

    if (originalForce === undefined) delete process.env["FORCE_COLOR"];
    else process.env["FORCE_COLOR"] = originalForce;

    if (originalNoColor === undefined) delete process.env["NO_COLOR"];
    else process.env["NO_COLOR"] = originalNoColor;
  });

  it("accepts partial levelLabels overrides and falls back to defaults", () => {
    const originalForce = process.env["FORCE_COLOR"];
    const originalNoColor = process.env["NO_COLOR"];
    delete process.env["FORCE_COLOR"];
    process.env["NO_COLOR"] = "1";

    const l = createLogger({
      showTime: false,
      levelLabels: { warn: "Warning", error: "!Ahhh..." },
    });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    l.warn("Custom label");
    l.info("Default label");

    expect(warnSpy).toHaveBeenCalledWith("Warning Custom label");
    expect(infoSpy).toHaveBeenCalledWith("[INFO] Default label");

    warnSpy.mockRestore();
    infoSpy.mockRestore();

    if (originalForce === undefined) delete process.env["FORCE_COLOR"];
    else process.env["FORCE_COLOR"] = originalForce;

    if (originalNoColor === undefined) delete process.env["NO_COLOR"];
    else process.env["NO_COLOR"] = originalNoColor;
  });

  it("symbol properties on logger and chained styled proxies return undefined", () => {
    const sym = Symbol("x");
    expect((logger as any)[sym]).toBeUndefined();

    const chained = (logger as any).red as any;
    expect(chained[sym]).toBeUndefined();
  });

  it("exports DEFAULT_LEVEL_LABELS in uppercase brackets", () => {
    expect(DEFAULT_LEVEL_LABELS).toEqual({
      trace: "[TRACE]",
      debug: "[DEBUG]",
      info: "[INFO]",
      warn: "[WARN]",
      error: "[ERROR]",
    });
    expect(DEFAULT_LEVEL_LABELS).not.toHaveProperty("log");
    expect(DEFAULT_LEVEL_LABELS).not.toHaveProperty("off");
  });

  it("DEFAULT_LEVEL_COLORS has no log or off entry", () => {
    expect(DEFAULT_LEVEL_COLORS).not.toHaveProperty("log");
    expect(DEFAULT_LEVEL_COLORS).not.toHaveProperty("off");
    expect(DEFAULT_LEVEL_COLORS.info).toBe("blue");
    expect(DEFAULT_LEVEL_COLORS.warn).toBe("yellow");
    expect(DEFAULT_LEVEL_COLORS.error).toBe("red");
  });

  it("format=json outputs structured JSON with level and message", () => {
    const l = createLogger({ format: "json" });
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    l.info("Test message");

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const jsonStr = infoSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(jsonStr);
    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("Test message");
    expect(parsed.timestamp).toBeUndefined();

    infoSpy.mockRestore();
  });

  it("format=json with showTime=true includes timestamp", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2023-11-07T14:20:35.123Z"));

    const l = createLogger({ format: "json", showTime: true });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    l.warn("Warning text");

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const jsonStr = warnSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(jsonStr);
    expect(parsed.level).toBe("warn");
    expect(parsed.message).toBe("Warning text");
    expect(parsed.timestamp).toBe("2023-11-07T14:20:35.123Z");

    warnSpy.mockRestore();
    vi.useRealTimers();
  });

  it("format=json with multiple args outputs messages array", () => {
    const l = createLogger({ format: "json" });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    l.error("First", "Second", { third: 3 });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const jsonStr = errorSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(jsonStr);
    expect(parsed.level).toBe("error");
    expect(parsed.messages).toEqual(["First", "Second", { third: 3 }]);
    expect(parsed.message).toBeUndefined();

    errorSpy.mockRestore();
  });

  it("format=json with no args omits message fields", () => {
    const l = createLogger({ format: "json" });
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    l.info();

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const jsonStr = infoSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(jsonStr);
    expect(parsed.level).toBe("info");
    expect(parsed.message).toBeUndefined();
    expect(parsed.messages).toBeUndefined();
    expect(parsed.data).toBeUndefined();

    infoSpy.mockRestore();
  });

  it("format=json serializes bigint values without throwing", () => {
    const l = createLogger({ format: "json" });
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    expect(() => l.info({ count: 1n })).not.toThrow();

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const jsonStr = infoSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(jsonStr);
    expect(parsed.level).toBe("info");
    expect(parsed.data).toEqual({ count: "1" });

    infoSpy.mockRestore();
  });

  it("format=json handles circular references", () => {
    const l = createLogger({ format: "json" });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const circular: Record<string, unknown> = { value: 1 };
    circular.self = circular;

    expect(() => l.warn(circular)).not.toThrow();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const jsonStr = warnSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(jsonStr);
    expect(parsed.level).toBe("warn");
    expect(parsed.data.value).toBe(1);
    expect(parsed.data.self).toBe("[Circular]");

    warnSpy.mockRestore();
  });

  it("format=json falls back when payload serialization throws", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2023-11-07T14:20:35.123Z"));

    const l = createLogger({ format: "json", showTime: true });
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const unserializable = {
      toJSON() {
        throw new Error("boom");
      },
    };

    l.info(unserializable);

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const jsonStr = infoSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(jsonStr);
    expect(parsed.level).toBe("info");
    expect(parsed.timestamp).toBe("2023-11-07T14:20:35.123Z");
    expect(parsed.message).toBe("[Unserializable log payload]");

    infoSpy.mockRestore();
    vi.useRealTimers();
  });

  it("plain format handles Error/null/undefined/circular values", () => {
    const originalForce = process.env["FORCE_COLOR"];
    const originalNoColor = process.env["NO_COLOR"];
    delete process.env["FORCE_COLOR"];
    process.env["NO_COLOR"] = "1";

    const l = createLogger();
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const err = new Error("boom");
    delete err.stack;
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;

    l.info(err, null, undefined, circular);

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const output = infoSpy.mock.calls[0]![0] as string;
    expect(output).toContain("[INFO] boom null undefined [object Object]");

    infoSpy.mockRestore();
    if (originalForce === undefined) delete process.env["FORCE_COLOR"];
    else process.env["FORCE_COLOR"] = originalForce;
    if (originalNoColor === undefined) delete process.env["NO_COLOR"];
    else process.env["NO_COLOR"] = originalNoColor;
  });
});
