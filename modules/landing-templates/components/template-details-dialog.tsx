"use client";

/**
 * Listing details for a master template: what tenants see in the marketplace
 * and at signup, and what they pay for it.
 *
 * Price is a one-time charge per tenant. 0 keeps the template free (or, if it
 * is marked premium, unlocked by the premium plan add-on as before).
 */

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { updateTemplateDetails, type TemplateLibraryCard } from "../lib/api";

type Props = {
  template: TemplateLibraryCard | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function TemplateDetailsDialog({ template, onOpenChange, onSaved }: Props) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [price, setPrice] = React.useState("0");
  const [premium, setPremium] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!template) return;
    setName(template.name);
    setDescription(template.description ?? "");
    setPrice(String(template.price_etb ?? 0));
    setPremium(Boolean(template.is_premium));
  }, [template]);

  const priceValue = Number(price);
  const priceValid = price.trim() !== "" && Number.isFinite(priceValue) && priceValue >= 0;
  const canSave = !!template && name.trim().length > 0 && priceValid && !saving;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!template || !canSave) return;

    setSaving(true);
    try {
      await updateTemplateDetails(template.id, {
        name: name.trim(),
        description: description.trim() || null,
        price_etb: Math.round(priceValue * 100) / 100,
        is_premium: premium,
      });
      toast.success("Template details saved.");
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the template details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!template} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={save} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Details &amp; pricing</DialogTitle>
            <DialogDescription>
              How this template is listed to tenants in their dashboard and at signup.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="tpl-detail-name">Name</Label>
            <Input id="tpl-detail-name" value={name} maxLength={190} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tpl-detail-description">Description</Label>
            <Textarea
              id="tpl-detail-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What kind of business is this design for?"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tpl-detail-price">One-time price (ETB)</Label>
            <Input
              id="tpl-detail-price"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              aria-invalid={!priceValid}
              aria-describedby="tpl-detail-price-help"
            />
            <p id="tpl-detail-price-help" className="text-xs leading-5 text-muted-foreground">
              Each tenant pays this once — at signup or from their dashboard — to use the template. Enter 0 to offer it
              free. Tenants who already bought it keep it if you change the price later.
            </p>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-2xl border border-border p-4">
            <div>
              <Label htmlFor="tpl-detail-premium" className="font-semibold">
                Premium (plan add-on)
              </Label>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {priceValue > 0
                  ? "Ignored while the template has a price — tenants buy it directly instead."
                  : "When free, only tenants whose plan includes the premium landing templates add-on can use it."}
              </p>
            </div>
            <Switch id="tpl-detail-premium" checked={premium} onCheckedChange={setPremium} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
