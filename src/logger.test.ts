import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { logger } from "@/logger";

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

  it("trace() forwards arguments to console.trace unchanged", () => {
    const traceSpy = vi.spyOn(console, "trace").mockImplementation(() => {});
    logger.trace("trace1", 2, { three: 3 });
    expect(traceSpy).toHaveBeenCalledWith("trace1", 2, { three: 3 });
    traceSpy.mockRestore();
  });

  it("debug() forwards arguments to console.debug unchanged", () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    logger.debug("debug1", 2, { three: 3 });
    expect(debugSpy).toHaveBeenCalledWith("debug1", 2, { three: 3 });
    debugSpy.mockRestore();
  });

  it("info() forwards arguments to console.info unchanged", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    logger.info("info1", 2, { three: 3 });
    expect(infoSpy).toHaveBeenCalledWith("info1", 2, { three: 3 });
    infoSpy.mockRestore();
  });

  it("warn() forwards arguments to console.warn unchanged", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn("warn1", 2, { three: 3 });
    expect(warnSpy).toHaveBeenCalledWith("warn1", 2, { three: 3 });
    warnSpy.mockRestore();
  });

  it("error() forwards arguments to console.error unchanged", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("err1", 2, { three: 3 });
    expect(errorSpy).toHaveBeenCalledWith("err1", 2, { three: 3 });
    errorSpy.mockRestore();
  });

  it("log() with no arguments still calls console.log", () => {
    logger.log();
    expect(logSpy).toHaveBeenCalled();
  });

  it("trace() with no arguments still calls console.trace", () => {
    const traceSpy = vi.spyOn(console, "trace").mockImplementation(() => {});
    logger.trace();
    expect(traceSpy).toHaveBeenCalled();
    traceSpy.mockRestore();
  });

  it("debug() with no arguments still calls console.debug", () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    logger.debug();
    expect(debugSpy).toHaveBeenCalled();
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
    const called = logSpy.mock.calls[0][0] as string;
    expect(called).toContain("styled text");
    expect(called).toContain("\x1b[31m"); // red
  });

  it("supports chaining multiple styles like logger.red.bgBlack(text)", () => {
    logger.red.bgBlack("chained");
    const called = logSpy.mock.calls[0][0] as string;
    expect(called).toContain("chained");
    expect(called).toContain("\x1b[31m"); // red
    expect(called).toContain("\x1b[40m"); // bgBlack
  });

  it("supports modifier chaining like logger.bold.red(text)", () => {
    logger.bold.red("mod text");
    const called = logSpy.mock.calls[0][0] as string;
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
    // chaining a rgb foreground after an existing foreground should now throw
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

    // chaining a hex foreground after an existing foreground should now throw
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
