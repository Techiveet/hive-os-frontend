"use client";

import * as React from "react";
import {
  Check,
  CheckCheck,
  Filter,
  Layers,
  PlusCircle,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  TenantCatalogModule,
  TenantCustomModuleInput,
} from "@/modules/subscription/types";

type Props = {
  catalog: TenantCatalogModule[];
  selectedModules: string[];
  customModules: TenantCustomModuleInput[];
  onSelectedModulesChange: (next: string[]) => void;
  onCustomModulesChange: (next: TenantCustomModuleInput[]) => void;
  plan?: string;
  disabled?: boolean;
  purchaseLockedModules?: boolean;
  onLockedModuleRequest?: (module: TenantCatalogModule) => void;
  showCustomModules?: boolean;
  planDefaultsList?: string[];
  onResetToPlanDefaults?: () => void;
};

const toneClasses: Record<string, string> = {
  rose: "border-rose-200 bg-rose-50/80 text-rose-700",
  violet: "border-violet-200 bg-violet-50/80 text-violet-700",
  sky: "border-sky-200 bg-sky-50/80 text-sky-700",
  amber: "border-amber-200 bg-amber-50/80 text-amber-700",
  emerald: "border-emerald-200 bg-emerald-50/80 text-emerald-700",
  cyan: "border-cyan-200 bg-cyan-50/80 text-cyan-700",
  indigo: "border-indigo-200 bg-indigo-50/80 text-indigo-700",
  orange: "border-orange-200 bg-orange-50/80 text-orange-700",
  lime: "border-lime-200 bg-lime-50/80 text-lime-700",
  teal: "border-teal-200 bg-teal-50/80 text-teal-700",
  slate: "border-slate-200 bg-slate-50/80 text-slate-700",
};

const createEmptyCustomModule = (): TenantCustomModuleInput => ({
  name: "",
  description: "",
  category: "Custom",
});

export function ModuleSubscriptionSelector({
  catalog,
  selectedModules,
  customModules,
  onSelectedModulesChange,
  onCustomModulesChange,
  plan,
  disabled = false,
  purchaseLockedModules = false,
  onLockedModuleRequest,
  showCustomModules = true,
  planDefaultsList,
  onResetToPlanDefaults,
}: Props) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "selected" | "unselected" | "included" | "addon">("selected");

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    catalog.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set).sort();
  }, [catalog]);

  const filteredCatalog = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return catalog.filter((module) => {
      // 1. Category filter
      if (selectedCategory !== "all" && module.category !== selectedCategory) {
        return false;
      }

      // 2. Status filter
      const isSelected = selectedModules.includes(module.slug);
      if (statusFilter === "selected" && !isSelected) return false;
      if (statusFilter === "unselected" && isSelected) return false;
      if (statusFilter === "included" && !module.included_in_plan) return false;
      if (statusFilter === "addon" && (module.included_in_plan || Number(module.monthly_price_etb ?? 0) <= 0)) return false;

      // 3. Search query
      if (q) {
        const matchName = module.name?.toLowerCase().includes(q);
        const matchDesc = module.description?.toLowerCase().includes(q);
        const matchSlug = module.slug?.toLowerCase().includes(q);
        const matchCat = module.category?.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchSlug && !matchCat) {
          return false;
        }
      }

      return true;
    });
  }, [catalog, searchQuery, selectedCategory, selectedModules, statusFilter]);

  const groupedCatalog = React.useMemo(() => {
    const seen = new Set<string>();
    return filteredCatalog.reduce<Record<string, TenantCatalogModule[]>>((groups, module) => {
      if (!module?.slug || seen.has(module.slug)) return groups;
      seen.add(module.slug);
      const group = groups[module.category] ?? [];
      group.push(module);
      groups[module.category] = group;
      return groups;
    }, {});
  }, [filteredCatalog]);

  const stats = React.useMemo(() => {
    const totalSelected = selectedModules.length;
    const includedCount = catalog.filter((m) => selectedModules.includes(m.slug) && m.included_in_plan).length;
    const addonsCount = totalSelected - includedCount;
    const addonCostEtb = catalog
      .filter((m) => selectedModules.includes(m.slug) && !m.included_in_plan)
      .reduce((sum, m) => sum + Number(m.monthly_price_etb ?? 0), 0);

    return { totalSelected, includedCount, addonsCount, addonCostEtb };
  }, [catalog, selectedModules]);

  const handleSelectAllFiltered = () => {
    if (disabled) return;
    const freeOrPlanSlugs = filteredCatalog
      .filter((m) => m.included_in_plan || !purchaseLockedModules || Number(m.monthly_price_etb ?? 0) <= 0 || m.status === "active")
      .map((m) => m.slug);
    const merged = Array.from(new Set([...selectedModules, ...freeOrPlanSlugs]));
    onSelectedModulesChange(merged);
  };

  const handleDeselectAllFiltered = () => {
    if (disabled) return;
    const filteredSlugs = new Set(filteredCatalog.map((m) => m.slug));
    onSelectedModulesChange(selectedModules.filter((s) => !filteredSlugs.has(s)));
  };

  const hasActiveFilters = searchQuery.trim() !== "" || selectedCategory !== "all" || statusFilter !== "all";

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setStatusFilter("all");
  };

  const toggleModule = (module: TenantCatalogModule) => {
    if (disabled) return;

    const slug = module.slug;
    const isLockedPaidAddon =
      purchaseLockedModules &&
      !selectedModules.includes(slug) &&
      !module.included_in_plan &&
      Number(module.monthly_price_etb ?? 0) > 0 &&
      module.status !== "active";

    if (isLockedPaidAddon) {
      onLockedModuleRequest?.(module);
      return;
    }

    if (selectedModules.includes(slug)) {
      onSelectedModulesChange(selectedModules.filter((item) => item !== slug));
      return;
    }

    onSelectedModulesChange([...selectedModules, slug]);
  };

  const addCustomModule = () => {
    if (disabled) return;
    onCustomModulesChange([...customModules, createEmptyCustomModule()]);
  };

  const updateCustomModule = (
    index: number,
    key: keyof TenantCustomModuleInput,
    value: string
  ) => {
    const next = customModules.map((module, currentIndex) =>
      currentIndex === index ? { ...module, [key]: value } : module
    );
    onCustomModulesChange(next);
  };

  const removeCustomModule = (index: number) => {
    if (disabled) return;
    onCustomModulesChange(customModules.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleCardKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    slug: string
  ) => {
    if (disabled) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const module = catalog.find((item) => item.slug === slug);
      if (module) {
        toggleModule(module);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header & Live Stat Strip ── */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h5 className="flex items-center gap-2 text-base font-bold text-foreground">
              <Layers className="h-4 w-4 text-primary" /> Included Catalog Modules
            </h5>
            <p className="text-xs text-muted-foreground">
              Choose the built-in modules this tenant should be able to use. Free modules activate immediately.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/5 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-primary">
              {stats.totalSelected} of {catalog.length} Active
            </Badge>
            {stats.includedCount > 0 ? (
              <Badge variant="outline" className="rounded-full border-sky-300/60 bg-sky-50/70 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 dark:border-sky-800/40 dark:bg-sky-950/20 dark:text-sky-300">
                {stats.includedCount} Plan Included
              </Badge>
            ) : null}
            {stats.addonsCount > 0 ? (
              <Badge variant="outline" className="rounded-full border-amber-300/60 bg-amber-50/70 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-300">
                {stats.addonsCount} Add-on{stats.addonsCount > 1 ? "s" : ""} (+ETB {stats.addonCostEtb}/mo)
              </Badge>
            ) : null}
          </div>
        </div>

        {/* ── Filters & Search Controls ── */}
        <div className="rounded-2xl border border-border/60 bg-card/50 p-3 shadow-xs space-y-3">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search modules by name, slug, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-full border-border/70 bg-background/80 pl-9 pr-8 text-xs focus-visible:ring-1"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {onResetToPlanDefaults ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onResetToPlanDefaults}
                  disabled={disabled}
                  className="h-8 rounded-full px-3 text-xs gap-1.5 font-medium hover:bg-muted"
                  title="Reset to modules included with your current plan"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" /> Reset Plan Defaults
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAllFiltered}
                disabled={disabled || filteredCatalog.length === 0}
                className="h-8 rounded-full px-3 text-xs gap-1 font-medium hover:bg-muted"
              >
                <CheckCheck className="h-3.5 w-3.5 text-primary" /> Select Free
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDeselectAllFiltered}
                disabled={disabled || filteredCatalog.length === 0}
                className="h-8 rounded-full px-3 text-xs font-medium hover:bg-muted"
              >
                Deselect Filtered
              </Button>
            </div>
          </div>

          {/* Category & Status Filter Pills */}
          <div className="flex flex-col gap-2 pt-1 border-t border-border/40 sm:flex-row sm:items-center sm:justify-between text-xs">
            {/* Status Filters */}
            <div className="flex flex-wrap items-center gap-1">
              <span className="font-semibold text-muted-foreground mr-1 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Status:
              </span>
              {[
                { key: "all", label: `All (${catalog.length})` },
                { key: "selected", label: `Active (${selectedModules.length})` },
                { key: "unselected", label: `Inactive (${catalog.length - selectedModules.length})` },
                { key: "included", label: `Plan Included (${catalog.filter(m => m.included_in_plan).length})` },
                { key: "addon", label: `Add-ons (${catalog.filter(m => !m.included_in_plan).length})` },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key as typeof statusFilter)}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 font-medium transition-colors",
                    statusFilter === key
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Clear All Filter Action */}
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearAllFilters}
                className="flex items-center gap-1 font-semibold text-primary hover:underline self-start sm:self-center"
              >
                <X className="h-3 w-3" /> Clear filters
              </button>
            ) : null}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs scrollbar-none">
            <span className="font-semibold text-muted-foreground shrink-0 mr-1">Category:</span>
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={cn(
                "rounded-full px-2.5 py-0.5 shrink-0 transition-colors",
                selectedCategory === "all"
                  ? "bg-foreground text-background font-semibold"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              All Categories
            </button>
            {categories.map((cat) => {
              const countInCat = catalog.filter((m) => m.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 shrink-0 transition-colors",
                    selectedCategory === cat
                      ? "bg-foreground text-background font-semibold"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {cat} ({countInCat})
                </button>
              );
            })}
          </div>
        </div>

        {/* Empty Search State */}
        {filteredCatalog.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-card/30 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Search className="h-6 w-6" />
            </div>
            <h6 className="mt-3 font-semibold text-foreground">No matching modules found</h6>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              No modules match your search query &quot;{searchQuery}&quot; or the selected status and category filters.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="mt-4 rounded-full"
            >
              Reset Filters
            </Button>
          </div>
        ) : null}

        {/* ── Catalog Cards Grouped By Category ── */}
        <div className="space-y-4">
          {Object.entries(groupedCatalog).map(([category, modules]) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border/60" />
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                  {category} ({modules.length})
                </p>
                <div className="h-px flex-1 bg-border/60" />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {modules.map((module) => {
                  const checked = selectedModules.includes(module.slug);
                  const toneClass = toneClasses[module.tone] ?? toneClasses.slate;
                  const isRecommended = !!plan && module.recommended_plans.includes(plan.toLowerCase());
                  const isLockedPaidAddon =
                    purchaseLockedModules &&
                    !checked &&
                    !module.included_in_plan &&
                    Number(module.monthly_price_etb ?? 0) > 0 &&
                    module.status !== "active";

                  return (
                    <div
                      key={module.slug}
                      role="checkbox"
                      tabIndex={disabled ? -1 : 0}
                      aria-checked={checked}
                      aria-disabled={disabled}
                      onClick={() => toggleModule(module)}
                      onKeyDown={(event) => handleCardKeyDown(event, module.slug)}
                      className={cn(
                        "flex items-start gap-3 rounded-[1.5rem] border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                        checked
                          ? "border-primary/40 bg-primary/5 shadow-sm"
                          : "border-border/60 bg-background/80 hover:border-primary/20 hover:bg-muted/40",
                        isLockedPaidAddon ? "border-amber-300/50 bg-amber-50/40" : "",
                        disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                      )}
                    >
                      <div
                        aria-hidden="true"
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border transition-colors",
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-transparent"
                        )}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">{module.name}</p>
                          <Badge variant="outline" className={cn("rounded-full px-2 py-0.5 text-[11px] uppercase tracking-widest", toneClass)}>
                            {module.category}
                          </Badge>
                          {isRecommended ? (
                            <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] uppercase tracking-widest text-emerald-700">
                              Recommended
                            </Badge>
                          ) : null}
                          {module.included_in_plan && !checked ? (
                            <Badge variant="outline" className="rounded-full border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] uppercase tracking-widest text-sky-700">
                              Included
                            </Badge>
                          ) : null}
                          {isLockedPaidAddon ? (
                            <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] uppercase tracking-widest text-amber-700">
                              ETB {Number(module.monthly_price_etb ?? 0).toFixed(0)}
                            </Badge>
                          ) : null}
                          {module.status === "pending" ? (
                            <Badge variant="outline" className="rounded-full border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] uppercase tracking-widest text-indigo-700">
                              Payment Pending
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {module.description}
                        </p>
                        {isLockedPaidAddon ? (
                          <p className="text-[11px] font-semibold text-amber-700">
                            Tap to subscribe and unlock this addon.
                          </p>
                        ) : null}
                        {module.status === "pending" ? (
                          <p className="text-[11px] font-semibold text-indigo-700">
                            Payment is in progress for this module. It will activate automatically once confirmed.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCustomModules ? (
        <div className="space-y-4 rounded-[1.5rem] border border-dashed border-border/70 bg-muted/20 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h5 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-amber-500" /> Custom Modules
            </h5>
            <p className="text-xs text-muted-foreground">
              Add tenant-specific addons beyond the built-in catalog, like internal tools or partner integrations.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCustomModule}
            disabled={disabled}
            className="rounded-full"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Custom Module
          </Button>
        </div>

        {customModules.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No custom modules added yet.
          </p>
        ) : (
          <div className="space-y-3">
            {customModules.map((module, index) => (
              <div
                key={`custom-module-${index}`}
                className="space-y-3 rounded-[1.25rem] border border-border/60 bg-background/70 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 px-3 py-1 text-[11px] uppercase tracking-widest text-amber-700">
                    Custom Module {index + 1}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCustomModule(index)}
                    disabled={disabled}
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                      Module Name
                    </Label>
                    <Input
                      value={module.name ?? ""}
                      onChange={(event) => updateCustomModule(index, "name", event.target.value)}
                      disabled={disabled}
                      placeholder="Audio Studio"
                      className="h-11 bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                      Category
                    </Label>
                    <Input
                      value={module.category ?? ""}
                      onChange={(event) => updateCustomModule(index, "category", event.target.value)}
                      disabled={disabled}
                      placeholder="Custom"
                      className="h-11 bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                    Description
                  </Label>
                  <Textarea
                    value={module.description ?? ""}
                    onChange={(event) => updateCustomModule(index, "description", event.target.value)}
                    disabled={disabled}
                    rows={3}
                    placeholder="Describe what this tenant-specific module does."
                    className="min-h-[92px] bg-background"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      ) : null}
    </div>
  );
}

