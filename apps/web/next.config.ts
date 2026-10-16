import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully dynamic app (dashboard + payments API): no Cache Components.
  serverExternalPackages: ["@interledger/open-payments", "pg"],
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
