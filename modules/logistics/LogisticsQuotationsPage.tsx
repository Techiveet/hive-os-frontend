"use client";

import Link from "next/link";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Plus, Search } from "lucide-react";
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
import type { FreightQuotation } from "@/modules/logistics/types";
import { useTranslation } from "@/store/use-translation";

export default function LogisticsQuotationsPage() {
  const { t } = useTranslation(); const { hasAnyPermission, isLoaded } = usePermissions();
  const [search, setSearch] = React.useState(""); const [status, setStatus] = React.useState("");
  const canCreate = isLoaded && hasAnyPermission(["create_logistics_quotations", "manage_logistics"]);
  const query = useQuery({ queryKey: ["logistics", "quotations", search, status], queryFn: () => logisticsApi.quotations({ search: search || undefined, status: status || undefined }).then((response) => response.data) });
  const quotations = (query.data?.data ?? []) as FreightQuotation[];
  return <main className="flex flex-col gap-6"><header className="flex flex-wrap items-end justify-between gap-4"><div className="flex flex-col gap-1"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t("logistics.eyebrow")}</p><h1 className="text-3xl font-black tracking-tight">{t("logistics.quotations.title")}</h1><p className="text-sm text-muted-foreground">{t("logistics.quotations.subtitle")}</p></div>{canCreate ? <Button asChild><Link href="/dashboard/logistics/quotations/create"><Plus data-icon="inline-start" aria-hidden="true" />{t("logistics.actions.new_quotation")}</Link></Button> : null}</header>
    <Card><CardHeader><CardTitle>{t("logistics.quotations.directory")}</CardTitle><CardDescription>{t("logistics.quotations.directory_description")}</CardDescription></CardHeader><CardContent className="flex flex-col gap-4"><FieldGroup className="grid md:grid-cols-[minmax(16rem,1fr)_14rem]"><Field><FieldLabel htmlFor="quotation-search">{t("logistics.fields.search")}</FieldLabel><div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 size-5 text-muted-foreground" aria-hidden="true" /><Input id="quotation-search" className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} /></div></Field><Field><FieldLabel htmlFor="quotation-status">{t("logistics.fields.status")}</FieldLabel><NativeSelect id="quotation-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{t("logistics.status.all")}</option>{["draft", "pending_approval", "approved", "sent", "accepted", "rejected", "expired", "cancelled", "superseded"].map((value) => <option key={value} value={value}>{t(`logistics.status.${value}`)}</option>)}</NativeSelect></Field></FieldGroup>
      {query.isLoading ? <div role="status" className="flex items-center gap-2"><Spinner />{t("logistics.loading")}</div> : query.isError ? <Alert variant="destructive"><AlertTitle>{t("logistics.errors.load_title")}</AlertTitle><AlertDescription>{t("logistics.errors.quotations")}</AlertDescription></Alert> : quotations.length === 0 ? <Empty><EmptyHeader><EmptyMedia variant="icon"><FileText aria-hidden="true" /></EmptyMedia><EmptyTitle>{t("logistics.empty.quotations_title")}</EmptyTitle><EmptyDescription>{t("logistics.empty.quotations_description")}</EmptyDescription></EmptyHeader></Empty> : <div className="overflow-x-auto"><Table><caption className="sr-only">{t("logistics.quotations.caption")}</caption><TableHeader><TableRow><TableHead scope="col">{t("logistics.fields.quotation")}</TableHead><TableHead scope="col">{t("logistics.fields.customer")}</TableHead><TableHead scope="col">{t("logistics.fields.route")}</TableHead><TableHead scope="col">{t("logistics.fields.total_sell")}</TableHead><TableHead scope="col">{t("logistics.fields.margin")}</TableHead><TableHead scope="col">{t("logistics.fields.valid_until")}</TableHead><TableHead scope="col">{t("logistics.fields.status")}</TableHead></TableRow></TableHeader><TableBody>{quotations.map((quotation) => <TableRow key={quotation.id}><TableCell><Button variant="link" asChild className="px-0"><Link href={`/dashboard/logistics/quotations/${quotation.id}`}>{quotation.quotation_number}</Link></Button></TableCell><TableCell>{quotation.customer?.name ?? "—"}</TableCell><TableCell>{quotation.revision?.origin_node?.code ?? "—"} → {quotation.revision?.destination_node?.code ?? "—"}</TableCell><TableCell>{quotation.revision ? `${quotation.revision.currency} ${quotation.revision.total_sell}` : "—"}</TableCell><TableCell>{quotation.revision?.margin_percentage !== undefined ? `${quotation.revision.margin_percentage ?? "—"}%` : t("logistics.restricted")}</TableCell><TableCell>{quotation.revision?.valid_until ?? "—"}</TableCell><TableCell><Badge variant={quotation.status === "accepted" ? "default" : "secondary"}>{t(`logistics.status.${quotation.status}`)}</Badge></TableCell></TableRow>)}</TableBody></Table></div>}
    </CardContent></Card></main>;
}
