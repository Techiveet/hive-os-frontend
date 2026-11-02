"use client";

import { Users } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Table = {
  id: number;
  label: string;
  capacity: number;
  status: string;
  table_type?: string;
  zone?: { name: string } | null;
  staff?: { name: string } | null;
};

type Props = {
  tables: Table[];
  selectedTable: Table | null;
  assignedTableCount?: number;
  canViewAllTables?: boolean;
  onSelectTable: (table: Table) => void;
};

const statusClasses = (status: string) => {
  switch (status) {
    case "available":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "occupied":
      return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "reserved":
      return "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "dirty":
      return "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300";
    default:
      return "border-slate-500 bg-muted text-muted-foreground";
  }
};

export function TableGridSelector({
  tables,
  selectedTable,
  assignedTableCount = 0,
  canViewAllTables = false,
  onSelectTable,
}: Props) {
  return (
    <section className="space-y-4" aria-labelledby="restaurant-table-selector-heading">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="restaurant-table-selector-heading" className="text-lg font-bold text-foreground">
            Dining Tables
          </h2>
          <p className="text-xs text-muted-foreground">
            {assignedTableCount > 0
              ? `${assignedTableCount} assigned table${assignedTableCount === 1 ? "" : "s"} available in this view.`
              : canViewAllTables
                ? "Showing all permitted restaurant tables."
                : "No assigned tables found for this waiter."}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">{tables.length} tables shown</span>
      </div>

      {tables.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No active dining tables are available for this waiter.
        </div>
      ) : (
        // This grid sits in a two-thirds-width column, so viewport breakpoints
        // overstate how much room a card actually gets. Six columns only fit
        // from 2xl upwards; at xl they squeezed each card to ~83px.
        <TooltipProvider delayDuration={200}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-6">
            {tables.map((table) => {
              const isSelected = selectedTable?.id === table.id;
              const zoneLabel = table.zone?.name ?? table.table_type ?? "Dining";

              return (
                <Tooltip key={table.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => onSelectTable(table)}
                      className={`flex min-h-28 flex-col items-start justify-between rounded-lg border p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:focus-visible:ring-emerald-300 active:scale-95 ${
                        isSelected
                          ? "border-emerald-700 bg-emerald-500/10 shadow-lg ring-2 ring-emerald-700 dark:border-emerald-300 dark:ring-emerald-300"
                          : "border-slate-500 bg-card hover:border-emerald-700 dark:hover:border-emerald-300"
                      }`}
                    >
                      <span className="flex w-full items-start justify-between gap-2">
                        {/* flex-1 is what claims the leftover row width. With min-w-0
                            alone the label collapsed to zero width beside the shrink-0
                            status badge, hiding which table the card represents. */}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-base font-bold text-foreground">
                            {table.label}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {zoneLabel}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase ${statusClasses(table.status)}`}
                        >
                          {table.status}
                        </span>
                      </span>

                      <span className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" aria-hidden="true" />
                          {table.capacity} guests
                        </span>
                        {table.staff?.name ? (
                          <span className="truncate">Waiter: {table.staff.name}</span>
                        ) : null}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-left">
                    <p className="font-semibold">{table.label}</p>
                    <p className="opacity-90">{zoneLabel}</p>
                    <p className="mt-1 capitalize opacity-90">
                      {table.status} · {table.capacity} guests
                      {table.staff?.name ? ` · ${table.staff.name}` : ""}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      )}
    </section>
  );
}
