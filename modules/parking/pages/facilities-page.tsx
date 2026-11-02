"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Car,
  Layers,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { parkingApi } from "@/modules/parking/api";
import {
  PageHeader,
  StatCard,
  errorText,
  formatCurrency,
} from "@/modules/parking/components/parking-ui";
import type { ParkingLot } from "@/modules/parking/types";

const EMPTY_LOT_FORM = {
  code: "",
  name: "",
  type: "multi_storey",
  address: "",
  city: "Addis Ababa",
  total_capacity: 50,
  hourly_rate_standard: 30,
  operating_hours: "06:00 - 22:00",
  contact_phone: "",
  has_ev_charging: false,
  has_valet: false,
  status: "active",
};

const EMPTY_ZONE_FORM = {
  code: "",
  name: "",
  floor_level: "0",
  zone_type: "general",
  capacity: 20,
  is_covered: true,
};

function lotToForm(lot: ParkingLot) {
  return {
    code: lot.code || "",
    name: lot.name || "",
    type: lot.type || "multi_storey",
    address: lot.address || "",
    city: lot.city || "Addis Ababa",
    total_capacity: Number(lot.total_capacity || 50),
    hourly_rate_standard: Number(lot.hourly_rate_standard || 0),
    operating_hours: lot.operating_hours || "06:00 - 22:00",
    contact_phone: lot.contact_phone || "",
    has_ev_charging: Boolean(lot.has_ev_charging),
    has_valet: Boolean(lot.has_valet),
    status: lot.status || "active",
  };
}

export default function ParkingFacilitiesPage() {
  const queryClient = useQueryClient();

  const [isLotDialogOpen, setIsLotDialogOpen] = React.useState(false);
  const [editingLot, setEditingLot] = React.useState<ParkingLot | null>(null);
  const [lotForm, setLotForm] = React.useState({ ...EMPTY_LOT_FORM });
  const [lotToDelete, setLotToDelete] = React.useState<ParkingLot | null>(null);

  const [zoneLot, setZoneLot] = React.useState<ParkingLot | null>(null);
  const [zoneForm, setZoneForm] = React.useState({ ...EMPTY_ZONE_FORM });

  const { data: lotsData, isLoading, refetch } = useQuery({
    queryKey: ["parking", "lots"],
    queryFn: () => parkingApi.listLots().then((res) => res.data.data),
  });
  const lots = lotsData ?? [];

  const openCreateLot = () => {
    setEditingLot(null);
    setLotForm({ ...EMPTY_LOT_FORM });
    setIsLotDialogOpen(true);
  };

  const openEditLot = (lot: ParkingLot) => {
    setEditingLot(lot);
    setLotForm(lotToForm(lot));
    setIsLotDialogOpen(true);
  };

  const createLotMutation = useMutation({
    mutationFn: (payload: typeof EMPTY_LOT_FORM) =>
      parkingApi.createLot(payload).then((res) => res.data.data),
    onSuccess: (lot) => {
      toast.success(`Parking lot “${lot.name}” created.`);
      setIsLotDialogOpen(false);
      setEditingLot(null);
      setLotForm({ ...EMPTY_LOT_FORM });
      queryClient.invalidateQueries({ queryKey: ["parking"] });
    },
    onError: (err) => toast.error(errorText(err, "Failed to create parking lot")),
  });

  const updateLotMutation = useMutation({
    mutationFn: (data: { id: number; payload: Omit<typeof EMPTY_LOT_FORM, "code"> & { code?: string } }) =>
      parkingApi
        .updateLot(data.id, {
          name: data.payload.name,
          type: data.payload.type,
          address: data.payload.address,
          city: data.payload.city,
          total_capacity: data.payload.total_capacity,
          hourly_rate_standard: data.payload.hourly_rate_standard,
          operating_hours: data.payload.operating_hours,
          contact_phone: data.payload.contact_phone,
          has_ev_charging: data.payload.has_ev_charging,
          has_valet: data.payload.has_valet,
          status: data.payload.status,
        })
        .then((res) => res.data.data),
    onSuccess: (lot) => {
      toast.success(`Parking lot “${lot.name}” updated.`);
      setIsLotDialogOpen(false);
      setEditingLot(null);
      queryClient.invalidateQueries({ queryKey: ["parking"] });
    },
    onError: (err) => toast.error(errorText(err, "Failed to update parking lot")),
  });

  const deleteLotMutation = useMutation({
    mutationFn: (id: number) => parkingApi.deleteLot(id),
    onSuccess: () => {
      toast.success(`Parking lot “${lotToDelete?.name}” deleted.`);
      setLotToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["parking"] });
    },
    onError: (err) => toast.error(errorText(err, "Failed to delete parking lot")),
  });

  const createZoneMutation = useMutation({
    mutationFn: (data: { lotId: number; payload: typeof EMPTY_ZONE_FORM }) =>
      parkingApi.createZone(data.lotId, data.payload).then((res) => res.data.data),
    onSuccess: (zone) => {
      toast.success(`Zone “${zone.name}” added.`);
      setZoneLot(null);
      setZoneForm({ ...EMPTY_ZONE_FORM });
      queryClient.invalidateQueries({ queryKey: ["parking"] });
    },
    onError: (err) => toast.error(errorText(err, "Failed to create zone")),
  });

  const savingLot = createLotMutation.isPending || updateLotMutation.isPending;
  const totalCapacity = lots.reduce((sum, lot) => sum + Number(lot.total_capacity || 0), 0);
  const totalBays = lots.reduce((sum, lot) => sum + Number(lot.bays_count || 0), 0);
  const activeLots = lots.filter((lot) => (lot.status || "active") === "active").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parking Facilities"
        subtitle="Create, edit, and remove parking lots, then add floors/zones used by bays and the rest of the parking module."
        badge={`${lots.length} Lots`}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>

          <Dialog
            open={isLotDialogOpen}
            onOpenChange={(open) => {
              setIsLotDialogOpen(open);
              if (!open) setEditingLot(null);
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground" onClick={openCreateLot}>
                <Plus className="h-4 w-4" />
                Add Parking Lot
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingLot ? "Edit Parking Lot" : "New Parking Lot"}</DialogTitle>
                <DialogDescription>
                  {editingLot
                    ? "Update facility details. Code stays fixed after creation."
                    : "Add another facility. You can create zones and bays for it afterwards."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Facility Name *</Label>
                  <Input
                    value={lotForm.name}
                    onChange={(e) =>
                      setLotForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                        code: editingLot
                          ? prev.code
                          : prev.code ||
                            e.target.value
                              .trim()
                              .toUpperCase()
                              .replace(/[^A-Z0-9]+/g, "-")
                              .slice(0, 20),
                      }))
                    }
                    placeholder="e.g. Bole Branch Basement"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Code *</Label>
                  <Input
                    value={lotForm.code}
                    onChange={(e) => setLotForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. BOLE-B1"
                    className="font-mono"
                    disabled={Boolean(editingLot)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <select
                    value={lotForm.type}
                    onChange={(e) => setLotForm((prev) => ({ ...prev, type: e.target.value }))}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="multi_storey">Multi-storey</option>
                    <option value="surface">Surface lot</option>
                    <option value="underground">Underground</option>
                    <option value="street">Street / curb</option>
                    <option value="valet">Valet facility</option>
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Status</Label>
                  <select
                    value={lotForm.status}
                    onChange={(e) => setLotForm((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="active">Active</option>
                    <option value="full">Full</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Address</Label>
                  <Input
                    value={lotForm.address}
                    onChange={(e) => setLotForm((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Street / landmark"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input
                    value={lotForm.city}
                    onChange={(e) => setLotForm((prev) => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Total Capacity</Label>
                  <Input
                    type="number"
                    min={1}
                    value={lotForm.total_capacity}
                    onChange={(e) =>
                      setLotForm((prev) => ({ ...prev, total_capacity: Number(e.target.value) || 1 }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Standard Hourly Rate (ETB)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={lotForm.hourly_rate_standard}
                    onChange={(e) =>
                      setLotForm((prev) => ({
                        ...prev,
                        hourly_rate_standard: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Operating Hours</Label>
                  <Input
                    value={lotForm.operating_hours}
                    onChange={(e) => setLotForm((prev) => ({ ...prev, operating_hours: e.target.value }))}
                    placeholder="06:00 - 22:00"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Contact Phone</Label>
                  <Input
                    value={lotForm.contact_phone}
                    onChange={(e) => setLotForm((prev) => ({ ...prev, contact_phone: e.target.value }))}
                    placeholder="+251 ..."
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">EV charging</p>
                    <p className="text-xs text-muted-foreground">Facility has EV bays</p>
                  </div>
                  <Switch
                    checked={lotForm.has_ev_charging}
                    onCheckedChange={(checked) =>
                      setLotForm((prev) => ({ ...prev, has_ev_charging: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">Valet service</p>
                    <p className="text-xs text-muted-foreground">Staffed valet available</p>
                  </div>
                  <Switch
                    checked={lotForm.has_valet}
                    onCheckedChange={(checked) =>
                      setLotForm((prev) => ({ ...prev, has_valet: checked }))
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsLotDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!lotForm.name.trim() || !lotForm.code.trim()) {
                      toast.error("Name and code are required.");
                      return;
                    }
                    if (editingLot) {
                      updateLotMutation.mutate({ id: editingLot.id, payload: lotForm });
                      return;
                    }
                    createLotMutation.mutate(lotForm);
                  }}
                  disabled={savingLot}
                >
                  {savingLot
                    ? editingLot
                      ? "Saving..."
                      : "Creating..."
                    : editingLot
                      ? "Save Changes"
                      : "Create Lot"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Lots" value={activeLots} subtitle="Facilities in operation" icon={Building2} variant="info" />
        <StatCard title="Total Capacity" value={totalCapacity} subtitle="Planned bay capacity" icon={Car} />
        <StatCard title="Provisioned Bays" value={totalBays} subtitle="Physical bays created" icon={Layers} variant="success" />
        <StatCard title="Zones" value={lots.reduce((sum, lot) => sum + Number(lot.zones_count || 0), 0)} subtitle="Floors / sections" icon={MapPin} />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : lots.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-semibold">No parking lots yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first facility, then add zones and bays.
            </p>
            <Button className="mt-4" onClick={openCreateLot}>
              <Plus className="mr-2 h-4 w-4" />
              Add Parking Lot
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {lots.map((lot) => (
            <Card key={lot.id} className="border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold">{lot.name}</CardTitle>
                    <CardDescription className="font-mono text-xs mt-1">{lot.code}</CardDescription>
                  </div>
                  <Badge variant={(lot.status || "active") === "active" ? "default" : "outline"}>
                    {(lot.status || "active").replaceAll("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="font-medium capitalize">{(lot.type || "facility").replaceAll("_", " ")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Capacity</p>
                    <p className="font-medium">{lot.total_capacity} bays</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Zones / Bays</p>
                    <p className="font-medium">
                      {lot.zones_count ?? 0} zones · {lot.bays_count ?? 0} bays
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Standard rate</p>
                    <p className="font-medium">{formatCurrency(lot.hourly_rate_standard ?? 0)}/hr</p>
                  </div>
                </div>

                {(lot.address || lot.city) && (
                  <p className="flex items-start gap-2 text-xs text-muted-foreground">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {[lot.address, lot.city].filter(Boolean).join(", ")}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {lot.has_ev_charging ? (
                    <Badge variant="outline" className="gap-1 text-emerald-700 border-emerald-500/30">
                      <Zap className="h-3 w-3" /> EV charging
                    </Badge>
                  ) : null}
                  {lot.has_valet ? (
                    <Badge variant="outline" className="gap-1">
                      Valet
                    </Badge>
                  ) : null}
                  {lot.operating_hours ? (
                    <Badge variant="outline">{lot.operating_hours}</Badge>
                  ) : null}
                </div>

                <div className="flex flex-wrap justify-end gap-2 border-t border-border/40 pt-3">
                  <Button variant="outline" size="sm" onClick={() => openEditLot(lot)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setZoneLot(lot);
                      setZoneForm({
                        ...EMPTY_ZONE_FORM,
                        code: `${lot.code}-Z${Number(lot.zones_count || 0) + 1}`,
                        name: `Zone ${Number(lot.zones_count || 0) + 1}`,
                      });
                    }}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Zone
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setLotToDelete(lot)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(zoneLot)} onOpenChange={(open) => !open && setZoneLot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Zone to {zoneLot?.name}</DialogTitle>
            <DialogDescription>
              Zones represent floors or sections. Create bays inside a zone from Live Bay Matrix.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Zone Name *</Label>
              <Input
                value={zoneForm.name}
                onChange={(e) => setZoneForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Ground Floor"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input
                value={zoneForm.code}
                onChange={(e) => setZoneForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Floor Level</Label>
              <Input
                value={zoneForm.floor_level}
                onChange={(e) => setZoneForm((prev) => ({ ...prev, floor_level: e.target.value }))}
                placeholder="0, 1, B1..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Capacity</Label>
              <Input
                type="number"
                min={1}
                value={zoneForm.capacity}
                onChange={(e) =>
                  setZoneForm((prev) => ({ ...prev, capacity: Number(e.target.value) || 1 }))
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Zone Type</Label>
              <select
                value={zoneForm.zone_type}
                onChange={(e) => setZoneForm((prev) => ({ ...prev, zone_type: e.target.value }))}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="general">General</option>
                <option value="vip">VIP</option>
                <option value="ev">EV charging</option>
                <option value="staff">Staff</option>
                <option value="motorcycle">Motorcycle</option>
              </select>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2 sm:col-span-2">
              <div>
                <p className="text-sm font-medium">Covered zone</p>
                <p className="text-xs text-muted-foreground">Indoor / sheltered parking</p>
              </div>
              <Switch
                checked={zoneForm.is_covered}
                onCheckedChange={(checked) => setZoneForm((prev) => ({ ...prev, is_covered: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setZoneLot(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!zoneLot?.id) return;
                if (!zoneForm.name.trim() || !zoneForm.code.trim()) {
                  toast.error("Zone name and code are required.");
                  return;
                }
                createZoneMutation.mutate({ lotId: zoneLot.id, payload: zoneForm });
              }}
              disabled={createZoneMutation.isPending}
            >
              {createZoneMutation.isPending ? "Saving..." : "Create Zone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(lotToDelete)} onOpenChange={(open) => !open && setLotToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete parking lot?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{lotToDelete?.name}</strong>
              {Number(lotToDelete?.bays_count || 0) > 0 || Number(lotToDelete?.zones_count || 0) > 0
                ? " and may also remove or detach its zones/bays depending on backend constraints"
                : ""}
              . This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => lotToDelete && deleteLotMutation.mutate(lotToDelete.id)}
              disabled={deleteLotMutation.isPending}
            >
              {deleteLotMutation.isPending ? "Deleting..." : "Delete Lot"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
