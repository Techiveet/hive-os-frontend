"use client";

import Link from "next/link";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, Plus, Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePermissions } from "@/hooks/use-permissions";
import { logisticsApi } from "@/modules/logistics/api";
import type { CustomsCase, ForwardingJob } from "@/modules/logistics/types";
import { useTranslation } from "@/store/use-translation";

export default function LogisticsCustomsPage() {
  const { t } = useTranslation(); const cache = useQueryClient(); const { hasAnyPermission } = usePermissions();
  const canCreate = hasAnyPermission(["create_logistics_customs", "manage_logistics"]);
  const [search, setSearch] = React.useState(""); const [status, setStatus] = React.useState(""); const [message, setMessage] = React.useState("");
  const query = useQuery({ queryKey: ["logistics", "customs", search, status], queryFn: () => logisticsApi.customsCases({ search: search || undefined, status: status || undefined }).then((r) => r.data) });
  const jobs = useQuery({ queryKey: ["logistics", "jobs", "customs"], queryFn: () => logisticsApi.jobs({ per_page: 100 }).then((r) => (r.data.data ?? []) as ForwardingJob[]) });
  const create = useMutation({ mutationFn: (payload: Record<string, unknown>) => logisticsApi.createCustomsCase(payload), onSuccess: async () => { await cache.invalidateQueries({ queryKey: ["logistics", "customs"] }); setMessage(t("logistics.messages.customs_created")); }, onError: () => setMessage(t("logistics.errors.customs_save")) });
  const submit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); create.mutate({ forwarding_job_id: Number(data.get("forwarding_job_id")), clearance_type: data.get("clearance_type"), customs_office: data.get("customs_office") || null, country_code: data.get("country_code") || null, e_sad_reference: data.get("e_sad_reference") || null }); };
  const items = (query.data?.data ?? []) as CustomsCase[];
  return <main className="flex flex-col gap-6"><header><p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">{t("logistics.eyebrow")}</p><h1 className="text-3xl font-black tracking-tight">{t("logistics.customs.title")}</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("logistics.customs.subtitle")}</p></header>
    <div aria-live="polite">{message ? <Alert><AlertTitle>{message}</AlertTitle></Alert> : null}</div>
    {canCreate ? <details className="rounded-2xl border bg-card p-5"><summary className="flex min-h-11 cursor-pointer items-center gap-2 font-bold"><Plus aria-hidden="true" />{t("logistics.customs.create")}</summary><p className="mt-2 text-sm text-muted-foreground">{t("logistics.customs.create_description")}</p><form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Field><FieldLabel htmlFor="customs-job">{t("logistics.fields.job")}</FieldLabel><NativeSelect id="customs-job" name="forwarding_job_id" required><option value="">{t("common.select")}</option>{jobs.data?.map((job) => <option key={job.id} value={job.id}>{job.job_number} — {job.customer?.name}</option>)}</NativeSelect></Field>
      <Field><FieldLabel htmlFor="customs-type">{t("logistics.fields.clearance_type")}</FieldLabel><NativeSelect id="customs-type" name="clearance_type" defaultValue="import">{["import", "export", "transit", "bonded_transfer", "other"].map((value) => <option key={value} value={value}>{t(`logistics.clearance.${value}`)}</option>)}</NativeSelect></Field>
      <Field><FieldLabel htmlFor="customs-office">{t("logistics.fields.customs_office")}</FieldLabel><Input id="customs-office" name="customs_office" /></Field>
      <Field><FieldLabel htmlFor="customs-country">{t("logistics.fields.country_code")}</FieldLabel><Input id="customs-country" name="country_code" maxLength={2} defaultValue="ET" className="uppercase" /></Field>
      <Field className="md:col-span-2"><FieldLabel htmlFor="customs-esad">{t("logistics.fields.e_sad_reference")}</FieldLabel><Input id="customs-esad" name="e_sad_reference" /></Field>
      <Button type="submit" className="min-h-11 self-end md:justify-self-start" disabled={create.isPending}>{create.isPending ? <Spinner /> : <Landmark aria-hidden="true" />}{t("logistics.actions.create_customs_case")}</Button>
    </form></details> : null}
    <Card><CardHeader><CardTitle>{t("logistics.customs.directory")}</CardTitle><CardDescription>{t("logistics.customs.directory_description")}</CardDescription></CardHeader><CardContent className="space-y-4"><FieldGroup className="grid md:grid-cols-[1fr_14rem]"><Field><FieldLabel htmlFor="customs-search">{t("logistics.fields.search")}</FieldLabel><div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 size-5 text-muted-foreground" aria-hidden="true" /><Input id="customs-search" className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} /></div></Field><Field><FieldLabel htmlFor="customs-status">{t("logistics.fields.status")}</FieldLabel><NativeSelect id="customs-status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">{t("logistics.status.all")}</option>{["draft", "documents_pending", "ready_for_declaration", "declaration_submitted", "under_review", "customs_hold", "cleared", "released"].map((value) => <option key={value} value={value}>{t(`logistics.status.${value}`)}</option>)}</NativeSelect></Field></FieldGroup>
      {query.isLoading ? <div role="status" className="flex items-center gap-2"><Spinner />{t("logistics.loading")}</div> : query.isError ? <Alert variant="destructive"><AlertTitle>{t("logistics.errors.load_title")}</AlertTitle><AlertDescription>{t("logistics.errors.customs")}</AlertDescription></Alert> : items.length === 0 ? <Empty><EmptyHeader><EmptyMedia variant="icon"><Landmark aria-hidden="true" /></EmptyMedia><EmptyTitle>{t("logistics.empty.customs_title")}</EmptyTitle><EmptyDescription>{t("logistics.empty.customs_description")}</EmptyDescription></EmptyHeader></Empty> : <div className="overflow-x-auto"><Table><caption className="sr-only">{t("logistics.customs.caption")}</caption><TableHeader><TableRow><TableHead scope="col">{t("logistics.fields.customs_case")}</TableHead><TableHead scope="col">{t("logistics.fields.job")}</TableHead><TableHead scope="col">{t("logistics.fields.clearance_type")}</TableHead><TableHead scope="col">{t("logistics.fields.declaration_reference")}</TableHead><TableHead scope="col">{t("logistics.fields.status")}</TableHead></TableRow></TableHeader><TableBody>{items.map((item) => <TableRow key={item.id}><TableCell><Button variant="link" asChild className="px-0 font-mono"><Link href={`/dashboard/logistics/customs/${item.id}`}>{item.case_number}</Link></Button></TableCell><TableCell>{item.job?.job_number ?? "—"}</TableCell><TableCell>{t(`logistics.clearance.${item.clearance_type}`)}</TableCell><TableCell>{item.declaration_reference ?? item.e_sad_reference ?? "—"}</TableCell><TableCell><Badge variant={item.status === "customs_hold" ? "destructive" : item.status === "released" ? "default" : "secondary"}>{t(`logistics.status.${item.status}`)}</Badge></TableCell></TableRow>)}</TableBody></Table></div>}
    </CardContent></Card></main>;
}
