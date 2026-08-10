import { performance } from "node:perf_hooks";

import { createLogger, shouldUseColor, stripAnsi, styled } from "../dist/index.mjs";

// No-op writer so we measure jk-log itself, not console/file/network I/O.
const noopWriter = () => {};

const log = createLogger({ writers: [noopWriter] });
const logJson = createLogger({ format: "json", writers: [noopWriter] });
const logSuppressed = createLogger({ logLevel: "error", writers: [noopWriter] });
const logStyled = createLogger({ writers: [noopWriter] });

function formatNumber(value) {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} G`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)} M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)} k`;
  return value.toFixed(0);
}

function bench(name, fn, iterations = 1_000_000) {
  for (let i = 0; i < 20_000; i++) fn(); // warm-up so the JIT has seen the hot path
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const elapsedMs = performance.now() - start;
  const opsPerSec = (iterations / elapsedMs) * 1000;
  const nsPerOp = (elapsedMs * 1e6) / iterations;
  console.log(
    `${name.padEnd(50)} ${formatNumber(opsPerSec).padStart(7)} ops/s ${nsPerOp.toFixed(0).padStart(7)} ns/op`,
  );
}

shouldUseColor(); // prime the color cache so the cached path is measured

console.log(`jk-log benchmark — Node ${process.version} (${process.platform}/${process.arch})`);
console.log("");

bench("shouldUseColor() (cached)", () => shouldUseColor());
bench('stripAnsi("\\x1b[31mtext\\x1b[39m")', () => stripAnsi("\x1b[31mtext\x1b[39m"), 200_000);
bench('styled.red("Hello")', () => styled.red("Hello"), 200_000);
bench('logger.log("plain message")', () => log.log("plain message"), 500_000);
bench('logger.info("plain message")', () => log.info("plain message"), 500_000);
bench('logger.info("json message") (JSON format)', () => logJson.info("json message"), 500_000);
bench('logger.log("x", { color: "red" })', () => log.log("x", { color: "red" }), 200_000);
bench('logger.red("styled text") (chainable proxy)', () => logStyled.red("styled text"), 100_000);
bench('logger.debug("nope") (suppressed, early exit)', () => logSuppressed.debug("nope"));
bench('logger.trace("nope") (suppressed, early exit)', () => logSuppressed.trace("nope"));
