/**
 * Attaching metadata to every log entry.
 *
 * Run: npx tsx examples/08-metadata.ts
 */
import { consoleWriter, createLogger } from "jk-log";

// Plain format — metadata is appended as JSON
const plainLogger = createLogger({
  metadata: { env: "production", version: "2.0.0" },
  writers: [consoleWriter()],
});
plainLogger.info("Server started on port 3000");
plainLogger.warn("High memory usage");

// JSON format — metadata keys are merged into the JSON object
const jsonLogger = createLogger({
  format: "json",
  metadata: { service: "billing", region: "eu-west-1" },
  writers: [consoleWriter()],
});
jsonLogger.info("Invoice generated");
jsonLogger.error("Payment failed");
