/**
 * Using styled methods directly on the logger instance.
 *
 * The logger proxies all `styled` chain properties, so you can call
 * e.g. `logger.red("text")` and it will print styled output via `log`.
 *
 * Run: FORCE_COLOR=1 npx tsx examples/06-logger-styled-methods.ts
 */
import { createLogger, consoleWriter } from "jk-log";

const logger = createLogger({ writers: [consoleWriter()] });

logger.red("Red text via logger");
logger.bold.green("Bold green via logger");
logger.bgYellow.black("Black on yellow via logger");
logger.hex("#ff1493")("Deep pink via logger.hex()");
logger.rgb(100, 200, 50)("Custom RGB via logger.rgb()");
