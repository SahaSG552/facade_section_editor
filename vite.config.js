import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    resolve: {
        alias: {
            // Provide empty shim for Node.js 'module' package in browser
            module: path.resolve(__dirname, "./src/utils/empty-shim.js"),
        },
    },
    optimizeDeps: {
        exclude: ["manifold-3d"],
        esbuildOptions: {
            // Allow manifold-3d to be bundled even with Node.js imports
            platform: "browser",
        },
    },
    server: {
        fs: {
            // Allow serving files from node_modules
            allow: [".."],
        },
    },
    assetsInclude: ["**/*.wasm"],
    build: {
        // Increase chunk size warning limit for large dependencies
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks: {
                    "three-vendor": ["three", "three-bvh-csg"],
                    manifold: ["manifold-3d"],
                },
            },
        },
        // Copy WASM files to dist
        copyPublicDir: true,
    },
});
