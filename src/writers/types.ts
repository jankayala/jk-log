import type { LogLevel, MethodLogLevel } from "@/logger";

export type LogWriterFn = (level: MethodLogLevel, ...args: unknown[]) => void;

export type LogWriter = LogWriterFn & {
  logLevel?: LogLevel;
  /** Flush pending entries and release resources. */
  destroy?: () => void;
};
