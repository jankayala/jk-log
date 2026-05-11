# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Log rotation for `fileWriter`** — two new rotation strategies that can be used independently or combined:
  - `maxFileSize` — rotate when the file exceeds a byte threshold (size-based rotation).
  - `rotationInterval` — rotate after a time interval in milliseconds (time-based rotation).
  - `maxFiles` — limit the number of retained backup files (e.g., `app.1.log`, `app.2.log`, …). Defaults to `5`.
- Rotated files use an index inserted before the file extension (`app.1.log`) or appended for extensionless paths (`app.1`).
- A background timer automatically triggers time-based rotation even when no log calls occur; the timer is `unref()`'d to avoid blocking process exit.
- Full test coverage (100% statements, branches, functions, and lines) for all rotation paths.

## [2.0.0] - 2026-05-08

### Added

- **Writers system** — pluggable log output handlers via a new `writers` option on `createLogger()`:
  - `consoleWriter(options?)` — routes log calls to matching `console.*` methods with optional `methodMapping` to remap levels.
  - `fileWriter(options)` — appends log lines to a file with internal buffering (`bufferSize`, `stripAnsi`, `overwrite` options). Includes `destroy()` for cleanup.
  - `httpWriter(options)` — sends log entries as JSON-RPC 2.0 requests over HTTP/HTTPS with batching, keep-alive, and configurable flush intervals.
  - `LogWriter` / `LogWriterFn` types with per-writer `logLevel` override and optional `destroy()` method.
- `logger.child(metadata)` — create child loggers that inherit parent options and merge additional metadata.
- `metadata` option on `createLogger()` — attach key-value pairs included in every log entry.
- `invalidateColorCache()` — reset the cached result of `shouldUseColor()` after changing environment variables.
- `isBrowser()` utility — detect browser-like environments (vs Node.js).
- `MethodLogLevel` type is now exported.
- Writers barrel export (`src/writers/index.ts`) re-exported from the package entry point.
- Comprehensive tests for all writers, child loggers, and color-support caching.

### Changed

- `shouldUseColor()` now caches its result for performance; use `invalidateColorCache()` to reset.
- `stripAnsi` regex upgraded to a more comprehensive pattern matching SGR, OSC, CSI, and other ANSI escape sequences.
- Default `logger` instance now explicitly uses `[consoleWriter()]` as its writer.
- Hoisted `styleFns` set and other hot-path allocations to module scope for reduced overhead.
- `styled` chain internals optimized to reduce intermediate array allocations.

### Fixed

- `logger.log()` now correctly checks the global `isEnabled("log")` gate, consistent with other log methods.
- `fileWriter` properly exposes `destroy()` to close file descriptors and flush pending data.
- `fileWriter` flush timer is now `unref()`'d to prevent blocking Node.js process exit.
- `httpWriter` handles non-serializable / circular-reference arguments safely.
- `httpWriter` flush race condition resolved with in-flight request tracking.

## [v1.0.2] - 2026-05-05

### Added

- `createLogger(options?)` factory for creating custom logger instances with configurable options:
  - `showTime` — prepend ISO timestamp to log output.
  - `format` — `"plain"` (default) or `"json"` for structured JSON log lines.
  - `logLevel` — minimum log level (`trace`, `debug`, `info`, `warn`, `error`).
  - `levelColors` — override the color used for each log level label.
  - `levelLabels` — override the label text for each log level.
- `logger.setLevel(level)` to change the minimum log level at runtime.
- `LOG_LEVEL` environment variable support for setting the default log level.
- `LoggerLogOptions` — pass inline style option objects to `logger.log()` for ad-hoc styling (color, rgb, hex, bgColor, bgRgb, bgHex, modifiers).
- JSON format mode with circular-reference safety and BigInt serialization.
- New examples: `examples/createLogger.ts` and `examples/logOptions.ts`.

### Changed

- Updated README to document the full current API.

## [v1.0.1] - 2026-05-03

### Added

- Console-compatible logger methods: `logger.warn`, `logger.error`, `logger.info`, `logger.debug`, and `logger.trace`.

### Changed

- Rename internal factory `createAnsiLogger()` to `createLogger()` for clearer API intent.

### Fixed

- Guard `shouldUseColor()` against missing or undefined `process.stdout.isTTY`, preventing errors when using proxied logger color methods like `logger.blue("text")` in non-TTY environments.

## [v1.0.0] - 2026-04-30

### Added

- Initial public API: `logger` and `styled` exports for colored console output.
- Support for named colors, bright colors, background colors and modifiers (bold, italic, underline, etc.).
- RGB and hex color helpers: `rgb(r,g,b)`, `hex("#rrggbb")`, `bgRgb(...)`, `bgHex(...)`.
- `shouldUseColor()` policy honoring `NO_COLOR` and `FORCE_COLOR` env vars and TTY detection.
- `stripAnsi()` utility to remove ANSI sequences from strings.
- TypeScript types and ESM/CJS exports for broad compatibility.
- Tests and coverage configuration (vitest + coverage).

### Changed

- (initial release)

### Fixed

- (initial release)
