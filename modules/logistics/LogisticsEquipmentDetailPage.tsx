"use client";

import Link from "next/link";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Box,
  History,
  Link2,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { usePermissions } from "@/hooks/use-permissions";
import { logisticsApi } from "@/modules/logistics/api";
import type {
  Equipment,
  EquipmentAssignment,
  EquipmentFreeTimeRule,
  ForwardingJob,
  LogisticsReferences,
  LogisticsOption,
} from "@/modules/logistics/types";
import { useTranslation } from "@/store/use-translation";

const EVENT_TYPES = [
  "empty_released",
  "empty_picked_up",
  "stuffing_started",
  "stuffing_completed",
  "sealed",
  "gate_in",
  "loaded",
  "departed",
  "transshipped",
  "discharged",
  "available",
  "gate_out",
  "delivered",
  "emptied",
  "empty_returned",
  "damage_detected",
  "corrected",
];

export default function LogisticsEquipmentDetailPage({
  equipmentId,
}: {
  equipmentId: string;
}) {
  const id = Number(equipmentId);
  const { t } = useTranslation();
  const cache = useQueryClient();
  const { hasAnyPermission } = usePermissions();
  const canAssign = hasAnyPermission([
    "assign_logistics_equipment",
    "manage_logistics",
  ]);
  const canEvent = hasAnyPermission([
    "manage_logistics_equipment_events",
    "manage_logistics",
  ]);
  const canUpdate = hasAnyPermission([
    "update_logistics_equipment",
    "manage_logistics",
  ]);
  const canOverrideFreeTime = hasAnyPermission([
    "override_logistics_free_time",
    "manage_logistics",
  ]);
  const [notice, setNotice] = React.useState("");
  const [error, setError] = React.useState("");
  const query = useQuery({
    queryKey: ["logistics", "equipment", id],
    queryFn: () =>
      logisticsApi
        .equipmentItem(id)
        .then((response) => response.data.data as Equipment),
    enabled: Number.isInteger(id),
  });
  const refs = useQuery({
    queryKey: ["logistics", "references"],
    queryFn: () =>
      logisticsApi
        .references()
        .then((response) => response.data.data as LogisticsReferences),
  });
  const jobs = useQuery({
    queryKey: ["logistics", "jobs", "equipment-assignment"],
    queryFn: () =>
      logisticsApi
        .jobs({ per_page: 100 })
        .then((response) => (response.data.data ?? []) as ForwardingJob[]),
  });
  const freeTimeRules = useQuery({
    queryKey: ["logistics", "equipment-free-time-rules"],
    queryFn: () =>
      logisticsApi
        .equipmentFreeTimeRules()
        .then(
          (response) =>
            (response.data.data?.data ?? []) as EquipmentFreeTimeRule[],
        ),
    enabled: canOverrideFreeTime,
  });
  const refresh = async (message: string) => {
    await cache.invalidateQueries({ queryKey: ["logistics", "equipment", id] });
    setError("");
    setNotice(message);
  };
  const message = (value: unknown) =>
    (value as { response?: { data?: { message?: string } } }).response?.data
      ?.message ?? t("logistics.errors.action");
  const assign = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      logisticsApi.assignEquipment(id, payload),
    onSuccess: () => refresh(t("logistics.messages.equipment_assigned")),
    onError: (value) => setError(message(value)),
  });
  const eventMutation = useMutation({
    mutationFn: ({
      assignment,
      payload,
    }: {
      assignment: number;
      payload: Record<string, unknown>;
    }) => logisticsApi.recordEquipmentEvent(assignment, payload),
    onSuccess: () => refresh(t("logistics.messages.event_recorded")),
    onError: (value) => setError(message(value)),
  });
  const sealMutation = useMutation({
    mutationFn: ({
      assignment,
      payload,
    }: {
      assignment: number;
      payload: Record<string, unknown>;
    }) => logisticsApi.recordEquipmentSeal(assignment, payload),
    onSuccess: () => refresh(t("logistics.messages.seal_recorded")),
    onError: (value) => setError(message(value)),
  });
  const vgmMutation = useMutation({
    mutationFn: ({
      assignment,
      payload,
    }: {
      assignment: number;
      payload: Record<string, unknown>;
    }) => logisticsApi.recordEquipmentVgm(assignment, payload),
    onSuccess: () => refresh(t("logistics.messages.vgm_recorded")),
    onError: (value) => setError(message(value)),
  });
  const freeTimeMutation = useMutation({
    mutationFn: ({
      assignment,
      payload,
    }: {
      assignment: number;
      payload: Record<string, unknown>;
    }) => logisticsApi.applyEquipmentFreeTime(assignment, payload),
    onSuccess: () => refresh(t("logistics.messages.free_time_applied")),
    onError: (value) => setError(message(value)),
  });
  const equipment = query.data;
  if (query.isLoading)
    return (
      <p role="status" className="flex items-center gap-2">
        <Spinner />
        {t("logistics.loading")}
      </p>
    );
  if (query.isError || !equipment)
    return (
      <Alert variant="destructive">
        <AlertTitle>{t("logistics.errors.load_title")}</AlertTitle>
        <AlertDescription>{t("logistics.errors.equipment")}</AlertDescription>
      </Alert>
    );
  return (
    <main className="space-y-6">
      <header>
        <Link
          href="/dashboard/logistics/equipment"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft aria-hidden="true" />
          {t("logistics.actions.back_equipment")}
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-3xl font-black tracking-tight">
            {equipment.identification_number}
          </h1>
          <Badge variant={equipment.is_iso_standard ? "default" : "outline"}>
            {equipment.is_iso_standard
              ? t("logistics.equipment.valid_iso")
              : t("logistics.equipment.non_iso")}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {equipment.type?.name ?? "—"} ·{" "}
          {equipment.owner?.name ?? t("logistics.optional.none")}
        </p>
      </header>
      <div aria-live="polite">
        {notice ? (
          <Alert>
            <AlertTitle>{notice}</AlertTitle>
          </Alert>
        ) : null}
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>{t("logistics.errors.action_title")}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>
      {canAssign ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 aria-hidden="true" />
              {t("logistics.actions.assign_equipment")}
            </CardTitle>
            <CardDescription>
              {t("logistics.equipment.journeys")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-[1fr_1fr_auto]"
              onSubmit={(formEvent) => {
                formEvent.preventDefault();
                const data = new FormData(formEvent.currentTarget);
                assign.mutate({
                  forwarding_job_id: Number(data.get("forwarding_job_id")),
                  current_node_id: data.get("current_node_id")
                    ? Number(data.get("current_node_id"))
                    : null,
                  status: "assigned",
                });
              }}
            >
              <Field>
                <FieldLabel htmlFor="assignment-job">
                  {t("logistics.fields.job")}
                </FieldLabel>
                <NativeSelect
                  id="assignment-job"
                  name="forwarding_job_id"
                  required
                >
                  <option value="">{t("common.select")}</option>
                  {jobs.data?.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.job_number} — {job.customer?.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="assignment-node">
                  {t("logistics.fields.current_node")}
                </FieldLabel>
                <NativeSelect id="assignment-node" name="current_node_id">
                  <option value="">{t("logistics.optional.none")}</option>
                  {refs.data?.nodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.code} — {node.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Button
                className="min-h-11 self-end"
                type="submit"
                disabled={assign.isPending}
              >
                {t("logistics.actions.assign_equipment")}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
      <section aria-labelledby="journeys-heading">
        <h2 id="journeys-heading" className="text-xl font-bold">
          {t("logistics.equipment.journeys")}
        </h2>
        {equipment.assignments?.length ? (
          <div className="mt-4 space-y-5">
            {equipment.assignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                canEvent={canEvent}
                canUpdate={canUpdate}
                canOverrideFreeTime={canOverrideFreeTime}
                nodes={refs.data?.nodes ?? []}
                freeTimeRules={freeTimeRules.data ?? []}
                t={t}
                onEvent={(payload) =>
                  eventMutation.mutate({ assignment: assignment.id, payload })
                }
                onSeal={(payload) =>
                  sealMutation.mutate({ assignment: assignment.id, payload })
                }
                onVgm={(payload) =>
                  vgmMutation.mutate({ assignment: assignment.id, payload })
                }
                onFreeTime={(payload) =>
                  freeTimeMutation.mutate({
                    assignment: assignment.id,
                    payload,
                  })
                }
                pending={
                  eventMutation.isPending ||
                  sealMutation.isPending ||
                  vgmMutation.isPending ||
                  freeTimeMutation.isPending
                }
              />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            {t("logistics.empty.assignments")}
          </p>
        )}
      </section>
    </main>
  );
}

function AssignmentCard({
  assignment,
  canEvent,
  canUpdate,
  canOverrideFreeTime,
  nodes,
  freeTimeRules,
  t,
  onEvent,
  onSeal,
  onVgm,
  onFreeTime,
  pending,
}: {
  assignment: EquipmentAssignment;
  canEvent: boolean;
  canUpdate: boolean;
  canOverrideFreeTime: boolean;
  nodes: LogisticsOption[];
  freeTimeRules: EquipmentFreeTimeRule[];
  t: (key: string, fallback?: string) => string;
  onEvent: (payload: Record<string, unknown>) => void;
  onSeal: (payload: Record<string, unknown>) => void;
  onVgm: (payload: Record<string, unknown>) => void;
  onFreeTime: (payload: Record<string, unknown>) => void;
  pending: boolean;
}) {
  const [eventType, setEventType] = React.useState(EVENT_TYPES[0]);
  const submit = (
    event: React.FormEvent<HTMLFormElement>,
    callback: (payload: Record<string, unknown>) => void,
  ) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    callback(Object.fromEntries(data.entries()));
  };
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>
              {assignment.job ? (
                <Link
                  href={`/dashboard/logistics/jobs/${assignment.job.id}`}
                  className="font-mono text-primary hover:underline"
                >
                  {assignment.job.job_number}
                </Link>
              ) : (
                t("logistics.fields.job")
              )}
            </CardTitle>
            <CardDescription>
              {assignment.current_node?.name ?? "—"}
            </CardDescription>
          </div>
          <Badge>
            {t(
              `logistics.status.${assignment.status}`,
              assignment.status.replaceAll("_", " "),
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="grid gap-3 sm:grid-cols-4">
          <div>
            <dt className="text-xs uppercase text-muted-foreground">
              {t("logistics.fields.free_time_end")}
            </dt>
            <dd className="font-semibold">
              {assignment.free_time_end_at
                ? new Date(assignment.free_time_end_at).toLocaleString()
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">
              {t("logistics.fields.exposure_days")}
            </dt>
            <dd className="font-semibold">
              {assignment.free_time.overdue_days}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">
              {t("logistics.fields.total_exposure")}
            </dt>
            <dd className="font-semibold">
              {assignment.free_time.total_exposure === null
                ? "—"
                : `${assignment.free_time.currency ?? ""} ${assignment.free_time.total_exposure}`}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">
              {t("logistics.fields.current_node")}
            </dt>
            <dd className="font-semibold">
              {assignment.current_node?.name ?? "—"}
            </dd>
          </div>
        </dl>
        <div className="grid gap-4 xl:grid-cols-4">
          {canEvent ? (
            <form
              className="rounded-xl border p-4"
              onSubmit={(event) => submit(event, onEvent)}
            >
              <h3 className="flex items-center gap-2 font-bold">
                <History aria-hidden="true" />
                {t("logistics.actions.record_event")}
              </h3>
              <Field className="mt-3">
                <FieldLabel htmlFor={`event-${assignment.id}`}>
                  {t("logistics.fields.event")}
                </FieldLabel>
                <NativeSelect
                  id={`event-${assignment.id}`}
                  name="event_type"
                  value={eventType}
                  onChange={(event) => setEventType(event.target.value)}
                  required
                >
                  {EVENT_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {t(
                        `logistics.status.${value}`,
                        value.replaceAll("_", " "),
                      )}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field className="mt-3">
                <FieldLabel htmlFor={`event-time-${assignment.id}`}>
                  {t("logistics.fields.event_time")}
                </FieldLabel>
                <Input
                  id={`event-time-${assignment.id}`}
                  name="event_at"
                  type="datetime-local"
                  required
                />
              </Field>
              <Field className="mt-3">
                <FieldLabel htmlFor={`event-leg-${assignment.id}`}>
                  {t("logistics.fields.transport_leg")}
                </FieldLabel>
                <NativeSelect
                  id={`event-leg-${assignment.id}`}
                  name="transport_leg_id"
                >
                  <option value="">{t("logistics.optional.none")}</option>
                  {assignment.legs?.map((link) => (
                    <option key={link.id} value={link.transport_leg_id}>
                      {link.leg
                        ? `${link.sequence}. ${link.leg.origin_node?.name ?? "—"} → ${link.leg.destination_node?.name ?? "—"}`
                        : `${link.sequence}`}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field className="mt-3">
                <FieldLabel htmlFor={`event-node-${assignment.id}`}>
                  {t("logistics.fields.current_node")}
                </FieldLabel>
                <NativeSelect
                  id={`event-node-${assignment.id}`}
                  name="transport_node_id"
                >
                  <option value="">{t("logistics.optional.none")}</option>
                  {nodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.code} — {node.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              {eventType === "damage_detected" ? (
                <>
                  <Field className="mt-3">
                    <FieldLabel htmlFor={`damage-severity-${assignment.id}`}>
                      {t("logistics.fields.damage_severity")}
                    </FieldLabel>
                    <NativeSelect
                      id={`damage-severity-${assignment.id}`}
                      name="damage_severity"
                      required
                    >
                      {["minor", "moderate", "severe", "total_loss"].map(
                        (value) => (
                          <option key={value} value={value}>
                            {t(`logistics.damage.${value}`)}
                          </option>
                        ),
                      )}
                    </NativeSelect>
                  </Field>
                  <Field className="mt-3">
                    <FieldLabel htmlFor={`damage-notes-${assignment.id}`}>
                      {t("logistics.fields.damage_notes")}
                    </FieldLabel>
                    <Input
                      id={`damage-notes-${assignment.id}`}
                      name="damage_notes"
                      required
                    />
                  </Field>
                </>
              ) : null}
              <input type="hidden" name="time_kind" value="actual" />
              <input type="hidden" name="source" value="manual" />
              <Button className="mt-3 min-h-11 w-full" disabled={pending}>
                {t("logistics.actions.record_event")}
              </Button>
            </form>
          ) : null}
          {canUpdate ? (
            <form
              className="rounded-xl border p-4"
              onSubmit={(event) => submit(event, onSeal)}
            >
              <h3 className="flex items-center gap-2 font-bold">
                <ShieldCheck aria-hidden="true" />
                {t("logistics.actions.add_seal")}
              </h3>
              <Field className="mt-3">
                <FieldLabel htmlFor={`seal-${assignment.id}`}>
                  {t("logistics.fields.seal_number")}
                </FieldLabel>
                <Input
                  id={`seal-${assignment.id}`}
                  name="seal_number"
                  required
                />
              </Field>
              <Field className="mt-3">
                <FieldLabel htmlFor={`seal-type-${assignment.id}`}>
                  {t("logistics.fields.seal_type")}
                </FieldLabel>
                <NativeSelect
                  id={`seal-type-${assignment.id}`}
                  name="seal_type"
                >
                  <option value="primary">
                    {t("logistics.seal_type.primary")}
                  </option>
                  <option value="carrier">
                    {t("logistics.seal_type.carrier")}
                  </option>
                  <option value="customs">
                    {t("logistics.seal_type.customs")}
                  </option>
                  <option value="additional">
                    {t("logistics.seal_type.additional")}
                  </option>
                </NativeSelect>
              </Field>
              <input
                type="hidden"
                name="applied_at"
                value={new Date().toISOString()}
              />
              <Button
                className="mt-3 min-h-11 w-full"
                variant="outline"
                disabled={pending}
              >
                {t("logistics.actions.add_seal")}
              </Button>
            </form>
          ) : null}
          {canUpdate ? (
            <form
              className="rounded-xl border p-4"
              onSubmit={(event) => submit(event, onVgm)}
            >
              <h3 className="flex items-center gap-2 font-bold">
                <Scale aria-hidden="true" />
                {t("logistics.actions.record_vgm")}
              </h3>
              <Field className="mt-3">
                <FieldLabel htmlFor={`vgm-${assignment.id}`}>
                  {t("logistics.fields.vgm_weight")}
                </FieldLabel>
                <Input
                  id={`vgm-${assignment.id}`}
                  name="weight_kg"
                  type="number"
                  min="0.001"
                  step="0.001"
                  required
                />
              </Field>
              <Field className="mt-3">
                <FieldLabel htmlFor={`vgm-method-${assignment.id}`}>
                  {t("logistics.fields.vgm_method")}
                </FieldLabel>
                <NativeSelect id={`vgm-method-${assignment.id}`} name="method">
                  <option value="method_1">
                    {t("logistics.vgm_method.method_1")}
                  </option>
                  <option value="method_2">
                    {t("logistics.vgm_method.method_2")}
                  </option>
                </NativeSelect>
              </Field>
              <input type="hidden" name="status" value="verified" />
              <input type="hidden" name="source" value="manual" />
              <Button
                className="mt-3 min-h-11 w-full"
                variant="outline"
                disabled={pending}
              >
                {t("logistics.actions.record_vgm")}
              </Button>
            </form>
          ) : null}
          {canOverrideFreeTime ? (
            <form
              className="rounded-xl border p-4"
              onSubmit={(event) => submit(event, onFreeTime)}
            >
              <h3 className="flex items-center gap-2 font-bold">
                <Box aria-hidden="true" />
                {t("logistics.actions.apply_free_time")}
              </h3>
              <Field className="mt-3">
                <FieldLabel htmlFor={`free-rule-${assignment.id}`}>
                  {t("logistics.fields.free_time_rule")}
                </FieldLabel>
                <NativeSelect
                  id={`free-rule-${assignment.id}`}
                  name="free_time_rule_id"
                  required
                >
                  <option value="">{t("common.select")}</option>
                  {freeTimeRules.map((rule) => (
                    <option key={rule.id} value={rule.id}>
                      {rule.name} · {rule.free_days}{" "}
                      {t("logistics.fields.free_days")}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field className="mt-3">
                <FieldLabel htmlFor={`free-start-${assignment.id}`}>
                  {t("logistics.fields.free_time_start")}
                </FieldLabel>
                <Input
                  id={`free-start-${assignment.id}`}
                  name="start_at"
                  type="datetime-local"
                  required
                />
              </Field>
              <Button
                className="mt-3 min-h-11 w-full"
                variant="outline"
                disabled={pending}
              >
                {t("logistics.actions.apply_free_time")}
              </Button>
            </form>
          ) : null}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <HistoryList
            title={t("logistics.equipment.events")}
            empty={t("logistics.empty.events")}
            items={assignment.events?.map(
              (item) =>
                `${t(`logistics.status.${item.event_type}`, item.event_type.replaceAll("_", " "))} · ${new Date(item.event_at).toLocaleString()}`,
            )}
          />
          <HistoryList
            title={t("logistics.equipment.seals")}
            empty={t("logistics.empty.events")}
            items={assignment.seals?.map(
              (item) => `${item.seal_number} · ${item.seal_type}`,
            )}
          />
          <HistoryList
            title={t("logistics.equipment.vgm")}
            empty={t("logistics.empty.events")}
            items={assignment.vgms?.map(
              (item) => `${item.weight_kg} kg · ${item.method}`,
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function HistoryList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items?: string[];
}) {
  return (
    <section aria-label={title} className="rounded-xl bg-muted/40 p-4">
      <h3 className="font-bold">{title}</h3>
      {items?.length ? (
        <ul className="mt-2 space-y-2 text-sm">
          {items.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}
