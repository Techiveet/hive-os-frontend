import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const skipBuildTypecheck =
  process.env.NEXT_SKIP_BUILD_TYPECHECK === "1" ||
  process.env.NEXT_SKIP_BUILD_TYPECHECK === "true";

const trimTrailingSlashes = (value: string): string => value.replace(/\/+$/, "");

const getApiRoot = (): string => {
  const configured =
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8081/api/v1";

  const normalized = trimTrailingSlashes(configured);

  return /\/api\/v1$/i.test(normalized)
    ? normalized
    : `${normalized}/api/v1`;
};

const getApiOrigin = (): string => {
  const apiRoot = getApiRoot();

  try {
    return new URL(apiRoot).origin;
  } catch {
    return apiRoot.replace(/\/api\/v1$/i, "");
  }
};

const getPublicApiOrigin = (): string => {
  const configured =
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8081/api/v1";

  const normalized = trimTrailingSlashes(configured);
  try {
    return new URL(normalized).origin;
  } catch {
    return normalized.replace(/\/api\/v1$/i, "");
  }
};

const allowedDevOrigins = Array.from(
  new Set(
    [
      "localhost",
      "127.0.0.1",
      "test.test",
      "10.0.2.2",
      ...(process.env.NEXT_ALLOWED_DEV_ORIGINS?.split(",") ?? []),
    ]
      .map((origin) => origin.trim())
      .filter(Boolean),
  ),
);

const distDir = process.env.NEXT_DIST_DIR?.trim() || ".next";
const isDev = process.env.NODE_ENV !== "production";

const toWebSocketOrigin = (origin: string): string | null => {
  try {
    const { origin: normalized, protocol } = new URL(origin);
    if (protocol !== "http:" && protocol !== "https:") return null;
    return normalized.replace(/^http(s?):/, "ws$1:");
  } catch {
    return null;
  }
};

/**
 * connect-src: plaintext loopback/dev origins (http://localhost:*, ws://...)
 * are only allowed in development builds. Production keeps the API origin,
 * its WebSocket twin and HTTPS/WSS (payment, analytics and Sentry endpoints
 * vary per deployment); set CSP_STRICT_CONNECT_SRC=true to drop the
 * `https:`/`wss:` wildcards and allow only CSP_CONNECT_SRC_EXTRA.
 */
const buildConnectSrc = (publicApiOrigin: string): string => {
  const strict = process.env.CSP_STRICT_CONNECT_SRC === "true" || process.env.CSP_STRICT_CONNECT_SRC === "1";
  const extra = (process.env.CSP_CONNECT_SRC_EXTRA ?? "")
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean);

  const sources = [
    "'self'",
    publicApiOrigin,
    toWebSocketOrigin(publicApiOrigin),
    ...(isDev
      ? [
          "http://localhost:*",
          "http://*.localhost:*",
          "http://127.0.0.1:*",
          "ws://localhost:*",
          "ws://*.localhost:*",
          "ws://127.0.0.1:*",
        ]
      : []),
    ...extra,
    ...(strict ? [] : ["https:", "wss:"]),
  ].filter((value): value is string => Boolean(value));

  return Array.from(new Set(sources)).join(" ");
};

const buildCsp = ({
  frameAncestors,
  allowTailwindCdn = false,
}: {
  frameAncestors: string;
  allowTailwindCdn?: boolean;
}): string => {
  const publicApiOrigin = getPublicApiOrigin();
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    ...(isDev ? ["'unsafe-eval'"] : []),
    "https://www.googletagmanager.com",
    "https://connect.facebook.net",
    // Still required: components/ui/model-3d-viewer.tsx loads <model-viewer> from here.
    "https://ajax.googleapis.com",
    ...(allowTailwindCdn ? ["https://cdn.tailwindcss.com"] : []),
  ].join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: http: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src ${buildConnectSrc(publicApiOrigin)}`,
    "media-src 'self' blob: https:",
    "worker-src 'self' blob:",
    "frame-src 'self' blob: https://www.google.com",
    `frame-ancestors ${frameAncestors}`,
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
  ].join("; ");
};

const nextConfig: NextConfig = {
  output: "standalone",
  // A separate cache lets authenticated acceptance run without competing with
  // an already-open developer browser that is compiling unrelated routes.
  distDir,
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: skipBuildTypecheck,
  },
  allowedDevOrigins,
  experimental: {
    // Hive's large modular dashboard can otherwise retain enough Webpack state
    // while compiling many development routes to exhaust the shared WSL VM.
    // These are Next.js-supported memory controls; they trade a small amount
    // of compile latency for a substantially lower peak footprint.
    webpackMemoryOptimizations: true,
    preloadEntriesOnStart: false,
    optimizePackageImports: [
      "lucide-react",
      "@heroicons/react",
      "date-fns",
      "framer-motion",
      "recharts",
      "echarts",
    ],
  },

  async headers() {
    const sharedHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=(), usb=()" },
    ];

    return [
      {
        source: "/logos/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/branding/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Public chat is intended to be framed by the approved Techive and Gubae sites.
        // Keep every authenticated route under the same-origin policy below.
        source: "/embed/support-bot/:path*",
        headers: [
          ...sharedHeaders,
          {
            key: "Content-Security-Policy",
            value: buildCsp({
              frameAncestors: "'self' https://techiveet.com https://www.techiveet.com https://gubae.techiveet.com",
            }),
          },
        ],
      },
      {
        source: "/dashboard/landing-templates/:path*",
        headers: [
          ...sharedHeaders,
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Content-Security-Policy",
            value: buildCsp({
              frameAncestors: "'self'",
              allowTailwindCdn: true,
            }),
          },
        ],
      },
      {
        source: "/dashboard/landing-library/:path*",
        headers: [
          ...sharedHeaders,
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Content-Security-Policy",
            value: buildCsp({
              frameAncestors: "'self'",
              allowTailwindCdn: true,
            }),
          },
        ],
      },
      {
        source: "/((?!embed/support-bot|dashboard/landing-templates|dashboard/landing-library).*)",
        headers: [
          ...sharedHeaders,
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          {
            key: "Content-Security-Policy",
            value: buildCsp({ frameAncestors: "'self'" }),
          },
        ],
      },
    ];
  },

  async rewrites() {
    const apiRoot = getApiRoot();
    const apiOrigin = getApiOrigin();

    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiRoot}/:path*`,
      },
      {
        source: "/sanctum/:path*",
        destination: `${apiOrigin}/sanctum/:path*`,
      },
    ];
  },

  webpack(config) {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    return config;
  },
  turbopack: {},
};

const enableSentryBuildPlugin = Boolean(
  process.env.SENTRY_DSN ||
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    process.env.SENTRY_AUTH_TOKEN,
);

export default enableSentryBuildPlugin
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
      webpack: {
        treeshake: {
          removeDebugLogging: true,
        },
      },
    })
  : nextConfig;
