"use client";

import { usePermissions } from "@/hooks/use-permissions";
import type { LmsDashboardRole } from "@/modules/Lms/components/lms-dashboard-shell";

/**
 * Permissions that mean "this person runs courses", not "this person takes
 * them".
 *
 * view_learning_management is deliberately absent: the seeded Learner role
 * holds it, so testing for it hands every student the instructor dashboard.
 * Anything here is either an authoring verb or the marking verb.
 */
export const LMS_STAFF_PERMISSIONS = [
  "manage_learning_management",
  "manage_lms_courses",
  "create_lms_courses",
  "edit_lms_courses",
  "grade_lms_assessments",
  "view_lms_learners",
] as const;

/** Permissions that let someone author or change a quiz. */
export const LMS_AUTHOR_PERMISSIONS = [
  "manage_learning_management",
  "manage_lms_courses",
  "create_lms_courses",
  "edit_lms_courses",
] as const;

/** Permissions that let someone put marks on an attempt. */
export const LMS_GRADE_PERMISSIONS = [
  "grade_lms_assessments",
  "manage_lms_courses",
  "manage_learning_management",
] as const;

/**
 * Permissions that let someone hide or restore a learner's review.
 *
 * Narrower than grading on purpose: a teaching assistant marks work but does
 * not decide what the public sees about the course.
 */
export const LMS_MODERATE_PERMISSIONS = [
  "manage_lms_courses",
  "manage_learning_management",
] as const;

/**
 * Which side of the LMS the signed-in user is on, plus the finer-grained
 * answers the quiz, assignment and review screens need.
 */
export function useLmsRole(): {
  role: LmsDashboardRole;
  isStaff: boolean;
  canAuthor: boolean;
  canGrade: boolean;
  canModerate: boolean;
} {
  const { hasAnyPermission } = usePermissions();

  const isStaff = hasAnyPermission([...LMS_STAFF_PERMISSIONS]);
  const canAuthor = hasAnyPermission([...LMS_AUTHOR_PERMISSIONS]);

  return {
    // Staff who cannot author are teaching assistants: they get the marking
    // screens and the cohort, without Create Course.
    role: isStaff ? (canAuthor ? "instructor" : "assistant") : "learner",
    isStaff,
    canAuthor,
    canGrade: hasAnyPermission([...LMS_GRADE_PERMISSIONS]),
    canModerate: hasAnyPermission([...LMS_MODERATE_PERMISSIONS]),
  };
}
