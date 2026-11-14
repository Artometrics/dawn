import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `_reference/` at the repo root is original-app source for merger work.
  // It is excluded from tsconfig and ESLint. Static export only emits
  // `src/app` and `public` into `out/`, so that folder must never ship.
  output: "export",
  images: { unoptimized: true },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // The dev badge sits on the bottom-left controls (name field, Atlas chips).
  devIndicators: false,
  // Static hosting on Firebase (public: out). Studio chat uses Firebase AI Logic in-browser.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Dev only. Production static export is served by Caddy, which routes /api itself.
if (process.env.NODE_ENV !== "production") {
  nextConfig.rewrites = async () => [
    { source: "/api/:path*", destination: "http://127.0.0.1:8787/api/:path*" },
  ];
}

export default nextConfig;
