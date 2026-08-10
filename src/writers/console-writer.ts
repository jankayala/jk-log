import type { LogLevel, MethodLogLevel } from "@/logger";
import type { LogWriter } from "./types";

export type ConsoleWriterOptions = {
  /** Map each log method to a specific console function. Defaults to matching console method. */
  methodMapping?: Partial<
    Record<MethodLogLevel, "log" | "info" | "warn" | "error" | "debug" | "trace">
  >;
  /** Override the logger's logLevel for this writer. */
  logLevel?: LogLevel;
};

/**
 * Creates a {@link LogWriter} that routes log entries to the matching `console.*` methods.
 *
 * @param options - Optional configuration for method mapping and log level override.
 * @returns A {@link LogWriter} that outputs to the console.
 *
 * @example
 * ```ts
 * const writer = consoleWriter({ logLevel: "warn" });
 * const log = createLogger({ writers: [writer] });
 * ```
 */
export function consoleWriter(options?: ConsoleWriterOptions): LogWriter {
  const mapping = options?.methodMapping;

  // Pre-resolve method names once to avoid repeated optional-chain lookups per call.
  const methodFor: Record<MethodLogLevel, MethodLogLevel> = {
    trace: mapping?.trace ?? "trace",
    debug: mapping?.debug ?? "debug",
    info: mapping?.info ?? "info",
    log: mapping?.log ?? "log",
    warn: mapping?.warn ?? "warn",
    error: mapping?.error ?? "error",
    fatal: mapping?.fatal ?? "fatal",
    silent: mapping?.silent ?? "silent",
  };

  const resolve = mapping
    ? (level: MethodLogLevel) => methodFor[level]
    : (level: MethodLogLevel) => level;

  /** Map MethodLogLevel to a valid console method name. */
  const toConsoleMethod = (level: MethodLogLevel): string => {
    const resolved = resolve(level);
    if (resolved === "fatal") return "error";
    if (resolved === "silent") return "log";
    return resolved;
  };

  const writer: LogWriter = (level: MethodLogLevel, ...args: unknown[]) => {
    (console[toConsoleMethod(level) as keyof Console] as (...a: unknown[]) => void).call(
      console,
      ...args,
    );
  };

  if (options?.logLevel !== undefined) {
    writer.logLevel = options.logLevel;
  }

  return writer;
}
