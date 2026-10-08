"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  UserCheck,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parkingApi } from "@/modules/parking/api";
import {
  PageHeader,
  PassStatusBadge,
  StatCard,
  errorText,
  formatCurrency,
  formatDateTime,
  rowsOf,
} from "@/modules/parking/components/parking-ui";
import type { ParkingPass } from "@/modules/parking/types";

export default function ParkingPassesPage() {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // New Pass Dialog State
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [userName, setUserName] = React.useState("");
  const [userPhone, setUserPhone] = React.useState("");
  const [plate, setPlate] = React.useState("");
  const [passType, setPassType] = React.useState("monthly_standard");
  const [price, setPrice] = React.useState(2500);
  const [months, setMonths] = React.useState(1);

  // Queries
  const { data: passesData, isLoading, refetch } = useQuery({
    queryKey: ["parking", "passes", statusFilter, searchQuery],
    queryFn: () => {
      const params: any = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      return parkingApi.listPasses(params).then((res) => res.data.data);
    },
  });

  const passes: ParkingPass[] = passesData?.data ?? [];
  const totalCount = passesData?.total ?? passes.length;

  // Mutations
  const createPassMutation = useMutation({
    mutationFn: (data: any) => parkingApi.createPass(data).then((res) => res.data.data),
    onSuccess: (p) => {
      toast.success(`Pass ${p.pass_code} issued for ${p.user_name}!`);
      setIsAddOpen(false);
      setUserName("");
      setPlate("");
      queryClient.invalidateQueries({ queryKey: ["parking", "passes"] });
    },
    onError: (err) => toast.error(errorText(err, "Failed to issue pass")),
  });

  const renewMutation = useMutation({
    mutationFn: (data: { id: number; months: number }) =>
      parkingApi.renewPass(data.id, data.months).then((res) => res.data.data),
    onSuccess: (p) => {
      toast.success(`Pass ${p.pass_code} renewed successfully through ${formatDateTime(p.valid_to)}!`);
      queryClient.invalidateQueries({ queryKey: ["parking", "passes"] });
    },
    onError: (err) => toast.error(errorText(err, "Failed to renew pass")),
  });

  const activePasses = passes.filter((p) => p.status === "active").length;
  const expiredPasses = passes.filter((p) => p.status === "expired").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly Passes & Season Subscribers"
        subtitle="Manage RFID season tags, corporate employee subscriptions, automated barrier whitelist, and renewals."
        badge={`${totalCount} Total Passes`}
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
                Issue Monthly Pass
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Issue Season Parking Pass</DialogTitle>
                <DialogDescription>
                  Register a vehicle for automated gate barrier access and unlimited parking.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>Subscriber Full Name *</Label>
                  <Input
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="e.g. Dawit Tadesse or Ethio Telecom Corporate"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Phone Number</Label>
                    <Input
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      placeholder="+251 9..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>License Plate *</Label>
                    <Input
                      value={plate}
                      onChange={(e) => setPlate(e.target.value.toUpperCase())}
                      placeholder="e.g. AA-2-45892"
                      className="font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Pass Tier</Label>
                    <select
                      value={passType}
                      onChange={(e) => {
                        setPassType(e.target.value);
                        if (e.target.value === "monthly_vip") setPrice(5000);
                        else if (e.target.value === "annual") setPrice(24000);
                        else setPrice(2500);
                      }}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    >
                      <option value="monthly_standard">Monthly Standard (2,500 ETB)</option>
                      <option value="monthly_vip">Monthly VIP Reserved (5,000 ETB)</option>
                      <option value="annual">Annual Season Pass (24,000 ETB)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Duration (Months)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="12"
                      value={months}
                      onChange={(e) => setMonths(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Total Price Paid (ETB)</Label>
                  <Input
                    type="number"
                    value={price * months}
                    onChange={(e) => setPrice(Number(e.target.value))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    createPassMutation.mutate({
                      user_name: userName,
                      user_phone: userPhone,
                      license_plate: plate,
                      pass_type: passType,
                      price_paid: price * months,
                      status: "active",
                      valid_from: new Date().toISOString(),
                      valid_to: new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString(),
                    })
                  }
                  disabled={createPassMutation.isPending || !userName.trim() || !plate.trim()}
                >
                  {createPassMutation.isPending ? "Issuing..." : "Confirm & Activate Pass"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {/* Metrics Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Subscribers"
          value={activePasses}
          subtitle="Whitelisted for instant barrier entry"
          icon={UserCheck}
          variant="success"
        />
        <StatCard
          title="Pass Revenue"
          value={formatCurrency(passes.reduce((acc, p) => acc + Number(p.price_paid || 0), 0))}
          subtitle="Recurring subscription billings"
          icon={CreditCard}
          variant="info"
        />
        <StatCard
          title="Expiring Soon"
          value={passes.filter((p) => p.status === "active").length}
          subtitle="Next 14 days renewal window"
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Expired / Suspended"
          value={expiredPasses}
          subtitle="Renewals required"
          icon={Calendar}
          variant="default"
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
                placeholder="Search subscriber, phone, or plate..."
                className="pl-9 h-9 text-sm"
              />
            </div>

            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full md:w-auto">
              <TabsList className="grid grid-cols-4 w-full md:w-auto">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="expired">Expired</TabsTrigger>
                <TabsTrigger value="suspended">Suspended</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Passes Table */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            Subscriber Roster
          </CardTitle>
          <CardDescription>
            Showing {passes.length} season pass holders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {passes.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <UserCheck className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm font-semibold">No subscriber passes found.</p>
              <p className="text-xs">Issue a monthly pass above to enroll vehicles.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pass Code</TableHead>
                  <TableHead>Subscriber Name</TableHead>
                  <TableHead>License Plate</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Valid From</TableHead>
                  <TableHead>Expires On</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {passes.map((pass) => (
                  <TableRow key={pass.id}>
                    <TableCell className="font-mono font-medium text-xs">
                      {pass.pass_code}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-sm">{pass.user_name}</div>
                      <div className="text-xs text-muted-foreground">{pass.user_phone || "-"}</div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded bg-muted font-mono font-bold text-xs border border-border/80">
                        {pass.license_plate}
                      </span>
                    </TableCell>
                    <TableCell className="capitalize text-xs">
                      {pass.pass_type.replace("_", " ")}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(pass.valid_from)}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-primary">
                      {formatDateTime(pass.valid_to)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatCurrency(pass.price_paid)}
                    </TableCell>
                    <TableCell>
                      <PassStatusBadge status={pass.status || "active"} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => renewMutation.mutate({ id: pass.id, months: 1 })}
                        disabled={renewMutation.isPending}
                        className="h-7 text-xs gap-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        +1 Month
                      </Button>
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
