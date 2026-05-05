import { createLogger, type LoggerOptions } from "../src";

const json5layers = {
  layer1: {
    name: "Level 1",
    layer2: {
      name: "Level 2",
      layer3: {
        name: "Level 3",
        layer4: {
          name: "Level 4",
          layer5: {
            name: "Level 5",
            value: "Deep data here",
          },
        },
      },
    },
  },
};

const withNoTimeAndPlain: LoggerOptions = {
  showTime: false,
  format: "plain",
};

const noTimePlainLogger = createLogger(withNoTimeAndPlain);
noTimePlainLogger.log("-- Logs with NO time and plain format --");
noTimePlainLogger.trace("This is a trace message.");
noTimePlainLogger.debug("This is a debug message.");
noTimePlainLogger.info("This is an info message.");
noTimePlainLogger.info(json5layers);
noTimePlainLogger.warn("This is an warning message.");
noTimePlainLogger.error("This is an error message.", "This is the ERROR");

const withTimeAndPlain: LoggerOptions = {
  showTime: true,
  format: "plain",
};

const timePlainLogger = createLogger(withTimeAndPlain);
timePlainLogger.log("-- Logs with time and plain format --");
timePlainLogger.trace("This is a trace message.");
timePlainLogger.debug("This is a debug message.");
timePlainLogger.info("This is an info message.");
timePlainLogger.info(json5layers);
timePlainLogger.warn("This is an warning message.");
timePlainLogger.error("This is an error message.", "This is the ERROR");

const withTimeJsonDebug: LoggerOptions = {
  showTime: true,
  format: "json",
  logLevel: "debug",
};

const timeJsonDebugLogger = createLogger(withTimeJsonDebug);
timeJsonDebugLogger.log("-- Logs with time and json format --");
timeJsonDebugLogger.trace("This is a trace message.");
timeJsonDebugLogger.debug("This is a debug message.");
timeJsonDebugLogger.info("This is an info message.");
timeJsonDebugLogger.info(json5layers);
timeJsonDebugLogger.warn("This is an warning message.");
timeJsonDebugLogger.error("This is an error message.", "This is the ERROR");

const withCustomLevelLabelsAndColors: LoggerOptions = {
  showTime: true,
  format: "plain",
  logLevel: "trace",
  levelLabels: { warn: "Warning", error: "!Ahhh..." },
  levelColors: { debug: "gray", trace: "lightGrey", info: "green", warn: "yellowBright" },
};

const customLevelLabelsAndColorsLogger = createLogger(withCustomLevelLabelsAndColors);
customLevelLabelsAndColorsLogger.log("-- Logs with time and json format --");
customLevelLabelsAndColorsLogger.trace("This is a trace message.");
customLevelLabelsAndColorsLogger.debug("This is a debug message.");
customLevelLabelsAndColorsLogger.info("This is an info message.");
customLevelLabelsAndColorsLogger.info(json5layers);
customLevelLabelsAndColorsLogger.warn("This is an warning message.");
customLevelLabelsAndColorsLogger.error("This is an error message.", "This is the ERROR");
