"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/store/use-translation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { createBuilding, createUnit, fetchBuildings, fetchProperty, fetchUnits } from "@/modules/property/api";
import { UNIT_TYPES } from "@/modules/property/types";

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? fallback;
  }
  return fallback;
};

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const propertyId = Number(params.id);
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [buildingModalOpen, setBuildingModalOpen] = React.useState(false);
  const [buildingName, setBuildingName] = React.useState("");

  const [unitModalOpen, setUnitModalOpen] = React.useState(false);
  const [unitForm, setUnitForm] = React.useState({ building_id: "", unit_type: "office", rentable_area: "", rent_rate: "" });

  const propertyQuery = useQuery({
    queryKey: ["property", "properties", propertyId],
    queryFn: () => fetchProperty(propertyId),
    enabled: Number.isFinite(propertyId),
  });

  const buildingsQuery = useQuery({
    queryKey: ["property", "properties", propertyId, "buildings"],
    queryFn: () => fetchBuildings(propertyId, { per_page: 100 }),
    enabled: Number.isFinite(propertyId),
  });

  const unitsQuery = useQuery({
    queryKey: ["property", "properties", propertyId, "units"],
    queryFn: () => fetchUnits({ property_id: propertyId, per_page: 100 }),
    enabled: Number.isFinite(propertyId),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["property", "properties", propertyId] });
    queryClient.invalidateQueries({ queryKey: ["property", "properties", propertyId, "buildings"] });
    queryClient.invalidateQueries({ queryKey: ["property", "properties", propertyId, "units"] });
    queryClient.invalidateQueries({ queryKey: ["property", "properties"] });
  };

  const buildingMutation = useMutation({
    mutationFn: () => createBuilding(propertyId, { name: buildingName.trim() }),
    onSuccess: () => {
      toast.success(t("property.detail.building_created", "Building added."));
      setBuildingModalOpen(false);
      setBuildingName("");
      invalidateAll();
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  const unitMutation = useMutation({
    mutationFn: () =>
      createUnit(propertyId, {
        building_id: unitForm.building_id ? Number(unitForm.building_id) : undefined,
        unit_type: unitForm.unit_type,
        rentable_area: unitForm.rentable_area ? Number(unitForm.rentable_area) : undefined,
        rent_rate: unitForm.rent_rate ? Number(unitForm.rent_rate) : undefined,
        currency: "ETB",
      }),
    onSuccess: () => {
      toast.success(t("property.detail.unit_created", "Unit published as available."));
      setUnitModalOpen(false);
      setUnitForm({ building_id: "", unit_type: "office", rentable_area: "", rent_rate: "" });
      invalidateAll();
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  if (propertyQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const property = propertyQuery.data;
  if (!property) {
    return <p className="text-sm text-muted-foreground">{t("property.detail.not_found", "Property not found.")}</p>;
  }

  const buildings = buildingsQuery.data?.data ?? [];
  const units = unitsQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">{property.name}</h1>
        <p className="text-sm text-muted-foreground">
          {property.code} · {property.type.replace(/_/g, " ")} · {[property.city, property.country].filter(Boolean).join(", ") || "—"}
        </p>
      </div>

      <Card className="rounded-[2rem] border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("property.detail.buildings", "Buildings")}</CardTitle>
          <Button size="sm" className="rounded-full" onClick={() => setBuildingModalOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            {t("property.detail.add_building", "Add Building")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {buildings.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("property.detail.no_buildings", "No buildings yet.")}</p>
          ) : (
            buildings.map((building) => (
              <div key={building.id} className="flex items-center justify-between rounded-xl border border-border/50 px-4 py-3">
                <div>
                  <p className="font-semibold">{building.name}</p>
                  <p className="text-xs text-muted-foreground">{building.code}</p>
                </div>
                <Badge variant="outline">{building.units_count ?? 0} {t("property.detail.units_suffix", "units")}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("property.detail.units", "Units")}</CardTitle>
          <Button size="sm" className="rounded-full" onClick={() => setUnitModalOpen(true)} disabled={buildings.length === 0}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            {t("property.detail.add_unit", "Add Unit")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {buildings.length === 0 && <p className="text-xs text-muted-foreground">{t("property.detail.add_building_first", "Add a building before publishing units.")}</p>}
          {units.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("property.detail.no_units", "No units yet.")}</p>
          ) : (
            units.map((unit) => (
              <div key={unit.id} className="flex items-center justify-between rounded-xl border border-border/50 px-4 py-3">
                <div>
                  <p className="font-semibold">{unit.unit_code}</p>
                  <p className="text-xs text-muted-foreground">{unit.unit_type.replace(/_/g, " ")} · {unit.building?.name ?? "—"}</p>
                </div>
                <Badge>{unit.status.replace(/_/g, " ")}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={buildingModalOpen} onOpenChange={setBuildingModalOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle>{t("property.detail.add_building", "Add Building")}</DialogTitle>
              <DialogDescription>{t("property.detail.building_modal_desc", "A code is generated automatically.")}</DialogDescription>
            </DialogHeader>
          </div>
          <div className="grid gap-4 px-6 py-5">
            <div className="space-y-2">
              <Label htmlFor="building-name">{t("property.common.name", "Name")}</Label>
              <Input id="building-name" value={buildingName} onChange={(event) => setBuildingName(event.target.value)} placeholder="Tower A" />
            </div>
          </div>
          <DialogFooter className="border-t border-border/40 bg-muted/20 px-6 py-4 sm:justify-end">
            <Button variant="outline" className="rounded-full" onClick={() => setBuildingModalOpen(false)}>
              {t("property.common.cancel", "Cancel")}
            </Button>
            <Button
              className="rounded-full"
              disabled={!buildingName.trim() || buildingMutation.isPending}
              onClick={() => buildingMutation.mutate()}
            >
              {buildingMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("property.common.create", "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={unitModalOpen} onOpenChange={setUnitModalOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle>{t("property.detail.add_unit", "Add Unit")}</DialogTitle>
              <DialogDescription>{t("property.detail.unit_modal_desc", "Publishes immediately as available.")}</DialogDescription>
            </DialogHeader>
          </div>
          <div className="grid gap-4 px-6 py-5">
            <div className="space-y-2">
              <Label htmlFor="unit-building">{t("property.detail.building", "Building")}</Label>
              <select
                id="unit-building"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={unitForm.building_id}
                onChange={(event) => setUnitForm((prev) => ({ ...prev, building_id: event.target.value }))}
              >
                <option value="">{t("property.common.none", "None")}</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit-type">{t("property.common.type", "Type")}</Label>
              <select
                id="unit-type"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={unitForm.unit_type}
                onChange={(event) => setUnitForm((prev) => ({ ...prev, unit_type: event.target.value }))}
              >
                {UNIT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit-area">{t("property.detail.rentable_area", "Rentable Area (m²)")}</Label>
                <Input
                  id="unit-area"
                  type="number"
                  value={unitForm.rentable_area}
                  onChange={(event) => setUnitForm((prev) => ({ ...prev, rentable_area: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit-rent">{t("property.detail.rent_rate", "Rent (ETB)")}</Label>
                <Input
                  id="unit-rent"
                  type="number"
                  value={unitForm.rent_rate}
                  onChange={(event) => setUnitForm((prev) => ({ ...prev, rent_rate: event.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="border-t border-border/40 bg-muted/20 px-6 py-4 sm:justify-end">
            <Button variant="outline" className="rounded-full" onClick={() => setUnitModalOpen(false)}>
              {t("property.common.cancel", "Cancel")}
            </Button>
            <Button className="rounded-full" disabled={unitMutation.isPending} onClick={() => unitMutation.mutate()}>
              {unitMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("property.common.create", "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
