import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: true,
  },
  {
    entry: ["src/bin.ts"],
    format: ["esm"],
    sourcemap: true,
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
]);
