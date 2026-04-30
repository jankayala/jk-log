// A compact set of examples that showcases the strengths of `ansilogger`:
// - easy, chainable styling (named colors, rgb/hex, background colors)
// - logger convenience proxy (behaves like console.log but with style helpers)
// - TypeScript types and safe runtime errors for invalid chains
//
// Run during development with:
//   npx ts-node-esm examples/basic.ts
// Or after build with:
//   npm run build
//   node dist/examples/basic.js

import { logger, styled, shouldUseColor, stripAnsi } from "../src";

// Basic usage: logger behaves like console.log but also offers style helpers
logger.log("Simple log: this behaves like console.log but lives on the logger object");

// Color helpers — extremely ergonomic for one-liners
logger.red("This is an error (red)");
logger.green.bold("Success message in bold green");

// Background example
logger.bgMagenta.white("White text on magenta background");

// RGB and hex helpers produce a callable that prints with the chosen color
logger.rgb(255, 128, 0)("Orange via rgb(255,128,0)");
logger.hex("#00cc88")("Sea-green via hex");

// styled builds strings (useful when you need to combine styled pieces)
const part1 = styled.bold.yellow("WARNING:");
const part2 = styled.rgb(200, 50, 50)(" disk space low");
console.log(part1 + part2 + " — take action!");

// You can build complex messages of mixed styles
const info = styled.hex("#0066ff").underline("Info");
console.log(`${info}: ${styled.dim("this is an example of combined output")}`);

// stripAnsi is handy when you need the plain text (e.g. for logs or tests)
const colored = styled.bgBlue.white("Hello colored world");
console.log("Raw colored output:", colored);
console.log("Stripped:", stripAnsi(colored));

// show shouldUseColor (respects NO_COLOR / FORCE_COLOR and TTY)
console.log("shouldUseColor():", shouldUseColor());

// Demonstrate that multiple foreground colors cannot be chained (runtime error)
try {
  // This attempts to chain two foreground colors and will throw
  // (styled enforces a single foreground color per styled instance)
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  styled.red.green("this will throw");
} catch (err) {
  console.error("Chaining error caught as expected:", (err as Error).message);
}

// The logger proxy offers the same ergonomic API but prints directly
logger.hex("#ff0077").bold("Fancy logger call with hex + bold");

// Multiple console arguments are preserved by logger.log
logger.log("multiple args:", styled.cyan("one"), "two", 3, { nested: true });

// Example demonstrating safe composition for libraries that need plain values
function formattedUserLine(name: string, status: string) {
  // Compose styled parts but return a plain string for storage
  return stripAnsi(`${styled.green(name)} — ${styled.yellow(status)}`);
}

console.log("Stored/plain user line:", formattedUserLine("alice", "online"));

// End of examples
console.log("--- examples complete ---");
