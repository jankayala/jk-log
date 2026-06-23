import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: {
    cjsReexport: true,
    oxc: true,
  },
  clean: true,
  sourcemap: true,
});
