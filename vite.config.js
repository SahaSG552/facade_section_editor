import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import basicSsl from "@vitejs/plugin-basic-ssl";

// Detect if running with --host (npm run host) so we only enable HTTPS on the network server.
// Local `npm run dev` stays on plain HTTP to avoid self-signed cert warnings.
const isHost = process.argv.some(
    (arg) => arg === "--host" || arg.startsWith("--host=")
);


const __dirname = path.dirname(fileURLToPath(import.meta.url));

function stripManifoldWasmBadSourceMap() {
    const targetSuffix = "/node_modules/manifold-3d/lib/wasm.js";

    return {
        name: "strip-manifold-wasm-bad-sourcemap",
        enforce: "pre",
        transform(code, id) {
            if (!id) return;
            const cleanId = id.split("?")[0].replace(/\\/g, "/");
            if (!cleanId.endsWith(targetSuffix)) return;

            return code.replace(
                /\n\/\/#[#@]\s*sourceMappingURL=wasm\.js\.map\s*$/,
                "\n",
            );
        },
    };
}

export default defineConfig({
    plugins: [stripManifoldWasmBadSourceMap(), ...(isHost ? [basicSsl()] : [])],
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
        ...(isHost ? { https: true, host: true } : {}),
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
