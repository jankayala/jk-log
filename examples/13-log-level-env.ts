/**
 * Controlling log level via the LOG_LEVEL environment variable.
 *
 * Run: LOG_LEVEL=debug npx tsx examples/13-log-level-env.ts
 * Run: LOG_LEVEL=error npx tsx examples/13-log-level-env.ts
 */
import { createLogger, consoleWriter } from "jk-log";

// When no explicit logLevel is passed, createLogger reads LOG_LEVEL from env
const logger = createLogger({ writers: [consoleWriter()] });

console.log(`LOG_LEVEL env = "${process.env.LOG_LEVEL ?? "(not set)"}"\n`);

logger.trace("trace — weight 10");
logger.debug("debug — weight 20");
logger.info("info  — weight 30");
logger.log("log   — weight 35");
logger.warn("warn  — weight 40");
logger.error("error — weight 50");

