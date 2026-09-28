"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { learningApi } from "@/modules/Lms/api";
import {
  quizApi,
  type LmsQuiz,
  type LmsQuizPayload,
  type LmsQuizQuestionSettings,
  type LmsQuizQuestionType,
} from "@/modules/Lms/api/quizzes";
import { LMS_TOKENS } from "@/modules/Lms/components/lms-site";
import { LmsPanel } from "@/modules/Lms/components/lms-dashboard-shell";

type DraftQuestion = {
  key: string;
  /**
   * The server id, on a question that already exists. Sending it back is what
   * keeps learners' answers attached across an edit — without it the server
   * treats the question as new and the old one is removed.
   */
  id?: string | null;
  type: LmsQuizQuestionType;
  prompt: string;
  options: string[];
  /** A list for most types; a left→right map for matching. */
  correct_answer: string[] | Record<string, string>;
  settings: LmsQuizQuestionSettings;
  partial_credit: boolean;
  points: number;
  explanation: string;
};

/** The answer key as a list, for the types that store one. */
function keyAsList(question: DraftQuestion): string[] {
  return Array.isArray(question.correct_answer) ? question.correct_answer : [];
}

/** The answer key as pairs, for matching. */
function keyAsPairs(question: DraftQuestion): Record<string, string> {
  return Array.isArray(question.correct_answer) ? {} : question.correct_answer;
}

const QUESTION_TYPES: { value: LmsQuizQuestionType; label: string; hint: string }[] = [
  { value: "single_choice", label: "Single choice", hint: "One right option — marked automatically." },
  { value: "multiple_choice", label: "Multiple choice", hint: "Several right options — marked automatically." },
  { value: "true_false", label: "True / false", hint: "Marked automatically." },
  { value: "numeric", label: "Numeric", hint: "A number, judged within a tolerance you set." },
  { value: "fill_blank", label: "Fill the blanks", hint: "Write ___ in the prompt for each gap." },
  { value: "matching", label: "Matching", hint: "Pair each item on the left with one on the right." },
  { value: "ordering", label: "Ordering", hint: "Learners arrange the items; order is the answer." },
  { value: "short_text", label: "Short answer", hint: "You mark this one." },
  { value: "long_text", label: "Essay", hint: "You mark this one." },
  { value: "coding", label: "Coding", hint: "Learner writes code; you mark it." },
];

/** Types whose options are a list of choices with a key picked from them. */
const CHOICE_TYPES: LmsQuizQuestionType[] = ["single_choice", "multiple_choice"];

/** Types where the options list is the material, not the answer choices. */
const LIST_TYPES: LmsQuizQuestionType[] = ["fill_blank", "matching", "ordering"];

/** Types that can pay per correct part rather than all-or-nothing. */
const PARTIAL_CREDIT_TYPES: LmsQuizQuestionType[] = [
  "multiple_choice",
  "fill_blank",
  "matching",
  "ordering",
];

function newQuestion(): DraftQuestion {
  return {
    key: crypto.randomUUID(),
    id: null,
    type: "single_choice",
    prompt: "",
    options: ["", ""],
    correct_answer: [],
    settings: {},
    partial_credit: false,
    points: 1,
    explanation: "",
  };
}

/** Server shape → editable draft, keeping option/answer arrays non-null. */
function toDraft(quiz: LmsQuiz): DraftQuestion[] {
  return (quiz.questions ?? []).map((question) => ({
    key: question.id,
    id: question.id,
    type: question.type,
    prompt: question.prompt,
    options: question.options ?? [],
    correct_answer: question.correct_answer ?? [],
    settings: question.settings ?? {},
    partial_credit: Boolean(question.partial_credit),
    points: Number(question.points) || 1,
    explanation: question.explanation ?? "",
  }));
}

type PatchFn = (key: string, changes: Partial<DraftQuestion>) => void;

/**
 * Gaps in a sentence.
 *
 * options holds the label shown beside each box ("Blank 1", or something the
 * author names); correct_answer holds what is accepted there. Alternatives are
 * comma-separated on one line, which is how an author actually thinks about
 * "colour or color" — the server takes a list.
 */
function BlanksEditor({ question, patch }: { question: DraftQuestion; patch: PatchFn }) {
  const accepted = keyAsList(question);
  const gaps = Math.max(question.options.length, accepted.length, 1);

  const setGap = (index: number, label: string, answers: string) => {
    const options = Array.from({ length: gaps }, (_, i) => question.options[i] ?? `Blank ${i + 1}`);
    const key = Array.from({ length: gaps }, (_, i) => accepted[i] ?? "");
    options[index] = label;
    key[index] = answers;
    patch(question.key, { options, correct_answer: key });
  };

  return (
    <div className="mt-5">
      <Label>Blanks</Label>
      <p className="mt-1.5 text-[13px]" style={{ color: LMS_TOKENS.muted }}>
        Write <code>___</code> in the prompt where each gap goes. Separate alternative spellings
        with a comma — any one of them is accepted.
      </p>
      <ul className="mt-3 flex flex-col gap-3">
        {Array.from({ length: gaps }, (_, index) => (
          <li key={index} className="grid gap-3 sm:grid-cols-[10rem_1fr_auto]">
            <Input
              aria-label={`Label for blank ${index + 1}`}
              placeholder={`Blank ${index + 1}`}
              value={question.options[index] ?? ""}
              onChange={(event) => setGap(index, event.target.value, accepted[index] ?? "")}
            />
            <Input
              aria-label={`Accepted answers for blank ${index + 1}`}
              placeholder="colour, color"
              value={accepted[index] ?? ""}
              onChange={(event) =>
                setGap(index, question.options[index] ?? `Blank ${index + 1}`, event.target.value)
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove blank ${index + 1}`}
              disabled={gaps <= 1}
              onClick={() =>
                patch(question.key, {
                  options: question.options.filter((_, i) => i !== index),
                  correct_answer: accepted.filter((_, i) => i !== index),
                })
              }
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            patch(question.key, {
              options: [...question.options, `Blank ${gaps + 1}`],
              correct_answer: [...accepted, ""],
            })
          }
        >
          <Plus className="size-4" />
          Add blank
        </Button>
        <label className="flex items-center gap-2 text-[14px]" style={{ color: LMS_TOKENS.muted }}>
          <input
            type="checkbox"
            className="size-4"
            checked={Boolean(question.settings.case_sensitive)}
            onChange={(event) =>
              patch(question.key, {
                settings: { ...question.settings, case_sensitive: event.target.checked || undefined },
              })
            }
          />
          Case matters
        </label>
      </div>
    </div>
  );
}

/**
 * Pairs.
 *
 * options is the left-hand column; correct_answer maps each left item to its
 * partner. settings.targets is the pool the learner picks from — it defaults to
 * the partners themselves, and an author only widens it when they want
 * distractors that pair with nothing.
 */
function MatchingEditor({ question, patch }: { question: DraftQuestion; patch: PatchFn }) {
  const pairs = keyAsPairs(question);
  const lefts = question.options.length ? question.options : ["", ""];

  const rename = (index: number, value: string) => {
    const previous = lefts[index];
    const options = [...lefts];
    options[index] = value;

    const next: Record<string, string> = {};
    for (const [left, right] of Object.entries(pairs)) {
      next[left === previous ? value : left] = right;
    }

    patch(question.key, { options, correct_answer: next });
  };

  return (
    <div className="mt-5">
      <Label>Pairs</Label>
      <p className="mt-1.5 text-[13px]" style={{ color: LMS_TOKENS.muted }}>
        Learners see the left column and pick a partner for each from a shuffled list of the right
        column.
      </p>
      <ul className="mt-3 flex flex-col gap-3">
        {lefts.map((left, index) => (
          <li key={index} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              aria-label={`Item ${index + 1}`}
              placeholder="404"
              value={left}
              onChange={(event) => rename(index, event.target.value)}
            />
            <Input
              aria-label={`Partner for item ${index + 1}`}
              placeholder="Not Found"
              value={pairs[left] ?? ""}
              onChange={(event) =>
                patch(question.key, {
                  correct_answer: { ...pairs, [left]: event.target.value },
                })
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove pair ${index + 1}`}
              disabled={lefts.length <= 2}
              onClick={() => {
                const next = { ...pairs };
                delete next[left];
                patch(question.key, {
                  options: lefts.filter((_, i) => i !== index),
                  correct_answer: next,
                });
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => patch(question.key, { options: [...lefts, ""] })}
      >
        <Plus className="size-4" />
        Add pair
      </Button>
    </div>
  );
}

/**
 * A sequence.
 *
 * The author writes the items in their correct order; options and
 * correct_answer are the same list, because the order *is* the answer. Learners
 * always receive them shuffled — the server sees to that, so an ordering
 * question never arrives pre-solved.
 */
function OrderingEditor({ question, patch }: { question: DraftQuestion; patch: PatchFn }) {
  const items = question.options.length ? question.options : ["", ""];

  const write = (next: string[]) =>
    patch(question.key, { options: next, correct_answer: next.filter((item) => item.trim()) });

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    write(next);
  };

  return (
    <div className="mt-5">
      <Label>Items, in the correct order</Label>
      <p className="mt-1.5 text-[13px]" style={{ color: LMS_TOKENS.muted }}>
        Learners always see these shuffled.
      </p>
      <ul className="mt-3 flex flex-col gap-3">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <span className="w-6 shrink-0 tabular-nums" style={{ color: LMS_TOKENS.muted }}>
              {index + 1}.
            </span>
            <Input
              aria-label={`Item ${index + 1}`}
              placeholder={`Step ${index + 1}`}
              value={item}
              onChange={(event) => {
                const next = [...items];
                next[index] = event.target.value;
                write(next);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Move item ${index + 1} up`}
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              <ArrowUp className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Move item ${index + 1} down`}
              disabled={index === items.length - 1}
              onClick={() => move(index, 1)}
            >
              <ArrowDown className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove item ${index + 1}`}
              disabled={items.length <= 2}
              onClick={() => write(items.filter((_, i) => i !== index))}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => write([...items, ""])}
      >
        <Plus className="size-4" />
        Add item
      </Button>
    </div>
  );
}

/**
 * Create/edit form for a quiz and its questions.
 *
 * Questions are sent whole on save: the API only rewrites them when the
 * `questions` key is present, so this component always owns the full set.
 */
export function QuizBuilder({ quiz }: { quiz?: LmsQuiz }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [courseId, setCourseId] = React.useState(quiz?.course_id ?? "");
  const [lessonId, setLessonId] = React.useState(quiz?.lesson_id ?? "");
  const [title, setTitle] = React.useState(quiz?.title ?? "");
  const [instructions, setInstructions] = React.useState(quiz?.instructions ?? "");
  const [duration, setDuration] = React.useState(String(quiz?.duration_minutes ?? 0));
  const [passMark, setPassMark] = React.useState(String(quiz?.pass_mark ?? 50));
  const [maxAttempts, setMaxAttempts] = React.useState(
    quiz?.max_attempts == null ? "" : String(quiz.max_attempts),
  );
  // datetime-local wants "YYYY-MM-DDTHH:mm"; the API sends ISO with a zone.
  const toLocalInput = (value?: string | null) => (value ? value.slice(0, 16) : "");
  const [availableFrom, setAvailableFrom] = React.useState(toLocalInput(quiz?.available_from));
  const [dueAt, setDueAt] = React.useState(toLocalInput(quiz?.due_at));
  const [shuffle, setShuffle] = React.useState(Boolean(quiz?.shuffle_questions));
  const [shuffleOptions, setShuffleOptions] = React.useState(Boolean(quiz?.shuffle_options));
  const [questionCount, setQuestionCount] = React.useState(
    quiz?.question_count == null ? "" : String(quiz.question_count),
  );
  const [showAnswers, setShowAnswers] = React.useState(Boolean(quiz?.show_correct_answers));

  // Exam conditions. allow_backtracking defaults on, so an existing quiz keeps
  // behaving the way it always has.
  const [audience, setAudience] = React.useState<"course" | "selected">(quiz?.audience ?? "course");
  const [allowBacktracking, setAllowBacktracking] = React.useState(quiz?.allow_backtracking ?? true);
  const [requireFullscreen, setRequireFullscreen] = React.useState(Boolean(quiz?.require_fullscreen));
  const [blockCopyPaste, setBlockCopyPaste] = React.useState(Boolean(quiz?.block_copy_paste));
  const [maxFocusLoss, setMaxFocusLoss] = React.useState(
    quiz?.max_focus_loss == null ? "" : String(quiz.max_focus_loss),
  );
  const [questions, setQuestions] = React.useState<DraftQuestion[]>(
    quiz ? toDraft(quiz) : [newQuestion()],
  );

  const courses = useQuery({
    queryKey: ["lms", "courses", "for-quiz"],
    queryFn: () => learningApi.getCourses({ per_page: 200 }),
  });

  const courseDetail = useQuery({
    queryKey: ["lms", "course", courseId],
    queryFn: () => learningApi.getCourse(courseId),
    enabled: Boolean(courseId),
  });

  const patch = (key: string, changes: Partial<DraftQuestion>) =>
    setQuestions((current) =>
      current.map((question) => (question.key === key ? { ...question, ...changes } : question)),
    );

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    setQuestions((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const totalPoints = questions.reduce((sum, question) => sum + (Number(question.points) || 0), 0);

  /** Everything that would make the server reject the save, said in advance. */
  const problems = React.useMemo(() => {
    const found: string[] = [];
    if (!courseId) found.push("Pick the course this quiz belongs to.");
    if (!title.trim()) found.push("Give the quiz a title.");
    if (questions.length === 0) found.push("Add at least one question.");

    if (availableFrom && dueAt && new Date(dueAt) <= new Date(availableFrom)) {
      found.push("The closing time must be after the opening time.");
    }

    // A bank too small for the paper it promises would hand different learners
    // different numbers of questions, silently.
    if (questionCount.trim() !== "" && Number(questionCount) > questions.length) {
      found.push(
        `This quiz draws ${questionCount} questions but the bank only has ${questions.length}.`,
      );
    }

    questions.forEach((question, index) => {
      const n = index + 1;
      if (!question.prompt.trim()) found.push(`Question ${n} has no prompt.`);
      if (CHOICE_TYPES.includes(question.type)) {
        const filled = question.options.filter((option) => option.trim());
        if (filled.length < 2) found.push(`Question ${n} needs at least two options.`);
        if (keyAsList(question).length === 0) {
          found.push(`Question ${n} has no correct option marked.`);
        }
      }
      if (question.type === "true_false" && keyAsList(question).length !== 1) {
        found.push(`Question ${n} needs True or False marked as correct.`);
      }
      if (question.type === "numeric" && keyAsList(question).filter(Boolean).length !== 1) {
        found.push(`Question ${n} needs the expected number.`);
      }
      if (question.type === "fill_blank" && keyAsList(question).filter(Boolean).length === 0) {
        found.push(`Question ${n} needs an accepted answer for each blank.`);
      }
      if (question.type === "ordering") {
        const items = question.options.filter((option) => option.trim());
        if (items.length < 2) found.push(`Question ${n} needs at least two items to order.`);
      }
      if (question.type === "matching") {
        const lefts = question.options.filter((option) => option.trim());
        const pairs = keyAsPairs(question);
        if (lefts.length < 2) found.push(`Question ${n} needs at least two items to match.`);
        if (lefts.some((left) => !pairs[left]?.trim())) {
          found.push(`Question ${n} has an item with no partner chosen.`);
        }
      }
    });

    return found;
  }, [courseId, title, questions, availableFrom, dueAt, questionCount]);

  const payload = (): LmsQuizPayload => ({
    course_id: courseId,
    lesson_id: lessonId || null,
    title: title.trim(),
    instructions: instructions.trim() || null,
    duration_minutes: Number(duration) || 0,
    pass_mark: Number(passMark) || 0,
    max_attempts: maxAttempts.trim() === "" ? null : Number(maxAttempts),
    available_from: availableFrom || null,
    due_at: dueAt || null,
    shuffle_questions: shuffle,
    shuffle_options: shuffleOptions,
    question_count: questionCount.trim() === "" ? null : Number(questionCount),
    audience,
    allow_backtracking: allowBacktracking,
    require_fullscreen: requireFullscreen,
    block_copy_paste: blockCopyPaste,
    max_focus_loss: maxFocusLoss.trim() === "" ? null : Number(maxFocusLoss),
    show_correct_answers: showAnswers,
    questions: questions.map((question) => {
      const key = Array.isArray(question.correct_answer)
        ? question.correct_answer.filter((value) => String(value).trim() !== "")
        : question.correct_answer;

      return {
        // Carrying the id is what keeps a learner's answers attached when the
        // author edits the paper afterwards.
        id: question.id ?? null,
        type: question.type,
        prompt: question.prompt.trim(),
        explanation: question.explanation.trim() || null,
        options:
          CHOICE_TYPES.includes(question.type) || LIST_TYPES.includes(question.type)
            ? question.options.map((option) => option.trim()).filter(Boolean)
            : question.type === "true_false"
              ? ["True", "False"]
              : null,
        correct_answer:
          Array.isArray(key) ? (key.length ? key : null) : (Object.keys(key).length ? key : null),
        settings: Object.keys(question.settings).length ? question.settings : null,
        partial_credit: PARTIAL_CREDIT_TYPES.includes(question.type) && question.partial_credit,
        points: Number(question.points) || 1,
      };
    }),
  });

  const save = useMutation({
    mutationFn: () => (quiz ? quizApi.update(quiz.id, payload()) : quizApi.create(payload())),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["lms", "quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["lms", "quiz", saved.id] });
      toast.success(quiz ? "Quiz saved." : "Quiz created.");
      if (!quiz) router.replace(`/learn/quizzes/${saved.id}/edit`);
    },
    onError: (error: unknown) =>
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "The quiz could not be saved.",
      ),
  });

  const publish = useMutation({
    // Save first: publishing a stale draft would push the wrong questions live.
    mutationFn: async () => {
      const saved = quiz ? await quizApi.update(quiz.id, payload()) : await quizApi.create(payload());
      return quizApi.publish(saved.id);
    },
    onSuccess: (published) => {
      queryClient.invalidateQueries({ queryKey: ["lms", "quizzes"] });
      toast.success("Quiz published — learners on this course can sit it now.");
      router.push(`/learn/quizzes/${published.id}/edit`);
    },
    onError: (error: unknown) =>
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "The quiz could not be published.",
      ),
  });

  const busy = save.isPending || publish.isPending;

  return (
    <div className="grid gap-7 xl:grid-cols-3">
      {/* ------------------------------ questions ----------------------------- */}
      <div className="flex flex-col gap-7 xl:col-span-2">
        {questions.map((question, index) => {
          const meta = QUESTION_TYPES.find((entry) => entry.value === question.type);
          const isChoice = CHOICE_TYPES.includes(question.type);

          return (
            <LmsPanel
              key={question.key}
              title={
                <span className="flex items-center gap-2">
                  <GripVertical className="size-4" style={{ color: LMS_TOKENS.muted }} />
                  Question {index + 1}
                </span>
              }
              action={
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Move question ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Move question ${index + 1} down`}
                    disabled={index === questions.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete question ${index + 1}`}
                    onClick={() =>
                      setQuestions((current) =>
                        current.filter((entry) => entry.key !== question.key),
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              }
            >
              <div className="grid gap-5 sm:grid-cols-[1fr_10rem]">
                <div>
                  <Label htmlFor={`type-${question.key}`}>Type</Label>
                  <Select
                    value={question.type}
                    onValueChange={(value) =>
                      patch(question.key, {
                        type: value as LmsQuizQuestionType,
                        // The old key stops meaning anything once the shape changes.
                        correct_answer: [],
                      })
                    }
                  >
                    <SelectTrigger id={`type-${question.key}`} className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUESTION_TYPES.map((entry) => (
                        <SelectItem key={entry.value} value={entry.value}>
                          {entry.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {meta ? (
                    <p className="mt-2 text-[13px]" style={{ color: LMS_TOKENS.muted }}>
                      {meta.hint}
                    </p>
                  ) : null}
                </div>

                <div>
                  <Label htmlFor={`points-${question.key}`}>Points</Label>
                  <Input
                    id={`points-${question.key}`}
                    type="number"
                    min={0}
                    step="0.5"
                    className="mt-2"
                    value={question.points}
                    onChange={(event) =>
                      patch(question.key, { points: Number(event.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="mt-5">
                <Label htmlFor={`prompt-${question.key}`}>Prompt</Label>
                <Textarea
                  id={`prompt-${question.key}`}
                  rows={2}
                  className="mt-2"
                  placeholder="What are you asking?"
                  value={question.prompt}
                  onChange={(event) => patch(question.key, { prompt: event.target.value })}
                />
              </div>

              {question.type === "true_false" ? (
                <div className="mt-5">
                  <Label>Correct answer</Label>
                  <div className="mt-2 flex gap-3">
                    {["True", "False"].map((option) => (
                      <Button
                        key={option}
                        type="button"
                        variant={keyAsList(question)[0] === option ? "default" : "outline"}
                        onClick={() => patch(question.key, { correct_answer: [option] })}
                        style={
                          keyAsList(question)[0] === option
                            ? { backgroundColor: LMS_TOKENS.purple }
                            : undefined
                        }
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}

              {isChoice ? (
                <div className="mt-5">
                  <Label>Options — tick the correct one{question.type === "multiple_choice" ? "s" : ""}</Label>
                  <ul className="mt-3 flex flex-col gap-3">
                    {question.options.map((option, optionIndex) => {
                      const checked = keyAsList(question).includes(option) && option.trim() !== "";
                      return (
                        <li key={optionIndex} className="flex items-center gap-3">
                          <input
                            type={question.type === "multiple_choice" ? "checkbox" : "radio"}
                            name={`correct-${question.key}`}
                            className="size-4 shrink-0"
                            aria-label={`Option ${optionIndex + 1} is correct`}
                            checked={checked}
                            disabled={!option.trim()}
                            onChange={(event) => {
                              if (question.type === "multiple_choice") {
                                patch(question.key, {
                                  correct_answer: event.target.checked
                                    ? [...keyAsList(question), option]
                                    : keyAsList(question).filter((entry) => entry !== option),
                                });
                              } else {
                                patch(question.key, { correct_answer: [option] });
                              }
                            }}
                          />
                          <Input
                            value={option}
                            placeholder={`Option ${optionIndex + 1}`}
                            onChange={(event) => {
                              const value = event.target.value;
                              const options = [...question.options];
                              const previous = options[optionIndex];
                              options[optionIndex] = value;
                              // Keep the key pointing at the renamed option.
                              patch(question.key, {
                                options,
                                correct_answer: keyAsList(question).map((entry) =>
                                  entry === previous ? value : entry,
                                ),
                              });
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove option ${optionIndex + 1}`}
                            disabled={question.options.length <= 2}
                            onClick={() =>
                              patch(question.key, {
                                options: question.options.filter((_, i) => i !== optionIndex),
                                correct_answer: keyAsList(question).filter(
                                  (entry) => entry !== option,
                                ),
                              })
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => patch(question.key, { options: [...question.options, ""] })}
                  >
                    <Plus className="size-4" />
                    Add option
                  </Button>
                </div>
              ) : null}

              {question.type === "numeric" ? (
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor={`numeric-${question.key}`}>Expected answer</Label>
                    <Input
                      id={`numeric-${question.key}`}
                      className="mt-2"
                      inputMode="decimal"
                      placeholder="9.81"
                      value={keyAsList(question)[0] ?? ""}
                      onChange={(event) =>
                        patch(question.key, { correct_answer: [event.target.value] })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor={`tolerance-${question.key}`}>
                      Tolerance <span style={{ color: LMS_TOKENS.muted }}>(±)</span>
                    </Label>
                    <Input
                      id={`tolerance-${question.key}`}
                      className="mt-2"
                      inputMode="decimal"
                      placeholder="0"
                      value={question.settings.tolerance ?? ""}
                      onChange={(event) =>
                        patch(question.key, {
                          settings: {
                            ...question.settings,
                            tolerance: event.target.value === "" ? undefined : Number(event.target.value),
                          },
                        })
                      }
                    />
                    <p className="mt-1.5 text-[13px]" style={{ color: LMS_TOKENS.muted }}>
                      How far out still counts. Leave blank to require an exact match.
                    </p>
                  </div>
                </div>
              ) : null}

              {question.type === "fill_blank" ? (
                <BlanksEditor question={question} patch={patch} />
              ) : null}

              {question.type === "matching" ? (
                <MatchingEditor question={question} patch={patch} />
              ) : null}

              {question.type === "ordering" ? (
                <OrderingEditor question={question} patch={patch} />
              ) : null}

              {PARTIAL_CREDIT_TYPES.includes(question.type) ? (
                <label className="mt-5 flex items-start gap-3">
                  <Switch
                    checked={question.partial_credit}
                    onCheckedChange={(checked) => patch(question.key, { partial_credit: checked })}
                  />
                  <span>
                    <span className="text-[15px]" style={{ color: LMS_TOKENS.navy }}>
                      Award marks per correct part
                    </span>
                    <span className="block text-[13px]" style={{ color: LMS_TOKENS.muted }}>
                      Off means all-or-nothing. On, three of four blanks earns three quarters —
                      and on multiple choice a wrong pick cancels out a right one, so ticking
                      everything scores zero.
                    </span>
                  </span>
                </label>
              ) : null}

              <div className="mt-5">
                <Label htmlFor={`explanation-${question.key}`}>
                  Explanation <span style={{ color: LMS_TOKENS.muted }}>(optional)</span>
                </Label>
                <Textarea
                  id={`explanation-${question.key}`}
                  rows={2}
                  className="mt-2"
                  placeholder="Shown after submission when answers are revealed."
                  value={question.explanation}
                  onChange={(event) => patch(question.key, { explanation: event.target.value })}
                />
              </div>
            </LmsPanel>
          );
        })}

        <Button
          type="button"
          variant="outline"
          className="h-14 border-dashed"
          onClick={() => setQuestions((current) => [...current, newQuestion()])}
        >
          <Plus className="size-4" />
          Add question
        </Button>
      </div>

      {/* ------------------------------ settings ------------------------------ */}
      <div className="flex flex-col gap-7">
        <LmsPanel title="Settings">
          <div className="flex flex-col gap-5">
            <div>
              <Label htmlFor="quiz-title">Title</Label>
              <Input
                id="quiz-title"
                className="mt-2"
                placeholder="Module 3 assessment"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="quiz-course">Course</Label>
              <Select
                value={courseId}
                onValueChange={(value) => {
                  setCourseId(value);
                  setLessonId("");
                }}
              >
                <SelectTrigger id="quiz-course" className="mt-2">
                  <SelectValue placeholder="Choose a course" />
                </SelectTrigger>
                <SelectContent>
                  {(courses.data?.data ?? []).map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quiz-lesson">Lesson</Label>
              <Select
                value={lessonId || "__course__"}
                onValueChange={(value) => setLessonId(value === "__course__" ? "" : value)}
                disabled={!courseId}
              >
                <SelectTrigger id="quiz-lesson" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__course__">Final quiz for the course</SelectItem>
                  {(courseDetail.data?.lessons ?? []).map((lesson) => (
                    <SelectItem key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quiz-instructions">Instructions</Label>
              <Textarea
                id="quiz-instructions"
                rows={3}
                className="mt-2"
                placeholder="Anything the learner should read before starting."
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quiz-duration">Minutes</Label>
                <Input
                  id="quiz-duration"
                  type="number"
                  min={0}
                  className="mt-2"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                />
                <p className="mt-1.5 text-[13px]" style={{ color: LMS_TOKENS.muted }}>
                  0 = untimed
                </p>
              </div>
              <div>
                <Label htmlFor="quiz-pass">Pass mark %</Label>
                <Input
                  id="quiz-pass"
                  type="number"
                  min={0}
                  max={100}
                  className="mt-2"
                  value={passMark}
                  onChange={(event) => setPassMark(event.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="quiz-attempts">Max attempts</Label>
              <Input
                id="quiz-attempts"
                type="number"
                min={1}
                className="mt-2"
                placeholder="Unlimited"
                value={maxAttempts}
                onChange={(event) => setMaxAttempts(event.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="quiz-opens">Opens</Label>
              <Input
                id="quiz-opens"
                type="datetime-local"
                className="mt-2"
                value={availableFrom}
                onChange={(event) => setAvailableFrom(event.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="quiz-due">Closes</Label>
              <Input
                id="quiz-due"
                type="datetime-local"
                className="mt-2"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
              />
              <p className="mt-1.5 text-[13px]" style={{ color: LMS_TOKENS.muted }}>
                Leave both blank to keep the quiz open for as long as it is published.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="quiz-shuffle" className="font-normal">
                Shuffle questions
              </Label>
              <Switch id="quiz-shuffle" checked={shuffle} onCheckedChange={setShuffle} />
            </div>

            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="quiz-shuffle-options" className="font-normal">
                Shuffle the options within each question
              </Label>
              <Switch
                id="quiz-shuffle-options"
                checked={shuffleOptions}
                onCheckedChange={setShuffleOptions}
              />
            </div>

            <div>
              <Label htmlFor="quiz-question-count">
                Questions per attempt <span style={{ color: LMS_TOKENS.muted }}>(optional)</span>
              </Label>
              <Input
                id="quiz-question-count"
                type="number"
                min={1}
                className="mt-2"
                placeholder={`All ${questions.length}`}
                value={questionCount}
                onChange={(event) => setQuestionCount(event.target.value)}
              />
              <p className="mt-1.5 text-[13px]" style={{ color: LMS_TOKENS.muted }}>
                Draw this many at random from the bank, so no two learners get the same paper.
                Blank asks them all.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="quiz-reveal" className="font-normal">
                Show correct answers after submission
              </Label>
              <Switch id="quiz-reveal" checked={showAnswers} onCheckedChange={setShowAnswers} />
            </div>
          </div>
        </LmsPanel>

        {/*
          Exam conditions. Everything here is enforced server-side as well as in
          the runner — the browser reports what it sees, the server decides what
          it means. Worth saying plainly on the screen, because a rule that is
          only enforced in the client is a rule that does not exist.
        */}
        <LmsPanel title="Exam conditions">
          <div className="flex flex-col gap-5">
            <div>
              <Label htmlFor="quiz-audience">Who can sit this quiz</Label>
              <Select
                value={audience}
                onValueChange={(value) => setAudience(value as "course" | "selected")}
              >
                <SelectTrigger id="quiz-audience" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="course">Everyone enrolled on the course</SelectItem>
                  <SelectItem value="selected">Only learners I choose</SelectItem>
                </SelectContent>
              </Select>
              {audience === "selected" ? (
                <p className="mt-1.5 text-[13px]" style={{ color: LMS_TOKENS.muted }}>
                  Save the quiz first, then pick the learners from its page. A quiz set for
                  selected learners cannot be published until at least one is named.
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="quiz-backtrack" className="font-normal">
                Allow going back to earlier questions
              </Label>
              <Switch
                id="quiz-backtrack"
                checked={allowBacktracking}
                onCheckedChange={setAllowBacktracking}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="quiz-fullscreen" className="font-normal">
                Ask for fullscreen
              </Label>
              <Switch
                id="quiz-fullscreen"
                checked={requireFullscreen}
                onCheckedChange={setRequireFullscreen}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="quiz-clipboard" className="font-normal">
                Block copy and paste
              </Label>
              <Switch
                id="quiz-clipboard"
                checked={blockCopyPaste}
                onCheckedChange={setBlockCopyPaste}
              />
            </div>

            <div>
              <Label htmlFor="quiz-focus-limit">
                Hand in after this many departures{" "}
                <span style={{ color: LMS_TOKENS.muted }}>(optional)</span>
              </Label>
              <Input
                id="quiz-focus-limit"
                type="number"
                min={1}
                className="mt-2"
                placeholder="Never"
                value={maxFocusLoss}
                onChange={(event) => setMaxFocusLoss(event.target.value)}
              />
              <p className="mt-1.5 text-[13px]" style={{ color: LMS_TOKENS.muted }}>
                Leaving the tab is always recorded for you to review. Set a number here to have the
                paper handed in automatically once it is reached.
              </p>
            </div>

            <p className="text-[13px]" style={{ color: LMS_TOKENS.muted }}>
              A browser can only report what its own tab sees, so these catch the ordinary case
              rather than a determined one. Every event is timestamped on the attempt for you to
              read afterwards.
            </p>
          </div>
        </LmsPanel>

        <LmsPanel title="Ready to save">
          <div className="flex items-center justify-between text-[15px]">
            <span style={{ color: LMS_TOKENS.muted }}>Questions</span>
            <span style={{ color: LMS_TOKENS.navy }}>{questions.length}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[15px]">
            <span style={{ color: LMS_TOKENS.muted }}>Total points</span>
            <span style={{ color: LMS_TOKENS.navy }}>{totalPoints}</span>
          </div>

          {problems.length > 0 ? (
            <ul className="mt-5 flex flex-col gap-1.5 text-[14px]" style={{ color: "#DC2626" }}>
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          ) : null}

          <Button
            type="button"
            className="mt-6 w-full"
            variant="outline"
            disabled={busy || problems.length > 0}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Saving…" : quiz ? "Save changes" : "Save draft"}
          </Button>
          <Button
            type="button"
            className="mt-3 w-full"
            disabled={busy || problems.length > 0}
            onClick={() => publish.mutate()}
            style={{ backgroundColor: LMS_TOKENS.purple }}
          >
            {publish.isPending ? "Publishing…" : "Save & publish"}
          </Button>
        </LmsPanel>
      </div>
    </div>
  );
}
