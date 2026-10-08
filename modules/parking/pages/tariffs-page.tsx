"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Calculator,
  Calendar,
  Clock,
  DollarSign,
  Plus,
  RefreshCw,
  Sliders,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
  PageHeader,
  errorText,
  formatCurrency,
  formatDuration,
} from "@/modules/parking/components/parking-ui";
import type { ParkingFeeResult, ParkingTariff } from "@/modules/parking/types";

export default function ParkingTariffsPage() {
  const queryClient = useQueryClient();

  // Create Modal State
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [tariffType, setTariffType] = React.useState("hourly");
  const [baseRate, setBaseRate] = React.useState(30);
  const [gracePeriod, setGracePeriod] = React.useState(15);
  const [dailyCap, setDailyCap] = React.useState(250);
  const [overnightFee, setOvernightFee] = React.useState(150);
  const [lostTicketFee, setLostTicketFee] = React.useState(500);

  // Live Fee Estimator Simulator State
  const [simHours, setSimHours] = React.useState(3);
  const [simTariffId, setSimTariffId] = React.useState<number | undefined>(undefined);
  const [simVehicleType, setSimVehicleType] = React.useState("sedan");
  const [previewResult, setPreviewResult] = React.useState<ParkingFeeResult | null>(null);

  // Queries
  const { data: tariffsData, isLoading, refetch } = useQuery({
    queryKey: ["parking", "tariffs"],
    queryFn: () => parkingApi.listTariffs().then((res) => res.data.data),
  });
  const tariffs: ParkingTariff[] = tariffsData ?? [];

  // Mutations
  const createTariffMutation = useMutation({
    mutationFn: (data: any) => parkingApi.createTariff(data).then((res) => res.data.data),
    onSuccess: (t) => {
      toast.success(`Tariff '${t.name}' created successfully.`);
      setIsAddOpen(false);
      setName("");
      queryClient.invalidateQueries({ queryKey: ["parking", "tariffs"] });
    },
    onError: (err) => toast.error(errorText(err, "Failed to create tariff")),
  });

  const previewMutation = useMutation({
    mutationFn: (data: any) => parkingApi.calculatePreview(data).then((res) => res.data.data),
    onSuccess: (res) => {
      setPreviewResult(res);
    },
    onError: (err) => toast.error(errorText(err, "Failed to calculate tariff preview")),
  });

  const runPreview = (tariffId?: number, hours?: number, vType?: string) => {
    const tId = tariffId ?? simTariffId ?? tariffs[0]?.id;
    const dur = (hours ?? simHours) * 60;
    if (!tId) return;

    previewMutation.mutate({
      tariff_id: tId,
      duration_minutes: dur,
      vehicle_type: vType ?? simVehicleType,
    });
  };

  React.useEffect(() => {
    if (tariffs.length > 0 && !simTariffId) {
      setSimTariffId(tariffs[0].id);
      runPreview(tariffs[0].id, simHours, simVehicleType);
    }
  }, [tariffs]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dynamic Tariffs & Rate Structures"
        subtitle="Manage parking rate rules, free grace periods, vehicle type multipliers, overnight flat fees, and lost ticket penalties."
        badge={`${tariffs.length} Active Plans`}
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
                Add Tariff Rule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Tariff Pricing Plan</DialogTitle>
                <DialogDescription>
                  Configure hourly rates, caps, grace windows, and penalties.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>Plan Name *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Weekend Special, VIP Valet, EV Charger Rate"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Rate Type</Label>
                    <select
                      value={tariffType}
                      onChange={(e) => setTariffType(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    >
                      <option value="hourly">Hourly Rate</option>
                      <option value="flat">Flat Daily Rate</option>
                      <option value="overnight">Overnight Stay</option>
                      <option value="special_event">Special Event</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Base Hourly Rate (ETB) *</Label>
                    <Input
                      type="number"
                      value={baseRate}
                      onChange={(e) => setBaseRate(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Free Grace Minutes</Label>
                    <Input
                      type="number"
                      value={gracePeriod}
                      onChange={(e) => setGracePeriod(Number(e.target.value))}
                    />
                    <p className="text-[11px] text-muted-foreground">Free if exit is under this duration</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Daily Max Cap (ETB)</Label>
                    <Input
                      type="number"
                      value={dailyCap}
                      onChange={(e) => setDailyCap(Number(e.target.value))}
                    />
                    <p className="text-[11px] text-muted-foreground">Maximum fee charged within 24h</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Overnight Flat Fee (ETB)</Label>
                    <Input
                      type="number"
                      value={overnightFee}
                      onChange={(e) => setOvernightFee(Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Lost Ticket Penalty (ETB)</Label>
                    <Input
                      type="number"
                      value={lostTicketFee}
                      onChange={(e) => setLostTicketFee(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    createTariffMutation.mutate({
                      name,
                      tariff_type: tariffType,
                      base_rate: baseRate,
                      grace_period_minutes: gracePeriod,
                      daily_max_cap: dailyCap,
                      overnight_flat_rate: overnightFee,
                      lost_ticket_penalty: lostTicketFee,
                      is_active: true,
                    })
                  }
                  disabled={createTariffMutation.isPending || !name.trim()}
                >
                  {createTariffMutation.isPending ? "Saving..." : "Create Tariff"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {/* Tariffs Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tariffs.map((t) => (
          <Card key={t.id} className="border-border/60 hover:border-primary/50 transition-colors flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="capitalize text-xs font-mono">
                  {t.tariff_type}
                </Badge>
                {t.is_active && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                    Active
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg font-bold mt-2">{t.name}</CardTitle>
              <CardDescription>
                {t.description || "Automated tariff policy for gate barriers"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-4 rounded-xl bg-muted/40 border border-border/50 flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground uppercase font-semibold">Base Rate</span>
                <span className="text-2xl font-black font-mono text-primary">
                  {formatCurrency(t.base_rate)}
                  <span className="text-xs font-normal text-muted-foreground"> / hr</span>
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Free Grace Window:</span>
                  <span className="font-semibold">{t.grace_period_minutes} mins</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Daily 24h Max Cap:</span>
                  <span className="font-semibold">{t.daily_max_cap ? formatCurrency(t.daily_max_cap) : "None"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Overnight Stay:</span>
                  <span className="font-semibold">{t.overnight_flat_rate ? formatCurrency(t.overnight_flat_rate) : "Standard"}</span>
                </div>
                <div className="flex justify-between py-1 text-rose-600 dark:text-rose-400">
                  <span>Lost Ticket Fine:</span>
                  <span className="font-semibold">{formatCurrency(t.lost_ticket_penalty)}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2 border-t border-border/40 flex justify-between">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 text-xs"
                onClick={() => {
                  setSimTariffId(t.id);
                  runPreview(t.id, simHours, simVehicleType);
                }}
              >
                <Sliders className="h-3.5 w-3.5 text-primary" />
                Simulate Fee in Previewer
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Live Fee Estimator & Simulator */}
      <Card className="border-primary/30 bg-primary/[0.02]">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Interactive Dynamic Rate Estimator
          </CardTitle>
          <CardDescription>
            Simulate the exact fees charged to parking patrons across different durations and vehicle classes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Simulator Inputs */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Select Tariff Plan</Label>
                <select
                  value={simTariffId ?? ""}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setSimTariffId(id);
                    runPreview(id, simHours, simVehicleType);
                  }}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  {tariffs.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({formatCurrency(t.base_rate)}/hr)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <Label>Duration Parked: {simHours} Hours ({simHours * 60} mins)</Label>
                  <span className="text-xs font-semibold text-primary">{formatDuration(simHours * 60)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="24"
                  step="0.5"
                  value={simHours}
                  onChange={(e) => {
                    const h = Number(e.target.value);
                    setSimHours(h);
                    runPreview(simTariffId, h, simVehicleType);
                  }}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0h (Grace)</span>
                  <span>4h</span>
                  <span>8h (Workday)</span>
                  <span>12h</span>
                  <span>24h (Overnight Cap)</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Vehicle Class</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "sedan", label: "Sedan" },
                    { id: "suv", label: "SUV (1.2x)" },
                    { id: "pickup", label: "Pickup (1.3x)" },
                    { id: "ev", label: "EV Charger" },
                    { id: "motorcycle", label: "Motorcycle (0.5x)" },
                    { id: "truck", label: "Heavy (1.5x)" },
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setSimVehicleType(v.id);
                        runPreview(simTariffId, simHours, v.id);
                      }}
                      className={`p-2 rounded-lg border text-xs font-medium text-center transition-all ${
                        simVehicleType === v.id
                          ? "border-primary bg-primary/10 text-primary font-bold"
                          : "border-border/60 hover:bg-muted"
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Simulator Output */}
            <div className="flex flex-col justify-between p-6 rounded-2xl border border-primary/20 bg-card">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Estimated Fee Breakdown
                </div>
                <div className="text-3xl font-black font-mono text-primary mb-4">
                  {formatCurrency(previewResult?.final_fee ?? 0)}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Tariff Applied:</span>
                    <span className="font-semibold">{previewResult?.tariff_name || "Standard Tariff"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">First Hour / Base Rate:</span>
                    <span className="font-mono">{formatCurrency(previewResult?.base_fee ?? 0)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Additional Time:</span>
                    <span className="font-mono">{formatCurrency(previewResult?.additional_fee ?? 0)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Daily Cap Applied:</span>
                    <span className="font-semibold text-emerald-600">
                      {previewResult && previewResult.final_fee >= (previewResult.daily_cap || Infinity) ? "YES" : "NO"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-muted text-xs text-muted-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <span>
                  Rates are calculated in real-time according to Ethiopian Birr (ETB) and central tenant rules.
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
