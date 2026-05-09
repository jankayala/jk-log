# jk-log

[![npm version](https://img.shields.io/npm/v/jk-log)](https://www.npmjs.com/package/jk-log)
[![license](https://img.shields.io/npm/l/jk-log)](https://github.com/jankayala/jk-log/blob/main/LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/jk-log)](https://bundlephobia.com/package/jk-log)
[![tests](https://github.com/jankayala/jk-log/actions/workflows/ci.yml/badge.svg)](https://github.com/jankayala/jk-log/actions/workflows/ci.yml)

A tiny, zero-dependency Node.js utility that enhances console output with ANSI colors and formatting. Includes a feature-rich logger, an ANSI string builder, and pluggable writers for console, file, and HTTP (JSON-RPC) output.

## Installation

```bash
npm install jk-log
```

## Quick examples

```ts
import { logger, styled, createLogger } from "jk-log";

logger.log("Hello world!");

logger.yellow("A warning message");
logger.red("Error: file not found");
logger.green.bold("Success!");

// styled returns an ANSI string
console.log(styled.hex("#ff00aa").underline("Custom color"));

// styled builds a string you can manipulate or combine
const s = styled.bold.rgb(0, 128, 255)("Info:") + " " + styled.underline("details");
console.log(s);

logger.rgb(255, 0, 0)("Red via RGB");
logger.bgBlue.white("White text on blue background");
```

## Log levels

Five levels (lowest to highest): `trace`, `debug`, `info`, `warn`, `error`. Default: `info`.

```ts
logger.info("Informational message");
logger.warn("Warning");
logger.error("Error");
logger.debug("Won't print at default level");
logger.trace("Won't print either");
```

Change at runtime or via `LOG_LEVEL` env var:

```ts
logger.setLevel("debug");
logger.debug("Now this prints");
```

```bash
LOG_LEVEL=debug node app.js
```

## Custom loggers with `createLogger`

```ts
import { createLogger } from "jk-log";

const log = createLogger({
  showTime: true,       // ISO timestamp prefix
  format: "json",       // "plain" (default) or "json"
  logLevel: "debug",    // minimum log level
  levelColors: { error: "magenta" },
  levelLabels: { info: "[ℹ]", warn: "[⚠]" },
  metadata: { app: "my-server", env: "production" },  // included in every entry
});

log.info("Server started on port 3000");
log.error("Something went wrong", { code: 500 });
```

### JSON format

When `format: "json"`:
```json
{ "level": "info", "timestamp": "2026-05-05T12:00:00.000Z", "message": "Server started", "app": "my-server" }
```

### Child loggers

Create a derived logger with merged metadata:
```ts
const reqLog = log.child({ requestId: "abc-123" });
reqLog.info("Handling request");
```

## Inline style options for `logger.log`

```ts
logger.log("Styled!", { color: "red", modifiers: "bold" });
logger.log("Custom", { hex: "#ff8800", modifiers: ["underline", "italic"] });
logger.log("Background", { bgColor: "bgCyan" });
```

## Writers

Writers route log output to different destinations. Pass them via the `writers` option in `createLogger`. Each writer can have its own `logLevel` override and a `destroy()` method for cleanup.

### consoleWriter

```ts
import { createLogger, consoleWriter } from "jk-log";

const log = createLogger({
  writers: [consoleWriter({ methodMapping: { warn: "error" } })],
});
```

| Option         | Type   | Default       | Description                                          |
| -------------- | ------ | ------------- | ---------------------------------------------------- |
| `methodMapping`| object | `{}`          | Map log levels to console methods (e.g. `warn→error`)|
| `logLevel`     | string | —             | Override the logger's minimum level for this writer  |

### fileWriter

Buffered file output with automatic flushing.

```ts
import { createLogger, fileWriter } from "jk-log";

const log = createLogger({
  writers: [fileWriter({ filePath: "./app.log", stripAnsi: true })],
});

log.info("Logged to a file");
log.error("Error details", new Error("fail"));

// Flush and close when done
log.writers?.[0]?.destroy?.();
```

| Option       | Type    | Default | Description                                      |
| ------------ | ------- | ------- | ------------------------------------------------ |
| `filePath`   | string  | —       | Path to the log file (required)                  |
| `stripAnsi`  | boolean | `true`  | Strip ANSI sequences before writing              |
| `overwrite`  | boolean | `false` | Overwrite file on open instead of appending      |
| `logLevel`   | string  | —       | Override the logger's minimum level              |
| `bufferSize` | number  | `8192`  | Bytes to buffer before flush (`0` = no buffering)|

### httpWriter

Sends log entries as JSON-RPC 2.0 requests with batching and keep-alive.

```ts
import { createLogger, httpWriter } from "jk-log";

const log = createLogger({
  writers: [
    httpWriter({
      url: "https://logs.example.com/rpc",
      method: "log",
      batchSize: 10,
      flushInterval: 2000,
    }),
  ],
});

log.info("Sent via HTTP");
```

| Option           | Type    | Default   | Description                                      |
| ---------------- | ------- | --------- | ------------------------------------------------ |
| `url`            | string  | —         | JSON-RPC endpoint URL (required)                 |
| `method`         | string  | `"log"`   | JSON-RPC method name                             |
| `stripAnsi`      | boolean | `true`    | Strip ANSI before sending                        |
| `logLevel`       | string  | —         | Override the logger's minimum level              |
| `headers`        | object  | `{}`      | Additional HTTP headers                          |
| `batchSize`      | number  | `1`       | Items before flush (`1` = send immediately)      |
| `flushInterval`  | number  | `5000`    | Max ms to wait before flushing a partial batch   |
| `highWaterMark`  | number  | `16384`   | Byte threshold before flush (16 KB)              |
| `timeout`        | number  | `30000`   | Request timeout in ms                            |
| `maxBufferSize`  | number  | `10000`   | Max buffered items before dropping entries       |

## API overview

| Export                   | Description                                                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `logger`                 | Default logger instance (log level `info`). Proxy with all style methods, `log`, `info`, `warn`, `error`, `debug`, `trace`, `setLevel`. |
| `styled`                 | Callable ANSI string builder. Supports chaining: colors, backgrounds, modifiers, `rgb`/`hex`/`bgRgb`/`bgHex`.                           |
| `createLogger(options?)` | Creates a custom logger. Options: `showTime`, `format`, `logLevel`, `levelColors`, `levelLabels`, `metadata`, `writers`.                 |
| `consoleWriter(options?)` | Creates a console output writer.                                                                                                       |
| `fileWriter(options)`     | Creates a buffered file output writer.                                                                                                 |
| `httpWriter(options)`     | Creates an HTTP JSON-RPC output writer.                                                                                                |
| `shouldUseColor()`       | Returns `boolean` — whether color output is enabled.                                                                                    |
| `stripAnsi(text)`        | Removes ANSI escape sequences from a string.                                                                                            |

## Color policy

- Set `NO_COLOR` (any non-empty value) to disable colors.
- Set `FORCE_COLOR=1` (any non-empty value) to force colors.
- By default, colors are enabled when stdout is a TTY.

## Examples

See [`./examples/basic.ts`](https://github.com/jankayala/jk-log/blob/main/examples/basic.ts) and [`./examples/createLogger.ts`](https://github.com/jankayala/jk-log/blob/main/examples/createLogger.ts).

## License

MIT — see LICENSE
