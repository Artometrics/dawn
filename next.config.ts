import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
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

export default nextConfig;
