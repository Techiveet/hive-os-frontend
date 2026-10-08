"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  CheckCircle2,
  Clock,
  DoorOpen,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Sparkles,
  XCircle,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parkingApi } from "@/modules/parking/api";
import {
  PageHeader,
  ReservationStatusBadge,
  StatCard,
  errorText,
  formatCurrency,
  formatDateTime,
} from "@/modules/parking/components/parking-ui";
import type { ParkingReservation } from "@/modules/parking/types";

export default function ParkingReservationsPage() {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // New Reservation Form State
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [plate, setPlate] = React.useState("");
  const [bayId, setBayId] = React.useState<number | undefined>(undefined);
  const [hoursAhead, setHoursAhead] = React.useState(2);
  const [deposit, setDeposit] = React.useState(150);

  // Queries
  const { data: reservationsData, isLoading, refetch } = useQuery({
    queryKey: ["parking", "reservations", statusFilter, searchQuery],
    queryFn: () => {
      const params: any = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      return parkingApi.listReservations(params).then((res) => res.data.data);
    },
  });
  const reservations: ParkingReservation[] = reservationsData?.data ?? [];
  const totalCount = reservationsData?.total ?? reservations.length;

  const { data: lotsData } = useQuery({
    queryKey: ["parking", "lots"],
    queryFn: () => parkingApi.listLots().then((res) => res.data.data),
  });
  const defaultLot = lotsData?.[0];

  const { data: baysData } = useQuery({
    queryKey: ["parking", "bays", "all"],
    queryFn: () => parkingApi.listBays().then((res) => res.data.data.data),
  });
  const bays = baysData ?? [];

  // Mutations
  const createReservationMutation = useMutation({
    mutationFn: (data: any) => parkingApi.createReservation(data).then((res) => res.data.data),
    onSuccess: (r) => {
      toast.success(`Reservation ${r.reservation_code} confirmed for ${r.customer_name}!`);
      setIsAddOpen(false);
      setCustomerName("");
      setPlate("");
      queryClient.invalidateQueries({ queryKey: ["parking", "reservations"] });
    },
    onError: (err) => toast.error(errorText(err, "Failed to create reservation")),
  });

  const checkinMutation = useMutation({
    mutationFn: (id: number) => parkingApi.checkinReservation(id).then((res) => res.data.data),
    onSuccess: (r) => {
      toast.success(`Reservation checked in! Active parking session started for ${r.license_plate}.`);
      queryClient.invalidateQueries({ queryKey: ["parking"] });
    },
    onError: (err) => toast.error(errorText(err, "Failed to check in reservation")),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => parkingApi.cancelReservation(id),
    onSuccess: () => {
      toast.info("Reservation cancelled.");
      queryClient.invalidateQueries({ queryKey: ["parking", "reservations"] });
    },
    onError: (err) => toast.error(errorText(err, "Failed to cancel reservation")),
  });

  const confirmedCount = reservations.filter((r) => r.status === "confirmed").length;
  const checkedInCount = reservations.filter((r) => r.status === "checked_in").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Advance Reservations & Valet Pre-Booking"
        subtitle="Reserve guaranteed parking slots in advance with QR token codes and automated ANPR gate barrier recognition."
        badge={`${totalCount} Reservations`}
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
                New Reservation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Advance Parking Reservation</DialogTitle>
                <DialogDescription>
                  Pre-allocate a guaranteed bay for an arriving client.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>Customer Name *</Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Dr. Meron Hailu"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Phone Number</Label>
                    <Input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+251 9..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>License Plate *</Label>
                    <Input
                      value={plate}
                      onChange={(e) => setPlate(e.target.value.toUpperCase())}
                      placeholder="e.g. ET-B-44321"
                      className="font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Allocated Slot</Label>
                    <select
                      value={bayId ?? ""}
                      onChange={(e) => setBayId(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    >
                      <option value="">Auto-Assign on Arrival</option>
                      {bays.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bay_code} ({b.bay_type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Pre-paid Deposit (ETB)</Label>
                    <Input
                      type="number"
                      value={deposit}
                      onChange={(e) => setDeposit(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const start = new Date(Date.now() + 60 * 60 * 1000);
                    const end = new Date(start.getTime() + hoursAhead * 60 * 60 * 1000);
                    createReservationMutation.mutate({
                      lot_id: defaultLot?.id,
                      customer_name: customerName,
                      customer_phone: customerPhone,
                      license_plate: plate,
                      bay_id: bayId,
                      start_time: start.toISOString(),
                      end_time: end.toISOString(),
                      prepaid_amount: deposit,
                      status: "confirmed",
                    });
                  }}
                  disabled={createReservationMutation.isPending || !customerName.trim() || !plate.trim()}
                >
                  {createReservationMutation.isPending ? "Confirming..." : "Confirm Booking"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Confirmed Bookings"
          value={confirmedCount}
          subtitle="Awaiting arrival today"
          icon={Calendar}
          variant="info"
        />
        <StatCard
          title="Currently Checked-In"
          value={checkedInCount}
          subtitle="Converted to active sessions"
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Prepaid Deposits"
          value={formatCurrency(reservations.reduce((acc, r) => acc + Number(r.prepaid_amount || 0), 0))}
          subtitle="Secured upfront payments"
          icon={Clock}
          variant="default"
        />
        <StatCard
          title="Fulfillment Rate"
          value={`${totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 100}%`}
          subtitle="Show-up reliability"
          icon={Sparkles}
          variant="default"
        />
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search booking code, customer, or plate..."
                className="pl-9 h-9 text-sm"
              />
            </div>

            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full md:w-auto">
              <TabsList className="grid grid-cols-4 w-full md:w-auto">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
                <TabsTrigger value="checked_in">Checked In</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Reservations Table */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <QrCode className="h-4 w-4 text-primary" />
            Reservation Manifest
          </CardTitle>
          <CardDescription>
            Showing {reservations.length} advance reservations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reservations.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm font-semibold">No reservations found.</p>
              <p className="text-xs">Create a new reservation above for incoming patrons.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking Code</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>License Plate</TableHead>
                  <TableHead>Reserved Bay</TableHead>
                  <TableHead>Arrival Time</TableHead>
                  <TableHead>Prepaid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((res) => (
                  <TableRow key={res.id}>
                    <TableCell className="font-mono font-medium text-xs text-primary">
                      {res.reservation_code}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-sm">{res.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{res.customer_phone || "-"}</div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded bg-muted font-mono font-bold text-xs border border-border/80">
                        {res.license_plate}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {res.bay?.bay_code || "Auto-Assign"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(res.start_time)}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold">
                      {formatCurrency(res.prepaid_amount)}
                    </TableCell>
                    <TableCell>
                      <ReservationStatusBadge status={res.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {res.status === "confirmed" && (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => checkinMutation.mutate(res.id)}
                            disabled={checkinMutation.isPending}
                            className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <DoorOpen className="h-3.5 w-3.5" />
                            Check-In
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelMutation.mutate(res.id)}
                            disabled={cancelMutation.isPending}
                            className="h-7 text-xs text-rose-600 hover:bg-rose-50"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
