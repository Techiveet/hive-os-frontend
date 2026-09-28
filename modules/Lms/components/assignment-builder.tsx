"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  assignmentApi,
  type LmsAssignment,
  type LmsAssignmentPayload,
} from "@/modules/Lms/api/assignments";
import { LMS_TOKENS } from "@/modules/Lms/components/lms-site";
import { LmsPanel } from "@/modules/Lms/components/lms-dashboard-shell";

/** datetime-local wants "YYYY-MM-DDTHH:mm"; the API sends ISO with a zone. */
const toLocalInput = (value?: string | null) => (value ? value.slice(0, 16) : "");

export function AssignmentBuilder({ assignment }: { assignment?: LmsAssignment }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [courseId, setCourseId] = React.useState(assignment?.course_id ?? "");
  const [title, setTitle] = React.useState(assignment?.title ?? "");
  const [instructions, setInstructions] = React.useState(assignment?.instructions ?? "");
  const [points, setPoints] = React.useState(String(assignment?.points ?? 100));
  const [availableFrom, setAvailableFrom] = React.useState(toLocalInput(assignment?.available_from));
  const [dueAt, setDueAt] = React.useState(toLocalInput(assignment?.due_at));
  const [allowLate, setAllowLate] = React.useState(assignment?.allow_late ?? true);

  const courses = useQuery({
    queryKey: ["lms", "courses", "for-assignment"],
    queryFn: () => learningApi.getCourses({ per_page: 200 }),
  });

  const problems = React.useMemo(() => {
    const found: string[] = [];
    if (!courseId) found.push("Pick the course this assignment belongs to.");
    if (!title.trim()) found.push("Give the assignment a title.");
    // Publishing refuses a blank brief server-side, so say so up front.
    if (!instructions.trim()) found.push("Write the instructions learners will follow.");
    if (availableFrom && dueAt && new Date(dueAt) <= new Date(availableFrom)) {
      found.push("The deadline must be after the opening time.");
    }
    return found;
  }, [courseId, title, instructions, availableFrom, dueAt]);

  const payload = (): LmsAssignmentPayload => ({
    course_id: courseId,
    title: title.trim(),
    instructions: instructions.trim() || null,
    points: Number(points) || 0,
    available_from: availableFrom || null,
    due_at: dueAt || null,
    allow_late: allowLate,
  });

  const save = useMutation({
    mutationFn: () =>
      assignment ? assignmentApi.update(assignment.id, payload()) : assignmentApi.create(payload()),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["lms", "assignments"] });
      toast.success(assignment ? "Assignment saved." : "Assignment created.");
      if (!assignment) router.replace(`/learn/assignments/${saved.id}/edit`);
    },
    onError: (error: unknown) =>
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "The assignment could not be saved.",
      ),
  });

  const publish = useMutation({
    // Save first, so publishing never pushes a stale brief live.
    mutationFn: async () => {
      const saved = assignment
        ? await assignmentApi.update(assignment.id, payload())
        : await assignmentApi.create(payload());
      return assignmentApi.publish(saved.id);
    },
    onSuccess: (published) => {
      queryClient.invalidateQueries({ queryKey: ["lms", "assignments"] });
      toast.success("Assignment published — learners on this course can see it now.");
      router.push(`/learn/assignments/${published.id}/edit`);
    },
    onError: (error: unknown) =>
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "The assignment could not be published.",
      ),
  });

  const busy = save.isPending || publish.isPending;

  return (
    <div className="grid gap-7 xl:grid-cols-3">
      <LmsPanel title="Brief" className="xl:col-span-2">
        <div className="flex flex-col gap-5">
          <div>
            <Label htmlFor="assignment-title">Title</Label>
            <Input
              id="assignment-title"
              className="mt-2"
              placeholder="Week 3 reflection"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="assignment-instructions">Instructions</Label>
            <Textarea
              id="assignment-instructions"
              rows={12}
              className="mt-2"
              placeholder="What should the learner produce, and how will it be marked?"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
            />
          </div>
        </div>
      </LmsPanel>

      <div className="flex flex-col gap-7">
        <LmsPanel title="Settings">
          <div className="flex flex-col gap-5">
            <div>
              <Label htmlFor="assignment-course">Course</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger id="assignment-course" className="mt-2">
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
              <Label htmlFor="assignment-points">Points</Label>
              <Input
                id="assignment-points"
                type="number"
                min={0}
                className="mt-2"
                value={points}
                onChange={(event) => setPoints(event.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="assignment-opens">Opens</Label>
              <Input
                id="assignment-opens"
                type="datetime-local"
                className="mt-2"
                value={availableFrom}
                onChange={(event) => setAvailableFrom(event.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="assignment-due">Due</Label>
              <Input
                id="assignment-due"
                type="datetime-local"
                className="mt-2"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="assignment-late" className="font-normal">
                Accept late hand-ins
              </Label>
              <Switch id="assignment-late" checked={allowLate} onCheckedChange={setAllowLate} />
            </div>
            <p className="-mt-2 text-[13px]" style={{ color: LMS_TOKENS.muted }}>
              When off, the deadline is hard and nothing can be handed in after it.
            </p>
          </div>
        </LmsPanel>

        <LmsPanel title="Ready to save">
          {problems.length > 0 ? (
            <ul className="flex flex-col gap-1.5 text-[14px]" style={{ color: "#DC2626" }}>
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[15px]" style={{ color: LMS_TOKENS.muted }}>
              Everything needed is filled in.
            </p>
          )}

          <Button
            type="button"
            className="mt-6 w-full"
            variant="outline"
            disabled={busy || problems.length > 0}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Saving…" : assignment ? "Save changes" : "Save draft"}
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
