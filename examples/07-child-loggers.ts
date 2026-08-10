/**
 * Child loggers with inherited options and merged metadata.
 *
 * Run: npx tsx examples/07-child-loggers.ts
 */
import { consoleWriter, createLogger } from "jk-log";

const rootLogger = createLogger({
  showTime: true,
  metadata: { service: "api-gateway" },
  writers: [consoleWriter()],
});

rootLogger.info("Root logger message");

// Child inherits showTime, writers, and merges metadata
const reqLogger = rootLogger.child({ requestId: "abc-123" });
reqLogger.info("Handling incoming request");

// Grandchild adds more context
const dbLogger = reqLogger.child({ db: "postgres" });
dbLogger.debug("Executing query SELECT * FROM users");
dbLogger.error("Connection timeout");
