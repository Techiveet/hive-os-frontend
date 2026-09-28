"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";

import { LMS_FONT_STACK, LMS_HEX, LMS_TOKENS } from "@/modules/Lms/components/lms-site";

/**
 * What a learner sees for the second before their course site loads.
 *
 * The LMS used to fall through to MarketplacePreloader — a dark grid of
 * shopping-cart and freight icons announcing "Loading marketplace". The wrong
 * promise entirely: the first thing a student saw was somebody else's product.
 *
 * This is the course site's own language instead — the Educrat light ground,
 * navy and purple, DM Sans — and it shows the thing they are waiting for: a
 * syllabus assembling itself, lesson by lesson. Everything is drawn from
 * LMS_TOKENS, so it follows light and dark like the rest of the LMS.
 */

/** The syllabus rows, with the width each "lesson title" bar settles at. */
const LESSON_ROWS = [
  { width: "78%", delay: 0 },
  { width: "62%", delay: 0.18 },
  { width: "84%", delay: 0.36 },
  { width: "54%", delay: 0.54 },
];

const CHIPS = ["Courses", "Lessons", "Certificates"];

/**
 * Turn a tenant slug into something worth showing on screen.
 *
 * Only used until the real brand title arrives — but "lms-demo" title-cased
 * naively reads "Lms Demo", so the acronyms are spelled properly on the way.
 */
const ACRONYMS = new Set(["lms", "hr", "it", "erp", "ict", "mba", "stem"]);

function prettyName(name?: string | null) {
  if (!name) return "Learning";

  return name
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) =>
      ACRONYMS.has(word.toLowerCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

export function LmsPreloader({ brandName }: { brandName?: string | null }) {
  const name = prettyName(brandName);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: LMS_TOKENS.lightBg, fontFamily: LMS_FONT_STACK }}
      role="status"
      aria-live="polite"
      aria-label={`Loading ${name}`}
    >
      {/* Soft lavender wash, the same one the landing hero sits on. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: `radial-gradient(circle, ${LMS_HEX.purple}1F, transparent 62%)` }}
        />
        <div
          className="absolute left-[26%] top-[28%] h-[320px] w-[320px] rounded-full"
          style={{ background: `radial-gradient(circle, ${LMS_HEX.green}14, transparent 62%)` }}
        />
        <div
          className="absolute bottom-[24%] right-[24%] h-[340px] w-[340px] rounded-full"
          style={{ background: `radial-gradient(circle, ${LMS_HEX.purple}14, transparent 62%)` }}
        />
      </div>

      {/* The course card, building itself. */}
      <div
        className="relative w-[19rem] overflow-hidden rounded-3xl sm:w-[22rem]"
        style={{
          backgroundColor: LMS_TOKENS.surface,
          boxShadow: "0 20px 60px rgba(20, 3, 66, 0.14)",
        }}
      >
        {/* Cover, with the cap riding the same gentle float as the hero art. */}
        <div
          className="flex h-28 items-center justify-center"
          style={{ backgroundColor: LMS_TOKENS.lavender }}
        >
          <motion.div
            animate={{ y: [0, -7, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <GraduationCap className="size-11" style={{ color: LMS_TOKENS.purple }} />
          </motion.div>
        </div>

        <div className="flex flex-col gap-4 px-6 py-7">
          {LESSON_ROWS.map((row, index) => (
            <div key={index} className="flex items-center gap-3">
              {/* The lesson's tick, filling in as it "loads". */}
              <motion.span
                className="flex size-5 shrink-0 items-center justify-center rounded-full"
                style={{ border: `2px solid ${LMS_TOKENS.border}` }}
                animate={{
                  backgroundColor: ["rgba(0,0,0,0)", LMS_HEX.purple, LMS_HEX.purple, "rgba(0,0,0,0)"],
                  borderColor: [LMS_TOKENS.border, LMS_HEX.purple, LMS_HEX.purple, LMS_TOKENS.border],
                }}
                transition={{
                  duration: 2.6,
                  delay: row.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                  times: [0, 0.3, 0.75, 1],
                }}
              >
                <motion.svg
                  viewBox="0 0 12 12"
                  className="size-3"
                  animate={{ opacity: [0, 1, 1, 0] }}
                  transition={{
                    duration: 2.6,
                    delay: row.delay,
                    repeat: Infinity,
                    ease: "easeInOut",
                    times: [0, 0.32, 0.75, 1],
                  }}
                >
                  <path
                    d="M2.5 6.2l2.2 2.2 4.8-5"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </motion.svg>
              </motion.span>

              {/* The lesson title, drawing itself left to right. */}
              <div
                className="h-2.5 flex-1 overflow-hidden rounded-full"
                style={{ backgroundColor: LMS_TOKENS.light3 }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: LMS_TOKENS.purple }}
                  animate={{ width: ["0%", row.width, row.width, "0%"] }}
                  transition={{
                    duration: 2.6,
                    delay: row.delay,
                    repeat: Infinity,
                    ease: "easeInOut",
                    times: [0, 0.3, 0.75, 1],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Brand, status, and the indeterminate bar. */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="relative mt-10 flex flex-col items-center px-6 text-center"
      >
        <h1 className="text-[26px] font-bold tracking-tight" style={{ color: LMS_TOKENS.navy }}>
          {name}
        </h1>
        <p
          className="mt-2 text-[11px] font-bold uppercase tracking-[0.28em]"
          style={{ color: LMS_TOKENS.muted }}
        >
          Preparing your courses
        </p>

        <div
          className="relative mt-5 h-1.5 w-56 overflow-hidden rounded-full"
          style={{ backgroundColor: LMS_TOKENS.light3 }}
        >
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-y-0 w-1/2 rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent, ${LMS_HEX.purple}, transparent)`,
            }}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          {CHIPS.map((chip, index) => (
            <motion.span
              key={chip}
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: LMS_TOKENS.muted }}
              animate={{ opacity: [0.32, 0.95, 0.32] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.45 }}
            >
              {chip}
            </motion.span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
