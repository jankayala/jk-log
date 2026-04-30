/**
 * Centralized color policy for styled-log-ts.
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
  // NO_COLOR wins over everything else
  if (process.env["NO_COLOR"] !== undefined && process.env["NO_COLOR"] !== "") {
    return false;
  }

  // FORCE_COLOR overrides TTY detection
  if (process.env["FORCE_COLOR"] !== undefined && process.env["FORCE_COLOR"] !== "") {
    return true;
  }

  // Fall back to TTY detection
  return !!process.stdout.isTTY;
}

/** Regex that matches all ANSI escape sequences. */
const ANSI_ESCAPE_RE = /\x1b\[[0-9;]*m/g;

/**
 * Removes all ANSI escape sequences from a string.
 * Used when `shouldUseColor()` returns `false`.
 */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_ESCAPE_RE, "");
}
