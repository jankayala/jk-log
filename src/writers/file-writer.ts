import {
  openSync,
  writeSync,
  writeFileSync,
  closeSync,
  statSync,
  renameSync,
  existsSync,
} from "node:fs";
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
  /**
   * Maximum file size in bytes before rotating. When the file exceeds this size
   * after a flush, it is renamed and a new file is opened.
   * Set to `0` or omit to disable rotation.
   */
  maxFileSize?: number;
  /**
   * Maximum number of rotated backup files to keep (e.g., `app.1.log`, `app.2.log`, …).
   * Older files beyond this count are deleted. Defaults to `5`. Only used when rotation is enabled.
   */
  maxFiles?: number;
  /**
   * Maximum age of the current log file in milliseconds before rotating.
   * The age is measured from when the file was created (or when the writer opened it).
   * Set to `0` or omit to disable time-based rotation.
   */
  rotationInterval?: number;
};

/**
 * Creates a {@link LogWriter} that appends log entries to a file with internal buffering.
 *
 * Supports ANSI stripping, configurable buffer size, and automatic log file rotation
 * based on file size or time interval. Only available in Node.js environments.
 *
 * Call `writer.destroy()` to flush pending entries, close the file descriptor, and release resources.
 *
 * @param options - Configuration for file path, buffering, rotation, and log level.
 * @returns A {@link LogWriter} that writes to the specified file.
 * @throws If called outside a Node.js environment.
 *
 * @example
 * ```ts
 * const writer = fileWriter({ filePath: "./app.log", bufferSize: 4096 });
 * const log = createLogger({ writers: [writer] });
 * ```
 */
export function fileWriter(options: FileWriterOptions): LogWriter {
  if (typeof process === "undefined" || typeof process.versions?.node !== "string") {
    throw new Error(
      "[jk-log] fileWriter is only available in Node.js environments. Use consoleWriter for browser support.",
    );
  }

  const { filePath } = options;
  const shouldStrip = options.stripAnsi !== false;
  const maxBuffer = options.bufferSize ?? 8192;
  const maxFileSize = options.maxFileSize ?? 0;
  const maxFiles = options.maxFiles ?? 5;
  const rotationInterval = options.rotationInterval ?? 0;

  if (options.overwrite === true) {
    writeFileSync(filePath, "");
  }

  let fd = openSync(filePath, options.overwrite === true ? "w" : "a");
  let buffer = "";
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let rotationTimer: ReturnType<typeof setTimeout> | null = null;
  let fileOpenedAt = Date.now();

  function getRotatedPath(index: number): string {
    const dotIdx = filePath.lastIndexOf(".");
    if (dotIdx === -1 || dotIdx < filePath.lastIndexOf("/")) {
      return `${filePath}.${index}`;
    }
    return `${filePath.slice(0, dotIdx)}.${index}${filePath.slice(dotIdx)}`;
  }

  function rotate() {
    closeSync(fd);

    // Shift existing rotated files: N-1 → N, …, 1 → 2
    // Files beyond maxFiles are overwritten by renameSync.
    for (let i = maxFiles - 1; i >= 1; i--) {
      const from = getRotatedPath(i);
      const to = getRotatedPath(i + 1);
      if (existsSync(from)) {
        renameSync(from, to);
      }
    }

    // Current → .1
    renameSync(filePath, getRotatedPath(1));

    // Open fresh file
    fd = openSync(filePath, "w");
    fileOpenedAt = Date.now();
    scheduleRotationTimer();
  }

  function flush() {
    if (buffer.length === 0) return;
    const data = buffer;
    buffer = "";
    if (flushTimer !== null) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    writeSync(fd, data);

    // Check size-based rotation after flush
    if (maxFileSize > 0) {
      try {
        const stat = statSync(filePath);
        if (stat.size >= maxFileSize) {
          rotate();
          return;
        }
      } catch {
        // File may have been removed externally; ignore
      }
    }

    // Check time-based rotation after flush
    if (rotationInterval > 0 && Date.now() - fileOpenedAt >= rotationInterval) {
      rotate();
    }
  }

  function scheduleFlush() {
    if (flushTimer !== null) return;
    flushTimer = setTimeout(flush, 0);
    // Allow process to exit even if timer is pending (Node.js always has .unref())
    (flushTimer as NodeJS.Timeout).unref();
  }

  function scheduleRotationTimer() {
    if (rotationInterval <= 0) return;
    if (rotationTimer !== null) {
      clearTimeout(rotationTimer);
    }
    rotationTimer = setTimeout(() => {
      rotationTimer = null;
      flush();
      // flush() will call rotate() if the interval has elapsed and there was data.
      // If flush had no data, we still need to rotate the (possibly non-empty) file.
      /* c8 ignore next -- false branch only reachable if flush() already rotated (race with scheduleFlush) */
      if (Date.now() - fileOpenedAt >= rotationInterval) {
        try {
          const stat = statSync(filePath);
          if (stat.size > 0) {
            rotate();
          } else {
            // File is empty, just reset the timer
            fileOpenedAt = Date.now();
            scheduleRotationTimer();
          }
        } catch {
          fileOpenedAt = Date.now();
          scheduleRotationTimer();
        }
      }
    }, rotationInterval);
    (rotationTimer as NodeJS.Timeout).unref();
  }

  // Start the initial rotation timer if configured
  scheduleRotationTimer();

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

  writer.flush = flush;

  /** Flush pending entries, close the file descriptor, and release resources. */
  writer.destroy = () => {
    if (destroyed) return;
    destroyed = true;
    if (rotationTimer !== null) {
      clearTimeout(rotationTimer);
      rotationTimer = null;
    }
    flush();
    closeSync(fd);
  };

  return writer;
}
