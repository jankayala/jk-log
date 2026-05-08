import { describe, it, expect, vi, afterAll, beforeAll, beforeEach } from "vitest";
import { fileWriter } from "@/writers";
import { readFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("fileWriter", () => {
  const testFile = join(tmpdir(), `jk-log-fw-test-${Date.now()}.log`);

  beforeAll(() => {
    process.env["FORCE_COLOR"] = "1";
    delete process.env["NO_COLOR"];
  });

  afterAll(() => {
    if (existsSync(testFile)) unlinkSync(testFile);
  });

  it("appends log lines to a file", () => {
    const writer = fileWriter({ filePath: testFile, overwrite: true, bufferSize: 0 });
    writer("info", "line one");
    writer("warn", "line two");

    const content = readFileSync(testFile, "utf-8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("line one");
    expect(lines[1]).toBe("line two");
  });

  it("strips ANSI by default", () => {
    const writer = fileWriter({ filePath: testFile, overwrite: true, bufferSize: 0 });
    writer("info", "\x1b[31mred text\x1b[39m");

    const content = readFileSync(testFile, "utf-8").trim();
    expect(content).toBe("red text");
  });

  it("preserves ANSI when stripAnsi is false", () => {
    const writer = fileWriter({
      filePath: testFile,
      overwrite: true,
      stripAnsi: false,
      bufferSize: 0,
    });
    writer("info", "\x1b[31mred\x1b[39m");

    const content = readFileSync(testFile, "utf-8").trim();
    expect(content).toContain("\x1b[31m");
  });

  it("handles null arg", () => {
    const writer = fileWriter({ filePath: testFile, overwrite: true, bufferSize: 0 });
    writer("info", null);

    const content = readFileSync(testFile, "utf-8").trim();
    expect(content).toBe("null");
  });

  it("handles undefined arg", () => {
    const writer = fileWriter({ filePath: testFile, overwrite: true, bufferSize: 0 });
    writer("info", undefined);

    const content = readFileSync(testFile, "utf-8").trim();
    expect(content).toBe("undefined");
  });

  it("handles mixed non-string args (null, undefined, objects)", () => {
    const writer = fileWriter({ filePath: testFile, overwrite: true, bufferSize: 0 });
    writer("info", null, undefined, { key: "val" });

    const content = readFileSync(testFile, "utf-8").trim();
    expect(content).toBe('null undefined {"key":"val"}');
  });

  it("serializes objects as JSON", () => {
    const writer = fileWriter({ filePath: testFile, overwrite: true, bufferSize: 0 });
    writer("info", { a: 1, b: [2, 3] });

    const content = readFileSync(testFile, "utf-8").trim();
    expect(content).toBe('{"a":1,"b":[2,3]}');
  });

  it("handles unserializable circular objects gracefully", () => {
    const writer = fileWriter({ filePath: testFile, overwrite: true, bufferSize: 0 });
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;

    writer("info", circular);
    const content = readFileSync(testFile, "utf-8").trim();
    expect(content).toBe("[object Object]");
  });

  it("handles number args", () => {
    const writer = fileWriter({ filePath: testFile, overwrite: true, bufferSize: 0 });
    writer("info", 42);

    const content = readFileSync(testFile, "utf-8").trim();
    expect(content).toBe("42");
  });

  it("handles boolean args", () => {
    const writer = fileWriter({ filePath: testFile, overwrite: true, bufferSize: 0 });
    writer("info", true, false);

    const content = readFileSync(testFile, "utf-8").trim();
    expect(content).toBe("true false");
  });

  it("overwrites file when overwrite is true", () => {
    const writer1 = fileWriter({ filePath: testFile, overwrite: true, bufferSize: 0 });
    writer1("info", "first");

    const writer2 = fileWriter({ filePath: testFile, overwrite: true, bufferSize: 0 });
    writer2("info", "second");

    const content = readFileSync(testFile, "utf-8").trim();
    expect(content).toBe("second");
  });

  it("appends to file when overwrite is false", () => {
    const writer1 = fileWriter({ filePath: testFile, overwrite: true, bufferSize: 0 });
    writer1("info", "first");

    const writer2 = fileWriter({ filePath: testFile, overwrite: false, bufferSize: 0 });
    writer2("info", "second");

    const lines = readFileSync(testFile, "utf-8").trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("first");
    expect(lines[1]).toBe("second");
  });

  it("appends by default (no overwrite option)", () => {
    const writer1 = fileWriter({ filePath: testFile, overwrite: true, bufferSize: 0 });
    writer1("info", "first");

    const writer2 = fileWriter({ filePath: testFile, bufferSize: 0 });
    writer2("info", "second");

    const lines = readFileSync(testFile, "utf-8").trim().split("\n");
    expect(lines).toHaveLength(2);
  });

  it("handles no args (writes empty line)", () => {
    const writer = fileWriter({ filePath: testFile, overwrite: true, bufferSize: 0 });
    writer("info");

    const content = readFileSync(testFile, "utf-8");
    expect(content).toBe("\n");
  });

  it("accepts logLevel option", () => {
    const writer = fileWriter({ filePath: testFile, logLevel: "error", bufferSize: 0 });
    expect(writer.logLevel).toBe("error");
  });

  it("has no logLevel when not specified", () => {
    const writer = fileWriter({ filePath: testFile, overwrite: true, bufferSize: 0 });
    expect(writer.logLevel).toBeUndefined();
  });

  it("destroy() flushes buffer and closes fd", () => {
    const writer = fileWriter({ filePath: testFile, overwrite: true, bufferSize: 8192 });
    writer("info", "buffered line");
    // Before destroy, the line is buffered (not flushed yet since < bufferSize)
    expect(readFileSync(testFile, "utf-8")).toBe("");

    writer.destroy!();
    const content = readFileSync(testFile, "utf-8").trim();
    expect(content).toBe("buffered line");
  });

  it("destroy() is idempotent", () => {
    const writer = fileWriter({ filePath: testFile, overwrite: true, bufferSize: 0 });
    writer("info", "test");
    expect(() => {
      writer.destroy!();
      writer.destroy!();
    }).not.toThrow();
  });

  it("ignores writes after destroy()", () => {
    const writer = fileWriter({ filePath: testFile, overwrite: true, bufferSize: 0 });
    writer("info", "before");
    writer.destroy!();
    writer("info", "after");

    const content = readFileSync(testFile, "utf-8").trim();
    expect(content).toBe("before");
  });

  it("destroy() clears pending flush timer", () => {
    const writer = fileWriter({ filePath: testFile, overwrite: true, bufferSize: 8192 });
    writer("info", "buffered");
    // This triggers scheduleFlush, destroy should clear it
    writer.destroy!();
    const content = readFileSync(testFile, "utf-8").trim();
    expect(content).toBe("buffered");
  });

  it("flushes via timer when buffer is below threshold", async () => {
    const writer = fileWriter({ filePath: testFile, overwrite: true, bufferSize: 8192 });
    writer("info", "timer flush");

    // Wait for the setTimeout(flush, 0) to fire
    await new Promise((resolve) => setTimeout(resolve, 50));
    const content = readFileSync(testFile, "utf-8").trim();
    expect(content).toBe("timer flush");
    writer.destroy!();
  });

  it("does not schedule duplicate flush timers", async () => {
    const writer = fileWriter({ filePath: testFile, overwrite: true, bufferSize: 8192 });
    writer("info", "line1");
    writer("info", "line2");

    await new Promise((resolve) => setTimeout(resolve, 50));
    const content = readFileSync(testFile, "utf-8").trim();
    expect(content).toBe("line1\nline2");
    writer.destroy!();
  });

  it("each line ends with newline", () => {
    const writer = fileWriter({ filePath: testFile, overwrite: true, bufferSize: 0 });
    writer("info", "a");
    writer("info", "b");

    const content = readFileSync(testFile, "utf-8");
    expect(content).toBe("a\nb\n");
  });

  it("handles all log levels", () => {
    const writer = fileWriter({ filePath: testFile, overwrite: true, bufferSize: 0 });
    const levels = ["trace", "debug", "info", "log", "warn", "error"] as const;
    for (const level of levels) {
      writer(level, level);
    }

    const lines = readFileSync(testFile, "utf-8").trim().split("\n");
    expect(lines).toHaveLength(6);
    expect(lines).toEqual(["trace", "debug", "info", "log", "warn", "error"]);
  });

  it("throws in non-Node environments", () => {
    const originalVersions = process.versions;
    Object.defineProperty(process, "versions", {
      value: {},
      writable: true,
      configurable: true,
    });

    try {
      expect(() => fileWriter({ filePath: "test.log" })).toThrow(
        "[jk-log] fileWriter is only available in Node.js environments",
      );
    } finally {
      Object.defineProperty(process, "versions", {
        value: originalVersions,
        writable: true,
        configurable: true,
      });
    }
  });
});
