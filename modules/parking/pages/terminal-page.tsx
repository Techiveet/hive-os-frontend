"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Car,
  CheckCircle2,
  Clock,
  CreditCard,
  DoorOpen,
  HelpCircle,
  Percent,
  Printer,
  QrCode,
  Receipt,
  RefreshCw,
  Search,
  Sparkles,
  UserCheck,
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parkingApi } from "@/modules/parking/api";
import {
  BayStatusBadge,
  PageHeader,
  SessionStatusBadge,
  errorText,
  formatCurrency,
  formatDateTime,
  formatDuration,
} from "@/modules/parking/components/parking-ui";
import type { ParkingFeeResult, ParkingPass, ParkingSession } from "@/modules/parking/types";

export default function ParkingTerminalPage() {
  const queryClient = useQueryClient();

  // Check-In Form State
  const [inPlate, setInPlate] = React.useState("");
  const [inVehicleType, setInVehicleType] = React.useState("sedan");
  const [inTariffId, setInTariffId] = React.useState<number | undefined>(undefined);
  const [inBayId, setInBayId] = React.useState<number | undefined>(undefined);
  const [createdSession, setCreatedSession] = React.useState<ParkingSession | null>(null);

  // Check-Out Form State
  const [searchTicket, setSearchTicket] = React.useState("");
  const [activeSession, setActiveSession] = React.useState<ParkingSession | null>(null);
  const [feeResult, setFeeResult] = React.useState<ParkingFeeResult | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState("telebirr");
  const [discountAmount, setDiscountAmount] = React.useState(0);
  const [isReceiptOpen, setIsReceiptOpen] = React.useState(false);
  const [completedSession, setCompletedSession] = React.useState<ParkingSession | null>(null);

  // Subscriber Lookup State
  const [lookupPlate, setLookupPlate] = React.useState("");
  const [subscriberPass, setSubscriberPass] = React.useState<ParkingPass | null>(null);
  const [hasSearchedPass, setHasSearchedPass] = React.useState(false);

  // Queries
  const { data: lotsData } = useQuery({
    queryKey: ["parking", "lots"],
    queryFn: () => parkingApi.listLots().then((res) => res.data.data),
  });
  const lots = lotsData ?? [];
  const defaultLot = lots[0];

  const { data: tariffsData } = useQuery({
    queryKey: ["parking", "tariffs"],
    queryFn: () => parkingApi.listTariffs().then((res) => res.data.data),
  });
  const tariffs = tariffsData ?? [];

  const { data: baysData } = useQuery({
    queryKey: ["parking", "bays", "available"],
    queryFn: () => parkingApi.listBays({ status: "available" }).then((res) => res.data.data.data),
  });
  const availableBays = baysData ?? [];

  // Mutations
  const checkInMutation = useMutation({
    mutationFn: (data: any) => parkingApi.checkIn(data).then((res) => res.data.data),
    onSuccess: (session) => {
      setCreatedSession(session);
      toast.success(`Vehicle checked in! Ticket #${session.ticket_number}`);
      setInPlate("");
      queryClient.invalidateQueries({ queryKey: ["parking"] });
    },
    onError: (err) => toast.error(errorText(err, "Failed to check in vehicle")),
  });

  const checkoutMutation = useMutation({
    mutationFn: (data: { id: number; payload: any }) =>
      parkingApi.checkout(data.id, data.payload).then((res) => res.data.data),
    onSuccess: (session) => {
      setCompletedSession(session);
      setIsReceiptOpen(true);
      setActiveSession(null);
      setFeeResult(null);
      setSearchTicket("");
      toast.success(`Checkout completed! Barrier Gate OPEN. Paid: ${formatCurrency(session.total_fee)}`);
      queryClient.invalidateQueries({ queryKey: ["parking"] });
    },
    onError: (err) => toast.error(errorText(err, "Failed to complete checkout")),
  });

  const lostTicketMutation = useMutation({
    mutationFn: (id: number) => parkingApi.lostTicket(id).then((res) => res.data.data),
    onSuccess: (session) => {
      toast.warning(`Session marked as Lost Ticket. Penalty applied: ${formatCurrency(session.total_fee)}`);
      setActiveSession(session);
      fetchFee(session.id);
      queryClient.invalidateQueries({ queryKey: ["parking"] });
    },
    onError: (err) => toast.error(errorText(err, "Failed to mark lost ticket")),
  });

  // Handler to fetch session for checkout
  const fetchSession = async (ticketOrPlate: string) => {
    if (!ticketOrPlate.trim()) return;
    try {
      const res = await parkingApi.listSessions({ search: ticketOrPlate.trim(), status: "active" });
      const sessions = res.data.data.data;
      if (sessions.length > 0) {
        const found = sessions[0];
        setActiveSession(found);
        fetchFee(found.id);
      } else {
        toast.error("No active parking session found for this ticket/plate");
        setActiveSession(null);
        setFeeResult(null);
      }
    } catch (err) {
      toast.error(errorText(err, "Error finding parking session"));
    }
  };

  const fetchFee = async (sessionId: number) => {
    try {
      const res = await parkingApi.calculateFee(sessionId);
      setFeeResult(res.data.data);
    } catch (err) {
      toast.error(errorText(err, "Could not calculate parking fee"));
    }
  };

  const handleLookupSubscriber = async () => {
    if (!lookupPlate.trim()) return;
    try {
      const res = await parkingApi.lookupPlate(lookupPlate.trim());
      setSubscriberPass(res.data.data);
      setHasSearchedPass(true);
      if (res.data.is_subscriber) {
        toast.success(`Active subscriber pass verified for ${lookupPlate}!`);
      } else {
        toast.info(`No active monthly pass on file for ${lookupPlate}.`);
      }
    } catch (err) {
      toast.error(errorText(err, "Failed to lookup plate"));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quick POS & Gate Attendant Terminal"
        subtitle="High-speed ticket issuance, electronic plate recognition, live fee calculator, and multi-channel checkout (Telebirr, CBE Birr, Cash)."
        badge="POS Station #1"
      />

      <Tabs defaultValue="checkout" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="checkout" className="gap-2">
            <CreditCard className="h-4 w-4" />
            POS Checkout
          </TabsTrigger>
          <TabsTrigger value="checkin" className="gap-2">
            <DoorOpen className="h-4 w-4" />
            Vehicle Entry
          </TabsTrigger>
          <TabsTrigger value="lookup" className="gap-2">
            <UserCheck className="h-4 w-4" />
            Subscriber Check
          </TabsTrigger>
        </TabsList>

        {/* CHECK-OUT TAB */}
        <TabsContent value="checkout" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Search Card */}
            <Card className="border-border/60 lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />
                  Find Vehicle or Ticket
                </CardTitle>
                <CardDescription>Scan barcode or type plate number</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ticket-input">Ticket # or License Plate</Label>
                  <div className="flex gap-2">
                    <Input
                      id="ticket-input"
                      value={searchTicket}
                      onChange={(e) => setSearchTicket(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && fetchSession(searchTicket)}
                      placeholder="e.g. TKT-20261006-... or AA-3-98765"
                    />
                    <Button onClick={() => fetchSession(searchTicket)} className="shrink-0">
                      Search
                    </Button>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40 text-xs text-muted-foreground space-y-2">
                  <p className="font-medium text-foreground">Quick Test Plates:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["AA-3-98765", "ET-B-44321", "AA-2-45892"].map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          setSearchTicket(p);
                          fetchSession(p);
                        }}
                        className="px-2 py-1 rounded bg-muted hover:bg-muted/80 font-mono text-[11px] border"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Session & Fee Card */}
            <Card className="border-border/60 lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-primary" />
                      Payment & Fee Settlement
                    </CardTitle>
                    <CardDescription>Live parking duration & dynamic tariff breakdown</CardDescription>
                  </div>
                  {activeSession && <SessionStatusBadge status={activeSession.status} />}
                </div>
              </CardHeader>
              <CardContent>
                {!activeSession ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-medium">No ticket currently loaded.</p>
                    <p className="text-xs">Enter a ticket number or license plate above to calculate fees.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Vehicle & Ticket Metadata Banner */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/40 border border-border/50 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Ticket Number</div>
                        <div className="font-mono font-bold">{activeSession.ticket_number}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">License Plate</div>
                        <div className="font-mono font-bold text-base text-primary">{activeSession.license_plate}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Allocated Bay</div>
                        <div className="font-semibold">{activeSession.bay?.bay_code || "General Lot"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Duration Parked</div>
                        <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatDuration(feeResult?.duration_minutes ?? activeSession.duration_minutes)}
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Fee Calculation Breakdown */}
                    {feeResult && (
                      <div className="space-y-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Base Parking Fee ({feeResult.tariff_name}):</span>
                          <span className="font-mono font-medium">{formatCurrency(feeResult.base_fee)}</span>
                        </div>
                        {Number(feeResult.additional_fee ?? 0) > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Additional Hours:</span>
                            <span className="font-mono font-medium">{formatCurrency(feeResult.additional_fee)}</span>
                          </div>
                        )}
                        {Number(feeResult.lost_ticket_fee ?? 0) > 0 && (
                          <div className="flex items-center justify-between text-sm text-rose-600 dark:text-rose-400 font-semibold">
                            <span>Lost Ticket Penalty:</span>
                            <span className="font-mono">+{formatCurrency(feeResult.lost_ticket_fee)}</span>
                          </div>
                        )}
                        {discountAmount > 0 && (
                          <div className="flex items-center justify-between text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                            <span>Applied Discount / Validation:</span>
                            <span className="font-mono">-{formatCurrency(discountAmount)}</span>
                          </div>
                        )}
                        <div className="pt-3 border-t border-primary/20 flex items-center justify-between">
                          <span className="text-base font-bold text-foreground">Total Payable:</span>
                          <span className="text-2xl font-black font-mono text-primary">
                            {formatCurrency(Math.max(0, feeResult.final_fee - discountAmount))}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Payment Method Selector */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Payment Gateway & Channel</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { id: "telebirr", label: "Telebirr SuperApp", icon: Zap, color: "text-sky-500" },
                          { id: "cbe_birr", label: "CBE Birr Pay", icon: CreditCard, color: "text-purple-500" },
                          { id: "cash", label: "Cash / Gate Kiosk", icon: Receipt, color: "text-emerald-500" },
                          { id: "card", label: "Debit / Credit Card", icon: CreditCard, color: "text-amber-500" },
                        ].map((m) => {
                          const Icon = m.icon;
                          const selected = paymentMethod === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setPaymentMethod(m.id)}
                              className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all ${
                                selected
                                  ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-sm"
                                  : "border-border/60 hover:border-border bg-card"
                              }`}
                            >
                              <Icon className={`h-5 w-5 ${m.color}`} />
                              <div>
                                <div className="text-xs font-semibold leading-tight">{m.label}</div>
                                <div className="text-[10px] text-muted-foreground">Instant Confirmation</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/40">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => activeSession && lostTicketMutation.mutate(activeSession.id)}
                        disabled={lostTicketMutation.isPending || activeSession.status === "lost_ticket"}
                        className="text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                      >
                        <AlertTriangle className="h-4 w-4 mr-1.5" />
                        Lost Ticket Penalty
                      </Button>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setActiveSession(null)}>
                          Clear
                        </Button>
                        <Button
                          size="lg"
                          onClick={() =>
                            activeSession &&
                            checkoutMutation.mutate({
                              id: activeSession.id,
                              payload: {
                                payment_method: paymentMethod,
                                discount_amount: discountAmount,
                              },
                            })
                          }
                          disabled={checkoutMutation.isPending}
                          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 shadow-md"
                        >
                          <CheckCircle2 className="h-5 w-5" />
                          {checkoutMutation.isPending ? "Processing Payment..." : "Pay & Open Exit Gate"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CHECK-IN TAB */}
        <TabsContent value="checkin" className="space-y-6">
          <Card className="max-w-2xl border-border/60 mx-auto">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <DoorOpen className="h-5 w-5 text-primary" />
                Manual Vehicle Entry Ticket Issuance
              </CardTitle>
              <CardDescription>
                Issue a printed barcode/QR parking ticket and open the barrier arm.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="in-plate">License Plate *</Label>
                  <Input
                    id="in-plate"
                    value={inPlate}
                    onChange={(e) => setInPlate(e.target.value.toUpperCase())}
                    placeholder="e.g. AA-3-45892"
                    className="font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="in-type">Vehicle Type</Label>
                  <select
                    id="in-type"
                    value={inVehicleType}
                    onChange={(e) => setInVehicleType(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="sedan">Sedan / Compact Car</option>
                    <option value="suv">SUV / 4WD</option>
                    <option value="pickup">Pickup Truck</option>
                    <option value="motorcycle">Motorcycle</option>
                    <option value="ev">Electric Vehicle (EV Charging)</option>
                    <option value="van">Minibus / Van</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="in-tariff">Tariff Pricing Rule</Label>
                  <select
                    id="in-tariff"
                    value={inTariffId ?? ""}
                    onChange={(e) => setInTariffId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="">Default Standard Tariff</option>
                    {tariffs.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({formatCurrency(t.base_rate)}/hr)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="in-bay">Bay Assignment</Label>
                  <select
                    id="in-bay"
                    value={inBayId ?? ""}
                    onChange={(e) => setInBayId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="">Automatic Best Available Bay</option>
                    {availableBays.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bay_code} ({b.zone?.name || "Zone"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {createdSession && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    Ticket Issued: {createdSession.ticket_number}
                  </div>
                  <div className="text-xs grid grid-cols-2 gap-2">
                    <div>Plate: <span className="font-mono font-bold">{createdSession.license_plate}</span></div>
                    <div>Bay: <span className="font-bold">{createdSession.bay?.bay_code || "General"}</span></div>
                    <div>Entry Time: {formatDateTime(createdSession.entry_time)}</div>
                    <div>Gate Status: <span className="font-semibold">Barrier Arm Lifted</span></div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t border-border/40 pt-4">
              <Button variant="outline" onClick={() => setInPlate("")}>
                Reset
              </Button>
              <Button
                onClick={() =>
                  checkInMutation.mutate({
                    lot_id: defaultLot?.id,
                    license_plate: inPlate,
                    vehicle_type: inVehicleType,
                    tariff_id: inTariffId,
                    bay_id: inBayId,
                  })
                }
                disabled={checkInMutation.isPending || !inPlate.trim()}
                className="gap-2 bg-primary text-primary-foreground font-bold shadow-md"
              >
                <Printer className="h-4 w-4" />
                {checkInMutation.isPending ? "Issuing Ticket..." : "Print Ticket & Open Gate"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* SUBSCRIBER LOOKUP TAB */}
        <TabsContent value="lookup" className="space-y-6">
          <Card className="max-w-2xl border-border/60 mx-auto">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Subscriber Monthly Pass Lookup
              </CardTitle>
              <CardDescription>
                Verify RFID season pass or registered corporate subscriber vehicle.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={lookupPlate}
                  onChange={(e) => setLookupPlate(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleLookupSubscriber()}
                  placeholder="Enter license plate e.g. AA-2-45892"
                  className="font-mono font-bold"
                />
                <Button onClick={handleLookupSubscriber} className="shrink-0 gap-1.5">
                  <Search className="h-4 w-4" />
                  Verify Pass
                </Button>
              </div>

              {hasSearchedPass && (
                <div>
                  {subscriberPass ? (
                    <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5" />
                          Active Season Pass Verified
                        </span>
                        <Badge className="bg-emerald-600 text-white">VALID</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-xs text-muted-foreground">Subscriber Name:</span>
                          <div className="font-semibold">{subscriberPass.user_name}</div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Phone:</span>
                          <div className="font-mono">{subscriberPass.user_phone || "-"}</div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Pass Tier:</span>
                          <div className="font-semibold capitalize">{subscriberPass.pass_type}</div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Valid Through:</span>
                          <div className="font-semibold text-primary">{formatDateTime(subscriberPass.valid_to)}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 rounded-xl border border-border/60 bg-muted/30 text-center text-sm text-muted-foreground">
                      No monthly pass or season registration found for <span className="font-mono font-bold text-foreground">{lookupPlate}</span>.
                      Standard hourly tariffs apply.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* RECEIPT / CHECKOUT SUCCESS MODAL */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              Payment Successful & Exit Granted
            </DialogTitle>
            <DialogDescription>
              Barrier gate has been triggered. Receipt copy generated.
            </DialogDescription>
          </DialogHeader>
          {completedSession && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl bg-muted/50 border font-mono text-xs space-y-2">
                <div className="text-center font-bold text-sm border-b pb-2">
                  ADDIS CENTRAL SMART GARAGE
                </div>
                <div className="flex justify-between">
                  <span>Ticket:</span>
                  <span>{completedSession.ticket_number}</span>
                </div>
                <div className="flex justify-between">
                  <span>Plate:</span>
                  <span className="font-bold">{completedSession.license_plate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Entry:</span>
                  <span>{formatDateTime(completedSession.entry_time)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Exit:</span>
                  <span>{formatDateTime(completedSession.exit_time)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span>{formatDuration(completedSession.duration_minutes)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold text-sm text-foreground">
                  <span>Amount Paid:</span>
                  <span>{formatCurrency(completedSession.total_fee)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Method:</span>
                  <span className="capitalize">{completedSession.payment_method?.replace("_", " ")}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setIsReceiptOpen(false)}>
              Close
            </Button>
            <Button onClick={() => window.print()} className="gap-1.5">
              <Printer className="h-4 w-4" />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
