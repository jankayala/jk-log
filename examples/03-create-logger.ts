/**
 * Custom logger instances with `createLogger()`.
 *
 * Run: npx tsx examples/03-create-logger.ts
 */
import { createLogger, consoleWriter } from "jk-log";

// Logger with timestamps
const timedLogger = createLogger({
  showTime: true,
  writers: [consoleWriter()],
});
timedLogger.info("This message includes a timestamp");

// Logger with a custom log level (only warn and above)
const prodLogger = createLogger({
  logLevel: "warn",
  writers: [consoleWriter()],
});
prodLogger.debug("This will NOT be printed");
prodLogger.info("This will NOT be printed either");
prodLogger.warn("This WILL be printed");
prodLogger.error("This WILL be printed too");

// Custom level labels and colors
const customLogger = createLogger({
  levelLabels: {
    info: "[ℹ]",
    warn: "[⚠]",
    error: "[✖]",
    debug: "[🐛]",
    trace: "[…]",
  },
  levelColors: {
    info: "cyan",
    warn: "yellowBright",
    error: "redBright",
  },
  writers: [consoleWriter()],
});
customLogger.info("Custom label and color");
customLogger.warn("Custom warning");
customLogger.error("Custom error");

// Change level at runtime
const dynamicLogger = createLogger({
  logLevel: "info",
  writers: [consoleWriter()],
});
dynamicLogger.debug("Hidden at info level");
dynamicLogger.setLevel("debug");
dynamicLogger.debug("Now visible after setLevel('debug')");
