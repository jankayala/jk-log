/**
 * Using the `styled` API for colorful terminal output.
 *
 * Run: FORCE_COLOR=1 npx tsx examples/02-styled-output.ts
 */
import { styled } from "jk-log";

// Named colors
console.log(styled.red("Error: something went wrong"));
console.log(styled.green("Success!"));
console.log(styled.blue("Info message"));
console.log(styled.yellow("Warning"));

// Modifiers
console.log(styled.bold("Bold text"));
console.log(styled.italic("Italic text"));
console.log(styled.underline("Underlined text"));
console.log(styled.strikethrough("Deprecated"));

// Chain a color + modifier
console.log(styled.bold.red("Bold red error"));
console.log(styled.italic.cyan("Italic cyan note"));
console.log(styled.underline.green("Underlined green success"));

// Background colors
console.log(styled.bgRed.white("White on red"));
console.log(styled.bgBlue.yellowBright("Bright yellow on blue"));

// RGB and Hex colors
console.log(styled.rgb(255, 165, 0)("Orange via RGB"));
console.log(styled.hex("#ff69b4")("Hot pink via Hex"));
console.log(styled.bgRgb(0, 0, 128)("Text on navy background"));
console.log(styled.bgHex("#2e8b57")("Text on sea-green background"));

// Combine foreground + background + modifier
console.log(styled.bold.hex("#ff6347").bgHex("#1a1a2e")("Tomato on dark blue, bold"));
