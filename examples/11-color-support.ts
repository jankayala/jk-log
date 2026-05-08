/**
 * Color support detection and ANSI stripping utilities.
 *
 * Run: npx tsx examples/11-color-support.ts
 * Try: NO_COLOR=1 npx tsx examples/11-color-support.ts
 * Try: FORCE_COLOR=1 npx tsx examples/11-color-support.ts
 */
import { shouldUseColor, stripAnsi, styled } from "jk-log";

console.log("Color enabled:", shouldUseColor());

// styled respects shouldUseColor() automatically
const message = styled.red.bold("Hello, world!");
console.log("Styled output:", message);

// stripAnsi removes escape codes from any string
const raw = "\x1b[31m\x1b[1mHello, world!\x1b[22m\x1b[39m";
console.log("Before strip:", raw);
console.log("After strip: ", stripAnsi(raw));
