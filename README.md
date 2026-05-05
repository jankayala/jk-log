# jk-log

[![npm version](https://img.shields.io/npm/v/jk-log)](https://www.npmjs.com/package/jk-log)
[![license](https://img.shields.io/npm/l/jk-log)](https://github.com/jankayala/jk-log/blob/main/LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/jk-log)](https://bundlephobia.com/package/jk-log)
[![tests](https://github.com/jankayala/jk-log/actions/workflows/test.yml/badge.svg)](https://github.com/jankayala/jk-log/actions/workflows/test.yml)

A tiny Node.js utility that enhances console.log with ANSI colors and formatting, making terminal output cleaner, more readable, and visually expressive with minimal setup.

## Overview

`jk-log` provides small, lightweight helpers and a logger to enrich terminal output with ANSI colors and formatting.

Main exports:

- `logger` — a configured logger with default createLogger values that writes directly to the console (e.g. `logger.red("...")`).
- `styled` — builds formatted ANSI strings (e.g. `styled.bold.red("text")`).
- `createLogger` — factory to create custom loggers with options (log level, timestamps, JSON format, custom colors/labels).

## Installation

Install from npm:

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

// RGB / background / modifiers
logger.rgb(255, 0, 0)("Red via RGB");
logger.bgBlue.white("White text on blue background");
```

## Log levels

The logger supports five log levels (from lowest to highest priority): `trace`, `debug`, `info`, `warn`, `error`. The default level is `info`.

```ts
logger.info("Informational message");
logger.warn("Warning message");
logger.error("Error message");
logger.debug("This won't print at default level");
logger.trace("This won't print either");
```

Change the level at runtime:

```ts
logger.setLevel("debug");
logger.debug("Now this prints");
```

You can also set the level via the `LOG_LEVEL` environment variable:

```bash
LOG_LEVEL=debug node app.js
```

## Custom loggers with `createLogger`

```ts
import { createLogger } from "jk-log";

const log = createLogger({
  showTime: true, // prepend ISO timestamp to each message
  format: "json", // "plain" (default) or "json"
  logLevel: "debug", // minimum log level
  levelColors: {
    // override colors per level
    error: "magenta",
  },
  levelLabels: {
    // override labels per level
    info: "[ℹ]",
    warn: "[⚠]",
  },
});

log.info("Server started on port 3000");
log.error("Something went wrong", { code: 500 });
```

### JSON format

When `format: "json"` is set, log output is emitted as a single JSON line per call:

```json
{ "level": "info", "timestamp": "2026-05-05T12:00:00.000Z", "message": "Server started" }
```

## Inline style options for `logger.log`

You can pass style option objects after the text argument:

```ts
logger.log("Styled!", { color: "red", modifiers: "bold" });
logger.log("Custom", { hex: "#ff8800", modifiers: ["underline", "italic"] });
logger.log("Background", { bgColor: "bgCyan" });
```

## API overview

| Export                   | Description                                                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `logger`                 | Default logger instance (log level `info`). Proxy with style methods and `log`, `info`, `warn`, `error`, `debug`, `trace`, `setLevel`. |
| `styled`                 | Callable factory returning an ANSI string. Supports chaining: colors, background colors, modifiers, `rgb`/`hex`/`bgRgb`/`bgHex`.       |
| `createLogger(options?)` | Creates a custom logger. Options: `showTime`, `format`, `logLevel`, `levelColors`, `levelLabels`.                                      |
| `shouldUseColor()`       | Returns `boolean` — whether color output is enabled.                                                                                   |
| `stripAnsi(text)`        | Removes ANSI escape sequences from a string.                                                                                           |

## Color policy

- Set `NO_COLOR` (any non-empty value) to disable colors.
- Set `FORCE_COLOR=1` (any non-empty value) to force colors.
- By default, colors are enabled when stdout is a TTY.

## Examples

See [`./examples/basic.ts`](https://github.com/jankayala/jk-log/blob/main/examples/basic.ts) and [`./examples/createLogger.ts`](https://github.com/jankayala/jk-log/blob/main/examples/createLogger.ts).

## License

MIT — see LICENSE

## Contact

Please open issues and pull requests on the GitHub repository.
