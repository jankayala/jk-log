import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { httpWriter } from "@/writers";

// Mock node:http
const fakeEnd = vi.fn();
const fakeOn = vi.fn();
const fakeResume = vi.fn();
const fakeResOn = vi.fn((_event: string, cb: () => void) => {
  // Auto-fire "end" callback to simulate response completion
  if (_event === "end") cb();
});

vi.mock("node:http", () => ({
  Agent: class FakeAgent {
    destroy() {}
  },
  request: vi.fn((_opts: any, cb: any) => {
    if (cb) cb({ resume: fakeResume, on: fakeResOn });
    return { on: fakeOn, end: fakeEnd };
  }),
}));

vi.mock("node:https", () => ({
  Agent: class FakeAgent {
    destroy() {}
  },
  request: vi.fn((_opts: any, cb: any) => {
    if (cb) cb({ resume: fakeResume, on: fakeResOn });
    return { on: fakeOn, end: fakeEnd };
  }),
}));

import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

describe("httpWriter", () => {
  let writtenBodies: string[];

  beforeEach(() => {
    writtenBodies = [];
    fakeEnd.mockImplementation((body?: string) => {
      if (body) writtenBodies.push(body);
    });
    vi.mocked(httpRequest).mockClear();
    fakeEnd.mockClear();
    fakeOn.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends a JSON-RPC request on each call with default batchSize 1", () => {
    const writer = httpWriter({ url: "http://localhost:3000/rpc" });
    writer("info", "hello world");

    expect(httpRequest).toHaveBeenCalledTimes(1);
    const opts = vi.mocked(httpRequest).mock.calls[0]![0] as any;
    expect(opts.hostname).toBe("localhost");
    expect(opts.path).toBe("/rpc");
    expect(opts.method).toBe("POST");

    const body = JSON.parse(writtenBodies[0]!);
    expect(body.jsonrpc).toBe("2.0");
    expect(body.method).toBe("log");
    expect(body.params.level).toBe("info");
    expect(body.params.messages).toEqual(["hello world"]);
    expect(body.params.timestamp).toBeDefined();
    expect(body.id).toBe(1);
  });

  it("uses custom method name", () => {
    const writer = httpWriter({ url: "http://localhost:3000/rpc", method: "logEntry" });
    writer("warn", "warning");

    const body = JSON.parse(writtenBodies[0]!);
    expect(body.method).toBe("logEntry");
  });

  it("strips ANSI by default", () => {
    const writer = httpWriter({ url: "http://localhost:3000/rpc" });
    writer("info", "\x1b[31mred\x1b[39m");

    const body = JSON.parse(writtenBodies[0]!);
    expect(body.params.messages[0]).toBe("red");
  });

  it("preserves ANSI when stripAnsi is false", () => {
    const writer = httpWriter({ url: "http://localhost:3000/rpc", stripAnsi: false });
    writer("info", "\x1b[31mred\x1b[39m");

    const body = JSON.parse(writtenBodies[0]!);
    expect(body.params.messages[0]).toContain("\x1b[31m");
  });

  it("includes custom headers", () => {
    const writer = httpWriter({
      url: "http://localhost:3000/rpc",
      headers: { Authorization: "Bearer token123" },
    });
    writer("info", "test");

    const opts = vi.mocked(httpRequest).mock.calls[0]![0] as any;
    expect(opts.headers.Authorization).toBe("Bearer token123");
  });

  it("batches requests when batchSize > 1", () => {
    vi.useFakeTimers();
    const writer = httpWriter({ url: "http://localhost:3000/rpc", batchSize: 3 });

    writer("info", "one");
    writer("info", "two");
    expect(httpRequest).not.toHaveBeenCalled();

    writer("info", "three");
    expect(httpRequest).toHaveBeenCalledTimes(1);

    const body = JSON.parse(writtenBodies[0]!);
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(3);
    expect(body[0].id).toBe(1);
    expect(body[2].id).toBe(3);
    vi.useRealTimers();
  });

  it("flushes partial batch after flushInterval", () => {
    vi.useFakeTimers();
    const writer = httpWriter({
      url: "http://localhost:3000/rpc",
      batchSize: 10,
      flushInterval: 100,
    });

    writer("info", "partial");
    expect(httpRequest).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(httpRequest).toHaveBeenCalledTimes(1);

    const body = JSON.parse(writtenBodies[0]!);
    expect(body.params.messages[0]).toBe("partial");
    vi.useRealTimers();
  });

  it("accepts logLevel option", () => {
    const writer = httpWriter({ url: "http://localhost:3000/rpc", logLevel: "error" });
    expect(writer.logLevel).toBe("error");
  });

  it("has no logLevel when not specified", () => {
    const writer = httpWriter({ url: "http://localhost:3000/rpc" });
    expect(writer.logLevel).toBeUndefined();
  });

  it("passes non-string args as-is", () => {
    const writer = httpWriter({ url: "http://localhost:3000/rpc" });
    writer("info", 42, { key: "val" }, null);

    const body = JSON.parse(writtenBodies[0]!);
    expect(body.params.messages).toEqual([42, { key: "val" }, null]);
  });

  it("increments id across calls", () => {
    const writer = httpWriter({ url: "http://localhost:3000/rpc" });
    writer("info", "a");
    writer("info", "b");

    expect(JSON.parse(writtenBodies[0]!).id).toBe(1);
    expect(JSON.parse(writtenBodies[1]!).id).toBe(2);
  });

  it("silently handles request errors", () => {
    const writer = httpWriter({ url: "http://localhost:3000/rpc" });
    expect(() => writer("error", "fail")).not.toThrow();
  });

  it("handles all log levels", () => {
    const writer = httpWriter({ url: "http://localhost:3000/rpc" });
    const levels = ["trace", "debug", "info", "log", "warn", "error"] as const;
    for (const level of levels) {
      writer(level, level);
    }

    expect(httpRequest).toHaveBeenCalledTimes(6);
    for (let i = 0; i < levels.length; i++) {
      const body = JSON.parse(writtenBodies[i]!);
      expect(body.params.level).toBe(levels[i]);
    }
  });

  it("handles circular references in args without throwing", () => {
    const writer = httpWriter({ url: "http://localhost:3000/rpc" });
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;

    expect(() => writer("info", circular)).not.toThrow();
    const body = JSON.parse(writtenBodies[0]!);
    expect(body.params.messages[0].a).toBe(1);
    expect(body.params.messages[0].self).toBe("[Circular]");
  });

  it("strips ANSI from multiple string args", () => {
    const writer = httpWriter({ url: "http://localhost:3000/rpc" });
    writer("info", "\x1b[31mred\x1b[39m", "plain", "\x1b[34mblue\x1b[39m");

    const body = JSON.parse(writtenBodies[0]!);
    expect(body.params.messages).toEqual(["red", "plain", "blue"]);
  });

  it("handles multiple args with mixed types and stripAnsi", () => {
    const writer = httpWriter({ url: "http://localhost:3000/rpc" });
    writer("info", "\x1b[31mred\x1b[39m", { key: "val" }, "plain");

    const body = JSON.parse(writtenBodies[0]!);
    expect(body.params.messages[0]).toBe("red");
    expect(body.params.messages[1]).toEqual({ key: "val" });
    expect(body.params.messages[2]).toBe("plain");
  });

  it("handles bigint values in args", () => {
    const writer = httpWriter({ url: "http://localhost:3000/rpc" });
    expect(() => writer("info", { count: 1n })).not.toThrow();
    const body = JSON.parse(writtenBodies[0]!);
    expect(body.params.messages[0].count).toBe("1");
  });

  it("handles unserializable objects via safeStringify fallback", () => {
    const writer = httpWriter({ url: "http://localhost:3000/rpc" });
    const evil = {
      toJSON() {
        throw new Error("boom");
      },
    };
    expect(() => writer("info", evil)).not.toThrow();
    const body = JSON.parse(writtenBodies[0]!);
    // Falls back to String(value)
    expect(body.params.messages[0]).toContain("[object Object]");
  });

  it("destroy() flushes buffer and prevents further writes", () => {
    vi.useFakeTimers();
    const writer = httpWriter({ url: "http://localhost:3000/rpc", batchSize: 10 });
    writer("info", "before destroy");
    expect(httpRequest).not.toHaveBeenCalled();

    writer.destroy!();
    expect(httpRequest).toHaveBeenCalledTimes(1);

    // Writes after destroy are ignored
    writer("info", "after destroy");
    expect(httpRequest).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("destroy() is idempotent", () => {
    const writer = httpWriter({ url: "http://localhost:3000/rpc" });
    expect(() => {
      writer.destroy!();
      writer.destroy!();
    }).not.toThrow();
  });

  it("validates unsupported protocol", () => {
    expect(() => httpWriter({ url: "ftp://localhost/rpc" })).toThrow("unsupported protocol");
  });

  it("validates invalid method name", () => {
    expect(() => httpWriter({ url: "http://localhost/rpc", method: "bad method!" })).toThrow(
      "invalid method name",
    );
  });

  it("drops entries when buffer exceeds maxBufferSize", () => {
    vi.useFakeTimers();
    const writer = httpWriter({
      url: "http://localhost:3000/rpc",
      batchSize: 100,
      maxBufferSize: 2,
    });
    writer("info", "one");
    writer("info", "two");
    writer("info", "three"); // should be dropped

    // Force flush
    writer.destroy!();
    expect(httpRequest).toHaveBeenCalledTimes(1);
    const body = JSON.parse(writtenBodies[0]!);
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);
    vi.useRealTimers();
  });

  it("handles empty args", () => {
    const writer = httpWriter({ url: "http://localhost:3000/rpc" });
    writer("info");

    const body = JSON.parse(writtenBodies[0]!);
    expect(body.params.messages).toEqual([]);
  });

  it("handles multiple non-string args", () => {
    const writer = httpWriter({ url: "http://localhost:3000/rpc" });
    writer("info", 42, { key: "val" }, null);

    const body = JSON.parse(writtenBodies[0]!);
    expect(body.params.messages).toEqual([42, { key: "val" }, null]);
  });

  it("queues a pending flush when flush is called while in-flight", () => {
    // Override mock to NOT auto-fire "end", so inFlight stays true
    let endCallback: (() => void) | null = null;
    fakeResOn.mockImplementation((_event: string, cb: () => void) => {
      if (_event === "end") endCallback = cb;
    });

    const writer = httpWriter({ url: "http://localhost:3000/rpc", batchSize: 1 });
    writer("info", "first");
    expect(httpRequest).toHaveBeenCalledTimes(1);

    // Now inFlight is true. Write another entry which triggers flush again.
    writer("info", "second");
    // flush was called but should have set pendingFlush=true since inFlight
    // The second request is NOT sent yet
    expect(httpRequest).toHaveBeenCalledTimes(1);

    // Now simulate the first response completing
    endCallback!();
    // onComplete should have flushed the pending buffer
    expect(httpRequest).toHaveBeenCalledTimes(2);
  });

  it("flushes via queueMicrotask when flushInterval is 0", async () => {
    const writer = httpWriter({
      url: "http://localhost:3000/rpc",
      batchSize: 10,
      flushInterval: 0,
    });
    writer("info", "microtask flush");
    // Before microtask fires, no request yet
    expect(httpRequest).not.toHaveBeenCalled();

    // Wait for microtask to fire
    await Promise.resolve();
    expect(httpRequest).toHaveBeenCalledTimes(1);
    const body = JSON.parse(writtenBodies[0]!);
    expect(body.params.messages).toEqual(["microtask flush"]);
  });

  it("handles request timeout", () => {
    const fakeDestroy = vi.fn();
    let timeoutCb: (() => void) | undefined;

    fakeOn.mockImplementation((event: string, cb: () => void) => {
      if (event === "timeout") timeoutCb = cb;
    });

    vi.mocked(httpRequest).mockImplementation((_opts: any, cb: any) => {
      if (cb) cb({ resume: fakeResume, on: fakeResOn });
      return { on: fakeOn, end: fakeEnd, destroy: fakeDestroy } as any;
    });

    const writer = httpWriter({ url: "http://localhost:3000/rpc" });
    writer("info", "timeout test");

    expect(timeoutCb).toBeDefined();
    timeoutCb!();
    expect(fakeDestroy).toHaveBeenCalled();
  });

  it("preserves ANSI in multiple string args when stripAnsi is false", () => {
    const writer = httpWriter({ url: "http://localhost:3000/rpc", stripAnsi: false });
    writer("info", "\x1b[31mred\x1b[39m", "\x1b[34mblue\x1b[39m");

    const body = JSON.parse(writtenBodies[0]!);
    expect(body.params.messages[0]).toContain("\x1b[31m");
    expect(body.params.messages[1]).toContain("\x1b[34m");
  });

  it("uses HTTPS agent for https URLs", () => {
    const writer = httpWriter({ url: "https://localhost:3000/rpc" });
    writer("info", "secure");
    // The request goes through the https mock
    expect(writtenBodies).toHaveLength(1);
  });

  it("defaults to port 443 for https URLs without explicit port", () => {
    vi.mocked(httpsRequest).mockClear();

    const writer = httpWriter({ url: "https://example.com/rpc" });
    writer("info", "default port");

    const opts = vi.mocked(httpsRequest).mock.calls[0]![0] as any;
    expect(opts.port).toBe(443);
  });

  it("defaults to port 80 for http URLs without explicit port", () => {
    vi.mocked(httpRequest).mockClear();

    const writer = httpWriter({ url: "http://example.com/rpc" });
    writer("info", "default port");

    const opts = vi.mocked(httpRequest).mock.calls[0]![0] as any;
    expect(opts.port).toBe(80);
  });
});
