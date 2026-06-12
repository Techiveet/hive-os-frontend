import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const skipBuildTypecheck =
  process.env.NEXT_SKIP_BUILD_TYPECHECK === "1" ||
  process.env.NEXT_SKIP_BUILD_TYPECHECK === "true";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: skipBuildTypecheck,
  },

  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8085";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
      {
        source: "/sanctum/:path*",
        destination: `${backendUrl}/sanctum/:path*`,
      },
    ];
  },

  webpack(config, { isServer }) {
    // Allow WASM imports (used by pdfjs-dist)
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
  turbopack: {},
};

export default withSentryConfig(nextConfig, {
  // Build-time options for the Sentry plugin.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Quiet unless running in CI.
  silent: !process.env.CI,
  // Only upload source maps when an auth token is provided (skipped in normal builds).
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  // Tree-shake Sentry logger statements to reduce bundle size.
  disableLogger: true,
});
