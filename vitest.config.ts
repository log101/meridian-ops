import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    env: { DATA_DIR: ":memory:" },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
