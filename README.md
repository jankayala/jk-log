# ansilogger

A tiny Node.js utility that enhances console.log with ANSI colors and formatting, making terminal output cleaner, more readable, and visually expressive with minimal setup.

## Overview

`ansilogger` provides small, lightweight helpers and a logger to enrich terminal output with ANSI colors and formatting.

Main exports:

- `logger` — a configured logger that writes directly to the console (e.g. `logger.red("...")`).
- `styled` — builds formatted ANSI strings (e.g. `styled.bold.red("text")`).

## Installation

Install from npm:

```bash
npm install ansilogger
```

## Quick examples

```ts
import { logger, styled } from "ansilogger";

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

Color hints:

- Set `NO_COLOR` (any non-empty value) to disable colors.
- Set `FORCE_COLOR=1` (any non-empty value) to force colors.
- By default, colors are enabled when stdout is a TTY.

Example: [`./examples/basic.ts`](https://github.com/jankayala/ansilogger/blob/main/examples/basic.ts)

## API overview

- `logger` — a proxy-like object with `log(...)` plus style methods (e.g. `red`, `bgBlue`, `rgb(...)`, `hex(...)`).
- `styled` — callable factory that returns an ANSI string; supports chaining, `rgb`/`hex`/`bgRgb`/`bgHex` and modifiers such as `bold`, `underline`.
- `shouldUseColor(): boolean` — decides whether color should be used.
- `stripAnsi(text: string): string` — removes ANSI formatting from a string.

See the source in `src/` for details and full typings.

## License

MIT — see LICENSE

## Contact

Please open issues and pull requests on the GitHub repository.
