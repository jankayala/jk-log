/**
 * Basic logging with the default logger instance.
 *
 * Run: npx tsx examples/01-basic-logging.ts
 */
import { logger } from "jk-log";

// Standard log levels
logger.info("Application started");
logger.debug("Loading configuration…");
logger.warn("Disk usage above 80%");
logger.error("Failed to connect to database");
logger.trace("Entering parseConfig()");
logger.log("Plain log message (no level label)");

// Multiple arguments are joined with a space
logger.info("User", "admin", "logged in from", "192.168.1.1");

// Objects and numbers are serialized automatically
logger.info("Request processed in", 42, "ms", { status: 200 });
