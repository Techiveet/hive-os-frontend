"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Boxes,
  Building2,
  Calendar,
  Check,
  DollarSign,
  FileText,
  ImagePlus,
  Loader2,
  MapPin,
  Package,
  Percent,
  Plus,
  RefreshCcw,
  Scale,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  Warehouse,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  createInventoryGood,
  fetchInventoryGood,
  fetchInventoryGoodOptions,
  generateGoodBarcode,
  updateInventoryGood,
} from "@/modules/inventory/api/goods";
import type {
  GoodRecord,
  GoodStatus,
  GoodTaxType,
  GoodType,
} from "@/modules/inventory/types";
import { FileManagerClient } from "@/components/dashboard/file-manager-client";

type ModalMode = "create" | "edit" | "duplicate";

type Props = {
  open: boolean;
  mode: ModalMode;
  goodId?: number | null;
  onClose: () => void;
  onSaved?: (good: GoodRecord) => void;
};

type SecondarySupplierInput = {
  supplier_id: string;
  supplier_sku: string;
  unit_cost: string;
  lead_time_days: string;
};

type FormState = {
  name: string;
  sku: string;
  stock_code: string;
  barcode: string;
  good_type: GoodType;
  status: GoodStatus;
  category_id: string;
  description: string;
  image: string;
  model_3d_path: string;

  // Units & Packaging
  unit_of_measure: string;
  purchase_uom: string;
  uom_conversion_factor: string;
  packaging_quantity: string;
  weight: string;
  length: string;
  width: string;
  height: string;

  // Cost & Supplier
  preferred_supplier_id: string;
  unit_cost: string;
  tax_rate: string;
  tax_type: GoodTaxType;
  currency: string;
  lead_time_days: string;
  minimum_order_quantity: string;
  secondary_suppliers: SecondarySupplierInput[];

  // Inventory & Reorder
  reorder_level: string;
  safety_stock: string;
  max_stock_capacity: string;
  track_batches: boolean;
  track_expiry: boolean;
  shelf_life_days: string;
  expiry_alert_days: string;
  msds_sheet_path: string;

  // Warehouse Assignment
  primary_warehouse_id: string;
  default_location_id: string;
  initial_stock: string;
};

const DEFAULT_FORM: FormState = {
  name: "",
  sku: "",
  stock_code: "",
  barcode: "",
  good_type: "raw_material",
  status: "active",
  category_id: "__none__",
  description: "",
  image: "",
  model_3d_path: "",

  unit_of_measure: "units",
  purchase_uom: "",
  uom_conversion_factor: "1.0",
  packaging_quantity: "",
  weight: "",
  length: "",
  width: "",
  height: "",

  preferred_supplier_id: "__none__",
  unit_cost: "0.00",
  tax_rate: "0.00",
  tax_type: "exclusive",
  currency: "USD",
  lead_time_days: "7",
  minimum_order_quantity: "1",
  secondary_suppliers: [],

  reorder_level: "10",
  safety_stock: "5",
  max_stock_capacity: "",
  track_batches: true,
  track_expiry: false,
  shelf_life_days: "",
  expiry_alert_days: "30",
  msds_sheet_path: "",

  primary_warehouse_id: "__none__",
  default_location_id: "__none__",
  initial_stock: "0",
};

const COMMON_UOMS = [
  "units",
  "kg",
  "grams",
  "liters",
  "ml",
  "meters",
  "cm",
  "boxes",
  "cartons",
  "rolls",
  "bags",
  "sheets",
  "drums",
  "pallets",
  "pairs",
];

const GOOD_TYPE_LABELS: Record<GoodType, { label: string; desc: string }> = {
  raw_material: { label: "Raw Material", desc: "Basic ingredients and raw processing inputs" },
  component: { label: "Component", desc: "Pre-fabricated parts or sub-assemblies" },
  packaging: { label: "Packaging", desc: "Bottles, caps, boxes, labels, wrap" },
  consumable: { label: "Consumable", desc: "Cleaning, maintenance, and operating supplies" },
  semi_finished: { label: "Semi-Finished", desc: "Intermediate outputs queued for assembly" },
};

export function GoodFormModal({ open, mode, goodId, onClose, onSaved }: Props) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("general");
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [assetPickerTarget, setAssetPickerTarget] = React.useState<"image" | "model" | "msds" | null>(null);
  const [isFileManagerOpen, setIsFileManagerOpen] = React.useState(false);

  // Fetch Options
  const { data: options } = useQuery({
    queryKey: ["inventory", "goods", "options"],
    queryFn: fetchInventoryGoodOptions,
    enabled: open,
  });

  // Fetch Existing Good if Edit
  const { data: goodDetail, isLoading: loadingGood } = useQuery({
    queryKey: ["inventory", "goods", "detail", goodId],
    queryFn: () => (goodId ? fetchInventoryGood(goodId) : null),
    enabled: open && Boolean(goodId) && (mode === "edit" || mode === "duplicate"),
  });

  // Populate Form on Data Load
  React.useEffect(() => {
    if (!open) return;

    if (goodDetail?.good) {
      const g = goodDetail.good;
      setForm({
        name: mode === "duplicate" ? `${g.name} (Copy)` : g.name || "",
        sku: mode === "duplicate" ? `SKU-${Math.floor(1000 + Math.random() * 9000)}` : g.sku || "",
        stock_code: g.stock_code || "",
        barcode: g.barcode || "",
        good_type: g.good_type || "raw_material",
        status: mode === "duplicate" ? "active" : g.status || "active",
        category_id: g.category_id ? String(g.category_id) : "__none__",
        description: g.description || "",
        image: g.image || "",
        model_3d_path: g.model_3d_path || "",

        unit_of_measure: g.uom || "units",
        purchase_uom: g.purchase_uom || "",
        uom_conversion_factor: g.conversion_factor ? String(g.conversion_factor) : "1.0",
        packaging_quantity: g.packaging_quantity ? String(g.packaging_quantity) : "",
        weight: g.weight ? String(g.weight) : "",
        length: g.length ? String(g.length) : "",
        width: g.width ? String(g.width) : "",
        height: g.height ? String(g.height) : "",

        preferred_supplier_id: g.preferred_supplier_id ? String(g.preferred_supplier_id) : "__none__",
        unit_cost: g.unit_cost !== undefined ? String(g.unit_cost) : "0.00",
        tax_rate: g.tax_rate !== undefined ? String(g.tax_rate) : "0.00",
        tax_type: g.tax_type || "exclusive",
        currency: g.currency || "USD",
        lead_time_days: g.lead_time_days !== undefined && g.lead_time_days !== null ? String(g.lead_time_days) : "7",
        minimum_order_quantity: g.min_order_quantity ? String(g.min_order_quantity) : "1",
        secondary_suppliers: (g.suppliers || []).map((s) => ({
          supplier_id: String(s.supplier_id),
          supplier_sku: s.supplier_sku || "",
          unit_cost: s.unit_cost !== undefined && s.unit_cost !== null ? String(s.unit_cost) : "",
          lead_time_days: s.lead_time_days ? String(s.lead_time_days) : "",
        })),

        reorder_level: g.reorder_level !== undefined ? String(g.reorder_level) : "10",
        safety_stock: g.safety_stock !== undefined ? String(g.safety_stock) : "5",
        max_stock_capacity: g.max_stock_capacity ? String(g.max_stock_capacity) : "",
        track_batches: Boolean(g.track_batches),
        track_expiry: Boolean(g.track_expiry),
        shelf_life_days: g.shelf_life_days ? String(g.shelf_life_days) : "",
        expiry_alert_days: g.expiry_alert_days ? String(g.expiry_alert_days) : "30",
        msds_sheet_path: g.msds_sheet_path || "",

        primary_warehouse_id: g.primary_warehouse_id ? String(g.primary_warehouse_id) : "__none__",
        default_location_id: g.default_location_id ? String(g.default_location_id) : "__none__",
        initial_stock: "0",
      });
    } else if (mode === "create") {
      setForm({
        ...DEFAULT_FORM,
        sku: `RM-${Math.floor(1000 + Math.random() * 9000)}`,
        stock_code: `STK-${Math.floor(100 + Math.random() * 900)}`,
      });
    }
  }, [open, goodDetail, mode]);

  // Barcode Generator Mutation
  const barcodeMutation = useMutation({
    mutationFn: (sku: string) => generateGoodBarcode(sku),
    onSuccess: (data) => {
      if (data?.barcode) {
        setForm((prev) => ({ ...prev, barcode: data.barcode }));
        toast.success("Barcode generated");
      }
    },
    onError: () => {
      const generated = `BAR-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      setForm((prev) => ({ ...prev, barcode: generated }));
      toast.info("Generated fallback barcode");
    },
  });

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (state: FormState) => {
      const payload: Record<string, any> = {
        name: state.name.trim(),
        sku: state.sku.trim(),
        stock_code: state.stock_code.trim() || null,
        barcode: state.barcode.trim() || null,
        good_type: state.good_type,
        status: state.status,
        category_id: state.category_id !== "__none__" ? Number(state.category_id) : null,
        description: state.description.trim() || null,
        image: state.image || null,
        model_3d_path: state.model_3d_path || null,

        uom: state.unit_of_measure,
        purchase_uom: state.purchase_uom.trim() || null,
        conversion_factor: Number(state.uom_conversion_factor) || 1.0,
        packaging_quantity: state.packaging_quantity ? Number(state.packaging_quantity) : null,
        weight: state.weight ? Number(state.weight) : null,
        length: state.length ? Number(state.length) : null,
        width: state.width ? Number(state.width) : null,
        height: state.height ? Number(state.height) : null,

        preferred_supplier_id: state.preferred_supplier_id !== "__none__" ? Number(state.preferred_supplier_id) : null,
        unit_cost: Number(state.unit_cost) || 0,
        tax_rate: Number(state.tax_rate) || 0,
        tax_type: state.tax_type,
        currency: state.currency || "USD",
        lead_time_days: state.lead_time_days ? Number(state.lead_time_days) : null,
        min_order_quantity: Number(state.minimum_order_quantity) || 1,

        suppliers: state.secondary_suppliers
          .filter((s) => s.supplier_id && s.supplier_id !== "__none__")
          .map((s) => ({
            supplier_id: Number(s.supplier_id),
            supplier_sku: s.supplier_sku || null,
            unit_cost: s.unit_cost ? Number(s.unit_cost) : null,
            lead_time_days: s.lead_time_days ? Number(s.lead_time_days) : null,
          })),

        reorder_level: Number(state.reorder_level) || 0,
        safety_stock: Number(state.safety_stock) || 0,
        max_stock_capacity: state.max_stock_capacity ? Number(state.max_stock_capacity) : null,
        track_batches: state.track_batches,
        track_expiry: state.track_expiry,
        shelf_life_days: state.shelf_life_days ? Number(state.shelf_life_days) : null,
        expiry_alert_days: state.expiry_alert_days ? Number(state.expiry_alert_days) : 30,
        msds_file_path: state.msds_sheet_path || null,

        primary_warehouse_id: state.primary_warehouse_id !== "__none__" ? Number(state.primary_warehouse_id) : null,
        default_location_id: state.default_location_id !== "__none__" ? Number(state.default_location_id) : null,
      };

      if (mode === "create" && Number(state.initial_stock) > 0) {
        payload.initial_stock = Number(state.initial_stock);
      }

      if (mode === "edit" && goodId) {
        return updateInventoryGood(goodId, payload);
      }
      return createInventoryGood(payload);
    },
    onSuccess: (savedGood: GoodRecord) => {
      queryClient.invalidateQueries({ queryKey: ["inventory", "goods"] });
      toast.success(
        mode === "edit" ? "Good updated successfully" : "Good created successfully"
      );
      if (savedGood && onSaved) {
        onSaved(savedGood);
      }
      onClose();
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "An error occurred while saving the good.";
      toast.error(msg);
    },
  });

  const handleGenerateSku = () => {
    const prefix = form.good_type === "packaging" ? "PKG" : form.good_type === "component" ? "CMP" : "RM";
    setForm((prev) => ({
      ...prev,
      sku: `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`,
    }));
  };

  const handleAddSecondarySupplier = () => {
    setForm((prev) => ({
      ...prev,
      secondary_suppliers: [
        ...prev.secondary_suppliers,
        { supplier_id: "__none__", supplier_sku: "", unit_cost: "", lead_time_days: "7" },
      ],
    }));
  };

  const handleRemoveSecondarySupplier = (index: number) => {
    setForm((prev) => ({
      ...prev,
      secondary_suppliers: prev.secondary_suppliers.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateSecondarySupplier = (
    index: number,
    field: keyof SecondarySupplierInput,
    val: string
  ) => {
    setForm((prev) => {
      const updated = [...prev.secondary_suppliers];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, secondary_suppliers: updated };
    });
  };

  const filteredLocations = React.useMemo(() => {
    if (!options?.locations) return [];
    if (!form.primary_warehouse_id || form.primary_warehouse_id === "__none__") {
      return options.locations;
    }
    const whId = Number(form.primary_warehouse_id);
    return options.locations.filter((loc: { warehouse_id?: number | null }) => loc.warehouse_id === whId);
  }, [options?.locations, form.primary_warehouse_id]);

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="flex h-[92vh] max-h-[92vh] flex-col overflow-hidden rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl sm:max-w-[1050px]">
          {/* Header */}
          <div className="border-b border-border/40 px-6 py-4 bg-muted/10">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                    <Boxes className="h-5 w-5 text-primary" />
                    {mode === "create"
                      ? "Create Raw Material / Good"
                      : mode === "duplicate"
                      ? `Duplicate Good: ${form.name}`
                      : `Edit Good: ${form.name}`}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Define specifications, units, supplier terms, safety stock thresholds, and warehouse bin assignments.
                  </DialogDescription>
                </div>
                <Badge
                  variant={
                    form.status === "active"
                      ? "default"
                      : form.status === "inactive"
                      ? "secondary"
                      : "destructive"
                  }
                  className="capitalize font-semibold text-xs px-3 py-1 rounded-full"
                >
                  {form.status}
                </Badge>
              </div>
            </DialogHeader>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loadingGood ? (
              <div className="flex h-64 items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span>Loading material specifications...</span>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-5 w-full bg-muted/40 p-1 rounded-2xl h-11 mb-5">
                  <TabsTrigger value="general" className="rounded-xl text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    General
                  </TabsTrigger>
                  <TabsTrigger value="units" className="rounded-xl text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    Units & Packaging
                  </TabsTrigger>
                  <TabsTrigger value="costing" className="rounded-xl text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    Cost & Suppliers
                  </TabsTrigger>
                  <TabsTrigger value="inventory" className="rounded-xl text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    Inventory & Safety
                  </TabsTrigger>
                  <TabsTrigger value="warehouse" className="rounded-xl text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    Warehouse & Bins
                  </TabsTrigger>
                </TabsList>

                {/* TAB 1: GENERAL INFO */}
                <TabsContent value="general" className="space-y-4 focus-visible:outline-none">
                  <div className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Item / Material Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          placeholder="e.g. 500ml PET Preform, Grade A Resin, Corrugated Outer Box..."
                          value={form.name}
                          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                          className="h-10 rounded-xl font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Material Type <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={form.good_type}
                          onValueChange={(val: GoodType) => setForm((prev) => ({ ...prev, good_type: val }))}
                        >
                          <SelectTrigger className="h-10 rounded-xl">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(GOOD_TYPE_LABELS).map(([key, item]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex flex-col text-left py-0.5">
                                  <span className="font-semibold text-xs">{item.label}</span>
                                  <span className="text-[10px] text-muted-foreground">{item.desc}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Category
                        </Label>
                        <Select
                          value={form.category_id}
                          onValueChange={(val) => setForm((prev) => ({ ...prev, category_id: val }))}
                        >
                          <SelectTrigger className="h-10 rounded-xl">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Uncategorized</SelectItem>
                            {(options?.categories || []).map((cat: { id: number; name: string }) => (
                              <SelectItem key={cat.id} value={String(cat.id)}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Material SKU <span className="text-destructive">*</span>
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="e.g. RM-1049"
                            value={form.sku}
                            onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))}
                            className="h-10 rounded-xl font-mono uppercase font-semibold"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 shrink-0 rounded-xl"
                            onClick={handleGenerateSku}
                            title="Generate SKU"
                          >
                            <RefreshCcw className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Internal Stock / Part Code
                        </Label>
                        <Input
                          placeholder="e.g. STK-PET-01"
                          value={form.stock_code}
                          onChange={(e) => setForm((prev) => ({ ...prev, stock_code: e.target.value }))}
                          className="h-10 rounded-xl font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Barcode / GS1 Code
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Scan or enter barcode..."
                            value={form.barcode}
                            onChange={(e) => setForm((prev) => ({ ...prev, barcode: e.target.value }))}
                            className="h-10 rounded-xl font-mono"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 shrink-0 rounded-xl"
                            disabled={barcodeMutation.isPending}
                            onClick={() => barcodeMutation.mutate(form.sku || "GOOD")}
                            title="Auto-generate Barcode"
                          >
                            {barcodeMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkles className="h-4 w-4 text-primary" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Catalog Status
                        </Label>
                        <Select
                          value={form.status}
                          onValueChange={(val: GoodStatus) => setForm((prev) => ({ ...prev, status: val }))}
                        >
                          <SelectTrigger className="h-10 rounded-xl">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active (Available for production & POs)</SelectItem>
                            <SelectItem value="inactive">Inactive (Temporarily suspended)</SelectItem>
                            <SelectItem value="discontinued">Discontinued (Phased out)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Description & Material Notes
                        </Label>
                        <Textarea
                          placeholder="Material grade, handling precautions, packaging requirements, or purity standards..."
                          value={form.description}
                          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                          className="min-h-[85px] rounded-xl text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Visuals & Assets */}
                  <div className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <ImagePlus className="h-4 w-4 text-primary" /> Material Imagery & Assets
                    </h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Material Image Asset Path</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="e.g. /storage/goods/preform.png"
                            value={form.image}
                            onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
                            className="h-10 rounded-xl text-xs font-mono"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 rounded-xl text-xs"
                            onClick={() => {
                              setAssetPickerTarget("image");
                              setIsFileManagerOpen(true);
                            }}
                          >
                            Browse
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">3D Model File (.glb/.gltf)</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="e.g. /storage/models/capsule.glb"
                            value={form.model_3d_path}
                            onChange={(e) => setForm((prev) => ({ ...prev, model_3d_path: e.target.value }))}
                            className="h-10 rounded-xl text-xs font-mono"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 rounded-xl text-xs"
                            onClick={() => {
                              setAssetPickerTarget("model");
                              setIsFileManagerOpen(true);
                            }}
                          >
                            Browse
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 2: UNITS & PACKAGING */}
                <TabsContent value="units" className="space-y-4 focus-visible:outline-none">
                  <div className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                      <Scale className="h-4 w-4 text-primary" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                        Units of Measure (UOM) & Conversion
                      </h4>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Base UOM (Consumption) <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={form.unit_of_measure}
                          onValueChange={(val) => setForm((prev) => ({ ...prev, unit_of_measure: val }))}
                        >
                          <SelectTrigger className="h-10 rounded-xl">
                            <SelectValue placeholder="Base UOM" />
                          </SelectTrigger>
                          <SelectContent>
                            {COMMON_UOMS.map((uom) => (
                              <SelectItem key={uom} value={uom}>
                                {uom}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">Used in BOM recipes and inventory deduction.</p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Purchase UOM (From Supplier)
                        </Label>
                        <Select
                          value={form.purchase_uom || "__same__"}
                          onValueChange={(val) =>
                            setForm((prev) => ({ ...prev, purchase_uom: val === "__same__" ? "" : val }))
                          }
                        >
                          <SelectTrigger className="h-10 rounded-xl">
                            <SelectValue placeholder="Same as Base UOM" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__same__">Same as Base ({form.unit_of_measure})</SelectItem>
                            {COMMON_UOMS.map((uom) => (
                              <SelectItem key={uom} value={uom}>
                                {uom}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">e.g. Bought in boxes, consumed in units.</p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Conversion Factor
                        </Label>
                        <Input
                          type="number"
                          step="any"
                          placeholder="e.g. 500"
                          value={form.uom_conversion_factor}
                          onChange={(e) => setForm((prev) => ({ ...prev, uom_conversion_factor: e.target.value }))}
                          className="h-10 rounded-xl font-mono"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          1 {form.purchase_uom || form.unit_of_measure} = {form.uom_conversion_factor || "1"} {form.unit_of_measure}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Physical Dimensions & Packaging */}
                  <div className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                      <Package className="h-4 w-4 text-primary" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                        Packaging & Physical Dimensions
                      </h4>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Units / Carton
                        </Label>
                        <Input
                          type="number"
                          placeholder="e.g. 100"
                          value={form.packaging_quantity}
                          onChange={(e) => setForm((prev) => ({ ...prev, packaging_quantity: e.target.value }))}
                          className="h-10 rounded-xl font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Unit Net Weight (kg)
                        </Label>
                        <Input
                          type="number"
                          step="0.001"
                          placeholder="e.g. 0.028"
                          value={form.weight}
                          onChange={(e) => setForm((prev) => ({ ...prev, weight: e.target.value }))}
                          className="h-10 rounded-xl font-mono"
                        />
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Dimensions (L × W × H in cm)
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="L"
                            value={form.length}
                            onChange={(e) => setForm((prev) => ({ ...prev, length: e.target.value }))}
                            className="h-10 rounded-xl font-mono"
                          />
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="W"
                            value={form.width}
                            onChange={(e) => setForm((prev) => ({ ...prev, width: e.target.value }))}
                            className="h-10 rounded-xl font-mono"
                          />
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="H"
                            value={form.height}
                            onChange={(e) => setForm((prev) => ({ ...prev, height: e.target.value }))}
                            className="h-10 rounded-xl font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 3: COST & SUPPLIERS */}
                <TabsContent value="costing" className="space-y-4 focus-visible:outline-none">
                  <div className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                      <DollarSign className="h-4 w-4 text-emerald-500" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                        Standard Costing & Taxation
                      </h4>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Standard Cost / Unit <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.0001"
                            placeholder="0.00"
                            value={form.unit_cost}
                            onChange={(e) => setForm((prev) => ({ ...prev, unit_cost: e.target.value }))}
                            className="h-10 rounded-xl font-mono pl-7 font-bold"
                          />
                          <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground font-semibold">
                            $
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Currency
                        </Label>
                        <Select
                          value={form.currency}
                          onValueChange={(val) => setForm((prev) => ({ ...prev, currency: val }))}
                        >
                          <SelectTrigger className="h-10 rounded-xl font-mono">
                            <SelectValue placeholder="Currency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="ETB">ETB (Br)</SelectItem>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                            <SelectItem value="GBP">GBP (£)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Tax Rate (%)
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="0.00"
                            value={form.tax_rate}
                            onChange={(e) => setForm((prev) => ({ ...prev, tax_rate: e.target.value }))}
                            className="h-10 rounded-xl font-mono pl-7"
                          />
                          <Percent className="absolute left-2.5 top-3 h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Tax Scheme
                        </Label>
                        <Select
                          value={form.tax_type}
                          onValueChange={(val: GoodTaxType) => setForm((prev) => ({ ...prev, tax_type: val }))}
                        >
                          <SelectTrigger className="h-10 rounded-xl">
                            <SelectValue placeholder="Tax type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="exclusive">Tax Exclusive</SelectItem>
                            <SelectItem value="inclusive">Tax Inclusive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Primary Supplier */}
                  <div className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                      <Truck className="h-4 w-4 text-primary" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                        Preferred Vendor & Lead Time
                      </h4>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Primary Supplier
                        </Label>
                        <Select
                          value={form.preferred_supplier_id}
                          onValueChange={(val) => setForm((prev) => ({ ...prev, preferred_supplier_id: val }))}
                        >
                          <SelectTrigger className="h-10 rounded-xl">
                            <SelectValue placeholder="Select supplier" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">No primary vendor assigned</SelectItem>
                            {(options?.suppliers || []).map((s: { id: number; name: string }) => (
                              <SelectItem key={s.id} value={String(s.id)}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Supplier Lead Time (Days)
                        </Label>
                        <Input
                          type="number"
                          placeholder="e.g. 14"
                          value={form.lead_time_days}
                          onChange={(e) => setForm((prev) => ({ ...prev, lead_time_days: e.target.value }))}
                          className="h-10 rounded-xl font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Min. Order Qty (MOQ)
                        </Label>
                        <Input
                          type="number"
                          placeholder="e.g. 500"
                          value={form.minimum_order_quantity}
                          onChange={(e) => setForm((prev) => ({ ...prev, minimum_order_quantity: e.target.value }))}
                          className="h-10 rounded-xl font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Secondary Suppliers List */}
                  <div className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-border/30">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                          Secondary / Backup Suppliers
                        </h4>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs h-8"
                        onClick={handleAddSecondarySupplier}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Vendor
                      </Button>
                    </div>

                    {form.secondary_suppliers.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2 italic">
                        No secondary vendors configured.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {form.secondary_suppliers.map((sec, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-12 gap-2 items-center bg-background/50 p-2.5 rounded-xl border border-border/40"
                          >
                            <div className="col-span-4">
                              <Select
                                value={sec.supplier_id}
                                onValueChange={(val) => handleUpdateSecondarySupplier(idx, "supplier_id", val)}
                              >
                                <SelectTrigger className="h-9 rounded-lg text-xs">
                                  <SelectValue placeholder="Vendor" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Select vendor</SelectItem>
                                  {(options?.suppliers || []).map((s: { id: number; name: string }) => (
                                    <SelectItem key={s.id} value={String(s.id)}>
                                      {s.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-3">
                              <Input
                                placeholder="Vendor SKU"
                                value={sec.supplier_sku}
                                onChange={(e) => handleUpdateSecondarySupplier(idx, "supplier_sku", e.target.value)}
                                className="h-9 rounded-lg text-xs font-mono"
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Unit Cost"
                                value={sec.unit_cost}
                                onChange={(e) => handleUpdateSecondarySupplier(idx, "unit_cost", e.target.value)}
                                className="h-9 rounded-lg text-xs font-mono"
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                placeholder="Lead (d)"
                                value={sec.lead_time_days}
                                onChange={(e) => handleUpdateSecondarySupplier(idx, "lead_time_days", e.target.value)}
                                className="h-9 rounded-lg text-xs font-mono"
                              />
                            </div>
                            <div className="col-span-1 flex justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive rounded-lg"
                                onClick={() => handleRemoveSecondarySupplier(idx)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* TAB 4: INVENTORY & SAFETY */}
                <TabsContent value="inventory" className="space-y-4 focus-visible:outline-none">
                  <div className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                      <ShieldCheck className="h-4 w-4 text-amber-500" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                        Safety Stock & Reorder Thresholds
                      </h4>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Reorder Point Threshold <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="number"
                          placeholder="e.g. 50"
                          value={form.reorder_level}
                          onChange={(e) => setForm((prev) => ({ ...prev, reorder_level: e.target.value }))}
                          className="h-10 rounded-xl font-mono font-bold"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Triggers low-stock alerts and purchase order drafting.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Safety Stock Buffer
                        </Label>
                        <Input
                          type="number"
                          placeholder="e.g. 20"
                          value={form.safety_stock}
                          onChange={(e) => setForm((prev) => ({ ...prev, safety_stock: e.target.value }))}
                          className="h-10 rounded-xl font-mono"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Minimum stock held for supplier delays or consumption spikes.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Max Stock Capacity
                        </Label>
                        <Input
                          type="number"
                          placeholder="e.g. 5000"
                          value={form.max_stock_capacity}
                          onChange={(e) => setForm((prev) => ({ ...prev, max_stock_capacity: e.target.value }))}
                          className="h-10 rounded-xl font-mono"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Upper storage ceiling to prevent warehouse overfill.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Batch & Expiry Tracking */}
                  <div className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                      <Calendar className="h-4 w-4 text-primary" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                        Batch, Lot & Expiry Compliance
                      </h4>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="flex items-start space-x-3 rounded-xl border border-border/40 p-3.5 bg-background/40">
                        <Switch
                          checked={form.track_batches}
                          onCheckedChange={(val) => setForm((prev) => ({ ...prev, track_batches: val }))}
                          id="track_batches"
                        />
                        <div className="space-y-0.5">
                          <Label htmlFor="track_batches" className="text-xs font-bold cursor-pointer">
                            Track Batches / Lot Numbers
                          </Label>
                          <p className="text-[11px] text-muted-foreground">
                            Enforces receipt lot capture and enables end-to-end BOM traceability.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3 rounded-xl border border-border/40 p-3.5 bg-background/40">
                        <Switch
                          checked={form.track_expiry}
                          onCheckedChange={(val) => setForm((prev) => ({ ...prev, track_expiry: val }))}
                          id="track_expiry"
                        />
                        <div className="space-y-0.5">
                          <Label htmlFor="track_expiry" className="text-xs font-bold cursor-pointer">
                            Track Expiry / Perishability
                          </Label>
                          <p className="text-[11px] text-muted-foreground">
                            Enables FIFO/FEFO picking and expiration alert notifications.
                          </p>
                        </div>
                      </div>

                      {form.track_expiry && (
                        <>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Shelf Life (Days)
                            </Label>
                            <Input
                              type="number"
                              placeholder="e.g. 365"
                              value={form.shelf_life_days}
                              onChange={(e) => setForm((prev) => ({ ...prev, shelf_life_days: e.target.value }))}
                              className="h-10 rounded-xl font-mono"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Expiry Warning Window (Days before expiry)
                            </Label>
                            <Input
                              type="number"
                              placeholder="e.g. 30"
                              value={form.expiry_alert_days}
                              onChange={(e) => setForm((prev) => ({ ...prev, expiry_alert_days: e.target.value }))}
                              className="h-10 rounded-xl font-mono"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* MSDS / Spec Sheet */}
                  <div className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                      <FileText className="h-4 w-4 text-primary" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                        Material Safety Data Sheet (MSDS) / Technical Spec
                      </h4>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Document URL or File Path
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g. /storage/docs/msds-citric-acid.pdf or https://..."
                          value={form.msds_sheet_path}
                          onChange={(e) => setForm((prev) => ({ ...prev, msds_sheet_path: e.target.value }))}
                          className="h-10 rounded-xl text-xs font-mono"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 rounded-xl text-xs"
                          onClick={() => {
                            setAssetPickerTarget("msds");
                            setIsFileManagerOpen(true);
                          }}
                        >
                          Browse Library
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 5: WAREHOUSE & BINS */}
                <TabsContent value="warehouse" className="space-y-4 focus-visible:outline-none">
                  <div className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                      <Warehouse className="h-4 w-4 text-primary" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                        Primary Facility & Default Bin Placement
                      </h4>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Primary Warehouse
                        </Label>
                        <Select
                          value={form.primary_warehouse_id}
                          onValueChange={(val) => {
                            setForm((prev) => ({
                              ...prev,
                              primary_warehouse_id: val,
                              default_location_id: "__none__",
                            }));
                          }}
                        >
                          <SelectTrigger className="h-10 rounded-xl">
                            <SelectValue placeholder="Select warehouse" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">No primary warehouse</SelectItem>
                            {(options?.warehouses || []).map((wh: { id: number; name: string; code?: string | null }) => (
                              <SelectItem key={wh.id} value={String(wh.id)}>
                                {wh.name} {wh.code ? `(${wh.code})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Default Bin / Shelf Location
                        </Label>
                        <Select
                          value={form.default_location_id}
                          onValueChange={(val) => setForm((prev) => ({ ...prev, default_location_id: val }))}
                        >
                          <SelectTrigger className="h-10 rounded-xl">
                            <SelectValue placeholder="Select location / bin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Unassigned bin</SelectItem>
                            {filteredLocations.map((loc: { id: number; code?: string | null; name?: string | null }) => (
                              <SelectItem key={loc.id} value={String(loc.id)}>
                                {loc.code} {loc.name ? `- ${loc.name}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {mode === "create" && (
                        <div className="space-y-1.5 md:col-span-2 pt-2 border-t border-border/30">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Initial Intake Stock Quantity
                          </Label>
                          <div className="flex items-center gap-3">
                            <Input
                              type="number"
                              step="any"
                              placeholder="0"
                              value={form.initial_stock}
                              onChange={(e) => setForm((prev) => ({ ...prev, initial_stock: e.target.value }))}
                              className="h-10 max-w-xs rounded-xl font-mono font-bold"
                            />
                            <span className="text-xs text-muted-foreground">
                              {form.unit_of_measure} allocated immediately to primary warehouse.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border/40 px-6 py-4 bg-muted/10 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl text-xs"
              onClick={onClose}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                className="rounded-full px-6 text-xs font-bold shadow-lg shadow-primary/20"
                disabled={saveMutation.isPending || loadingGood || !form.name.trim() || !form.sku.trim()}
                onClick={() => saveMutation.mutate(form)}
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Material...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    {mode === "edit" ? "Update Good" : "Save Good"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Asset Library File Manager */}
      <Dialog open={isFileManagerOpen} onOpenChange={setIsFileManagerOpen}>
        <DialogContent className="max-w-5xl h-[85vh] p-0 overflow-hidden rounded-[2rem]">
          <div className="p-4 border-b flex justify-between items-center">
            <DialogTitle className="text-sm font-bold">Select Media / Asset</DialogTitle>
          </div>
          <div className="flex-1 h-full overflow-hidden p-2">
            <FileManagerClient
              isPickerMode={true}
              onFileSelect={(file: any) => {
                const path = file?.relative_path || file?.path || file?.url || "";
                if (assetPickerTarget === "image") {
                  setForm((prev) => ({ ...prev, image: path }));
                } else if (assetPickerTarget === "model") {
                  setForm((prev) => ({ ...prev, model_3d_path: path }));
                } else if (assetPickerTarget === "msds") {
                  setForm((prev) => ({ ...prev, msds_sheet_path: path }));
                }
                setIsFileManagerOpen(false);
                setAssetPickerTarget(null);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
