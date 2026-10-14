"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Car,
  CheckCircle2,
  Clock,
  CreditCard,
  DoorOpen,
  Grid3X3,
  QrCode,
  Radio,
  Receipt,
  RefreshCw,
  ShieldAlert,
  Sparkles,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parkingApi } from "@/modules/parking/api";
import {
  BayStatusBadge,
  PageHeader,
  SessionStatusBadge,
  StatCard,
  errorText,
  formatCurrency,
  formatDateTime,
  formatDuration,
  rowsOf,
} from "@/modules/parking/components/parking-ui";

export default function ParkingDashboardPage() {
  const queryClient = useQueryClient();
  const [selectedLotId, setSelectedLotId] = React.useState<number | undefined>(undefined);
  const [simPlate, setSimPlate] = React.useState("AA-3-98765");
  const [simDirection, setSimDirection] = React.useState<"entry" | "exit">("entry");
  const [isSimOpen, setIsSimOpen] = React.useState(false);

  const { data: lotsData } = useQuery({
    queryKey: ["parking", "lots"],
    queryFn: () => parkingApi.listLots().then((res) => res.data.data),
  });

  const lots = lotsData ?? [];
  const currentLotId = selectedLotId ?? (lots.length > 0 ? lots[0].id : undefined);

  const { data: overviewData, isLoading, refetch } = useQuery({
    queryKey: ["parking", "overview", currentLotId],
    queryFn: () => parkingApi.overview(currentLotId ? { lot_id: currentLotId } : {}).then((res) => res.data.data),
    refetchInterval: 15000,
  });

  const { data: matrixData } = useQuery({
    queryKey: ["parking", "matrix", currentLotId],
    queryFn: () => currentLotId ? parkingApi.getMatrix(currentLotId).then((res) => res.data.data) : Promise.resolve([]),
    enabled: Boolean(currentLotId),
  });

  const anprMutation = useMutation({
    mutationFn: (data: { license_plate: string; direction: "entry" | "exit"; lot_id?: number }) =>
      parkingApi.simulateScan(data).then((res) => res.data),
    onSuccess: (res: any) => {
      toast.success(res.message || "ANPR scan processed successfully.");
      setIsSimOpen(false);
      queryClient.invalidateQueries({ queryKey: ["parking"] });
    },
    onError: (err) => {
      toast.error(errorText(err, "Failed to process ANPR simulation"));
    },
  });

  const kpis = overviewData?.kpis;
  const recentSessions = overviewData?.recent_sessions ?? [];
  const devices = overviewData?.devices ?? [];
  const zones = matrixData ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Smart Parking Operations"
        subtitle="Real-time parking occupancy, gate barrier automation, ANPR camera feeds, and automated ticket ticketing."
        badge="Live Matrix"
      >
        <div className="flex items-center gap-2">
          <select
            value={currentLotId ?? ""}
            onChange={(e) => setSelectedLotId(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {lots.map((lot) => (
              <option key={lot.id} value={lot.id}>
                {lot.name} ({lot.total_capacity} bays)
              </option>
            ))}
          </select>

          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>

          <Dialog open={isSimOpen} onOpenChange={setIsSimOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                <Sparkles className="h-4 w-4" />
                Simulate ANPR Scan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>IoT ANPR Plate Scanner Simulator</DialogTitle>
                <DialogDescription>
                  Simulate an automated license plate optical recognition event at the barrier gate.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="sim-plate">License Plate Number</Label>
                  <Input
                    id="sim-plate"
                    value={simPlate}
                    onChange={(e) => setSimPlate(e.target.value.toUpperCase())}
                    placeholder="e.g. AA-3-98765 or ET-A-12345"
                  />
                  <p className="text-xs text-muted-foreground">
                    Try plates with subscriber passes (e.g. AA-2-45892) or advance reservations.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Gate Direction</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="direction"
                        checked={simDirection === "entry"}
                        onChange={() => setSimDirection("entry")}
                      />
                      <span>Entry Gate (Check-In &amp; Open Barrier)</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="direction"
                        checked={simDirection === "exit"}
                        onChange={() => setSimDirection("exit")}
                      />
                      <span>Exit Gate (Check-Out &amp; Verify Payment)</span>
                    </label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsSimOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    anprMutation.mutate({
                      license_plate: simPlate,
                      direction: simDirection,
                      lot_id: currentLotId,
                    })
                  }
                  disabled={anprMutation.isPending || !simPlate}
                  className="gap-2"
                >
                  {anprMutation.isPending ? "Processing Optical Scan..." : "Trigger Barrier Gate"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Link href="/dashboard/parking/terminal">
            <Button size="sm" variant="default" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
              <CreditCard className="h-4 w-4" />
              POS Terminal
            </Button>
          </Link>
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Live Occupancy"
          value={`${kpis?.occupancy_rate ?? 0}%`}
          subtitle={`${kpis?.occupied_bays ?? 0} of ${kpis?.total_bays ?? 0} bays filled`}
          icon={Car}
          variant={(kpis?.occupancy_rate ?? 0) > 85 ? "danger" : "default"}
          trend={`${kpis?.available_bays ?? 0} bays free`}
        />
        <StatCard
          title="Revenue Today"
          value={formatCurrency(kpis?.revenue_today ?? 0)}
          subtitle="Collected gate fees &amp; POS payments"
          icon={Receipt}
          variant="success"
          trend="Central &amp; Telebirr"
        />
        <StatCard
          title="Active Tickets"
          value={kpis?.active_sessions ?? 0}
          subtitle="Vehicles currently parked"
          icon={Clock}
          variant="info"
          trend="Live Sessions"
        />
        <StatCard
          title="Overstays &amp; Violations"
          value={kpis?.overstay_count ?? 0}
          subtitle="Exceeded duration or unpaid fines"
          icon={AlertTriangle}
          variant={(kpis?.overstay_count ?? 0) > 0 ? "warning" : "default"}
          trend="Action Required"
        />
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Grid3X3 className="h-5 w-5 text-primary" />
                Live 2D Bay Availability Matrix
              </CardTitle>
              <CardDescription>
                Visual floor map showing bay statuses, occupied vehicles, EV chargers, and VIP slots.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-emerald-500/20 border border-emerald-500/40" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-amber-500/20 border border-amber-500/40" />
                <span>Occupied</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-indigo-500/20 border border-indigo-500/40" />
                <span>Reserved</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-rose-500/20 border border-rose-500/40" />
                <span>Maintenance</span>
              </div>
              <Link href="/dashboard/parking/bays" className="font-semibold text-primary hover:underline ml-2">
                Full View &rarr;
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {zones.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No zones or bays configured for this facility.
            </div>
          ) : (
            <div className="space-y-6">
              {zones.map((zone) => (
                <div key={zone.id} className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      {zone.name} (Floor {zone.floor_number ?? 0})
                    </span>
                    <span>
                      {zone.bays?.filter((b) => b.status === "available").length ?? 0} / {zone.bays?.length ?? 0} Free
                    </span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
                    {zone.bays?.slice(0, 24).map((bay) => {
                      const isOccupied = bay.status === "occupied";
                      const isAvail = bay.status === "available";
                      const isRes = bay.status === "reserved";

                      const bg = isOccupied
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300"
                        : isAvail
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                        : isRes
                        ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-700 dark:text-indigo-300"
                        : "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300";

                      return (
                        <div
                          key={bay.id}
                          className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${bg}`}
                          title={`Bay: ${bay.bay_code} | Status: ${bay.status} ${bay.current_license_plate ? '| Plate: ' + bay.current_license_plate : ''}`}
                        >
                          <div className="text-xs font-mono font-bold truncate">{bay.bay_code}</div>
                          {bay.current_license_plate ? (
                            <div className="text-[10px] font-semibold tracking-tight truncate mt-0.5">
                              {bay.current_license_plate}
                            </div>
                          ) : (
                            <div className="text-[10px] opacity-75 capitalize mt-0.5">{bay.status}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/60 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary" />
              IoT Barrier Gates &amp; Hardware
            </CardTitle>
            <CardDescription>Live telemetry and barrier state</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {devices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No gate devices registered.</p>
            ) : (
              devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50 text-sm"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      {device.name}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {device.device_type.replace("_", " ")} &bull; {device.ip_address || "192.168.1.10"}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    {device.status.toUpperCase()}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  Active Parked Vehicles
                </CardTitle>
                <CardDescription>Recent check-in tickets and real-time fees</CardDescription>
              </div>
              <Link href="/dashboard/parking/sessions">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  View All Sessions <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentSessions.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No vehicles currently checked in.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket #</TableHead>
                    <TableHead>License Plate</TableHead>
                    <TableHead>Bay</TableHead>
                    <TableHead>Entry Time</TableHead>
                    <TableHead>Elapsed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSessions.slice(0, 5).map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-mono font-medium text-xs">{session.ticket_number}</TableCell>
                      <TableCell className="font-semibold">
                        <span className="px-2 py-0.5 rounded bg-muted font-mono text-xs border border-border/80">
                          {session.license_plate}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">{session.bay?.bay_code || "Auto-Allocated"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(session.entry_time)}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {formatDuration(session.duration_minutes)}
                      </TableCell>
                      <TableCell>
                        <SessionStatusBadge status={session.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/dashboard/parking/terminal?ticket=${encodeURIComponent(session.ticket_number)}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs">
                            Checkout
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
