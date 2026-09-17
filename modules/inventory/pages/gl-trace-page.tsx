"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowDown, FileText, Layers3, Loader2, Lock, Receipt, Route, Search } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/store/use-translation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { usePermissions } from "@/hooks/use-permissions";
import { fetchGlTraceFromJournal, fetchGlTraceFromValuation } from "@/modules/inventory/api";
import type { GlJournalPayload, StockMovementPayload, ValuationEntry } from "@/modules/inventory/operations-types";

type TraceResult = {
  valuation_entry: ValuationEntry | null;
  gl_journal: GlJournalPayload | null;
  stock_movement: StockMovementPayload | null;
  business_document?: { reference_type: string | null; reference_id: string | null } | null;
};

function Node({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-3xl border-border/60 p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4" /> {title}
      </h3>
      {children}
    </Card>
  );
}

export default function GlTracePage() {
  const { t } = useTranslation();
  const { hasPermission, isLoaded } = usePermissions();
  const canView = hasPermission("view_finance");

  const [mode, setMode] = React.useState<"valuation" | "journal">("valuation");
  const [id, setId] = React.useState("");
  const [result, setResult] = React.useState<TraceResult | null>(null);

  const traceMutation = useMutation({
    mutationFn: async () => {
      const numId = Number(id);
      if (mode === "valuation") return (await fetchGlTraceFromValuation(numId)) as TraceResult;
      return (await fetchGlTraceFromJournal(numId)) as TraceResult;
    },
    onSuccess: (data) => setResult(data),
    onError: (error: any) => {
      setResult(null);
      toast.error(error?.response?.status === 404
        ? t("inventory.gltrace.not_found", "No record found for that id.")
        : (error?.response?.data?.message ?? t("inventory.common.failed", "Trace failed.")));
    },
  });

  if (isLoaded && !canView) {
    return (
      <Card className="mx-auto mt-10 max-w-lg rounded-3xl border-border/60 p-8 text-center">
        <Lock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <h2 className="text-lg font-bold">{t("inventory.gltrace.no_access_title", "Finance access required")}</h2>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight">
          <Route className="h-7 w-7 text-primary" />
          {t("inventory.gltrace.title", "Inventory ↔ GL Trace")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("inventory.gltrace.subtitle", "Follow the audit chain from a valuation entry or GL journal to its source stock movement and document.")}
        </p>
      </div>

      <Card className="rounded-3xl border-border/60 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:w-48">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("inventory.gltrace.trace_by", "Trace by")}</label>
            <Select value={mode} onValueChange={(v) => { setMode(v as typeof mode); setResult(null); }}>
              <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="valuation">{t("inventory.gltrace.by_valuation", "Valuation entry")}</SelectItem>
                <SelectItem value="journal">{t("inventory.gltrace.by_journal", "GL journal")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("inventory.gltrace.id_label", "ID")}</label>
            <Input
              className="mt-1 rounded-xl font-mono"
              value={id}
              inputMode="numeric"
              onChange={(e) => setId(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && id) traceMutation.mutate(); }}
              placeholder={mode === "valuation" ? t("inventory.gltrace.ph_valuation", "Valuation entry id") : t("inventory.gltrace.ph_journal", "Journal id")}
            />
          </div>
          <Button className="rounded-full px-5" disabled={!id || traceMutation.isPending} onClick={() => traceMutation.mutate()}>
            {traceMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            {t("inventory.gltrace.trace_btn", "Trace")}
          </Button>
        </div>
      </Card>

      {result ? (
        <div className="space-y-3">
          {result.valuation_entry ? (
            <>
              <Node icon={Layers3} title={t("inventory.gltrace.valuation_entry", "Valuation Entry")}>
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div><p className="text-xs text-muted-foreground">ID</p><p className="font-mono">#{result.valuation_entry.id}</p></div>
                  <div><p className="text-xs text-muted-foreground">{t("inventory.valuation.direction", "Direction")}</p><p className="uppercase">{result.valuation_entry.direction}</p></div>
                  <div><p className="text-xs text-muted-foreground">{t("inventory.valuation.value_amount", "Value")}</p><p className="font-mono">{result.valuation_entry.value_amount}</p></div>
                  <div><p className="text-xs text-muted-foreground">PPV</p><p className="font-mono">{result.valuation_entry.purchase_price_variance}</p></div>
                </div>
              </Node>
              <div className="flex justify-center"><ArrowDown className="h-5 w-5 text-muted-foreground" /></div>
            </>
          ) : null}

          <Node icon={Receipt} title={t("inventory.gltrace.gl_journal", "GL Journal")}>
            {result.gl_journal ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <Badge variant="outline" className="rounded-full">#{result.gl_journal.id}</Badge>
                  <span className="text-muted-foreground">{result.gl_journal.type}</span>
                  <Badge variant="outline" className="rounded-full capitalize">{result.gl_journal.status}</Badge>
                  <span className="ml-auto font-mono text-xs text-muted-foreground">
                    Dr {result.gl_journal.debit_total} · Cr {result.gl_journal.credit_total}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr className="border-b border-border/60">
                      <th className="py-1.5">{t("inventory.gltrace.account", "Account")}</th>
                      <th className="py-1.5 text-right">{t("inventory.gltrace.debit", "Debit")}</th>
                      <th className="py-1.5 text-right">{t("inventory.gltrace.credit", "Credit")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.gl_journal.lines.map((line, i) => (
                      <tr key={i} className="border-b border-border/40">
                        <td className="py-1.5 font-mono">#{line.account_id}{line.description ? <span className="ml-2 text-xs text-muted-foreground">{line.description}</span> : null}</td>
                        <td className="py-1.5 text-right font-mono">{line.debit}</td>
                        <td className="py-1.5 text-right font-mono">{line.credit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("inventory.gltrace.no_journal", "No GL journal linked (Finance may not be posted).")}</p>
            )}
          </Node>

          {result.stock_movement ? (
            <>
              <div className="flex justify-center"><ArrowDown className="h-5 w-5 text-muted-foreground" /></div>
              <Node icon={FileText} title={t("inventory.gltrace.source", "Source Stock Movement & Document")}>
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div><p className="text-xs text-muted-foreground">{t("inventory.gltrace.movement", "Movement")}</p><p className="font-mono">#{result.stock_movement.id} · {result.stock_movement.type}</p></div>
                  <div><p className="text-xs text-muted-foreground">{t("inventory.common.quantity", "Qty")}</p><p className="font-mono">{result.stock_movement.quantity}</p></div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">{t("inventory.gltrace.document", "Business document")}</p>
                    <p className="font-mono">
                      {(result.business_document?.reference_type ?? result.stock_movement.reference_type)?.split("\\").pop() ?? "—"}
                      {" "}#{result.business_document?.reference_id ?? result.stock_movement.reference_id ?? "—"}
                    </p>
                  </div>
                </div>
              </Node>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
