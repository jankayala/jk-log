/**
 * Centralized color policy for jk-log.
 *
 * Priority (highest → lowest):
 *  1. NO_COLOR=<any non-empty string>  → always disable colors
 *  2. FORCE_COLOR=<any non-empty string> → always enable colors
 *  3. process.stdout.isTTY === true    → enable colors
 *  4. default                          → disable colors
 *
 * Spec reference: https://no-color.org / https://force-color.org
 */
export function shouldUseColor(): boolean {
  if (_colorCacheValid) return _colorCached;

  /* c8 ignore next */
  const proc = typeof process !== "undefined" ? process : undefined;
  const env = proc?.env;

  let result: boolean;

  // NO_COLOR wins over everything else
  if (env?.["NO_COLOR"] !== undefined && env["NO_COLOR"] !== "") {
    result = false;
  }
  // FORCE_COLOR overrides TTY detection
  else if (env?.["FORCE_COLOR"] !== undefined && env["FORCE_COLOR"] !== "") {
    result = true;
  }
  // Fall back to TTY detection
  else {
    result =
      proc !== undefined &&
      typeof proc.stdout === "object" &&
      proc.stdout !== null &&
      proc.stdout.isTTY === true;
  }

  _colorCached = result;
  _colorCacheValid = true;
  return result;
}

let _colorCached = false;
let _colorCacheValid = false;

/**
 * Invalidates the cached result of `shouldUseColor()`.
 * Call this after changing environment variables that affect color support
 * (e.g., `NO_COLOR`, `FORCE_COLOR`) or `process.stdout.isTTY`.
 */
export function invalidateColorCache(): void {
  _colorCacheValid = false;
}

/** Regex that matches all ANSI escape sequences (SGR, OSC, CSI, etc.). */
const ANSI_ESCAPE_RE =
  /[\u001B\u009B][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><~]/g;

/**
 * Removes all ANSI escape sequences from a string.
 * Used when `shouldUseColor()` returns `false`.
 */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_ESCAPE_RE, "");
}

/**
 * Returns `true` when running in a browser-like environment
 * (i.e. `window` / `document` exist and Node.js `process.versions.node` does not).
 */
export function isBrowser(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    (typeof process === "undefined" || typeof process.versions?.node !== "string")
  );
}
