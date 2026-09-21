"use client";

import Link from "next/link";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Container, Plus, Search } from "lucide-react";
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePermissions } from "@/hooks/use-permissions";
import { logisticsApi } from "@/modules/logistics/api";
import type { Equipment, LogisticsReferences } from "@/modules/logistics/types";
import { useTranslation } from "@/store/use-translation";

export default function LogisticsEquipmentPage() {
  const { t } = useTranslation();
  const cache = useQueryClient();
  const { hasAnyPermission } = usePermissions();
  const canCreate = hasAnyPermission([
    "create_logistics_equipment",
    "manage_logistics",
  ]);
  const canOverrideValidation = hasAnyPermission([
    "override_logistics_equipment_validation",
    "manage_logistics",
  ]);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [error, setError] = React.useState("");
  const [allowNonStandard, setAllowNonStandard] = React.useState(false);
  const query = useQuery({
    queryKey: ["logistics", "equipment", search, status],
    queryFn: () =>
      logisticsApi
        .equipment({ search: search || undefined, status: status || undefined })
        .then((response) => response.data),
  });
  const refs = useQuery({
    queryKey: ["logistics", "references"],
    queryFn: () =>
      logisticsApi
        .references()
        .then((response) => response.data.data as LogisticsReferences),
  });
  const create = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      logisticsApi.createEquipment(payload),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ["logistics", "equipment"] });
      setError("");
      setNotice(t("logistics.messages.equipment_created"));
    },
    onError: (value: unknown) =>
      setError(
        (value as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? t("logistics.errors.equipment_save"),
      ),
  });
  const equipment = (query.data?.data ?? []) as Equipment[];
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    create.mutate({
      identification_number: data.get("identification_number"),
      equipment_type_id: Number(data.get("equipment_type_id")),
      owner_supplier_id: data.get("owner_supplier_id")
        ? Number(data.get("owner_supplier_id"))
        : null,
      notes: data.get("notes") || null,
      allow_non_standard: allowNonStandard,
      validation_override_reason: allowNonStandard
        ? data.get("validation_override_reason")
        : null,
    });
  };

  return (
    <main className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {t("logistics.eyebrow")}
        </p>
        <h1 className="text-3xl font-black tracking-tight">
          {t("logistics.equipment.title")}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {t("logistics.equipment.subtitle")}
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
      {canCreate ? (
        <details className="rounded-2xl border bg-card p-5">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-bold">
            <Plus aria-hidden="true" />
            {t("logistics.equipment.register")}
          </summary>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("logistics.equipment.register_description")}
          </p>
          <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={submit}>
            <Field>
              <FieldLabel htmlFor="equipment-number">
                {t("logistics.fields.equipment_number")}
              </FieldLabel>
              <Input
                id="equipment-number"
                name="identification_number"
                required
                autoComplete="off"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="equipment-type">
                {t("logistics.fields.equipment_type")}
              </FieldLabel>
              <NativeSelect
                id="equipment-type"
                name="equipment_type_id"
                required
              >
                <option value="">{t("common.select")}</option>
                {refs.data?.equipment_types.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} — {item.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="equipment-owner">
                {t("logistics.fields.owner")}
              </FieldLabel>
              <NativeSelect id="equipment-owner" name="owner_supplier_id">
                <option value="">{t("logistics.optional.none")}</option>
                {refs.data?.suppliers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="equipment-notes">
                {t("logistics.fields.notes")}
              </FieldLabel>
              <Input id="equipment-notes" name="notes" />
            </Field>
            {canOverrideValidation ? (
              <>
                <Field>
                  <FieldLabel htmlFor="equipment-iso-override">
                    {t("logistics.fields.iso_override")}
                  </FieldLabel>
                  <NativeSelect
                    id="equipment-iso-override"
                    value={allowNonStandard ? "1" : "0"}
                    onChange={(event) =>
                      setAllowNonStandard(event.target.value === "1")
                    }
                  >
                    <option value="0">{t("common.no")}</option>
                    <option value="1">{t("common.yes")}</option>
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor="equipment-override-reason">
                    {t("logistics.fields.override_reason")}
                  </FieldLabel>
                  <Input
                    id="equipment-override-reason"
                    name="validation_override_reason"
                    disabled={!allowNonStandard}
                    required={allowNonStandard}
                  />
                </Field>
              </>
            ) : null}
            <Button
              type="submit"
              className="min-h-11 md:col-span-2 md:justify-self-end"
              disabled={create.isPending}
            >
              {create.isPending ? (
                <Spinner />
              ) : (
                <Container aria-hidden="true" />
              )}
              {t("logistics.actions.create_equipment")}
            </Button>
          </form>
        </details>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>{t("logistics.equipment.directory")}</CardTitle>
          <CardDescription>
            {t("logistics.equipment.directory_description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldGroup className="grid md:grid-cols-[minmax(16rem,1fr)_14rem]">
            <Field>
              <FieldLabel htmlFor="equipment-search">
                {t("logistics.fields.search")}
              </FieldLabel>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-2.5 size-5 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="equipment-search"
                  className="pl-10"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </Field>
            <Field>
              <FieldLabel htmlFor="equipment-status">
                {t("logistics.fields.status")}
              </FieldLabel>
              <NativeSelect
                id="equipment-status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="">{t("logistics.status.all")}</option>
                {[
                  "assigned",
                  "empty_released",
                  "picked_up",
                  "stuffing",
                  "stuffed",
                  "sealed",
                  "gate_in",
                  "loaded",
                  "in_transit",
                  "discharged",
                  "available",
                  "gate_out",
                  "delivered",
                  "emptied",
                  "empty_returned",
                  "damaged",
                  "exception",
                ].map((value) => (
                  <option key={value} value={value}>
                    {t(`logistics.status.${value}`)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </FieldGroup>
          {query.isLoading ? (
            <div role="status" className="flex items-center gap-2">
              <Spinner />
              {t("logistics.loading")}
            </div>
          ) : query.isError ? (
            <Alert variant="destructive">
              <AlertTitle>{t("logistics.errors.load_title")}</AlertTitle>
              <AlertDescription>
                {t("logistics.errors.equipment")}
              </AlertDescription>
            </Alert>
          ) : equipment.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Container aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>{t("logistics.empty.equipment_title")}</EmptyTitle>
                <EmptyDescription>
                  {t("logistics.empty.equipment_description")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <caption className="sr-only">
                  {t("logistics.equipment.caption")}
                </caption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">
                      {t("logistics.fields.equipment_number")}
                    </TableHead>
                    <TableHead scope="col">
                      {t("logistics.fields.equipment_type")}
                    </TableHead>
                    <TableHead scope="col">
                      {t("logistics.fields.owner")}
                    </TableHead>
                    <TableHead scope="col">
                      {t("logistics.fields.current_job")}
                    </TableHead>
                    <TableHead scope="col">
                      {t("logistics.fields.current_node")}
                    </TableHead>
                    <TableHead scope="col">
                      {t("logistics.fields.status")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipment.map((item) => {
                    const assignment = item.assignments?.[0];
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Button
                            variant="link"
                            asChild
                            className="px-0 font-mono"
                          >
                            <Link
                              href={`/dashboard/logistics/equipment/${item.id}`}
                            >
                              {item.identification_number}
                            </Link>
                          </Button>
                          <Badge
                            className="ml-2"
                            variant={
                              item.is_iso_standard ? "secondary" : "outline"
                            }
                          >
                            {item.is_iso_standard
                              ? t("logistics.equipment.valid_iso")
                              : t("logistics.equipment.non_iso")}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.type?.code ?? "—"}</TableCell>
                        <TableCell>{item.owner?.name ?? "—"}</TableCell>
                        <TableCell>
                          {assignment?.job ? (
                            <Link
                              className="underline underline-offset-4"
                              href={`/dashboard/logistics/jobs/${assignment.job.id}`}
                            >
                              {assignment.job.job_number}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {assignment?.current_node?.name ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              assignment?.status === "in_transit"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {t(
                              `logistics.status.${assignment?.status ?? "available"}`,
                            )}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
