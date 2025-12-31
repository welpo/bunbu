import { defineConfig } from "astro/config";
import AstroPWA from "@vite-pwa/astro";

// https://astro.build/config
export default defineConfig({
    site: "https://bunbu.osc.garden",
    integrations: [
        AstroPWA({
            registerType: "autoUpdate",
            includeAssets: ["favicon.png", "favicon.ico", "apple-touch-icon.png"],
            manifest: {
                name: "bunbu - Japanese Frequency Analyser",
                short_name: "bunbu",
                description: "Analyse Japanese text frequency with offline support",
                start_url: "/",
                display: "standalone",
                background_color: "#a7b2ec",
                theme_color: "#193773",
                orientation: "any",
                icons: [
                    {
                        src: "pwa-192x192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                    {
                        src: "pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                    },
                    {
                        src: "pwa-maskable-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "maskable",
                    },
                ],
            },
            workbox: {
                globPatterns: ["**/*.{css,js,html,svg,png,ico,txt,woff2,wasm}"],
                maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
                navigateFallback: "/",
                runtimeCaching: [
                    {
                        urlPattern: /^\/workers\/.*/i,
                        handler: "CacheFirst",
                        options: {
                            cacheName: "workers-cache",
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                            },
                        },
                    },
                ],
            },
        }),
    ],
});
