/**
 * HTTP writer — sends logs as JSON-RPC 2.0 over HTTP.
 *
 * ⚠️  This example requires a running HTTP server that accepts POST requests.
 *     You can use a simple echo server, e.g.:
 *       npx http-echo-server 9999
 *
 * Run: npx tsx examples/12-http-writer.ts
 */
import { createLogger, consoleWriter, httpWriter } from "jk-log";

const http = httpWriter({
  url: "http://localhost:9999/logs",
  method: "application.log", // JSON-RPC method name
  batchSize: 5, // send every 5 entries
  flushInterval: 3000, // or every 3 seconds
  stripAnsi: true,
  headers: {
    Authorization: "Bearer my-token",
  },
});

const logger = createLogger({
  writers: [consoleWriter(), http],
});

logger.info("Log sent to console AND HTTP endpoint");
logger.warn("Warnings also batched to the server");
logger.error("Errors go out immediately if batch threshold is met");

// Flush remaining entries and close connections
setTimeout(() => {
  http.destroy?.();
  console.log("HTTP writer destroyed, pending entries flushed.");
}, 5000);
