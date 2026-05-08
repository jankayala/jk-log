import { openSync, writeSync, writeFileSync, closeSync } from "node:fs";
import { stripAnsi } from "@/color-support";
import type { LogLevel, MethodLogLevel } from "@/logger";
import type { LogWriter } from "./types";

export type FileWriterOptions = {
  /** Absolute or relative path to the log file. */
  filePath: string;
  /** Strip ANSI escape sequences before writing. Defaults to `true`. */
  stripAnsi?: boolean;
  /** Overwrite the file on creation instead of appending. Defaults to `false`. */
  overwrite?: boolean;
  /** Override the logger's logLevel for this writer. */
  logLevel?: LogLevel;
  /**
   * Number of bytes to buffer before flushing to disk.
   * Set to `0` to disable buffering (flush every write). Defaults to `8192`.
   */
  bufferSize?: number;
};

export function fileWriter(options: FileWriterOptions): LogWriter {
  if (typeof process === "undefined" || typeof process.versions?.node !== "string") {
    throw new Error(
      "[jk-log] fileWriter is only available in Node.js environments. Use consoleWriter for browser support.",
    );
  }

  const { filePath } = options;
  const shouldStrip = options.stripAnsi !== false;
  const maxBuffer = options.bufferSize ?? 8192;

  if (options.overwrite === true) {
    writeFileSync(filePath, "");
  }

  const fd = openSync(filePath, options.overwrite === true ? "w" : "a");
  let buffer = "";
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  function flush() {
    if (buffer.length === 0) return;
    const data = buffer;
    buffer = "";
    if (flushTimer !== null) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    writeSync(fd, data);
  }

  function scheduleFlush() {
    if (flushTimer !== null) return;
    flushTimer = setTimeout(flush, 0);
    // Allow process to exit even if timer is pending (Node.js always has .unref())
    (flushTimer as NodeJS.Timeout).unref();
  }

  let destroyed = false;

  const writer: LogWriter = (level: MethodLogLevel, ...args: unknown[]) => {
    if (destroyed) return;
    const parts = args.map((arg) => {
      if (typeof arg === "string") return arg;
      if (arg === null || arg === undefined) return String(arg);
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    });

    let line = parts.join(" ");
    if (shouldStrip) {
      line = stripAnsi(line);
    }

    buffer += line + "\n";

    if (maxBuffer === 0 || buffer.length >= maxBuffer) {
      flush();
    } else {
      scheduleFlush();
    }
  };

  if (options.logLevel !== undefined) {
    writer.logLevel = options.logLevel;
  }

  /** Flush pending entries, close the file descriptor, and release resources. */
  writer.destroy = () => {
    if (destroyed) return;
    destroyed = true;
    flush();
    closeSync(fd);
  };

  return writer;
}
