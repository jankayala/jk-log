/**
 * Structured JSON log output.
 *
 * Run: npx tsx examples/04-json-format.ts
 */
import { consoleWriter, createLogger } from "jk-log";

const jsonLogger = createLogger({
  format: "json",
  showTime: true,
  writers: [consoleWriter()],
});

// Single string → { level, timestamp, message }
jsonLogger.info("User signed in");

// Multiple args → { level, timestamp, messages }
jsonLogger.warn("Retrying request", 3, "of", 5);

// Object → { level, timestamp, data }
jsonLogger.error({ code: "ECONNREFUSED", host: "db.local", port: 5432 });
