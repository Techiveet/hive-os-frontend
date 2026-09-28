import { LmsPreloader } from "@/modules/Lms/components/lms-preloader";

/**
 * The wait before any /learn screen.
 *
 * Without this the section fell back to the root loading.tsx, which announces
 * "Preparing HIVE.OS" in the operator console's lime green — the ERP shell a
 * learner is deliberately never shown. A route-level loading file is the whole
 * fix: Next.js prefers the nearest one.
 */
export default function LearnLoading() {
  return <LmsPreloader />;
}
