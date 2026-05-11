import { stripAnsi } from "@/color-support";
import { Agent, request as httpRequest } from "node:http";
import { Agent as HttpsAgent, request as httpsRequest } from "node:https";
import type { LogLevel, MethodLogLevel } from "@/logger";
import type { LogWriter } from "./types";

export type HttpWriterOptions = {
  /** The URL of the JSON-RPC server endpoint. */
  url: string;
  /** The JSON-RPC method name to call. Defaults to `"log"`. */
  method?: string;
  /** Strip ANSI escape sequences before sending. Defaults to `true`. */
  stripAnsi?: boolean;
  /** Override the logger's logLevel for this writer. */
  logLevel?: LogLevel;
  /** Additional HTTP headers to include in the request. */
  headers?: Record<string, string>;
  /**
   * Number of log entries to buffer before flushing as a batch request.
   * Set to `1` to send immediately. Defaults to `1`.
   */
  batchSize?: number;
  /** Maximum milliseconds to wait before flushing a partial batch. Defaults to `5000`. */
  flushInterval?: number;
  /**
   * Internal buffer high-water mark in bytes.
   * Writes are buffered in memory and flushed in a single HTTP request when this threshold is reached.
   * Defaults to `16384` (16 KB).
   */
  highWaterMark?: number;
  /** Request timeout in milliseconds. Defaults to `30000` (30s). */
  timeout?: number;
  /** Maximum number of buffered items before dropping new entries. Defaults to `10000`. */
  maxBufferSize?: number;
};

/**
 * Creates a {@link LogWriter} that sends log entries as JSON-RPC 2.0 requests over HTTP or HTTPS.
 *
 * Supports batching, keep-alive connections, configurable flush intervals, and back-pressure
 * handling via a max buffer size. ANSI sequences are stripped by default.
 *
 * Call `writer.destroy()` to flush pending entries and destroy the HTTP agent.
 *
 * @param options - Configuration for URL, batching, timeouts, headers, and log level.
 * @returns A {@link LogWriter} that sends log data over HTTP.
 * @throws If the URL uses an unsupported protocol or the method name is invalid.
 *
 * @example
 * ```ts
 * const writer = httpWriter({
 *   url: "https://logs.example.com/rpc",
 *   batchSize: 10,
 *   flushInterval: 3000,
 * });
 * const log = createLogger({ writers: [writer] });
 * ```
 */
export function httpWriter(options: HttpWriterOptions): LogWriter {
  const { url } = options;

  // Validate URL
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error(
      `httpWriter: unsupported protocol "${parsedUrl.protocol}". Use http: or https:.`,
    );
  }

  // Validate and sanitize method name (alphanumeric, dots, underscores only)
  const rpcMethod = options.method ?? "log";
  if (!/^[a-zA-Z0-9._]+$/.test(rpcMethod)) {
    throw new Error(
      `httpWriter: invalid method name "${rpcMethod}". Only alphanumeric, dots, and underscores are allowed.`,
    );
  }

  const shouldStrip = options.stripAnsi !== false;
  const batchSize = options.batchSize ?? 1;
  const flushInterval = options.flushInterval ?? 5000;
  const highWaterMark = options.highWaterMark ?? 16384;
  const timeout = options.timeout ?? 30000;
  const maxBufferSize = options.maxBufferSize ?? 10000;

  const isHttps = parsedUrl.protocol === "https:";
  const requestFn = isHttps ? httpsRequest : httpRequest;

  // Keep-alive agent for connection reuse
  const agent = isHttps
    ? new HttpsAgent({ keepAlive: true, maxSockets: 10 })
    : new Agent({ keepAlive: true, maxSockets: 10 });

  // Pre-build request options (Content-Length added per request)
  const baseRequestOptions = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (isHttps ? 443 : 80),
    path: parsedUrl.pathname + parsedUrl.search,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Connection: "keep-alive",
      ...options.headers,
    },
    agent,
    timeout,
  };

  function safeStringify(value: unknown): string {
    const seen = new WeakSet<object>();
    try {
      return JSON.stringify(value, (_key, val: unknown) => {
        if (typeof val === "bigint") return val.toString();
        if (typeof val === "object" && val !== null) {
          if (seen.has(val)) return "[Circular]";
          seen.add(val);
        }
        return val;
      });
    } catch {
      return JSON.stringify(String(value));
    }
  }

  // Internal buffer
  let bufferItems: string[] = [];
  let bufferBytes = 0;
  let idCounter = 0;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let flushScheduled = false;
  let destroyed = false;
  let inFlight = false;
  let pendingFlush = false;

  function flush() {
    if (bufferItems.length === 0) return;
    if (inFlight) {
      pendingFlush = true;
      return;
    }

    const body = bufferItems.length === 1 ? bufferItems[0]! : "[" + bufferItems.join(",") + "]";
    bufferItems = [];
    bufferBytes = 0;
    flushScheduled = false;
    if (flushTimer !== null) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }

    inFlight = true;

    const bodyBuffer = Buffer.byteLength(body, "utf8");
    const reqOptions = {
      ...baseRequestOptions,
      headers: {
        ...baseRequestOptions.headers,
        "Content-Length": bodyBuffer,
      },
    };

    const onComplete = () => {
      inFlight = false;
      if (pendingFlush) {
        pendingFlush = false;
        flush();
      }
    };

    const req = requestFn(reqOptions, (res) => {
      res.resume(); // Consume response to free socket back to pool
      res.on("end", onComplete);
    });
    req.on("error", onComplete); // Complete on error too
    req.on("timeout", () => {
      req.destroy();
    });
    req.end(body);
  }

  function scheduleFlush() {
    if (flushTimer !== null || flushScheduled) return;
    if (flushInterval === 0) {
      flushScheduled = true;
      queueMicrotask(flush);
    } else {
      flushTimer = setTimeout(flush, flushInterval);
      // Allow process to exit even if timer is pending
      /* c8 ignore next 3 -- defensive guard for non-Node runtimes where setTimeout returns a number */
      if (typeof flushTimer === "object" && flushTimer !== null && "unref" in flushTimer) {
        (flushTimer as NodeJS.Timeout).unref();
      }
    }
  }

  const writer: LogWriter = (level: MethodLogLevel, ...args: unknown[]) => {
    if (destroyed) return;

    // Drop entries if buffer is full to prevent memory exhaustion
    if (bufferItems.length >= maxBufferSize) return;

    // Build JSON string directly to minimize allocations
    let messagesJson: string;
    if (args.length === 0) {
      messagesJson = "[]";
    } else if (args.length === 1) {
      const arg = args[0];
      if (typeof arg === "string") {
        const val = shouldStrip ? stripAnsi(arg) : arg;
        messagesJson = "[" + JSON.stringify(val) + "]";
      } else {
        messagesJson = "[" + safeStringify(arg) + "]";
      }
    } else {
      const parts: string[] = [];
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (typeof arg === "string") {
          const val = shouldStrip ? stripAnsi(arg) : arg;
          parts.push(JSON.stringify(val));
        } else {
          parts.push(safeStringify(arg));
        }
      }
      messagesJson = "[" + parts.join(",") + "]";
    }

    // Safe counter wrap to prevent exceeding Number.MAX_SAFE_INTEGER
    idCounter = (idCounter % Number.MAX_SAFE_INTEGER) + 1;
    const id = idCounter;

    const serialized =
      '{"jsonrpc":"2.0","method":"' +
      rpcMethod +
      '","params":{"level":"' +
      level +
      '","messages":' +
      messagesJson +
      ',"timestamp":"' +
      new Date().toISOString() +
      '"},"id":' +
      id +
      "}";

    bufferItems.push(serialized);
    bufferBytes += serialized.length;

    // Flush when batch count OR byte threshold is reached
    if (bufferItems.length >= batchSize || bufferBytes >= highWaterMark) {
      flush();
    } else {
      scheduleFlush();
    }
  };

  /** Flush pending entries and destroy the agent. */
  writer.destroy = () => {
    if (destroyed) return;
    destroyed = true;
    flush();
    agent.destroy();
  };

  if (options.logLevel !== undefined) {
    writer.logLevel = options.logLevel;
  }

  return writer;
}
