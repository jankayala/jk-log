import type { LoggerLogOptions } from "@/logger";

function expectLoggerLogOptions(_value: LoggerLogOptions) {}

const redRgb = [255, 0, 0] as [number, number, number];
const grayBgRgb = [128, 128, 128] as [number, number, number];

expectLoggerLogOptions({
  rgb: redRgb,
  bgHex: "#808080",
  modifiers: ["bold", "underline"],
});

expectLoggerLogOptions({ color: "blue" });
expectLoggerLogOptions({ rgb: redRgb });
expectLoggerLogOptions({ hex: "#ff0000" });
expectLoggerLogOptions({ bgColor: "bgBlue" });
expectLoggerLogOptions({ bgRgb: grayBgRgb });
expectLoggerLogOptions({ bgHex: "#808080" });
expectLoggerLogOptions({ color: "blue", bgHex: "#808080", modifiers: "bold" });

// @ts-expect-error LoggerLogOptions must not allow multiple text style options at the same time.
expectLoggerLogOptions({
  color: "blue",
  rgb: redRgb,
  bgHex: "#808080",
  modifiers: ["bold", "underline"],
});

// @ts-expect-error LoggerLogOptions must not allow color and hex together.
expectLoggerLogOptions({
  color: "blue",
  hex: "#ff0000",
});

// @ts-expect-error LoggerLogOptions must not allow rgb and hex together.
expectLoggerLogOptions({
  rgb: redRgb,
  hex: "#ff0000",
});

// @ts-expect-error LoggerLogOptions must not allow color, rgb and hex together.
expectLoggerLogOptions({
  color: "blue",
  rgb: redRgb,
  hex: "#ff0000",
});

// @ts-expect-error LoggerLogOptions must not allow multiple background style options at the same time.
expectLoggerLogOptions({
  color: "blue",
  bgColor: "bgBlue",
  bgHex: "#808080",
});

// @ts-expect-error LoggerLogOptions must not allow bgColor and bgRgb together.
expectLoggerLogOptions({
  bgColor: "bgBlue",
  bgRgb: grayBgRgb,
});

// @ts-expect-error LoggerLogOptions must not allow bgRgb and bgHex together.
expectLoggerLogOptions({
  bgRgb: grayBgRgb,
  bgHex: "#808080",
});

// @ts-expect-error LoggerLogOptions must not allow bgColor, bgRgb and bgHex together.
expectLoggerLogOptions({
  bgColor: "bgBlue",
  bgRgb: grayBgRgb,
  bgHex: "#808080",
});
