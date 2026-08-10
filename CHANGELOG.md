# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Benchmark script** — new `bench/index.mjs` (zero-dependency, built on `node:perf_hooks`) measures the cached color check, `stripAnsi`, `styled`, the logger fast/suppressed paths, JSON format, and chainable styled methods so future perf work can be measured instead of assumed. Run with `npm run bench` (builds first).
- **Biome linting + type checking** — Biome (a Rust-based all-in-one linter, formatter, and import organizer) replaces Prettier via a new `biome.json` that matches the previous style (2-space, double quotes, trailing commas, 100 cols). Added `npm run lint`, `npm run check`, and `npm run typecheck` scripts; CI now runs `npm run check` and `npm run typecheck`.
- **Pre-commit hooks** — husky 9 + lint-staged 15: staged files are auto-formatted/linted with Biome (`check --write`), then `npm run lint` + `npm run typecheck` run before every commit.
- **`"sideEffects": false`** in `package.json` — lets bundlers tree-shake the library.

### Changed

- **Reduced color-stub boilerplate in tests** — new `src/test-utils.ts` helper (`withColors({ force, noColor, isTTY }, fn)` and `setColorEnv(options)`) centralizes env manipulation plus `invalidateColorCache()` calls, trimming ~300 lines across the `color-support`, `logger`, `styled`, and `file-writer` test suites.
- **Source cleanups** — `Object.hasOwn` instead of `Object.prototype.hasOwnProperty.call` in the logger, `for...of` loops over arrays in `styled`/`logger`, template literals in `fileWriter`/`httpWriter`, and a pre-resolved `methodFor` lookup table in `consoleWriter` (no behavior changes).

### Removed

- **Dead in-flight counter in `httpWriter`** — dropped the leaky `inFlightCount` that never decremented on request timeout; requests now run fully concurrently.

## [v2.1.4] - 2026-08-08

### Changed

- **Dev dependency updates** — upgraded TypeScript to 7.0.2, tsdown to 0.22.14, Prettier to 3.9.6, Vitest and `@vitest/coverage-v8` to 4.1.10, and `@types/node` to 26.2.0.

## [v2.1.3] - 2026-06-23

### Changed

- **Build performance: 18x faster** — switched DTS generation from tsc to Oxc via `isolatedDeclarations`, and enabled CJS re-export stubs to avoid a full second type-checking pass. Build time dropped from ~12s to ~700ms.
- **Type safety** — added explicit type annotations on `ANSI_CODES` and `logger` for `isolatedDeclarations` compliance, catching previously implicit export types.

## [v2.1.2] - 2026-05-22

### Changed

- **Performance: single-writer fast path** — when only one writer is configured (the common case), the logger bypasses the writer loop entirely, eliminating iterator overhead and enabling V8 to inline the call.
- **Performance: faster JSON serialization** — `stringifyJsonLog` now attempts plain `JSON.stringify` first and only falls back to the expensive replacer (circular-ref/BigInt handling) when the fast path throws. Most payloads avoid the replacer entirely.
- **Performance: pre-computed metadata** — `Object.entries(metadata)` and the serialized metadata suffix are computed once at logger creation time instead of on every log call, removing per-call allocations.
- **Performance: avoid argument spreading** — writer invocations now use a `switch` on `args.length` (0, 1, 2) to call writers without spread for the common cases, reducing array frame allocations.
- **Performance: HTTP writer concurrent requests** — `httpWriter` no longer serializes requests behind a single in-flight gate. Multiple batches can now be in flight concurrently (up to `maxSockets`), eliminating head-of-line blocking.

## [v2.1.1] - 2026-05-21

### Changed

- **Performance: early level guard before formatting** — all level methods (`trace`, `debug`, `info`, `warn`, `error`, `fatal`) now check the effective minimum log level before any argument formatting or prefix construction. Disabled levels exit in ~20ns instead of performing full serialization.

## [v2.1.0] - 2026-05-19

### Added

- **`fatal` log level** — new highest-severity level (weight `60`, above `error`). Uses magenta color and `[FATAL]` label. Maps to `console.error` in the console writer.
- **`silent` log level** — set `logLevel: "silent"` (weight: `Infinity`) to suppress all output without removing the logger. Useful for testing or temporarily muting a logger.
- **`logger.flush()` method** — flushes all pending buffered entries across all writers. Useful before process exit to avoid losing logs in `fileWriter` or `httpWriter`.
- **`logger.destroy()` method** — calls `destroy()` on all writers, flushing pending data and releasing resources (file descriptors, HTTP agents).
- **`flush` property on `LogWriter` type** — writers can now expose a `flush()` method for flushing without destroying. Both `fileWriter` and `httpWriter` implement it.
- **`engines` field in `package.json`** — specifies `"node": ">=18"` as the minimum supported Node.js version.

### Changed

- `LogLevel` type now includes `"fatal"` and `"silent"`.
- `MethodLogLevel` type now includes `"fatal"` and `"silent"`.
- `DEFAULT_LEVEL_COLORS` and `DEFAULT_LEVEL_LABELS` now include entries for `fatal`.
- `Logger` type now includes `fatal()`, `flush()`, and `destroy()` methods.
- Console writer maps `fatal` to `console.error` since `console.fatal` does not exist.

## [v2.0.1] - 2026-05-11

### Added

- **`logger.isLevelEnabled(level)`** — cheap boolean check so callers can skip expensive string formatting when a level is suppressed. Checks all configured writers (including per-writer `logLevel` overrides).
- **Pretty-printing objects in plain format** — objects and arrays are now formatted with `util.inspect` instead of `JSON.stringify`, producing readable multi-line output with colors, circular-reference handling, and depth limiting. JSON format output is unchanged.
- **JSDoc comments on all public functions** — `createLogger`, `styled`, `consoleWriter`, `fileWriter`, `httpWriter`, and the default `logger` instance now have JSDoc descriptions visible in IDE tooltips.
- **Log rotation for `fileWriter`** — two new rotation strategies that can be used independently or combined:
  - `maxFileSize` — rotate when the file exceeds a byte threshold (size-based rotation).
  - `rotationInterval` — rotate after a time interval in milliseconds (time-based rotation).
  - `maxFiles` — limit the number of retained backup files (e.g., `app.1.log`, `app.2.log`, …). Defaults to `5`.
- Rotated files use an index inserted before the file extension (`app.1.log`) or appended for extensionless paths (`app.1`).
- A background timer automatically triggers time-based rotation even when no log calls occur; the timer is `unref()`'d to avoid blocking process exit.
- Full test coverage (100% statements, branches, functions, and lines) for all rotation paths.

### Changed

- Plain format `formatArg` now uses `util.inspect` for objects/arrays instead of `JSON.stringify`, producing more readable output with color support and circular-reference handling.
- **Performance: `shouldUseColor()` called once per styled invocation** — previously called once per ANSI style in the chain (e.g., `styled.red.bold.italic("text")` triggered 3 calls); now checked a single time before applying all styles.
- **Performance: incremental `StyleAnalysis` in `styled` chains** — adding a style to a chain no longer re-scans all previous styles to classify foreground/background conflicts. Analysis is extended in O(1) via `extendAnalysis()` instead of recomputed in O(n) via the removed `analyzeStyles()`.
- **Performance: Logger Proxy method caching** — bound logger methods (`log`, `info`, `warn`, etc.) are now cached in a `Map` on first access, eliminating repeated `Function.prototype.bind` calls in hot loops.

## [v2.0.0] - 2026-05-08

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
