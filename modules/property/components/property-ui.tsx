"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { propertyApi } from "@/modules/property/api";

// ------------------------------------------------------------------ helpers

/** Rows from a plain array, a Laravel paginator or a `{ data: [...] }` body. */
export function rowsOf<T = any>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  if (body && typeof body === "object" && Array.isArray((body as any).data)) return (body as any).data as T[];
  return [];
}

export function totalOf(body: unknown): number {
  if (body && typeof body === "object") {
    const b = body as any;
    if (typeof b.total === "number") return b.total;
    if (typeof b.meta?.total === "number") return b.meta.total;
  }
  return rowsOf(body).length;
}

/** The most useful message from an API error: first validation error, then message. */
export function errorText(error: any, fallback: string): string {
  const data = error?.response?.data;
  const errors = data?.errors;
  if (errors && typeof errors === "object") {
    const first = Object.values(errors).flat().find((item) => typeof item === "string");
    if (typeof first === "string") return first;
  }
  return data?.message || fallback;
}

const num = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const money = (value: unknown, currency = "ETB") =>
  `${currency} ${num(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const humanize = (value: unknown) =>
  value === null || value === undefined || value === "" ? "—" : String(value).replace(/_/g, " ");

export const dateOnly = (value: unknown) => (value ? String(value).slice(0, 10) : "—");

export const dateTime = (value: unknown) =>
  value ? new Date(String(value)).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

// ------------------------------------------------------------------- status

const TONE_CLASSES: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  progress: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  good: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  danger: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

const STATUS_TONES: Record<string, string> = {
  // units
  available: "good",
  reserved: "info",
  under_negotiation: "info",
  lease_pending_approval: "progress",
  occupied: "progress",
  notice_given: "warning",
  under_maintenance: "warning",
  renovation: "warning",
  blocked: "danger",
  owner_occupied: "neutral",
  inactive: "neutral",
  // leases
  draft: "neutral",
  submitted: "info",
  under_review: "info",
  approved: "good",
  awaiting_signature: "progress",
  signed: "progress",
  scheduled: "info",
  active: "good",
  renewal_due: "warning",
  expiring: "warning",
  expired: "danger",
  terminated: "danger",
  cancelled: "danger",
  rejected: "danger",
  // shared
  pending: "info",
  completed: "good",
  paid: "good",
  partially_paid: "warning",
  refunded: "neutral",
  forfeited: "danger",
  lost: "danger",
  revoked: "danger",
  returned: "neutral",
  issued: "info",
  checked_in: "progress",
  checked_out: "neutral",
  no_show: "warning",
  under_construction: "info",
  disposed: "neutral",
  occupied_space: "progress",
  converted: "good",
  maintenance: "warning",
  confirmed: "good",
  processed: "good",
};

export function StatusBadge({ status }: { status?: string | null }) {
  const value = status || "unknown";
  const tone = STATUS_TONES[value] ?? "neutral";

  return (
    <Badge
      variant="outline"
      className={`border-transparent text-[11px] font-black uppercase tracking-widest ${TONE_CLASSES[tone]}`}
    >
      {value.replace(/_/g, " ")}
    </Badge>
  );
}

// ------------------------------------------------------------------- layout

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-black tracking-tight">{title}</h1>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export type SimpleColumn<T> = {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
};

/** A plain table for nested lists that do not need server paging. */
export function SimpleTable<T extends Record<string, any>>({
  columns,
  rows,
  loading,
  empty,
  rowKey = (row) => String(row.id),
}: {
  columns: SimpleColumn<T>[];
  rows: T[];
  loading?: boolean;
  empty: string;
  rowKey?: (row: T) => string;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
            {columns.map((column) => (
              <th key={column.key} className={`py-2 pr-3 font-semibold ${column.className ?? ""}`}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-border/30 align-top">
              {columns.map((column) => (
                <td key={column.key} className={`py-2 pr-3 ${column.className ?? ""}`}>
                  {column.render ? column.render(row) : humanize(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// -------------------------------------------------------------- form dialog

export type FieldOption = { value: string | number; label: string };

export type FormField = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "datetime-local" | "time" | "email" | "select" | "textarea" | "checkbox" | "file";
  options?: FieldOption[];
  required?: boolean;
  placeholder?: string;
  /** Span both columns. */
  wide?: boolean;
  min?: number;
  step?: string;
  help?: string;
};

export type FormValues = Record<string, any>;

/**
 * A dialog that renders a form from a field list and hands the values back.
 * Empty optional fields are left out; clearing a stored value sends null.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  initial,
  submitLabel = "Save",
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FormField[];
  initial?: FormValues;
  submitLabel?: string;
  submitting?: boolean;
  onSubmit: (values: FormValues) => void;
}) {
  const [values, setValues] = React.useState<FormValues>({});

  React.useEffect(() => {
    if (open) {
      const start: FormValues = {};
      for (const field of fields) {
        let value = initial?.[field.name] ?? (field.type === "checkbox" ? false : field.type === "file" ? null : "");
        // API dates arrive as ISO timestamps; date inputs need the local form.
        if (typeof value === "string" && value) {
          if (field.type === "date") value = value.slice(0, 10);
          if (field.type === "datetime-local") value = value.slice(0, 16);
        }
        start[field.name] = value;
      }
      setValues(start);
    }
    // Reset only when the dialog opens.
  }, [open]);

  const missing = fields.some(
    (field) =>
      field.required &&
      (values[field.name] === "" || values[field.name] === null || values[field.name] === undefined),
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (missing) return;
    const payload: FormValues = {};
    for (const field of fields) {
      const value = values[field.name];
      const empty = value === "" || value === null || value === undefined;
      const initialValue = initial?.[field.name];
      const wasSet = !(initialValue === "" || initialValue === null || initialValue === undefined);

      if (field.type === "checkbox" || field.type === "file") {
        payload[field.name] = value;
      } else if (empty) {
        // Leave untouched optional fields out; send null only to clear a value.
        if (wasSet) payload[field.name] = null;
      } else {
        payload[field.name] = field.type === "number" ? Number(value) : value;
      }
    }
    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl sm:max-w-2xl">
        <form onSubmit={submit}>
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">{title}</DialogTitle>
              {description ? <DialogDescription>{description}</DialogDescription> : null}
            </DialogHeader>
          </div>

          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
            {fields.map((field) => {
              const id = `pm-${field.name}`;
              const common = {
                id,
                required: field.required,
                placeholder: field.placeholder,
              };

              return (
                <div key={field.name} className={`space-y-1.5 ${field.wide || field.type === "textarea" ? "sm:col-span-2" : ""}`}>
                  {field.type === "checkbox" ? (
                    <label htmlFor={id} className="flex items-center gap-2 pt-6 text-sm">
                      <input
                        id={id}
                        type="checkbox"
                        checked={Boolean(values[field.name])}
                        onChange={(event) => setValues({ ...values, [field.name]: event.target.checked })}
                        className="h-4 w-4 rounded border-input"
                      />
                      {field.label}
                    </label>
                  ) : (
                    <>
                      <Label htmlFor={id}>
                        {field.label}
                        {field.required ? <span className="text-destructive"> *</span> : null}
                      </Label>
                      {field.type === "select" ? (
                        <select
                          {...common}
                          value={values[field.name] ?? ""}
                          onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
                          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
                        >
                          <option value="">Select…</option>
                          {(field.options ?? []).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : field.type === "textarea" ? (
                        <Textarea
                          {...common}
                          value={values[field.name] ?? ""}
                          onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
                          rows={3}
                        />
                      ) : field.type === "file" ? (
                        <Input
                          id={id}
                          type="file"
                          required={field.required}
                          onChange={(event) => setValues({ ...values, [field.name]: event.target.files?.[0] ?? null })}
                        />
                      ) : (
                        <Input
                          {...common}
                          type={field.type ?? "text"}
                          min={field.min}
                          step={field.step ?? (field.type === "number" ? "any" : undefined)}
                          value={values[field.name] ?? ""}
                          onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
                        />
                      )}
                    </>
                  )}
                  {field.help ? <p className="text-[11px] text-muted-foreground">{field.help}</p> : null}
                </div>
              );
            })}
          </div>

          <DialogFooter className="border-t border-border/40 px-6 py-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || missing}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------- shared options

export const optionsFrom = (values: readonly string[]): FieldOption[] =>
  values.map((value) => ({ value, label: value.replace(/_/g, " ") }));

/** Properties as select options, shared by every page that picks one. */
export function usePropertyOptions() {
  const query = useQuery({
    queryKey: ["property", "property-options"],
    queryFn: () => propertyApi.listProperties({ per_page: 200, sort_col: "name", sort_dir: "asc" }).then((res) => res.data),
    staleTime: 60_000,
  });

  const options = React.useMemo<FieldOption[]>(
    () => rowsOf<any>(query.data).map((p) => ({ value: p.id, label: p.code ? `${p.name} (${p.code})` : p.name })),
    [query.data],
  );

  return { options, loading: query.isLoading };
}

export function useOccupierOptions() {
  const query = useQuery({
    queryKey: ["property", "occupier-options"],
    queryFn: () => propertyApi.listOccupiers({ per_page: 200 }).then((res) => res.data),
    staleTime: 60_000,
  });

  return React.useMemo<FieldOption[]>(
    () => rowsOf<any>(query.data).map((o) => ({ value: o.id, label: o.name })),
    [query.data],
  );
}

export function PropertyPicker({
  value,
  onChange,
  label = "Property",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const { options, loading } = usePropertyOptions();

  React.useEffect(() => {
    if (!value && options.length > 0) onChange(String(options[0].value));
  }, [value, options, onChange]);

  return (
    <div className="space-y-1">
      <Label htmlFor="pm-property-picker" className="text-xs">
        {label}
      </Label>
      <select
        id="pm-property-picker"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={loading}
        className="h-9 min-w-[14rem] rounded-md border border-input bg-background px-3 text-sm"
      >
        {options.length === 0 ? <option value="">{loading ? "Loading…" : "No properties yet"}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Tab strip used by the multi-section pages. */
export function SectionTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div role="tablist" className="flex flex-wrap gap-1.5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            active === tab.id
              ? "border-primary bg-primary/15 text-primary"
              : "border-border/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
