/**
 * Using multiple writers: console + file.
 *
 * Run: npx tsx examples/09-writers.ts
 * Check: cat examples/app.log
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { consoleWriter, createLogger, fileWriter } from "jk-log";

const __dirname = dirname(fileURLToPath(import.meta.url));

const file = fileWriter({
  filePath: join(__dirname, "app.log"),
  overwrite: true, // start fresh each run
  stripAnsi: true, // no escape codes in the file
  bufferSize: 0, // flush immediately for this demo
});

const logger = createLogger({
  showTime: true,
  writers: [consoleWriter(), file],
});

logger.info("Written to both console and file");
logger.warn("This warning also goes to the file");
logger.error("Errors are captured everywhere");

// Per-writer log level: file only captures errors
const errorFile = fileWriter({
  filePath: join(__dirname, "errors.log"),
  overwrite: true,
  logLevel: "error", // only error-level goes to this writer
  bufferSize: 0,
});

const logger2 = createLogger({
  writers: [consoleWriter(), errorFile],
});

logger2.info("Console only — file writer filters this out");
logger2.error("This goes to both console and errors.log");

// Clean up file descriptors
file.destroy?.();
errorFile.destroy?.();
