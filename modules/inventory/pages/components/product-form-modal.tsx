"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileBox, ImagePlus, Info, Lightbulb, Loader2, Plus, RefreshCcw, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createInventoryProduct,
  fetchInventoryProduct,
  fetchInventoryProductOptions,
  generateInventoryBarcode,
  updateInventoryProduct,
} from "@/modules/inventory/api";
import type { ProductKeyValue, ProductRecord } from "@/modules/inventory/types";
import { getBackendStorageUrl } from "@/lib/runtime-context";
import { FileManagerClient } from "@/components/dashboard/file-manager-client";
import { usePermissions } from "@/hooks/use-permissions";
import { Model3DViewer } from "@/components/ui/model-3d-viewer";
import { SecureAssetImage } from "@/components/ui/secure-asset-image";
import { getInventoryAssetPreviewUrl } from "@/modules/inventory/lib/product-assets";
import { isWorkflowPendingSubmission, notifyMutationOutcome } from "@/modules/workflow/utils/mutation-outcome";

type ModalMode = "create" | "edit" | "duplicate";
type InventoryAssetSelection = {
  id?: number | null;
  path?: string | null;
  url?: string | null;
  media_details?: {
    relative_path?: string | null;
    url?: string | null;
    name?: string | null;
    title?: string | null;
  } | null;
};

type Props = {
  open: boolean;
  mode: ModalMode;
  productId?: number | null;
  onClose: () => void;
  onSaved?: (product: ProductRecord) => void;
};

type FormState = {
  name: string;
  sku: string;
  stock_code: string;
  description: string;
  status: "draft" | "published" | "archived";
  product_category_id: string;
  unit: string;
  currency: string;
  unit_price: string;
  tax_rate: string;
  cost_of_good: string;
  sale_price: string;
  reorder_point: string;
  initial_stock: string;
  set_quantity: string;
  barcode: string;
  is_variant: boolean;
  parent_product_id: string;
  track_inventory: boolean;
  allow_backorders: boolean;
  tags: number[];
  hs_code: string;
  country_of_origin: string;
  units_per_package: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  nutritional_info: ProductKeyValue[];
  variant_attributes: ProductKeyValue[];
  image_path: string;
  model_3d_path: string;
};

const emptyKeyValue = (): ProductKeyValue => ({ key: "", value: "" });

const DEFAULT_CURRENCY_OPTIONS = [
  { code: "USD", symbol: "$", label: "USD - US Dollar" },
  { code: "ETB", symbol: "Br", label: "ETB - Ethiopian Birr" },
];

const normalizeKeyValueRows = (rows?: ProductKeyValue[] | null) =>
  rows && rows.length > 0 ? rows : [emptyKeyValue()];

const normalizeSelectedAssetPath = (value: string | null | undefined): string | null => {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const prefixes = ["/storage/", "/tenancy/assets/"];
  for (const prefix of prefixes) {
    const index = trimmed.indexOf(prefix);
    if (index !== -1) {
      return trimmed.substring(index + prefix.length).replace(/^\/+/, "");
    }
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const serveMatch = url.pathname.match(/\/api\/v1\/files\/(\d+)\/serve/);
      if (serveMatch) {
        return url.pathname;
      }
      return normalizeSelectedAssetPath(url.pathname) ?? trimmed;
    } catch {
      return trimmed;
    }
  }

  return trimmed.replace(/^\/+/, "");
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }

  return fallback;
};

const defaultForm = (): FormState => ({
  name: "",
  sku: "",
  stock_code: "",
  description: "",
  status: "draft",
  product_category_id: "",
  unit: "unit",
  currency: "USD",
  unit_price: "0",
  tax_rate: "15",
  cost_of_good: "0",
  sale_price: "",
  reorder_point: "0",
  initial_stock: "0",
  set_quantity: "",
  barcode: "",
  is_variant: false,
  parent_product_id: "",
  track_inventory: true,
  allow_backorders: false,
  tags: [],
  hs_code: "",
  country_of_origin: "",
  units_per_package: "",
  weight: "",
  length: "",
  width: "",
  height: "",
  nutritional_info: [emptyKeyValue()],
  variant_attributes: [emptyKeyValue()],
  image_path: "",
  model_3d_path: "",
});

const buildFormStateFromProduct = (product: ProductRecord, mode: ModalMode): FormState => {
  const isDuplicate = mode === "duplicate";

  return {
    name: product.name ?? "",
    sku: isDuplicate ? "" : product.sku ?? "",
    stock_code: isDuplicate ? "" : product.stock_code ?? "",
    description: product.description ?? "",
    status: isDuplicate ? "draft" : product.status,
    product_category_id: product.product_category_id ? String(product.product_category_id) : "",
    unit: product.unit ?? "unit",
    currency: product.currency ?? "USD",
    unit_price: String(product.unit_price ?? "0"),
    tax_rate: String(product.tax_rate ?? "15"),
    cost_of_good: String(product.cost_of_good ?? "0"),
    sale_price: product.sale_price ? String(product.sale_price) : "",
    reorder_point: String(product.reorder_point ?? 0),
    initial_stock: "0",
    set_quantity: isDuplicate ? "" : String(product.quantity ?? ""),
    barcode: isDuplicate ? "" : product.barcode ?? "",
    is_variant: Boolean(product.parent_product_id),
    parent_product_id: product.parent_product_id ? String(product.parent_product_id) : "",
    track_inventory: product.track_inventory,
    allow_backorders: product.allow_backorders,
    tags: product.tags?.map((tag) => tag.id) ?? [],
    hs_code: product.hs_code ?? "",
    country_of_origin: product.country_of_origin ?? "",
    units_per_package: product.units_per_package ? String(product.units_per_package) : "",
    weight: product.weight ? String(product.weight) : "",
    length: product.length ? String(product.length) : "",
    width: product.width ? String(product.width) : "",
    height: product.height ? String(product.height) : "",
    nutritional_info: normalizeKeyValueRows(product.nutritional_info as ProductKeyValue[] | null | undefined),
    variant_attributes: normalizeKeyValueRows(product.attributes as ProductKeyValue[] | null | undefined),
    image_path: product.image ?? "",
    model_3d_path: product.model_3d_path ?? "",
  };
};

export function ProductFormModal({ open, mode, productId, onClose, onSaved }: Props) {
  const isEdit = mode === "edit";
  const isDuplicate = mode === "duplicate";
  const loadsSourceProduct = isEdit || isDuplicate;
  const queryClient = useQueryClient();
  const { hasAnyPermission, hasPermission } = usePermissions();
  const [form, setForm] = React.useState<FormState>(defaultForm);
  const [barcodePreview, setBarcodePreview] = React.useState<string | null>(null);
  const [newImage, setNewImage] = React.useState<File | null>(null);
  const [newModel, setNewModel] = React.useState<File | null>(null);
  const [isFileManagerOpen, setIsFileManagerOpen] = React.useState(false);
  const [pickerField, setPickerField] = React.useState<"image" | "model_3d" | null>(null);
  const pickerFieldRef = React.useRef<"image" | "model_3d" | null>(null);
  const [newImagePreviewUrl, setNewImagePreviewUrl] = React.useState<string | null>(null);
  const [newModelPreviewUrl, setNewModelPreviewUrl] = React.useState<string | null>(null);
  const [selectedImagePreviewUrl, setSelectedImagePreviewUrl] = React.useState<string | null>(null);
  const [selectedModelPreviewUrl, setSelectedModelPreviewUrl] = React.useState<string | null>(null);
  const [isAnySelectOpen, setIsAnySelectOpen] = React.useState(false);
  const dismissingFileManagerRef = React.useRef(false);

  const optionsQuery = useQuery({
    queryKey: ["inventory", "products", "options", productId ?? "new"],
    queryFn: () => fetchInventoryProductOptions(productId ?? undefined),
    enabled: open,
  });

  const productQuery = useQuery({
    queryKey: ["inventory", "products", "detail", productId],
    queryFn: () => fetchInventoryProduct(productId as number),
    enabled: open && loadsSourceProduct && Boolean(productId),
  });

  React.useEffect(() => {
    if (!open) return;
    if (mode === "create") {
      setForm(defaultForm());
      setBarcodePreview(null);
      setNewImage(null);
      setNewModel(null);
      setSelectedImagePreviewUrl(null);
      setSelectedModelPreviewUrl(null);
    }
  }, [open, mode]);

  React.useEffect(() => {
    if (!open || !loadsSourceProduct || !productQuery.data?.product) return;

    const product = productQuery.data.product;
    setForm(buildFormStateFromProduct(product, mode));
    setBarcodePreview(!isDuplicate && product.barcode_path ? getBackendStorageUrl(product.barcode_path) : null);
    setNewImage(null);
    setNewModel(null);
    setSelectedImagePreviewUrl(product.image_preview_url ?? null);
    setSelectedModelPreviewUrl(product.model_3d_preview_url ?? null);
  }, [open, isDuplicate, loadsSourceProduct, mode, productQuery.data]);

  React.useEffect(() => {
    if (!newImage) {
      setNewImagePreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(newImage);
    setNewImagePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [newImage]);

  React.useEffect(() => {
    if (!newModel) {
      setNewModelPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(newModel);
    setNewModelPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [newModel]);

  const loading = optionsQuery.isLoading || (loadsSourceProduct && productQuery.isLoading);
  const options = optionsQuery.data;
  const canBrowseAssetLibrary = hasAnyPermission(["view_storage", "manage_storage"]);
  const canManageStorage = hasPermission("manage_storage");
  const currencyOptions =
    options?.currency_options && options.currency_options.length > 0
      ? options.currency_options
      : DEFAULT_CURRENCY_OPTIONS;
  const countryOptions = options?.countries ?? [];
  const dialogTitle = isEdit ? "Edit Product" : isDuplicate ? "Duplicate Product" : "Create Product";
  const dialogDescription = isDuplicate
    ? "Create a new product from an existing record, then adjust the fields you want to change."
    : "Build complete product records with pricing, inventory, shipping, media, and compliance data.";
  const saveLabel = isEdit ? "Save Product" : isDuplicate ? "Create Copy" : "Create Product";
  const imagePreviewUrl =
    newImagePreviewUrl ??
    getInventoryAssetPreviewUrl({ path: form.image_path, previewUrl: selectedImagePreviewUrl });
  const modelPreviewUrl =
    newModelPreviewUrl ??
    getInventoryAssetPreviewUrl({ path: form.model_3d_path, previewUrl: selectedModelPreviewUrl });
  const hasImageSelection = Boolean(form.image_path || newImage);
  const hasModelSelection = Boolean(form.model_3d_path || newModel);
  const imageDisplayPath = newImage ? `Pending upload: ${newImage.name}` : form.image_path || "No saved path selected";
  const modelDisplayPath = newModel ? `Pending upload: ${newModel.name}` : form.model_3d_path || "No saved path selected";
  const modelDisplayName = newModel?.name || form.model_3d_path.split("/").pop() || "No model selected";

  const closeAssetLibrary = React.useCallback(() => {
    // Nested/sibling Dialog dismiss can bubble to the product modal; ignore that briefly.
    dismissingFileManagerRef.current = true;
    pickerFieldRef.current = null;
    setPickerField(null);
    setIsFileManagerOpen(false);
    window.setTimeout(() => {
      dismissingFileManagerRef.current = false;
    }, 0);
  }, []);

  const openAssetLibrary = React.useCallback((field: "image" | "model_3d") => {
    pickerFieldRef.current = field;
    setPickerField(field);
    setIsFileManagerOpen(true);
  }, []);

  const barcodeMutation = useMutation({
    mutationFn: () => generateInventoryBarcode(),
    onSuccess: (payload) => {
      setForm((prev) => ({ ...prev, barcode: payload.barcode }));
      setBarcodePreview(payload.preview_data_url);
    },
    onError: () => toast.error("Failed to generate barcode."),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = new FormData();
      data.append("name", form.name.trim());
      data.append("sku", form.sku.trim());
      data.append("stock_code", form.stock_code.trim());
      data.append("description", form.description.trim());
      data.append("status", form.status);
      data.append("unit", form.unit);
      data.append("uom", form.unit);
      data.append("currency", form.currency);
      data.append("unit_price", form.unit_price || "0");
      data.append("tax_rate", form.tax_rate || "0");
      data.append("cost_of_good", form.cost_of_good || "0");
      data.append("reorder_point", form.reorder_point || "0");
      data.append("barcode", form.barcode.trim());
      data.append("is_variant", String(form.is_variant));
      data.append("track_inventory", String(form.track_inventory));
      data.append("allow_backorders", String(form.allow_backorders));
      data.append("tags", JSON.stringify(form.tags));
      data.append("variant_attributes", JSON.stringify(form.variant_attributes));
      data.append("nutritional_info", JSON.stringify(form.nutritional_info));

      if (form.sale_price.trim()) data.append("sale_price", form.sale_price);
      if (form.product_category_id) data.append("product_category_id", form.product_category_id);
      if (form.parent_product_id) data.append("parent_product_id", form.parent_product_id);
      if (form.hs_code.trim()) data.append("hs_code", form.hs_code.trim());
      if (form.country_of_origin.trim()) data.append("country_of_origin", form.country_of_origin.trim());
      if (form.units_per_package.trim()) data.append("units_per_package", form.units_per_package);
      if (form.weight.trim()) data.append("weight", form.weight);
      if (form.length.trim()) data.append("length", form.length);
      if (form.width.trim()) data.append("width", form.width);
      if (form.height.trim()) data.append("height", form.height);
      if (isEdit) data.append("set_quantity", form.set_quantity || "0");
      if (!isEdit) data.append("initial_stock", form.initial_stock || "0");
      if (newImage) {
        data.append("new_image", newImage);
      } else if (form.image_path) {
        data.append("image_path", form.image_path);
      } else if (isEdit) {
        data.append("image_path", "");
      }

      if (newModel) {
        data.append("new_3d_model", newModel);
      } else if (form.model_3d_path) {
        data.append("model_3d_path", form.model_3d_path);
      } else if (isEdit) {
        data.append("model_3d_path", "");
      }

      if (isEdit && productId) {
        return updateInventoryProduct(productId, data);
      }
      return createInventoryProduct(data);
    },
    onSuccess: (product) => {
      const outcome = notifyMutationOutcome(product, {
        savedMessage: isEdit ? "Product updated." : isDuplicate ? "Product duplicated." : "Product created.",
        submittedMessage: "Submitted for approval.",
        queryClient,
      });
      queryClient.invalidateQueries({ queryKey: ["inventory", "products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", "products", "summary"] });
      if (productId) {
        queryClient.invalidateQueries({ queryKey: ["inventory", "products", "detail", productId] });
      }
      if (outcome === "saved" && !isWorkflowPendingSubmission(product)) {
        onSaved?.(product as ProductRecord);
      }
      onClose();
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Failed to save product.")),
  });

  const onAddKeyValue = (field: "nutritional_info" | "variant_attributes") => {
    setForm((prev) => ({
      ...prev,
      [field]: [...prev[field], emptyKeyValue()],
    }));
  };

  const onRemoveKeyValue = (field: "nutritional_info" | "variant_attributes", index: number) => {
    setForm((prev) => {
      const next = prev[field].filter((_, i) => i !== index);
      return {
        ...prev,
        [field]: next.length > 0 ? next : [emptyKeyValue()],
      };
    });
  };

  const onUpdateKeyValue = (
    field: "nutritional_info" | "variant_attributes",
    index: number,
    key: "key" | "value",
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    }));
  };

  const handleFileSelect = (file: InventoryAssetSelection) => {
    const targetField = pickerFieldRef.current ?? pickerField;
    if (!targetField) {
      return;
    }

    const rawPath =
      file?.media_details?.relative_path ||
      file?.path;
    const path = normalizeSelectedAssetPath(rawPath);

    if (!path) {
      toast.error("Could not extract the selected asset path from the file manager.");
      return;
    }

    const previewUrl = file?.media_details?.url || file?.url || null;

    setForm((prev) => ({
      ...prev,
      [targetField === "image" ? "image_path" : "model_3d_path"]: path,
    }));
    
    // Clear direct file uploads if selecting from library
    if (targetField === "image") {
      setNewImage(null);
      setSelectedImagePreviewUrl(previewUrl);
    } else {
      setNewModel(null);
      setSelectedModelPreviewUrl(previewUrl);
    }
    
    closeAssetLibrary();
    toast.success("Asset selected from the media library.");
  };

  const toggleTag = (tagId: number) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tagId) ? prev.tags.filter((id) => id !== tagId) : [...prev.tags, tagId],
    }));
  };

  if (!open) return null;

  return (
    <>
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          if (isAnySelectOpen || isFileManagerOpen || dismissingFileManagerRef.current) {
            return;
          }
          onClose();
        }
      }}
    >
      <DialogContent
        className="flex h-[92vh] max-h-[92vh] flex-col overflow-hidden rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl sm:max-w-[1200px]"
        onInteractOutside={(event) => {
          if (isFileManagerOpen || dismissingFileManagerRef.current) {
            event.preventDefault();
          }
        }}
        onPointerDownOutside={(event) => {
          if (isFileManagerOpen || dismissingFileManagerRef.current) {
            event.preventDefault();
          }
        }}
        onFocusOutside={(event) => {
          if (isFileManagerOpen || dismissingFileManagerRef.current) {
            event.preventDefault();
          }
        }}
      >
        <div className="border-b border-border/40 px-6 py-5">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight">
              {dialogTitle}
            </DialogTitle>
            <DialogDescription>
              {dialogDescription}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading product data...
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-8">
                <SectionCard title="Basic Information">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Product Name" required>
                      <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Hagenes PLC et" />
                    </Field>
                    <Field label="SKU" required>
                      <div className="flex gap-2">
                        <Input
                          value={form.sku}
                          onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))}
                          placeholder="e.g. SKU-0001 (Auto-generated)"
                          className="font-mono font-semibold"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="shrink-0 gap-1 text-xs"
                          onClick={() => setForm((prev) => ({ ...prev, sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}` }))}
                          title="Generate new unique SKU"
                        >
                          <RefreshCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Field>
                    <Field label="Stock Code">
                      <Input value={form.stock_code} onChange={(event) => setForm((prev) => ({ ...prev, stock_code: event.target.value }))} placeholder="STK-001" />
                    </Field>
                    <Field label="Barcode (GTIN / UPC)">
                      <div className="flex gap-2">
                        <Input value={form.barcode} onChange={(event) => setForm((prev) => ({ ...prev, barcode: event.target.value }))} placeholder="Enter or generate barcode..." />
                        <Button type="button" variant="outline" className="shrink-0" disabled={barcodeMutation.isPending} onClick={() => barcodeMutation.mutate()}>
                          {barcodeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                        </Button>
                      </div>
                    </Field>
                    <Field label="Description" className="md:col-span-2">
                      <Textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Add a short product description..." className="min-h-[90px]" />
                    </Field>
                  </div>
                </SectionCard>

                <SectionCard title="Compliance & Nutrition">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="HS Code (Customs)">
                      <Input value={form.hs_code} onChange={(event) => setForm((prev) => ({ ...prev, hs_code: event.target.value }))} placeholder="HS-0000" />
                    </Field>
                    <Field label="Country of Origin">
                      <Select value={form.country_of_origin || "__none__"} onValueChange={(value) => setForm((prev) => ({ ...prev, country_of_origin: value === "__none__" ? "" : value }))} onOpenChange={setIsAnySelectOpen}>
                        <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                        <SelectContent className="max-h-80">
                          <SelectItem value="__none__">Not specified</SelectItem>
                          {countryOptions.map((country) => (
                            <SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Nutritional Facts" className="md:col-span-2">
                      <div className="space-y-2">
                        {form.nutritional_info.map((row, index) => (
                          <div key={`nutrition-${index}`} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                            <Input value={row.key} onChange={(event) => onUpdateKeyValue("nutritional_info", index, "key", event.target.value)} placeholder="Fact (e.g., Calories)" />
                            <Input value={row.value} onChange={(event) => onUpdateKeyValue("nutritional_info", index, "value", event.target.value)} placeholder="Value (e.g., 250 kcal)" />
                            <Button type="button" variant="ghost" size="icon" onClick={() => onRemoveKeyValue("nutritional_info", index)} className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => onAddKeyValue("nutritional_info")}>
                          <Plus className="mr-2 h-3.5 w-3.5" />
                          Add Fact
                        </Button>
                      </div>
                    </Field>
                  </div>
                </SectionCard>

                <SectionCard title="Pricing">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <Field label="Currency" required className="min-w-0">
  <Select
    value={form.currency}
    onValueChange={(value) => setForm((prev) => ({ ...prev, currency: value }))}
    onOpenChange={setIsAnySelectOpen}
  >
    <SelectTrigger className="w-full min-w-0">
      <SelectValue placeholder="Select currency" className="truncate" />
    </SelectTrigger>
    <SelectContent className="max-h-72">
      {currencyOptions.map((currency) => (
        <SelectItem key={currency.code} value={currency.code}>
          {currency.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</Field>
                    <Field label="Cost of Good"><Input type="number" min="0" step="0.01" value={form.cost_of_good} onChange={(event) => setForm((prev) => ({ ...prev, cost_of_good: event.target.value }))} /></Field>
                    <Field label="Unit Price" required><Input type="number" min="0" step="0.01" value={form.unit_price} onChange={(event) => setForm((prev) => ({ ...prev, unit_price: event.target.value }))} /></Field>
                    <Field label="Sale Price"><Input type="number" min="0" step="0.01" value={form.sale_price} onChange={(event) => setForm((prev) => ({ ...prev, sale_price: event.target.value }))} /></Field>
                    <Field label="Tax Rate (%)"><Input type="number" min="0" step="0.01" value={form.tax_rate} onChange={(event) => setForm((prev) => ({ ...prev, tax_rate: event.target.value }))} /></Field>
                  </div>
                </SectionCard>

                <SectionCard title="Inventory">
                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="Reorder Point"><Input type="number" min="0" value={form.reorder_point} onChange={(event) => setForm((prev) => ({ ...prev, reorder_point: event.target.value }))} /></Field>
                    <Field label={isEdit ? "Set Quantity" : "Initial Stock Quantity"}>
                      <Input type="number" min="0" value={isEdit ? form.set_quantity : form.initial_stock} onChange={(event) => setForm((prev) => isEdit ? { ...prev, set_quantity: event.target.value } : { ...prev, initial_stock: event.target.value })} />
                    </Field>
                    <Field label="Units per Package / Case"><Input type="number" min="1" value={form.units_per_package} onChange={(event) => setForm((prev) => ({ ...prev, units_per_package: event.target.value }))} /></Field>
                    <div className="md:col-span-3">
                      <div className="flex flex-wrap items-center gap-4 pt-1 text-sm">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <Checkbox checked={form.track_inventory} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, track_inventory: checked === true }))} />
                          <span>Track inventory</span>
                          <FieldInfoPopover label="Track inventory" />
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <Checkbox checked={form.allow_backorders} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, allow_backorders: checked === true }))} />
                          <span>Allow backorders</span>
                          <FieldInfoPopover label="Allow backorders" />
                        </label>
                      </div>
                    </div>
                    {barcodePreview ? (
                      <div className="md:col-span-3">
                        { }
                        <img src={barcodePreview} alt="Barcode preview" className="h-16 rounded-md border border-border bg-white p-1" />
                      </div>
                    ) : null}
                  </div>
                </SectionCard>

                <SectionCard title="Shipping & Packaging">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Unit of Measure" required>
                      <Select value={form.unit} onValueChange={(value) => setForm((prev) => ({ ...prev, unit: value }))} onOpenChange={setIsAnySelectOpen}>
                        <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                        <SelectContent>
                          {(options?.uom_options ?? ["unit"]).map((value) => (
                            <SelectItem key={value} value={value}>{value}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Weight"><Input type="number" min="0" step="0.001" value={form.weight} onChange={(event) => setForm((prev) => ({ ...prev, weight: event.target.value }))} placeholder="0.000" /></Field>
                    <Field label="Length"><Input type="number" min="0" step="0.001" value={form.length} onChange={(event) => setForm((prev) => ({ ...prev, length: event.target.value }))} /></Field>
                    <Field label="Width"><Input type="number" min="0" step="0.001" value={form.width} onChange={(event) => setForm((prev) => ({ ...prev, width: event.target.value }))} /></Field>
                    <Field label="Height" className="md:col-span-2"><Input type="number" min="0" step="0.001" value={form.height} onChange={(event) => setForm((prev) => ({ ...prev, height: event.target.value }))} /></Field>
                  </div>
                </SectionCard>
              </div>

              <div className="space-y-4 lg:col-span-4">
                <SectionCard title="Organization">
                  <div className="space-y-3">
                    <Field label="Status" required>
                      <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as FormState["status"] }))} onOpenChange={setIsAnySelectOpen}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(options?.status_options ?? ["draft", "published", "archived"]).map((value) => (
                            <SelectItem key={value} value={value}>{value}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Product Category">
                      <Select value={form.product_category_id || "__none__"} onValueChange={(value) => setForm((prev) => ({ ...prev, product_category_id: value === "__none__" ? "" : value }))} onOpenChange={setIsAnySelectOpen}>
                        <SelectTrigger><SelectValue placeholder="Select product category" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Uncategorized</SelectItem>
                          {(options?.categories ?? []).map((category) => (
                            <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Tags">
                      <div className="flex flex-wrap gap-2">
                        {(options?.tags ?? []).length === 0 ? (
                          <p className="text-xs text-muted-foreground">No tags found.</p>
                        ) : (
                          (options?.tags ?? []).map((tag) => (
                            <button key={tag.id} type="button" className="transition-transform hover:scale-[1.02]" onClick={() => toggleTag(tag.id)}>
                              <Badge variant={form.tags.includes(tag.id) ? "default" : "outline"}>#{tag.name}</Badge>
                            </button>
                          ))
                        )}
                      </div>
                    </Field>
                  </div>
                </SectionCard>

                <SectionCard title="Variant Workflow">
                  <div className="space-y-3">
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                      <Checkbox checked={form.is_variant} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_variant: checked === true, parent_product_id: checked === true ? prev.parent_product_id : "" }))} />
                      <span>This product has variants</span>
                      <FieldInfoPopover label="This product has variants" />
                    </label>
                    <Field label="Parent Product">
                      <Select value={form.parent_product_id || "__none__"} onValueChange={(value) => setForm((prev) => ({ ...prev, parent_product_id: value === "__none__" ? "" : value }))} disabled={!form.is_variant} onOpenChange={setIsAnySelectOpen}>
                        <SelectTrigger><SelectValue placeholder="No parent" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No parent</SelectItem>
                          {(options?.parent_products ?? []).map((parent) => (
                            <SelectItem key={parent.id} value={String(parent.id)}>{parent.name} ({parent.sku})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    {form.is_variant ? (
                      <Field label="Variant Attributes">
                        <div className="space-y-2">
                          {form.variant_attributes.map((row, index) => (
                            <div key={`variant-${index}`} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                              <Input value={row.key} onChange={(event) => onUpdateKeyValue("variant_attributes", index, "key", event.target.value)} placeholder="Attribute (e.g., Color)" />
                              <Input value={row.value} onChange={(event) => onUpdateKeyValue("variant_attributes", index, "value", event.target.value)} placeholder="Value (e.g., Blue)" />
                              <Button type="button" variant="ghost" size="icon" onClick={() => onRemoveKeyValue("variant_attributes", index)} className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button type="button" variant="outline" size="sm" onClick={() => onAddKeyValue("variant_attributes")}>
                            <Plus className="mr-2 h-3.5 w-3.5" />
                            Add Attribute
                          </Button>
                        </div>
                      </Field>
                    ) : null}
                  </div>
                </SectionCard>

                <SectionCard title="Media & Visuals">
                  <div className="space-y-4">
                    <Field label="Product Image">
                      <div className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-dashed border-border/60 bg-muted/5 transition-colors hover:border-primary/50">
                        {hasImageSelection ? (
                          <>
                            {imagePreviewUrl ? (
                              <SecureAssetImage
                                src={imagePreviewUrl}
                                alt="Product"
                                className="h-full w-full object-cover"
                                loadingClassName="animate-pulse bg-muted/40"
                              />
                            ) : (
                              <div className="flex h-full flex-col items-center justify-center space-y-3 p-6 text-center">
                                <div className="rounded-full bg-primary/10 p-3 text-primary">
                                  <ImagePlus className="h-6 w-6" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold">Preview unavailable</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    The selected image path will still be saved with this product.
                                  </p>
                                </div>
                              </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button type="button" variant="secondary" size="sm" className="rounded-full shadow-md" onClick={() => openAssetLibrary("image")}>
                                <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> Library
                              </Button>
                              <div className="relative">
                                <Button type="button" variant="secondary" size="sm" className="rounded-full shadow-md">
                                  <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload
                                </Button>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="absolute inset-0 cursor-pointer opacity-0"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    setNewImage(file);
                                    if (file) {
                                      setForm((prev) => ({ ...prev, image_path: "" }));
                                      setSelectedImagePreviewUrl(null);
                                    }
                                    e.target.value = "";
                                  }}
                                />
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={() => {
                                setForm((prev) => ({ ...prev, image_path: "" }));
                                setNewImage(null);
                                setSelectedImagePreviewUrl(null);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center space-y-3 p-6 text-center">
                            <div className="rounded-full bg-primary/10 p-3 text-primary">
                              <ImagePlus className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">No image selected</p>
                              <p className="text-[11px] text-muted-foreground">Select from library or upload new</p>
                            </div>
                            <div className="flex gap-2">
                              <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => openAssetLibrary("image")}>
                                Library
                              </Button>
                              <div className="relative">
                                <Button type="button" variant="secondary" size="sm" className="rounded-full">
                                  <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload
                                </Button>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="absolute inset-0 cursor-pointer opacity-0"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    setNewImage(file);
                                    if (file) {
                                      setForm((prev) => ({ ...prev, image_path: "" }));
                                      setSelectedImagePreviewUrl(null);
                                    }
                                    e.target.value = "";
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="rounded-2xl border border-border/50 bg-muted/10 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Saved Asset Path</p>
                        <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground">{imageDisplayPath}</p>
                      </div>
                    </Field>

                    <Field label="3D Model (.glb / .gltf)">
                      <div className="space-y-3">
                        <Model3DViewer
                          src={modelPreviewUrl}
                          className="min-h-[280px]"
                          viewerClassName="min-h-[280px]"
                          emptyTitle={hasModelSelection ? "Preview unavailable" : "No 3D model available"}
                          emptyDescription={
                            hasModelSelection
                              ? "The selected 3D file path will still be saved with this product."
                              : "Select a GLB or GLTF file from the library or upload one to preview it here."
                          }
                          errorTitle="Could not load the 3D model preview"
                          showOpenButton={Boolean(modelPreviewUrl)}
                        />
                        <div className="rounded-2xl border border-border/50 bg-muted/10 p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                              <FileBox className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{modelDisplayName}</p>
                              <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{modelDisplayPath}</p>
                            </div>
                            <div className="flex gap-1 items-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg"
                                title="Select 3D model from library"
                                onClick={() => openAssetLibrary("model_3d")}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <div className="relative">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg"
                                  title="Upload 3D model (.glb / .gltf)"
                                >
                                  <Upload className="h-4 w-4" />
                                </Button>
                                <input
                                  type="file"
                                  accept=".glb,.gltf"
                                  className="absolute inset-0 cursor-pointer opacity-0"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    setNewModel(file);
                                    if (file) {
                                      setForm((prev) => ({ ...prev, model_3d_path: "" }));
                                      setSelectedModelPreviewUrl(null);
                                    }
                                    e.target.value = "";
                                  }}
                                />
                              </div>
                              {(form.model_3d_path || newModel) ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg text-destructive"
                                  title="Remove 3D model"
                                  onClick={() => {
                                    setForm((prev) => ({ ...prev, model_3d_path: "" }));
                                    setNewModel(null);
                                    setSelectedModelPreviewUrl(null);
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Field>
                  </div>
                </SectionCard>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="sticky bottom-0 mt-auto border-t border-border/40 bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <Button variant="outline" className="rounded-full" onClick={onClose}>Cancel</Button>
          <Button className="rounded-full" disabled={saveMutation.isPending || loading} onClick={() => {
            if (!form.name.trim()) {
              toast.error("Product name is required.");
              return;
            }
            if (!form.sku.trim()) {
              toast.error("SKU is required. Click the refresh icon to auto-generate one.");
              return;
            }
            if (!form.currency.trim()) {
              toast.error("Currency is required.");
              return;
            }
            if (!form.unit_price.trim() || isNaN(Number(form.unit_price)) || Number(form.unit_price) < 0) {
              toast.error("A valid unit price is required.");
              return;
            }
            if (form.sale_price.trim() && !isNaN(Number(form.sale_price)) && Number(form.sale_price) >= Number(form.unit_price)) {
              toast.error("Sale price must be strictly less than unit price.");
              return;
            }
            if (!form.unit.trim()) {
              toast.error("Unit of measure is required.");
              return;
            }
            if (!form.status.trim()) {
              toast.error("Status is required.");
              return;
            }
            saveMutation.mutate();
          }}>
            {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      <Dialog
        open={isFileManagerOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeAssetLibrary();
            return;
          }

          setIsFileManagerOpen(true);
        }}
      >
        <DialogContent className="flex h-[80vh] max-w-[1000px] flex-col p-0 overflow-hidden rounded-[2rem]">
          <div className="flex items-center justify-between border-b px-6 py-4 bg-background/50 backdrop-blur-md">
            <div>
              <DialogTitle>Media Library</DialogTitle>
              <DialogDescription>Select an asset for this product</DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={closeAssetLibrary} className="rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="file-picker-wrapper relative flex-1 overflow-hidden">
            <style dangerouslySetInnerHTML={{ __html: `
              .file-picker-wrapper > div > div:nth-child(1), 
              .file-picker-wrapper > div > div:nth-child(2) > div:nth-child(2) { display: none !important; }
              .file-picker-wrapper > div { height: 100% !important; min-height: 100% !important; margin: 0 !important; }
            `}} />
            <FileManagerClient 
              isPickerMode={true}
              onFileSelect={handleFileSelect}
              access={{ canRead: canBrowseAssetLibrary, canManage: canManageStorage }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/50 bg-card/40 p-4">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

export type FieldInfoData = {
  title?: string;
  description: string;
  example?: string;
  bestPractice?: string;
};

const PRODUCT_FIELD_INFO_MAP: Record<string, FieldInfoData> = {
  "Product Name": {
    title: "Product Name",
    description: "The primary commercial display title of the product. Appears across sales quotes, invoices, order packing slips, and the digital catalog.",
    example: "Highland Reserve Yirgacheffe Coffee Beans 500g",
    bestPractice: "Include brand name, key distinguishing attribute, and package size for fast search and identification.",
  },
  "SKU": {
    title: "Stock Keeping Unit (SKU)",
    description: "A unique alphanumeric identifier used to distinguish this exact item variant across warehouses, inventory bins, and barcode scanners.",
    example: "COF-YIRG-500G",
    bestPractice: "Must be unique across your organization. Click the refresh button to auto-generate a valid unique code.",
  },
  "Stock Code": {
    title: "Internal Stock Code",
    description: "Secondary internal reference or legacy inventory ledger code used for enterprise cross-system synchronization and vendor part matching.",
    example: "STK-COF-001",
    bestPractice: "Use this to mirror accounting catalog codes or supplier part numbers when they differ from your SKU.",
  },
  "Barcode (GTIN / UPC)": {
    title: "Barcode (GTIN / UPC / EAN)",
    description: "Standard 12-digit (UPC) or 13-digit (EAN-13) retail barcode scanned at warehouse dispatch, receiving gates, and point-of-sale registers.",
    example: "6901234567891",
    bestPractice: "Click the refresh icon to auto-generate a compliant EAN-13 barcode with checksum validation.",
  },
  "Description": {
    title: "Product Description",
    description: "Detailed narrative describing product characteristics, specifications, usage instructions, or marketing copy for customers and staff.",
    example: "Specialty Grade 1 washed Arabica coffee beans from Gedeo zone, Yirgacheffe. Features floral aromas and balanced citrus notes.",
  },
  "HS Code (Customs)": {
    title: "Harmonized System (HS) Tariff Code",
    description: "Standardized international tariff classification code (6 to 10 digits) used by customs authorities worldwide to calculate import/export tariffs, taxes, and duties.",
    example: "0901.21 (Roasted Coffee) or 2201.10 (Mineral Waters)",
    bestPractice: "Essential for international shipping documents, bill of lading, and automated export compliance.",
  },
  "Country of Origin": {
    title: "Country of Origin",
    description: "The 2-letter ISO country code where the item was grown, manufactured, or underwent significant transformation.",
    example: "ET (Ethiopia), US (United States), DE (Germany)",
    bestPractice: "Required for customs documentation, preferential trade agreements, and regulatory declarations.",
  },
  "Nutritional Facts": {
    title: "Nutritional Facts & Lab Specs",
    description: "Structured attribute key-value pairs representing nutritional breakdown (e.g., Calories, Total Fat) or lab test results (e.g., pH, TDS, Purity).",
    example: "Serving Size: 15g | Calories: 2 kcal | pH: 7.2",
    bestPractice: "Allows dynamic rendering on product compliance labels, digital menus, and customer specification sheets.",
  },
  "Currency": {
    title: "Pricing Currency",
    description: "The official transaction currency code for all monetary amounts (Unit Price, Cost of Good, Sale Price) on this item.",
    example: "ETB (Ethiopian Birr), USD (US Dollar)",
    bestPractice: "Ensures accounting ledgers, tax reports, and multi-currency order conversions calculate correctly.",
  },
  "Cost of Good": {
    title: "Cost of Goods Sold (COGS)",
    description: "The direct expense incurred to manufacture or procure one unit of this product (materials, production labor, freight allocation).",
    example: "480.00",
    bestPractice: "Used by the ERP valuation engine to determine gross margins and profitability. Defaults to 0.00 if left blank.",
  },
  "Unit Price": {
    title: "Standard Selling Price",
    description: "The standard list price charged to customers per unit before discounts, taxes, or volume price tiers.",
    example: "850.00",
    bestPractice: "Must be a non-negative number. Required to publish items and generate sales quotations.",
  },
  "Sale Price": {
    title: "Discount / Promotional Price",
    description: "An optional promotional price offered during special discounts, clearances, or partner campaigns.",
    example: "765.00",
    bestPractice: "Must be strictly lower than the base Unit Price. Leave empty if no special promotion is active.",
  },
  "Tax Rate (%)": {
    title: "Tax / VAT Rate",
    description: "The applicable Value Added Tax (VAT) or sales tax percentage charged on this item.",
    example: "15.00 (Standard VAT rate) or 0.00 (Tax-exempt)",
    bestPractice: "Calculated automatically on invoice line items. Defaults to standard 15% if left blank.",
  },
  "Reorder Point": {
    title: "Reorder Threshold Point",
    description: "The minimum inventory level that automatically triggers a low-stock alert or auto-generates a replenishment purchase requisition.",
    example: "50",
    bestPractice: "Set this above your minimum safety buffer based on vendor lead times to prevent stockouts.",
  },
  "Initial Stock Quantity": {
    title: "Initial Stock Quantity",
    description: "The opening inventory balance physically counted and loaded into your central warehouse upon product creation.",
    example: "320",
    bestPractice: "Automatically creates an audited initial stock journal movement in the warehouse inventory ledger.",
  },
  "Set Quantity": {
    title: "Current Stock Balance",
    description: "Manually updates the recorded on-hand quantity for this item in warehouse inventory.",
    example: "150",
    bestPractice: "For formal audits, prefer using the Stock Adjustment or Physical Count workflow for complete reconciliation.",
  },
  "Units per Package / Case": {
    title: "Package / Case Pack Quantity",
    description: "The quantity of individual consumer units contained inside a single bulk shipping carton, case, or crate.",
    example: "12 (e.g. 12 bottles per shrink bundle), 24, 50",
    bestPractice: "Allows warehouse staff to pick, scan, and ship in whole case multiples without unboxing.",
  },
  "Unit of Measure": {
    title: "Unit of Measure (UoM)",
    description: "The primary physical unit used to quantify, count, and transact this item throughout purchasing, warehousing, and sales.",
    example: "pack, box, kg, bottle, piece, liter",
    bestPractice: "Standardizes inventory metrics and ensures purchasing and sales measure the exact same units.",
  },
  "Weight": {
    title: "Gross Weight (kg)",
    description: "The packaged weight of one product unit measured in kilograms (kg).",
    example: "0.520 kg",
    bestPractice: "Used by logistics dispatch engines to calculate shipment weight, container capacity, and carrier freight charges.",
  },
  "Length": {
    title: "Package Length (cm)",
    description: "The outer length dimension of one packaged unit in centimeters (cm).",
    example: "38.0 cm",
  },
  "Width": {
    title: "Package Width (cm)",
    description: "The outer width dimension of one packaged unit in centimeters (cm).",
    example: "26.0 cm",
  },
  "Height": {
    title: "Package Height (cm)",
    description: "The vertical height dimension of one packaged unit in centimeters (cm).",
    example: "22.0 cm",
    bestPractice: "Combined with length and width to compute volumetric dimensional weight for freight shipping.",
  },
  "Status": {
    title: "Product Lifecycle Status",
    description: "Determines whether this product is actively available for ordering, hidden as a work-in-progress, or retired.",
    example: "Published (Active), Draft (Work in progress), Archived (Discontinued)",
    bestPractice: "Keep new items in Draft until photos, compliance specs, and prices are fully approved.",
  },
  "Product Category": {
    title: "Product Category",
    description: "Primary business classification (e.g. Finished Goods, Raw Materials, Packaging, Maintenance Spares, Cleaning).",
    example: "Finished Goods",
    bestPractice: "Drives general ledger inventory accounting, category reports, and sales catalog navigation.",
  },
  "Tags": {
    title: "Search & Marketing Tags",
    description: "Flexible labels used for merchandising groups, seasonal filters, brand campaigns, and internal search indexing.",
    example: "#featured, #export-ready, #organic",
    bestPractice: "Click any tag badge to toggle it on or off for this item.",
  },
  "Parent Product": {
    title: "Parent Product (Matrix Variant)",
    description: "The master parent SKU that groups related color, size, or style variations together under a single product family.",
    example: "Parent Coffee SKU or Apparel Master",
    bestPractice: "Select a parent product when this item represents a specific variant size or color.",
  },
  "Variant Attributes": {
    title: "Variant Attributes",
    description: "The specific distinguishing attributes (e.g. Size, Color, Flavor, Material Grade) that define this variant variation.",
    example: "Roast Profile: Medium Roast | Bottle Volume: 500ml",
    bestPractice: "Define consistent attribute keys so customers can switch between variant options on your web store.",
  },
  "Product Image": {
    title: "Primary Product Photo",
    description: "High-resolution product photo displayed on catalogs, point-of-sale registers, and order packing slips.",
    bestPractice: "Upload a square image (PNG or JPG) with good lighting or pick from your SeaweedFS media library.",
  },
  "3D Model (.glb / .gltf)": {
    title: "Interactive 3D Asset",
    description: "A 3D model file (.glb or .gltf) enabling customers and staff to inspect the item in interactive 360-degree rotation and AR.",
    bestPractice: "Supports web-optimized .glb files up to 20MB with embedded textures.",
  },
  "Track inventory": {
    title: "Track Inventory Stock",
    description: "When enabled, stock quantities are strictly audited and deducted upon fulfillment, sales orders, and transfers.",
    bestPractice: "Leave enabled for physical goods; disable only for digital services or non-inventoried consumables.",
  },
  "Allow backorders": {
    title: "Allow Backorders",
    description: "Allows orders to proceed and confirm even if stock quantity is zero or insufficient, anticipating future replenishment.",
    bestPractice: "Useful for fast-moving items with steady supply chains where delivery delays are acceptable.",
  },
  "This product has variants": {
    title: "Variant Enabled",
    description: "Indicates this product exists in multiple options (such as sizes, colors, or flavors) linked to a parent product.",
    bestPractice: "Enabling this activates the Parent Product selector and custom Variant Attributes table.",
  },
};

export function FieldInfoPopover({
  label,
  required,
  info,
}: {
  label: string;
  required?: boolean;
  info?: FieldInfoData | string;
}) {
  const [open, setOpen] = React.useState(false);

  const resolvedInfo: FieldInfoData | null = React.useMemo(() => {
    if (typeof info === "string") {
      return { description: info };
    }
    if (info && typeof info === "object") {
      return info;
    }
    if (PRODUCT_FIELD_INFO_MAP[label]) {
      return PRODUCT_FIELD_INFO_MAP[label];
    }
    const cleanLabel = label.split("(")[0].trim();
    if (PRODUCT_FIELD_INFO_MAP[cleanLabel]) {
      return PRODUCT_FIELD_INFO_MAP[cleanLabel];
    }
    return null;
  }, [info, label]);

  if (!resolvedInfo) return null;

  const title = resolvedInfo.title || label;

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <button
          type="button"
          tabIndex={0}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((prev) => !prev);
          }}
          className={cn(
            "group/info -my-0.5 inline-flex size-4.5 items-center justify-center rounded-full text-muted-foreground/50 transition-all hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60 cursor-pointer active:scale-90",
            open && "bg-primary/15 text-primary ring-1 ring-primary/40 shadow-xs"
          )}
          aria-label={`Field explanation for ${label}`}
          title={`Click to read guide: ${label}`}
        >
          <Info className="size-3 transition-transform duration-200 group-hover/info:scale-115" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={6}
        className="z-[9999] w-84 max-w-[calc(100vw-2rem)] rounded-2xl border border-border/70 bg-popover/95 p-4 shadow-2xl backdrop-blur-xl outline-none text-left normal-case tracking-normal animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-150"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 shadow-xs">
              <Info className="size-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-foreground tracking-tight line-clamp-1">{title}</h4>
              <p className="text-[10px] text-muted-foreground/75 font-medium uppercase tracking-wider">Field Guide</p>
            </div>
          </div>
          {required ? (
            <Badge variant="destructive" className="h-5 px-2 text-[9px] font-bold uppercase tracking-wider bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/25 shrink-0">
              Required
            </Badge>
          ) : (
            <Badge variant="outline" className="h-5 px-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/80 bg-muted/40 border-border/60 shrink-0">
              Optional
            </Badge>
          )}
        </div>

        <div className="mt-3 space-y-2.5">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {resolvedInfo.description}
          </p>

          {resolvedInfo.example ? (
            <div className="rounded-xl border border-border/50 bg-muted/30 p-2.5 text-[11px] leading-snug">
              <div className="flex items-center gap-1.5 font-semibold text-foreground/90 mb-1">
                <span className="inline-block size-1.5 rounded-full bg-primary/70" />
                <span>Example / Format</span>
              </div>
              <p className="font-mono text-muted-foreground break-all text-[11px] pl-3 border-l-2 border-primary/30">
                {resolvedInfo.example}
              </p>
            </div>
          ) : null}

          {resolvedInfo.bestPractice ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 text-[11px] leading-snug text-muted-foreground">
              <Lightbulb className="size-4 shrink-0 text-amber-500 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground/90 block mb-0.5">Best Practice</span>
                <span>{resolvedInfo.bestPractice}</span>
              </div>
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Field({
  label,
  required,
  className,
  info,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  info?: FieldInfoData | string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center gap-1.5 select-none">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
          {required ? <span className="text-destructive text-red-500 font-bold ml-1" aria-hidden="true">*</span> : null}
        </Label>
        <FieldInfoPopover label={label} required={required} info={info} />
      </div>
      {children}
    </div>
  );
}
