# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
