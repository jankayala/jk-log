import { createLogger, type LoggerLogOptions } from "../src";

const logger = createLogger();

const logOptions: LoggerLogOptions = {
  rgb: [255, 0, 0],
  bgHex: "#808080",
  modifiers: ["bold", "underline"],
};

logger.log("This is a log", logOptions);

// Demonstrate invalid LoggerLogOptions
try {
  // @ts-ignore
  const logOptionsColor: LoggerLogOptions = {
    color: "red",
    hex: "#FFFFFF",
    bgHex: "#808080",
    modifiers: ["italic"],
  };

  logger.log("This is a log", logOptionsColor);
} catch (err) {
  console.error("Invalid LoggerLogOptions error caught as expected:", (err as Error).message);
}
