import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment:
    process.env.NEXT_PUBLIC_SENTRY_ENV ||
    process.env.NODE_ENV ||
    "production",
  // Errors only by default — no tracing / no session replay (keeps event volume low).
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  sendDefaultPii: false,
});

// Capture App Router navigations for tracing (no-op when disabled).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
