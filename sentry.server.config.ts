import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  // No DSN configured => SDK is a no-op. Safe to ship without one.
  enabled: Boolean(dsn),
  environment:
    process.env.SENTRY_ENV || process.env.NODE_ENV || "production",
  // Performance tracing off by default to stay within the free event quota.
  tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
    ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
    : 0,
  // Do not attach request PII by default (multi-tenant privacy).
  sendDefaultPii: false,
});
