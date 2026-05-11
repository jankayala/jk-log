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
  const methodFor: Record<string, MethodLogLevel> = Object.create(null);
  if (mapping) {
    const levels: MethodLogLevel[] = ["trace", "debug", "info", "log", "warn", "error"];
    for (const level of levels) {
      methodFor[level] = mapping[level] ?? level;
    }
  }

  const resolve = mapping
    ? (level: MethodLogLevel) => methodFor[level]!
    : (level: MethodLogLevel) => level;

  const writer: LogWriter = (level: MethodLogLevel, ...args: unknown[]) => {
    (console[resolve(level)] as (...a: unknown[]) => void).call(console, ...args);
  };

  if (options?.logLevel !== undefined) {
    writer.logLevel = options.logLevel;
  }

  return writer;
}
