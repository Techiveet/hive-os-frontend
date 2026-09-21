"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePermissions } from "@/hooks/use-permissions";
import { logisticsApi } from "@/modules/logistics/api";
import type { LogisticsReferences, RateSheet } from "@/modules/logistics/types";
import { useTranslation } from "@/store/use-translation";

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };

export default function LogisticsRateSheetsPage() {
  const { t } = useTranslation();
  const cache = useQueryClient();
  const { hasAnyPermission, isLoaded } = usePermissions();
  const canCreate = isLoaded && hasAnyPermission(["create_logistics_rates", "manage_logistics"]);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [showCreate, setShowCreate] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const ratesQuery = useQuery({ queryKey: ["logistics", "rates", search, status], queryFn: () => logisticsApi.rateSheets({ search: search || undefined, status: status || undefined }).then((response) => response.data) });
  const refsQuery = useQuery({ queryKey: ["logistics", "references"], queryFn: () => logisticsApi.references().then((response) => response.data.data as LogisticsReferences), enabled: showCreate });
  const createRate = useMutation({
    mutationFn: (payload: Record<string, unknown>) => logisticsApi.createRateSheet(payload),
    onSuccess: async () => { await cache.invalidateQueries({ queryKey: ["logistics", "rates"] }); setShowCreate(false); toast.success(t("logistics.rates.created")); },
    onError: (error: ApiError) => setFormError(error.response?.data?.message ?? Object.values(error.response?.data?.errors ?? {})[0]?.[0] ?? t("logistics.errors.save")),
  });
  const rates = (ratesQuery.data?.data ?? []) as RateSheet[];
  const refs = refsQuery.data;

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setFormError("");
    const values = new FormData(event.currentTarget);
    const numberOrNull = (name: string) => values.get(name) ? Number(values.get(name)) : null;
    createRate.mutate({
      name: values.get("name"), rate_type: "carrier", supplier_id: numberOrNull("supplier_id"),
      sales_customer_id: numberOrNull("sales_customer_id"), transport_mode_id: numberOrNull("transport_mode_id"),
      origin_node_id: numberOrNull("origin_node_id"), destination_node_id: numberOrNull("destination_node_id"),
      service_type: values.get("service_type") || null, currency: values.get("currency"), notes: values.get("notes") || null,
      version: { effective_date: values.get("effective_date"), expiry_date: values.get("expiry_date") || null, lines: [{
        charge_code_id: Number(values.get("charge_code_id")), description_snapshot: values.get("description_snapshot"),
        basis: values.get("basis"), buy_rate: values.get("buy_rate"), sell_rate: values.get("sell_rate"), calculation_order: 0,
      }] },
    });
  };

  return <main className="flex flex-col gap-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t("logistics.eyebrow")}</p><h1 className="text-3xl font-black tracking-tight">{t("logistics.rates.title")}</h1><p className="text-sm text-muted-foreground">{t("logistics.rates.subtitle")}</p></div>
      {canCreate ? <Button type="button" onClick={() => setShowCreate((value) => !value)}><Plus data-icon="inline-start" aria-hidden="true" />{showCreate ? t("common.cancel") : t("logistics.actions.new_rate")}</Button> : null}
    </header>

    {showCreate ? <Card>
      <CardHeader><CardTitle>{t("logistics.rates.create_title")}</CardTitle><CardDescription>{t("logistics.rates.create_description")}</CardDescription></CardHeader>
      <CardContent><form onSubmit={submit} className="flex flex-col gap-6">
        {formError ? <Alert variant="destructive"><AlertTitle>{t("logistics.errors.validation_title")}</AlertTitle><AlertDescription>{formError}</AlertDescription></Alert> : null}
        <FieldSet><FieldLegend>{t("logistics.rates.scope")}</FieldLegend><FieldGroup className="grid md:grid-cols-2 xl:grid-cols-3">
          <Field><FieldLabel htmlFor="rate-name">{t("logistics.fields.name")}</FieldLabel><Input id="rate-name" name="name" required maxLength={180} /></Field>
          <Field><FieldLabel htmlFor="rate-provider">{t("logistics.fields.provider")}</FieldLabel><NativeSelect id="rate-provider" name="supplier_id"><option value="">{t("logistics.optional.any_provider")}</option>{refs?.suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</NativeSelect></Field>
          <Field><FieldLabel htmlFor="rate-customer">{t("logistics.fields.customer")}</FieldLabel><NativeSelect id="rate-customer" name="sales_customer_id"><option value="">{t("logistics.rates.general_rate")}</option>{refs?.customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</NativeSelect></Field>
          <Field><FieldLabel htmlFor="rate-mode">{t("logistics.fields.mode")}</FieldLabel><NativeSelect id="rate-mode" name="transport_mode_id"><option value="">{t("logistics.optional.any_mode")}</option>{refs?.modes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</NativeSelect></Field>
          <Field><FieldLabel htmlFor="rate-origin">{t("logistics.fields.origin")}</FieldLabel><NativeSelect id="rate-origin" name="origin_node_id"><option value="">{t("logistics.optional.any_origin")}</option>{refs?.nodes.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</NativeSelect></Field>
          <Field><FieldLabel htmlFor="rate-destination">{t("logistics.fields.destination")}</FieldLabel><NativeSelect id="rate-destination" name="destination_node_id"><option value="">{t("logistics.optional.any_destination")}</option>{refs?.nodes.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</NativeSelect></Field>
          <Field><FieldLabel htmlFor="rate-service">{t("logistics.fields.service")}</FieldLabel><Input id="rate-service" name="service_type" /></Field>
          <Field><FieldLabel htmlFor="rate-currency">{t("logistics.fields.currency")}</FieldLabel><Input id="rate-currency" name="currency" defaultValue="USD" required minLength={3} maxLength={3} /></Field>
          <Field><FieldLabel htmlFor="rate-effective">{t("logistics.fields.effective_date")}</FieldLabel><Input id="rate-effective" name="effective_date" type="date" required /></Field>
          <Field><FieldLabel htmlFor="rate-expiry">{t("logistics.fields.expiry_date")}</FieldLabel><Input id="rate-expiry" name="expiry_date" type="date" /></Field>
        </FieldGroup></FieldSet>
        <FieldSet><FieldLegend>{t("logistics.rates.first_charge")}</FieldLegend><FieldGroup className="grid md:grid-cols-2 xl:grid-cols-3">
          <Field><FieldLabel htmlFor="rate-charge">{t("logistics.fields.charge_code")}</FieldLabel><NativeSelect id="rate-charge" name="charge_code_id" required><option value="">{t("common.select")}</option>{refs?.charge_codes.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</NativeSelect></Field>
          <Field><FieldLabel htmlFor="rate-description">{t("logistics.fields.description")}</FieldLabel><Input id="rate-description" name="description_snapshot" required /></Field>
          <Field><FieldLabel htmlFor="rate-basis">{t("logistics.fields.basis")}</FieldLabel><NativeSelect id="rate-basis" name="basis" required>{["flat", "per_shipment", "per_container", "per_teu", "per_feu", "per_kg", "per_chargeable_kg", "per_tonne", "per_cbm", "per_package", "percentage", "distance", "manual"].map((basis) => <option key={basis} value={basis}>{t(`logistics.rate_basis.${basis}`)}</option>)}</NativeSelect></Field>
          <Field><FieldLabel htmlFor="rate-buy">{t("logistics.fields.buy_rate")}</FieldLabel><Input id="rate-buy" name="buy_rate" inputMode="decimal" defaultValue="0.00" required /></Field>
          <Field><FieldLabel htmlFor="rate-sell">{t("logistics.fields.sell_rate")}</FieldLabel><Input id="rate-sell" name="sell_rate" inputMode="decimal" defaultValue="0.00" required /></Field>
        </FieldGroup></FieldSet>
        <div className="flex justify-end"><Button type="submit" disabled={createRate.isPending || refsQuery.isLoading}>{createRate.isPending ? <Spinner data-icon="inline-start" /> : <Plus data-icon="inline-start" aria-hidden="true" />}{createRate.isPending ? t("common.saving") : t("logistics.actions.create_rate")}</Button></div>
      </form></CardContent>
    </Card> : null}

    <Card><CardHeader><CardTitle>{t("logistics.rates.directory")}</CardTitle><CardDescription>{t("logistics.rates.directory_description")}</CardDescription></CardHeader><CardContent className="flex flex-col gap-4">
      <FieldGroup className="grid md:grid-cols-[minmax(16rem,1fr)_14rem]"><Field><FieldLabel htmlFor="rates-search">{t("logistics.fields.search")}</FieldLabel><div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 size-5 text-muted-foreground" aria-hidden="true" /><Input id="rates-search" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10" /></div></Field><Field><FieldLabel htmlFor="rates-status">{t("logistics.fields.status")}</FieldLabel><NativeSelect id="rates-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{t("logistics.status.all")}</option>{["draft", "active", "expired", "superseded"].map((value) => <option key={value} value={value}>{t(`logistics.status.${value}`)}</option>)}</NativeSelect></Field></FieldGroup>
      {ratesQuery.isLoading ? <div className="flex items-center gap-2" role="status"><Spinner />{t("logistics.loading")}</div> : ratesQuery.isError ? <Alert variant="destructive"><AlertTitle>{t("logistics.errors.load_title")}</AlertTitle><AlertDescription>{t("logistics.errors.rates")}</AlertDescription></Alert> : rates.length === 0 ? <Empty><EmptyHeader><EmptyMedia variant="icon"><Search aria-hidden="true" /></EmptyMedia><EmptyTitle>{t("logistics.empty.rates_title")}</EmptyTitle><EmptyDescription>{t("logistics.empty.rates_description")}</EmptyDescription></EmptyHeader></Empty> : <div className="overflow-x-auto"><Table><caption className="sr-only">{t("logistics.rates.caption")}</caption><TableHeader><TableRow><TableHead scope="col">{t("logistics.fields.rate_sheet")}</TableHead><TableHead scope="col">{t("logistics.fields.provider")}</TableHead><TableHead scope="col">{t("logistics.fields.route")}</TableHead><TableHead scope="col">{t("logistics.fields.mode")}</TableHead><TableHead scope="col">{t("logistics.fields.currency")}</TableHead><TableHead scope="col">{t("logistics.fields.version")}</TableHead><TableHead scope="col">{t("logistics.fields.status")}</TableHead></TableRow></TableHeader><TableBody>{rates.map((rate) => <TableRow key={rate.id}><TableCell><Button variant="link" asChild className="px-0"><Link href={`/dashboard/logistics/rates/${rate.id}`}>{rate.rate_sheet_number}<span className="sr-only"> — {rate.name}</span></Link></Button><div className="text-xs text-muted-foreground">{rate.name}</div></TableCell><TableCell>{rate.supplier?.name ?? t("logistics.rates.general_provider")}</TableCell><TableCell>{rate.origin_node?.code ?? "*"} → {rate.destination_node?.code ?? "*"}</TableCell><TableCell>{rate.transport_mode?.name ?? t("logistics.rates.all_modes")}</TableCell><TableCell>{rate.currency}</TableCell><TableCell>{rate.current_version}</TableCell><TableCell><Badge variant={rate.status === "active" ? "default" : "secondary"}>{t(`logistics.status.${rate.status}`)}</Badge></TableCell></TableRow>)}</TableBody></Table></div>}
    </CardContent></Card>
  </main>;
}
