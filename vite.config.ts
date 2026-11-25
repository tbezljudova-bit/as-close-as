import fs from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

const workerFile = path.resolve(
  "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs",
);

/** Serve MapLibre's worker as a raw file. Vite's transform injects a client
 * import that a module worker cannot run. */
function maplibreWorker(): Plugin {
  return {
    name: "maplibre-worker",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url !== "/maplibre-gl-worker.mjs") return next();
        res.setHeader("Content-Type", "text/javascript");
        res.setHeader("Cache-Control", "no-cache");
        fs.createReadStream(workerFile).pipe(res);
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "maplibre-gl-worker.mjs",
        source: fs.readFileSync(workerFile),
      });
    },
  };
}

export default defineConfig({
  plugins: [maplibreWorker(), react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 43123,
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 43123,
    strictPort: true,
  },
  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
