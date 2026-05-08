/**
 * Console writer with method mapping.
 *
 * Run: npx tsx examples/10-console-writer-options.ts
 */
import { createLogger, consoleWriter } from "jk-log";

// Remap all levels to console.log (useful when console.debug is filtered)
const writer = consoleWriter({
  methodMapping: {
    trace: "log",
    debug: "log",
    info: "log",
    log: "log",
    warn: "warn",
    error: "error",
  },
});

const logger = createLogger({ writers: [writer] });

logger.trace("Routed to console.log via methodMapping");
logger.debug("Also routed to console.log");
logger.info("Also routed to console.log");
logger.warn("Still goes to console.warn");
logger.error("Still goes to console.error");

