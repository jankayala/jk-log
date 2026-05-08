import { describe, it, expect, vi, afterEach } from "vitest";
import { consoleWriter } from "@/writers";

describe("consoleWriter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routes to matching console method by default", () => {
    const writer = consoleWriter();
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    writer("info", "test");
    expect(infoSpy).toHaveBeenCalledWith("test");
  });

  it("routes log level to console.log", () => {
    const writer = consoleWriter();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    writer("log", "msg");
    expect(logSpy).toHaveBeenCalledWith("msg");
  });

  it("routes trace level to console.trace", () => {
    const writer = consoleWriter();
    const traceSpy = vi.spyOn(console, "trace").mockImplementation(() => {});
    writer("trace", "t");
    expect(traceSpy).toHaveBeenCalledWith("t");
  });

  it("routes debug level to console.debug", () => {
    const writer = consoleWriter();
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    writer("debug", "d");
    expect(debugSpy).toHaveBeenCalledWith("d");
  });

  it("routes warn level to console.warn", () => {
    const writer = consoleWriter();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    writer("warn", "w");
    expect(warnSpy).toHaveBeenCalledWith("w");
  });

  it("routes error level to console.error", () => {
    const writer = consoleWriter();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    writer("error", "e");
    expect(errorSpy).toHaveBeenCalledWith("e");
  });

  it("supports methodMapping override", () => {
    const writer = consoleWriter({ methodMapping: { info: "log" } });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    writer("info", "remapped");
    expect(logSpy).toHaveBeenCalledWith("remapped");
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it("supports multiple methodMapping overrides", () => {
    const writer = consoleWriter({ methodMapping: { warn: "error", debug: "log" } });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    writer("warn", "w");
    writer("debug", "d");
    expect(errorSpy).toHaveBeenCalledWith("w");
    expect(logSpy).toHaveBeenCalledWith("d");
  });

  it("handles no args", () => {
    const writer = consoleWriter();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    writer("log");
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith();
  });

  it("passes multiple args through", () => {
    const writer = consoleWriter();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    writer("log", "a", 1, { b: 2 });
    expect(logSpy).toHaveBeenCalledWith("a", 1, { b: 2 });
  });

  it("accepts logLevel option", () => {
    const writer = consoleWriter({ logLevel: "warn" });
    expect(writer.logLevel).toBe("warn");
  });

  it("has no logLevel when not specified", () => {
    const writer = consoleWriter();
    expect(writer.logLevel).toBeUndefined();
  });

  it("has no logLevel when options are empty", () => {
    const writer = consoleWriter({});
    expect(writer.logLevel).toBeUndefined();
  });

  it("unmapped levels still route to their default console method", () => {
    const writer = consoleWriter({ methodMapping: { info: "log" } });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    writer("warn", "still warn");
    expect(warnSpy).toHaveBeenCalledWith("still warn");
  });
});
