"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
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
  StatCard,
  ViolationStatusBadge,
  errorText,
  formatCurrency,
  formatDateTime,
} from "@/modules/parking/components/parking-ui";
import type { ParkingViolation } from "@/modules/parking/types";

export default function ParkingViolationsPage() {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Issue Violation Dialog State
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [plate, setPlate] = React.useState("");
  const [violationType, setViolationType] = React.useState("overstay");
  const [fineAmount, setFineAmount] = React.useState(250);
  const [notes, setNotes] = React.useState("");

  // Queries
  const { data: violationsData, isLoading, refetch } = useQuery({
    queryKey: ["parking", "violations", statusFilter, searchQuery],
    queryFn: () => {
      const params: any = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      return parkingApi.listViolations(params).then((res) => res.data.data);
    },
  });
  const violations: ParkingViolation[] = violationsData?.data ?? [];
  const totalCount = violationsData?.total ?? violations.length;

  // Mutations
  const createViolationMutation = useMutation({
    mutationFn: (data: any) => parkingApi.createViolation(data).then((res) => res.data.data),
    onSuccess: (v) => {
      toast.success(`Violation ${v.violation_number} issued for ${v.license_plate}.`);
      setIsAddOpen(false);
      setPlate("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["parking", "violations"] });
    },
    onError: (err) => toast.error(errorText(err, "Failed to issue citation")),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (data: { id: number; status: string }) =>
      parkingApi.updateViolationStatus(data.id, data.status).then((res) => res.data.data),
    onSuccess: (v) => {
      toast.success(`Violation #${v.violation_number} marked as ${v.status.toUpperCase()}.`);
      queryClient.invalidateQueries({ queryKey: ["parking", "violations"] });
    },
    onError: (err) => toast.error(errorText(err, "Failed to update citation status")),
  });

  const pendingCount = violations.filter((v) => v.status === "pending").length;
  const paidCount = violations.filter((v) => v.status === "paid").length;
  const totalPendingFines = violations
    .filter((v) => v.status === "pending")
    .reduce((acc, v) => acc + Number(v.fine_amount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parking Violations & Enforcement"
        subtitle="Manage parking citations, overstay penalties, unauthorized bay infractions, and automated plate flagging."
        badge={`${totalCount} Total Citations`}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white">
                <Plus className="h-4 w-4" />
                Issue Violation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Issue Parking Citation</DialogTitle>
                <DialogDescription>
                  Issue a formal infraction and apply a penalty fine to the vehicle license plate.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>License Plate *</Label>
                  <Input
                    value={plate}
                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                    placeholder="e.g. AA-3-98765"
                    className="font-mono font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Infraction Type</Label>
                    <select
                      value={violationType}
                      onChange={(e) => {
                        setViolationType(e.target.value);
                        if (e.target.value === "unauthorized_parking") setFineAmount(500);
                        else if (e.target.value === "blocking_driveway") setFineAmount(750);
                        else if (e.target.value === "unpaid_exit") setFineAmount(1000);
                        else setFineAmount(250);
                      }}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    >
                      <option value="overstay">Overstay Exceeded Duration</option>
                      <option value="unauthorized_parking">Unauthorized VIP/Handicap Slot</option>
                      <option value="blocking_driveway">Blocking Lane / Driveway</option>
                      <option value="unpaid_exit">Attempted Unpaid Barrier Exit</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Fine Amount (ETB)</Label>
                    <Input
                      type="number"
                      value={fineAmount}
                      onChange={(e) => setFineAmount(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Officer Notes / Evidence</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Parked across two bays on 1st floor"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    createViolationMutation.mutate({
                      license_plate: plate,
                      violation_type: violationType,
                      fine_amount: fineAmount,
                      notes,
                      status: "pending",
                    })
                  }
                  disabled={createViolationMutation.isPending || !plate.trim()}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {createViolationMutation.isPending ? "Issuing..." : "Confirm & Issue Fine"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pending Citations"
          value={pendingCount}
          subtitle="Awaiting fine payment"
          icon={AlertTriangle}
          variant={pendingCount > 0 ? "danger" : "default"}
        />
        <StatCard
          title="Outstanding Fines"
          value={formatCurrency(totalPendingFines)}
          subtitle="Uncollected enforcement revenue"
          icon={DollarSign}
          variant="warning"
        />
        <StatCard
          title="Settled & Paid"
          value={paidCount}
          subtitle="Paid citations"
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Enforcement Accuracy"
          value="98.5%"
          subtitle="Optical ANPR verification"
          icon={ShieldAlert}
          variant="info"
        />
      </div>

      {/* Search and Filter */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search citation # or plate..."
                className="pl-9 h-9 text-sm"
              />
            </div>

            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full md:w-auto">
              <TabsList className="grid grid-cols-4 w-full md:w-auto">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="paid">Settled</TabsTrigger>
                <TabsTrigger value="waived">Waived</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Violations Table */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-500" />
            Citations Log
          </CardTitle>
          <CardDescription>
            Showing {violations.length} recorded infractions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {violations.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm font-semibold">No violations found.</p>
              <p className="text-xs">Facility enforcement is completely clear.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Citation #</TableHead>
                  <TableHead>License Plate</TableHead>
                  <TableHead>Infraction Type</TableHead>
                  <TableHead>Fine Amount</TableHead>
                  <TableHead>Issued Time</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {violations.map((violation) => (
                  <TableRow key={violation.id}>
                    <TableCell className="font-mono font-medium text-xs">
                      {violation.violation_number}
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded bg-muted font-mono font-bold text-xs border border-border/80">
                        {violation.license_plate}
                      </span>
                    </TableCell>
                    <TableCell className="capitalize text-xs">
                      {violation.violation_type.replace("_", " ")}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(violation.fine_amount)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(violation.issued_at)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {violation.notes || "-"}
                    </TableCell>
                    <TableCell>
                      <ViolationStatusBadge status={violation.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {violation.status === "pending" && (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => updateStatusMutation.mutate({ id: violation.id, status: "paid" })}
                            disabled={updateStatusMutation.isPending}
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Mark Paid
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ id: violation.id, status: "waived" })}
                            disabled={updateStatusMutation.isPending}
                            className="h-7 text-xs text-muted-foreground hover:bg-muted"
                          >
                            Waive
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
