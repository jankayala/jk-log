# AI Coding Agent Guide for jk-log

## Project Overview

**jk-log** is a zero-dependency, lightweight Node.js/TypeScript library that wraps `console.*` methods with ANSI color/formatting support. It is published on npm as `jk-log`.

## Tech Stack

- **Language:** TypeScript (v6, strict mode, ESNext target)
- **Module system:** ESM (`"type": "module"` in package.json), dual CJS/ESM output
- **Bundler:** tsdown (entry: `src/index.ts`, outputs ESM `.mjs`, CJS `.cjs`, `.d.mts`)
- **Test framework:** Vitest (v4) with `@vitest/coverage-v8`
- **Formatter & linter:** Biome (all-in-one lint + format + import organization)
- **Git hooks:** husky 9 + lint-staged 15 — `.husky/pre-commit` runs `npx lint-staged` (Biome `check --write` on staged files), then `npm run lint` + `npm run typecheck`. Hooks are skipped with `HUSKY=0` or `git commit --no-verify`.
- **Path aliases:** `@/*` → `./src/*` (configured in `tsconfig.json`, resolved by tsdown/vitest)
- **No runtime dependencies** — everything is self-contained

## Source Structure

```
src/
  index.ts            — barrel re-export of all modules
  color-support.ts    — shouldUseColor() and stripAnsi() utilities
  styled.ts           — ANSI styling engine (styled chain API via Proxy)
  logger.ts           — createLogger() factory and default logger instance
  *.test.ts           — co-located Vitest test files
  logger.typecheck.ts — compile-time type-level tests
  writers/
    index.ts          — barrel re-export of all writers and types
    types.ts          — LogWriter and LogWriterFn types
    console-writer.ts — consoleWriter() factory
    file-writer.ts    — fileWriter() factory (buffered file output)
    http-writer.ts    — httpWriter() factory (JSON-RPC over HTTP/HTTPS)
```

## Architecture & Key Concepts

### `styled` (src/styled.ts)

- Chainable ANSI string builder using `Proxy` objects.
- Supports named colors (`red`, `blue`, …), background colors (`bgRed`, …), modifiers (`bold`, `italic`, …), and `rgb()`/`hex()`/`bgRgb()`/`bgHex()` methods.
- **Enforces single foreground + single background color** per chain at both type-level and runtime (throws `Error` on conflict).
- Respects `shouldUseColor()` — returns plain text when colors are disabled.
- Key types: `StyledChain<HasTextStyle, HasBackgroundStyle>`, `StyleName`, `ColorName`, `BgColorName`, `ModifierName`.

### `createLogger` / `logger` (src/logger.ts)

- Factory function returning a `Logger` object (Proxy-based).
- Logger methods: `log`, `trace`, `debug`, `info`, `warn`, `error`, `setLevel`.
- Also exposes all `styled` chain methods directly on the logger (e.g., `logger.red("text")` prints styled text).
- Options: `showTime` (ISO timestamp prefix), `format` (`"plain"` | `"json"`), `logLevel`, `levelColors`, `levelLabels`, `writers` (array of output handlers), `metadata` (key-value pairs included in every log entry).
- `writers`: optional `[LogWriter, ...LogWriter[]]` array. When omitted, defaults to `[consoleWriter()]`. All writers receive every log call in order.
- Log level resolution: explicit option → `LOG_LEVEL` env var → default `"info"`.
- Level weights: trace(10) < debug(20) < info(30) < log(35) < warn(40) < error(50).
- `logger.log()` supports inline style option objects as additional arguments (auto-detected via `isLoggerLogOptions`).
- JSON format outputs single-line JSON with `level`, `timestamp?`, `message?`/`messages?`/`data?`. Handles circular refs and BigInt.

### Writers (src/writers/)

**`LogWriter` type** (`types.ts`): `LogWriterFn & { logLevel?: LogLevel; destroy?: () => void }` where `LogWriterFn = (level: MethodLogLevel, ...args: unknown[]) => void`. Individual writers can override the logger's `logLevel` via their own `logLevel` property and expose a `destroy()` method for cleanup.

- **`consoleWriter(options?)`** — routes to matching `console.*` methods. Supports `methodMapping` to remap levels.
- **`fileWriter(options)`** — appends log lines to a file with internal buffering. Options: `filePath`, `stripAnsi` (default `true`), `overwrite` (default `false`), `logLevel`, `bufferSize` (default `8192` bytes, `0` to disable).
- **`httpWriter(options)`** — sends log entries as JSON-RPC 2.0 requests over HTTP/HTTPS with batching and keep-alive. Options: `url`, `method` (default `"log"`), `stripAnsi` (default `true`), `logLevel`, `headers`, `batchSize` (default `1`), `flushInterval` (default `5000`ms), `highWaterMark` (default `16384` bytes), `timeout` (default `30000`ms), `maxBufferSize` (default `10000`).

### Color Support (src/color-support.ts)

- `shouldUseColor()`: NO_COLOR env → disable; FORCE_COLOR env → enable; `process.stdout.isTTY` → enable; else disable.
- `stripAnsi(text)`: removes ANSI escape sequences via regex.

## Build & Development Commands

| Command                | Description                                   |
| ---------------------- | --------------------------------------------- |
| `npm run build`        | Bundle with tsdown → `dist/`                  |
| `npm test`             | Run all Vitest tests                          |
| `npm run coverage`     | Run tests with V8 coverage                    |
| `npm run format`       | Format all files with Biome                   |
| `npm run format:check` | Check formatting without writing (Biome)      |
| `npm run lint`         | Lint all files with Biome                     |
| `npm run check`        | Format + lint + organize imports (Biome)      |
| `npm run typecheck`    | Type-check all sources with `tsc --noEmit`    |

## Testing Conventions

- Test files are co-located: `src/foo.test.ts` tests `src/foo.ts`.
- Tests use Vitest (`describe`, `it`, `expect`, `vi.spyOn`, `vi.stubEnv`).
- Environment variables (`FORCE_COLOR`, `NO_COLOR`, `LOG_LEVEL`) are stubbed in tests.
- `logger.typecheck.ts` contains `@ts-expect-error` annotations for compile-time type safety validation.
- Coverage target: 100% across all source files.

## Important Patterns

- **Proxy pattern**: Both `styled` and `Logger` use `Proxy` for dynamic property chaining.
- **Discriminated union types**: `LoggerTextStyleOptions` / `LoggerBackgroundStyleOptions` use mutually exclusive properties (`color` vs `rgb` vs `hex`) enforced at type level with `never`.
- **Type-level error messages**: Impossible combinations surface custom error message types (e.g., `"Not allowed to define more than 1 text color style option"`).
- **No classes** — functional style throughout.

## Common Pitfalls for AI Agents

1. **Path alias `@/`**: Always use `@/module` for internal imports, not relative paths.
2. **Color in tests**: Tests must set `FORCE_COLOR=1` (or stub `shouldUseColor`) to get ANSI output, otherwise assertions on styled strings will fail.
3. **Proxy usage**: Adding new properties to `Logger` or `styled` requires updating the Proxy `get` trap, not just adding a method.
4. **Dual format output**: Any public API changes must work in both ESM and CJS builds.
5. **Strict TypeScript**: `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` are enabled — be precise with `undefined` vs optional.

## Public Exports (from src/index.ts)

- `logger` — default Logger instance
- `createLogger(options?)` — Logger factory
- `styled` — ANSI string builder
- `shouldUseColor()` — color policy check
- `stripAnsi(text)` — strip ANSI sequences
- `consoleWriter(options?)` — built-in console writer
- `fileWriter(options)` — built-in file writer
- `httpWriter(options)` — built-in HTTP/JSON-RPC writer
- All relevant types: `LogLevel`, `LogFormat`, `Logger`, `LoggerOptions`, `LoggerLogOptions`, `LoggerLevelColors`, `LoggerLevelLabels`, `LogWriter`, `LogWriterFn`, `ConsoleWriterOptions`, `FileWriterOptions`, `HttpWriterOptions`, `MethodLogLevel`, `StyleName`, `ColorName`, `BgColorName`, `ModifierName`, `StyledChain`, `Styled`, `StyleOptions`, etc.
