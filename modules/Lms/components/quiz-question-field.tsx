"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";

import { CodeEditor, type VirtualFile } from "@/components/ui/code-editor";
import { LMS_TOKENS } from "@/modules/Lms/components/lms-site";
import type { LmsQuizQuestion } from "@/modules/Lms/api/quizzes";

/**
 * Renders one quiz question for a learner.
 *
 * The choice and prose types share their vocabulary with the recruitment
 * assessment runner (app/careers/assessment/[token]/page.tsx) so both engines
 * speak the same dialect; this component is the LMS-styled counterpart of its
 * QuestionCard. The four LMS-only types below it — numeric, fill_blank,
 * matching and ordering — exist so a paper can ask more than "pick one" without
 * adding to what a human has to mark.
 *
 * Every one of them stores its answer in the shape the server's grader reads,
 * which is the contract worth keeping in mind when changing anything here:
 * an array positional to the gaps, a left→right map, a sequence.
 */
export function QuizQuestionField({
  question,
  value,
  onChange,
  disabled = false,
}: {
  question: LmsQuizQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}) {
  const options =
    question.type === "true_false"
      ? ["True", "False"]
      : (question.options ?? []);

  const selected = React.useMemo(
    () => (Array.isArray(value) ? (value as string[]) : value == null ? [] : [String(value)]),
    [value],
  );

  if (question.type === "single_choice" || question.type === "true_false") {
    return (
      <div className="flex flex-col gap-3">
        {options.map((option) => (
          <label
            key={option}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-[15px] transition"
            style={{
              borderColor: selected[0] === option ? LMS_TOKENS.purple : LMS_TOKENS.border,
              backgroundColor: selected[0] === option ? LMS_TOKENS.lavender : "transparent",
              color: LMS_TOKENS.navy,
            }}
          >
            <input
              type="radio"
              name={`q-${question.id}`}
              value={option}
              checked={selected[0] === option}
              disabled={disabled}
              onChange={() => onChange([option])}
              className="size-4"
            />
            {option}
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "multiple_choice") {
    return (
      <div className="flex flex-col gap-3">
        {options.map((option) => {
          const checked = selected.includes(option);
          return (
            <label
              key={option}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-[15px] transition"
              style={{
                borderColor: checked ? LMS_TOKENS.purple : LMS_TOKENS.border,
                backgroundColor: checked ? LMS_TOKENS.lavender : "transparent",
                color: LMS_TOKENS.navy,
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...selected, option]
                      : selected.filter((item) => item !== option),
                  )
                }
                className="size-4"
              />
              {option}
            </label>
          );
        })}
      </div>
    );
  }

  if (question.type === "numeric") {
    return <NumericAnswer question={question} value={value} onChange={onChange} disabled={disabled} />;
  }

  if (question.type === "fill_blank") {
    return <BlanksAnswer question={question} value={value} onChange={onChange} disabled={disabled} />;
  }

  if (question.type === "matching") {
    return <MatchingAnswer question={question} value={value} onChange={onChange} disabled={disabled} />;
  }

  if (question.type === "ordering") {
    return <OrderingAnswer question={question} value={value} onChange={onChange} disabled={disabled} />;
  }

  if (question.type === "coding") {
    return <CodingAnswer value={value} onChange={onChange} />;
  }

  return (
    <textarea
      aria-label={`Answer to: ${question.prompt}`}
      rows={question.type === "long_text" ? 8 : 3}
      disabled={disabled}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border p-3 text-[15px] outline-none focus-visible:ring-2"
      style={{ borderColor: LMS_TOKENS.border, color: LMS_TOKENS.navy }}
    />
  );
}

/** Shared input styling, so every free-entry field reads as one family. */
const FIELD_STYLE: React.CSSProperties = {
  borderColor: LMS_TOKENS.border,
  color: LMS_TOKENS.navy,
};

/**
 * A single number.
 *
 * Kept as text rather than <input type="number"> on purpose: a number input
 * silently discards what it cannot parse, so a learner who types "1,234" sees
 * their answer vanish. The server forgives separators and spaces, so let them
 * type and let it judge.
 */
function NumericAnswer({
  question,
  value,
  onChange,
  disabled,
}: {
  question: LmsQuizQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}) {
  const typed = Array.isArray(value) ? String(value[0] ?? "") : value == null ? "" : String(value);

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        inputMode="decimal"
        aria-label={`Answer to: ${question.prompt}`}
        disabled={disabled}
        value={typed}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Your answer"
        className="w-full max-w-xs rounded-xl border p-3 text-[15px] outline-none focus-visible:ring-2"
        style={FIELD_STYLE}
      />
    </div>
  );
}

/**
 * One box per gap, in the order the gaps appear.
 *
 * The prompt marks its gaps with ___ (three underscores). The count of boxes
 * comes from the question's options — the author's list of gap labels — falling
 * back to counting the markers in the prompt, so a question authored without
 * labels still renders the right number of boxes.
 */
function BlanksAnswer({
  question,
  value,
  onChange,
  disabled,
}: {
  question: LmsQuizQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}) {
  const labels = question.options ?? [];
  const gapCount = labels.length || Math.max(1, (question.prompt.match(/_{3,}/g) ?? []).length);
  const answers = React.useMemo(
    () => (Array.isArray(value) ? (value as string[]) : []),
    [value],
  );

  const setGap = (index: number, text: string) => {
    const next = Array.from({ length: gapCount }, (_, i) => answers[i] ?? "");
    next[index] = text;
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: gapCount }, (_, index) => (
        <div key={index} className="flex flex-wrap items-center gap-3">
          <span className="min-w-24 text-[14px]" style={{ color: LMS_TOKENS.muted }}>
            {labels[index] ?? `Blank ${index + 1}`}
          </span>
          <input
            type="text"
            aria-label={labels[index] ?? `Blank ${index + 1}`}
            disabled={disabled}
            value={answers[index] ?? ""}
            onChange={(event) => setGap(index, event.target.value)}
            className="min-w-0 flex-1 rounded-xl border p-3 text-[15px] outline-none focus-visible:ring-2"
            style={FIELD_STYLE}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Pair each item on the left with one from a shared right-hand column.
 *
 * The answer is stored as a left→right map, which is what the grader compares
 * pair by pair. A <select> rather than drag-and-drop: it works on a phone, it
 * works with a keyboard, and it cannot half-drop an item into nowhere.
 */
function MatchingAnswer({
  question,
  value,
  onChange,
  disabled,
}: {
  question: LmsQuizQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}) {
  const lefts = question.options ?? [];
  // The right-hand column arrives as match_targets, already shuffled by the
  // server. settings.targets is the authoring-side source of the same list and
  // is never sent to a learner, so it is only a fallback for the builder's own
  // preview.
  const targets = React.useMemo(() => {
    if (question.match_targets?.length) return question.match_targets;
    return question.settings?.targets ?? [];
  }, [question.match_targets, question.settings]);

  const pairs = React.useMemo(
    () => (value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, string>)
      : {}),
    [value],
  );

  return (
    <div className="flex flex-col gap-3">
      {lefts.map((left) => (
        <div key={left} className="flex flex-wrap items-center gap-3">
          <span
            className="min-w-32 flex-1 rounded-xl border px-4 py-3 text-[15px]"
            style={{ borderColor: LMS_TOKENS.border, color: LMS_TOKENS.navy }}
          >
            {left}
          </span>
          <select
            aria-label={`Match for ${left}`}
            disabled={disabled}
            value={pairs[left] ?? ""}
            onChange={(event) => onChange({ ...pairs, [left]: event.target.value })}
            className="min-w-0 flex-1 rounded-xl border p-3 text-[15px] outline-none focus-visible:ring-2"
            style={FIELD_STYLE}
          >
            <option value="">Choose…</option>
            {targets.map((target) => (
              <option key={target} value={target}>
                {target}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

/**
 * Put the items in order.
 *
 * Move-up / move-down buttons rather than dragging: the same reasoning as the
 * matching select, plus a dragged list is close to unusable with a screen
 * reader. The answer is the sequence itself, which is what the grader marks
 * position by position.
 */
function OrderingAnswer({
  question,
  value,
  onChange,
  disabled,
}: {
  question: LmsQuizQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}) {
  const items = React.useMemo(() => {
    const stored = Array.isArray(value) ? (value as string[]) : [];
    const available = question.options ?? [];

    // Start from what the learner has already arranged, then append anything
    // the question offers that is not in it yet — so a half-finished answer
    // survives a reload without losing the untouched items.
    const seen = new Set(stored);
    return [...stored.filter((item) => available.includes(item)),
      ...available.filter((item) => !seen.has(item))];
  }, [value, question.options]);

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;

    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <ol className="flex flex-col gap-2">
      {items.map((item, index) => (
        <li
          key={item}
          className="flex items-center gap-3 rounded-xl border px-4 py-3 text-[15px]"
          style={{ borderColor: LMS_TOKENS.border, color: LMS_TOKENS.navy }}
        >
          <GripVertical className="size-4 shrink-0" style={{ color: LMS_TOKENS.muted }} aria-hidden="true" />
          <span className="w-6 shrink-0 tabular-nums" style={{ color: LMS_TOKENS.muted }}>
            {index + 1}.
          </span>
          <span className="min-w-0 flex-1">{item}</span>
          <button
            type="button"
            aria-label={`Move ${item} up`}
            disabled={disabled || index === 0}
            onClick={() => move(index, -1)}
            className="rounded-lg border p-1.5 transition disabled:opacity-30"
            style={{ borderColor: LMS_TOKENS.border }}
          >
            <ArrowUp className="size-4" style={{ color: LMS_TOKENS.navy }} />
          </button>
          <button
            type="button"
            aria-label={`Move ${item} down`}
            disabled={disabled || index === items.length - 1}
            onClick={() => move(index, 1)}
            className="rounded-lg border p-1.5 transition disabled:opacity-30"
            style={{ borderColor: LMS_TOKENS.border }}
          >
            <ArrowDown className="size-4" style={{ color: LMS_TOKENS.navy }} />
          </button>
        </li>
      ))}
    </ol>
  );
}

/**
 * Coding answers are stored as { files: VirtualFile[] } so a submission keeps
 * its file structure, matching what the recruitment runner already persists.
 */
function CodingAnswer({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const initial = React.useMemo<VirtualFile[]>(() => {
    const stored = (value as { files?: VirtualFile[] } | null)?.files;
    return stored?.length ? stored : [{ name: "answer.js", content: "" } as VirtualFile];
  }, [value]);

  const [files, setFiles] = React.useState<VirtualFile[]>(initial);

  // Push edits up, but only when they differ, so the autosave upstream is not
  // retriggered by its own round trip.
  React.useEffect(() => {
    const next = JSON.stringify({ files });
    if (next !== JSON.stringify(value ?? null)) {
      onChange({ files });
    }
  }, [files]);

  return <CodeEditor files={files} setFiles={setFiles} className="min-h-[24rem]" />;
}
