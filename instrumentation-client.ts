const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

let routerTransitionHandler: ((...args: unknown[]) => void) | undefined;

if (dsn) {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn,
      enabled: true,
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
    routerTransitionHandler =
      Sentry.captureRouterTransitionStart as unknown as (
        ...args: unknown[]
      ) => void;
  });
}

// Capture App Router navigations for tracing (no-op when disabled).
export const onRouterTransitionStart = (...args: unknown[]) => {
  routerTransitionHandler?.(...args);
};
