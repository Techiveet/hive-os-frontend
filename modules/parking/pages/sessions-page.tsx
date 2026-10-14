"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  Car,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Filter,
  Receipt,
  RefreshCw,
  Search,
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  SessionStatusBadge,
  StatCard,
  errorText,
  formatCurrency,
  formatDateTime,
  formatDuration,
  rowsOf,
} from "@/modules/parking/components/parking-ui";
import type { ParkingFeeResult, ParkingSession } from "@/modules/parking/types";

export default function ParkingSessionsPage() {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [activeFeeModal, setActiveFeeModal] = React.useState<{ session: ParkingSession; fee: ParkingFeeResult } | null>(null);

  // Queries
  const { data: sessionsData, isLoading, refetch } = useQuery({
    queryKey: ["parking", "sessions", statusFilter, searchQuery],
    queryFn: () => {
      const params: any = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      return parkingApi.listSessions(params).then((res) => res.data.data);
    },
    refetchInterval: 15000,
  });

  const sessions: ParkingSession[] = sessionsData?.data ?? [];
  const totalCount = sessionsData?.total ?? sessions.length;

  const handleInspectFee = async (session: ParkingSession) => {
    try {
      const res = await parkingApi.calculateFee(session.id);
      setActiveFeeModal({ session, fee: res.data.data });
    } catch (err) {
      toast.error(errorText(err, "Failed to calculate live fee"));
    }
  };

  const activeCount = sessions.filter((s) => s.status === "active").length;
  const completedCount = sessions.filter((s) => s.status === "completed").length;
  const overstayCount = sessions.filter((s) => s.status === "overstay").length;
  const lostCount = sessions.filter((s) => s.status === "lost_ticket").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parking Sessions & Tickets"
        subtitle="Complete log of active vehicles, historical checkouts, parking duration, and ticket revenue."
        badge={`${totalCount} Tickets`}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>

          <Link href="/dashboard/parking/terminal">
            <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground">
              <CreditCard className="h-4 w-4" />
              Terminal Check-In
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Filter and Search Bar */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket # or plate number..."
                className="pl-9 h-9 text-sm"
              />
            </div>

            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full md:w-auto">
              <TabsList className="grid grid-cols-5 w-full md:w-auto">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Parked</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="overstay">Overstay</TabsTrigger>
                <TabsTrigger value="lost_ticket">Lost</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Ticket Registry
          </CardTitle>
          <CardDescription>
            Showing {sessions.length} recorded parking sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Receipt className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm font-semibold">No tickets found.</p>
              <p className="text-xs">Adjust filters or issue a new ticket from the POS terminal.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket #</TableHead>
                  <TableHead>License Plate</TableHead>
                  <TableHead>Vehicle Type</TableHead>
                  <TableHead>Allocated Bay</TableHead>
                  <TableHead>Entry Time</TableHead>
                  <TableHead>Exit Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Fee Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-mono font-medium text-xs">
                      {session.ticket_number}
                    </TableCell>
                    <TableCell className="font-semibold">
                      <span className="px-2 py-0.5 rounded bg-muted font-mono text-xs border border-border/80">
                        {session.license_plate}
                      </span>
                    </TableCell>
                    <TableCell className="capitalize text-xs text-muted-foreground">
                      {session.vehicle_type}
                    </TableCell>
                    <TableCell className="text-xs">
                      {session.bay?.bay_code || "General"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(session.entry_time)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {session.exit_time ? formatDateTime(session.exit_time) : "-"}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {formatDuration(session.duration_minutes)}
                    </TableCell>
                    <TableCell className="font-mono font-semibold text-xs text-primary">
                      {formatCurrency(session.total_fee)}
                    </TableCell>
                    <TableCell>
                      <SessionStatusBadge status={session.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {session.status === "active" || session.status === "overstay" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleInspectFee(session)}
                            className="h-7 px-2 text-xs"
                          >
                            <Calculator className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Link href={`/dashboard/parking/terminal?ticket=${encodeURIComponent(session.ticket_number)}`}>
                            <Button size="sm" variant="default" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                              Checkout
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {session.payment_method?.toUpperCase() || "PAID"}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Live Fee Preview Dialog */}
      <Dialog open={Boolean(activeFeeModal)} onOpenChange={(open) => !open && setActiveFeeModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Live Fee Calculation
            </DialogTitle>
            <DialogDescription>
              Ticket #{activeFeeModal?.session.ticket_number} &bull; Plate: {activeFeeModal?.session.license_plate}
            </DialogDescription>
          </DialogHeader>

          {activeFeeModal && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl bg-muted/40 border space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Applied Tariff:</span>
                  <span className="font-semibold">{activeFeeModal.fee.tariff_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration Parked:</span>
                  <span className="font-semibold text-emerald-600">
                    {formatDuration(activeFeeModal.fee.duration_minutes)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Rate:</span>
                  <span className="font-mono">{formatCurrency(activeFeeModal.fee.base_fee)}</span>
                </div>
                {Number(activeFeeModal.fee.additional_fee ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Additional Hours:</span>
                    <span className="font-mono">{formatCurrency(activeFeeModal.fee.additional_fee)}</span>
                  </div>
                )}
                {Number(activeFeeModal.fee.lost_ticket_fee ?? 0) > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Lost Penalty:</span>
                    <span className="font-mono">+{formatCurrency(activeFeeModal.fee.lost_ticket_fee)}</span>
                  </div>
                )}
                <div className="pt-2 border-t flex justify-between font-bold text-base text-foreground">
                  <span>Current Fee:</span>
                  <span className="text-primary font-mono">{formatCurrency(activeFeeModal.fee.final_fee)}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setActiveFeeModal(null)}>
              Close
            </Button>
            {activeFeeModal && (
              <Link href={`/dashboard/parking/terminal?ticket=${encodeURIComponent(activeFeeModal.session.ticket_number)}`}>
                <Button className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                  Proceed to POS Checkout <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
