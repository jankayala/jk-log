/**
 * Inline style options passed to `logger.log()`.
 *
 * Run: FORCE_COLOR=1 npx tsx examples/05-inline-style-options.ts
 */
import { consoleWriter, createLogger } from "jk-log";

const logger = createLogger({ writers: [consoleWriter()] });

// Named color
logger.log("Styled via options", { color: "magenta" });

// RGB color with a modifier
logger.log("Orange bold text", { rgb: [255, 165, 0], modifiers: "bold" });

// Hex color with background
logger.log("Custom hex styling", {
  hex: "#00ced1",
  bgHex: "#1c1c1c",
  modifiers: ["bold", "underline"],
});
