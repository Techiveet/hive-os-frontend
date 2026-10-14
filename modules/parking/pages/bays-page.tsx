"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Car,
  CheckCircle2,
  Filter,
  Grid3X3,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

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
import { parkingApi } from "@/modules/parking/api";
import {
  BayStatusBadge,
  PageHeader,
  StatCard,
  errorText,
} from "@/modules/parking/components/parking-ui";
import type { ParkingBay, ParkingZone } from "@/modules/parking/types";

export default function ParkingBaysPage() {
  const queryClient = useQueryClient();

  const [selectedZoneId, setSelectedZoneId] = React.useState<string>("all");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all");
  const [selectedType, setSelectedType] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Inspect & Edit Bay Modal
  const [inspectedBay, setInspectedBay] = React.useState<ParkingBay | null>(null);
  const [editStatus, setEditStatus] = React.useState<string>("available");
  const [editPlate, setEditPlate] = React.useState<string>("");

  // Add Bay Modal
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [newBayCode, setNewBayCode] = React.useState("");
  const [newBayType, setNewBayType] = React.useState("standard");
  const [newZoneId, setNewZoneId] = React.useState<number | undefined>(undefined);

  // Queries
  const { data: lotsData } = useQuery({
    queryKey: ["parking", "lots"],
    queryFn: () => parkingApi.listLots().then((res) => res.data.data),
  });
  const currentLot = lotsData?.[0];

  const { data: matrixData, isLoading, refetch } = useQuery({
    queryKey: ["parking", "matrix", currentLot?.id],
    queryFn: () => currentLot ? parkingApi.getMatrix(currentLot.id).then((res) => res.data.data) : Promise.resolve([]),
    enabled: Boolean(currentLot?.id),
  });
  const zones: ParkingZone[] = matrixData ?? [];

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: (data: { id: number; status: string; plate?: string }) =>
      parkingApi.updateBayStatus(data.id, data.status, data.plate).then((res) => res.data.data),
    onSuccess: (bay) => {
      toast.success(`Bay ${bay.bay_code} updated to ${bay.status}.`);
      setInspectedBay(null);
      queryClient.invalidateQueries({ queryKey: ["parking"] });
    },
    onError: (err) => toast.error(errorText(err, "Failed to update bay")),
  });

  const createBayMutation = useMutation({
    mutationFn: (payload: any) => parkingApi.createBay(payload).then((res) => res.data.data),
    onSuccess: (bay) => {
      toast.success(`Bay ${bay.bay_code} created successfully.`);
      setIsAddOpen(false);
      setNewBayCode("");
      queryClient.invalidateQueries({ queryKey: ["parking"] });
    },
    onError: (err) => toast.error(errorText(err, "Failed to create bay")),
  });

  // Flatten bays with zone details
  const allBays: ParkingBay[] = React.useMemo(() => {
    return zones.flatMap((z) => (z.bays || []).map((b) => ({ ...b, zone: z })));
  }, [zones]);

  const filteredBays = allBays.filter((b) => {
    if (selectedZoneId !== "all" && String(b.zone_id) !== selectedZoneId) return false;
    if (selectedStatus !== "all" && b.status !== selectedStatus) return false;
    if (selectedType !== "all" && b.bay_type !== selectedType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const codeMatch = (b.bay_code || b.bay_number || "").toLowerCase().includes(q);
      const plateMatch = (b.current_license_plate || "").toLowerCase().includes(q);
      if (!codeMatch && !plateMatch) return false;
    }
    return true;
  });

  const availableCount = allBays.filter((b) => b.status === "available").length;
  const occupiedCount = allBays.filter((b) => b.status === "occupied").length;
  const reservedCount = allBays.filter((b) => b.status === "reserved").length;
  const maintenanceCount = allBays.filter((b) => b.status === "maintenance").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Bay Matrix & Space Management"
        subtitle="Visual slot layout, multi-floor occupancy telemetry, bay status overrides, and sensor status."
        badge={`${allBays.length} Total Bays`}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground">
                <Plus className="h-4 w-4" />
                Add Parking Bay
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Parking Bay</DialogTitle>
                <DialogDescription>
                  Provision a new parking slot inside a designated zone or floor.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>Zone / Floor *</Label>
                  <select
                    value={newZoneId ?? ""}
                    onChange={(e) => setNewZoneId(Number(e.target.value))}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="">Select Zone...</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} (Floor {z.floor_number ?? 0})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Bay Code *</Label>
                  <Input
                    value={newBayCode}
                    onChange={(e) => setNewBayCode(e.target.value.toUpperCase())}
                    placeholder="e.g. G-15, B1-09, or EV-02"
                    className="font-mono font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Bay Type</Label>
                  <select
                    value={newBayType}
                    onChange={(e) => setNewBayType(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="standard">Standard Slot</option>
                    <option value="vip">VIP Executive Slot</option>
                    <option value="ev">Electric Vehicle (EV Charger)</option>
                    <option value="handicap">Accessible / Handicap</option>
                    <option value="motorcycle">Motorcycle Bay</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    createBayMutation.mutate({
                      lot_id: currentLot?.id,
                      zone_id: newZoneId || zones[0]?.id,
                      bay_code: newBayCode,
                      bay_type: newBayType,
                      status: "available",
                    })
                  }
                  disabled={createBayMutation.isPending || !newBayCode.trim()}
                >
                  {createBayMutation.isPending ? "Creating..." : "Save Bay"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {/* Metrics Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Available Free Bays"
          value={availableCount}
          subtitle="Ready for incoming vehicles"
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Occupied Bays"
          value={occupiedCount}
          subtitle="Vehicles currently parked"
          icon={Car}
          variant="warning"
        />
        <StatCard
          title="Reserved Slots"
          value={reservedCount}
          subtitle="Pre-booked or monthly subscribers"
          icon={Layers}
          variant="info"
        />
        <StatCard
          title="Under Maintenance"
          value={maintenanceCount}
          subtitle="Out of service or blocked"
          icon={Wrench}
          variant={maintenanceCount > 0 ? "danger" : "default"}
        />
      </div>

      {/* Filter Toolbar */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by bay code (e.g. G-01) or license plate..."
                className="pl-9 h-9 text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
              >
                <option value="all">All Zones / Floors</option>
                {zones.map((z) => (
                  <option key={z.id} value={String(z.id)}>
                    {z.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
              >
                <option value="all">All Statuses</option>
                <option value="available">Available Only</option>
                <option value="occupied">Occupied Only</option>
                <option value="reserved">Reserved Only</option>
                <option value="maintenance">Maintenance Only</option>
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
              >
                <option value="all">All Bay Types</option>
                <option value="standard">Standard</option>
                <option value="vip">VIP</option>
                <option value="ev">EV Charger</option>
                <option value="handicap">Handicap</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive 2D Bay Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        {filteredBays.map((bay) => {
          const isOcc = bay.status === "occupied";
          const isAvail = bay.status === "available";
          const isRes = bay.status === "reserved";
          const isMaint = bay.status === "maintenance";

          const borderBg = isOcc
            ? "border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200"
            : isAvail
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 hover:border-emerald-500/80"
            : isRes
            ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-900 dark:text-indigo-200"
            : "border-rose-500/50 bg-rose-500/10 text-rose-900 dark:text-rose-200";

          return (
            <div
              key={bay.id}
              onClick={() => {
                setInspectedBay(bay);
                setEditStatus(bay.status);
                setEditPlate(bay.current_license_plate || "");
              }}
              className={`p-3 rounded-xl border flex flex-col justify-between transition-all cursor-pointer hover:shadow-md ${borderBg}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sm">{bay.bay_code}</span>
                {bay.bay_type === "ev" ? (
                  <Zap className="h-3.5 w-3.5 text-emerald-500" />
                ) : bay.bay_type === "vip" ? (
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                ) : (
                  <Car className="h-3.5 w-3.5 opacity-60" />
                )}
              </div>

              <div className="my-2 text-center">
                {bay.current_license_plate ? (
                  <div className="font-mono font-extrabold text-xs tracking-tight bg-background/80 px-1.5 py-0.5 rounded border border-border/40 truncate">
                    {bay.current_license_plate}
                  </div>
                ) : (
                  <span className="text-[11px] capitalize opacity-80">{bay.status}</span>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                <span className="truncate">{bay.zone?.name || "Zone"}</span>
                <span className="uppercase text-[9px] font-semibold">{bay.bay_type}</span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredBays.length === 0 && (
        <Card className="border-dashed p-12 text-center text-muted-foreground">
          <Car className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm font-semibold">No bays found matching the active filters.</p>
          <p className="text-xs">Adjust zone, status, or search query above.</p>
        </Card>
      )}

      {/* Bay Inspection & Status Override Dialog */}
      <Dialog open={Boolean(inspectedBay)} onOpenChange={(open) => !open && setInspectedBay(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Manage Bay: {inspectedBay?.bay_code}
            </DialogTitle>
            <DialogDescription>
              {inspectedBay?.zone?.name} &bull; Type: {inspectedBay?.bay_type?.toUpperCase()}
            </DialogDescription>
          </DialogHeader>

          {inspectedBay && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Operational Status</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "available", label: "Available / Free" },
                    { id: "occupied", label: "Occupied" },
                    { id: "reserved", label: "Reserved" },
                    { id: "maintenance", label: "Under Maintenance" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setEditStatus(s.id)}
                      className={`p-2.5 rounded-lg border text-xs font-semibold text-center transition-all ${
                        editStatus === s.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 hover:bg-muted"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-plate">Assigned License Plate</Label>
                <Input
                  id="edit-plate"
                  value={editPlate}
                  onChange={(e) => setEditPlate(e.target.value.toUpperCase())}
                  placeholder="Leave empty if bay is vacant"
                  className="font-mono font-bold"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                if (inspectedBay) {
                  updateStatusMutation.mutate({
                    id: inspectedBay.id,
                    status: "available",
                    plate: "",
                  });
                }
              }}
              className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
            >
              Force Vacate
            </Button>
            <Button
              onClick={() => {
                if (inspectedBay) {
                  updateStatusMutation.mutate({
                    id: inspectedBay.id,
                    status: editStatus,
                    plate: editPlate,
                  });
                }
              }}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? "Updating..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
