import { invalidateColorCache } from "@/color-support";

/**
 * Describes how to stub the color environment for a test.
 *
 * - `force: true`  → sets `FORCE_COLOR=1` and clears `NO_COLOR`
 * - `noColor: true` → sets `NO_COLOR=1` and clears `FORCE_COLOR`
 * - otherwise both variables are cleared (no env override)
 * - `isTTY` (when the key is present) overrides `process.stdout.isTTY`
 */
export type ColorEnvOptions = {
  force?: boolean;
  noColor?: boolean;
  isTTY?: boolean | undefined;
};

/**
 * Sets up a color environment (env vars, `isTTY`, and cache invalidation) and
 * returns a restore function that reverts everything. Use in `beforeAll` /
 * `afterAll` pairs to avoid save/restore boilerplate:
 *
 * @example
 * ```ts
 * let restoreColorEnv: () => void;
 * beforeAll(() => {
 *   restoreColorEnv = setColorEnv({ force: true });
 * });
 * afterAll(() => {
 *   restoreColorEnv();
 * });
 * ```
 */
export function setColorEnv(options: ColorEnvOptions): () => void {
  const savedForce = process.env.FORCE_COLOR;
  const savedNoColor = process.env.NO_COLOR;
  const savedIsTTY = process.stdout.isTTY;

  if (options.force === true) process.env.FORCE_COLOR = "1";
  else delete process.env.FORCE_COLOR;

  if (options.noColor === true) process.env.NO_COLOR = "1";
  else delete process.env.NO_COLOR;

  if ("isTTY" in options) {
    Object.defineProperty(process.stdout, "isTTY", {
      value: options.isTTY,
      writable: true,
      configurable: true,
    });
  }

  invalidateColorCache();

  return () => {
    if (savedForce === undefined) delete process.env.FORCE_COLOR;
    else process.env.FORCE_COLOR = savedForce;

    if (savedNoColor === undefined) delete process.env.NO_COLOR;
    else process.env.NO_COLOR = savedNoColor;

    Object.defineProperty(process.stdout, "isTTY", {
      value: savedIsTTY,
      writable: true,
      configurable: true,
    });

    invalidateColorCache();
  };
}

/**
 * Runs `fn` with the given color environment stubbed and restores the previous
 * environment afterwards — even when `fn` throws or rejects:
 *
 * @example
 * ```ts
 * withColors({ force: true }, () => {
 *   expect(styled.red("Hello")).toBe("\x1b[31mHello\x1b[39m");
 * });
 * ```
 */
export function withColors<T>(options: ColorEnvOptions, fn: () => T): T | Promise<T> {
  const restore = setColorEnv(options);
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.then(
        (value) => {
          restore();
          return value;
        },
        (error) => {
          restore();
          throw error;
        },
      );
    }
    restore();
    return result;
  } catch (error) {
    restore();
    throw error;
  }
}
