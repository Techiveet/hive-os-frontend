"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Pencil, Trash2, Loader2, Star, Crown, History } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  createHospitalityCustomer,
  updateHospitalityCustomer,
  deleteHospitalityCustomer,
  fetchHospitalityCustomerHistory,
} from "@/modules/hospitality/api";
import api from "@/modules/shared/api/http";
import type { HospitalityCustomer } from "@/modules/hospitality/types";
import { DataTable } from "@/components/datatable/data-table";
import type { ColumnDef } from "@tanstack/react-table";

const tierColors: Record<string, string> = {
  bronze: "bg-[#CD7F32]/10 text-[#CD7F32] border-[#CD7F32]/20",
  silver: "bg-slate-100 text-slate-700 border-slate-200",
  gold: "bg-yellow-100 text-yellow-700 border-yellow-200",
  platinum: "bg-slate-800 text-slate-100 border-slate-700",
  none: "bg-muted text-muted-foreground",
};

export default function CRMPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<HospitalityCustomer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<HospitalityCustomer | null>(null);

  // DataTable State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [sortCol, setSortCol] = useState<string>("last_visit_at");
  const [sortDir, setSortDir] = useState<string>("desc");
  const [tableKey, setTableKey] = useState(0);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    date_of_birth: "",
    tier: "none",
    notes: "",
  });

  const { data: customersData, isLoading: isLoadingCustomers, isFetching } = useQuery({
    queryKey: ["hospitality", "customers-paginated", page, pageSize, search, tierFilter, sortCol, sortDir],
    queryFn: async () => {
      const params: Record<string, any> = {
        page,
        per_page: pageSize,
      };
      if (search.trim()) params.search = search.trim();
      if (tierFilter !== "all") params.tier = tierFilter;
      if (sortCol) {
        params.sortCol = sortCol;
        params.sortDir = sortDir;
      }

      const res = await api.get("/hospitality/customers", { params });
      return {
        rows: res.data?.data || [],
        total: res.data?.meta?.total || res.data?.total || 0,
      };
    },
    placeholderData: (prev) => prev,
  });

  const { data: customerHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["hospitality", "customer-history", viewingCustomer?.id],
    queryFn: () => fetchHospitalityCustomerHistory(viewingCustomer!.id),
    enabled: !!viewingCustomer,
  });

  const createMutation = useMutation({
    mutationFn: createHospitalityCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitality", "customers-paginated"] });
      toast.success("Customer profile created");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to create customer");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      updateHospitalityCustomer(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitality", "customers-paginated"] });
      toast.success("Customer profile updated");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update customer");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHospitalityCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitality", "customers-paginated"] });
      toast.success("Customer deleted");
    },
    onError: (error: any) => {
      toast.error("Failed to delete customer");
    },
  });

  const resetForm = () => {
    setEditingCustomer(null);
    setFormData({
      name: "",
      phone: "",
      email: "",
      date_of_birth: "",
      tier: "none",
      notes: "",
    });
  };

  const openEditDialog = useCallback((customer: HospitalityCustomer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || "",
      date_of_birth: customer.date_of_birth ? customer.date_of_birth.split("T")[0] : "",
      tier: customer.tier || "none",
      notes: customer.notes || "",
    });
    setIsDialogOpen(true);
  }, []);

  const openHistoryDialog = useCallback((customer: HospitalityCustomer) => {
    setViewingCustomer(customer);
    setIsHistoryDialogOpen(true);
  }, []);

  const handleDeleteRows = useCallback(async (rows: HospitalityCustomer[]) => {
    try {
      await Promise.all(rows.map((row) => deleteMutation.mutateAsync(row.id)));
      toast.success(`${rows.length} customer(s) deleted.`);
    } catch {
      toast.error("An error occurred during deletion.");
    }
  }, [deleteMutation]);

  const handleQueryChange = useCallback((q: any) => {
    if (q.page !== undefined) setPage(q.page);
    if (q.pageSize !== undefined) setPageSize(q.pageSize);
    if (q.search !== undefined) {
      setSearch((prev) => {
        if (prev !== q.search) {
          setPage(1);
        }
        return q.search;
      });
    }
    if (q.sortCol) setSortCol(q.sortCol);
    if (q.sortDir) setSortDir(q.sortDir);
  }, []);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["hospitality", "customers-paginated"] });
  }, [queryClient]);

  const resetFilters = useCallback(() => {
    setSearch("");
    setTierFilter("all");
    setPage(1);
    setTableKey((prev) => prev + 1);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
    };

    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const columns = useMemo<ColumnDef<HospitalityCustomer>[]>(() => [
    {
      id: "name",
      header: "Customer",
      accessorKey: "name",
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 font-bold border border-indigo-100">
              {customer.name.charAt(0)}
            </div>
            <div>
              <div className="font-medium flex items-center gap-2">
                {customer.name}
                {customer.tier && customer.tier !== "none" && (
                  <Crown className="h-3 w-3 text-yellow-500" />
                )}
              </div>
              {customer.reservations_count !== undefined && (
                <div className="text-xs text-muted-foreground">{customer.reservations_count} total visits</div>
              )}
            </div>
          </div>
        );
      }
    },
    {
      id: "phone",
      header: "Contact",
      accessorKey: "phone",
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <div>
            <div className="text-sm">{customer.phone}</div>
            <div className="text-xs text-muted-foreground">{customer.email || "No email"}</div>
          </div>
        );
      }
    },
    {
      id: "tier",
      header: "Tier & Points",
      accessorKey: "tier",
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <div className="flex flex-col items-start gap-1">
            <Badge variant="outline" className={`capitalize border ${tierColors[customer.tier || "none"]}`}>
              {customer.tier || "Standard"}
            </Badge>
            <div className="text-xs flex items-center gap-1 text-muted-foreground">
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              {customer.loyalty_points || 0} pts
            </div>
          </div>
        );
      }
    },
    {
      id: "last_visit_at",
      header: "Last Visit",
      accessorKey: "last_visit_at",
      cell: ({ row }) => {
        const customer = row.original;
        return customer.last_visit_at ? (
          <div className="text-sm">
            {new Date(customer.last_visit_at).toLocaleDateString()}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Never</span>
        );
      }
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      meta: { align: "right" },
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openHistoryDialog(customer)}
              className="h-8 w-8 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50"
              title="View History"
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEditDialog(customer)}
              className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (confirm("Are you sure you want to delete this customer profile?")) {
                  deleteMutation.mutate(customer.id);
                }
              }}
              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }
  ], [openEditDialog, openHistoryDialog, deleteMutation]);

  return (
    <div className="space-y-8 p-6 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8 text-indigo-500" />
            CRM & Customers
          </h1>
          <p className="text-muted-foreground">Manage your customer relationships, VIP tiers, and history.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) resetForm();
          setIsDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button className="rounded-full px-6 shadow-xl shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingCustomer ? "Edit Customer" : "New Customer Profile"}</DialogTitle>
              <DialogDescription>
                Enter the customer's details and assign a VIP tier if applicable.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tier">VIP Tier</Label>
                  <Select
                    value={formData.tier}
                    onValueChange={(val) => setFormData({ ...formData, tier: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Standard</SelectItem>
                      <SelectItem value="bronze">Bronze</SelectItem>
                      <SelectItem value="silver">Silver</SelectItem>
                      <SelectItem value="gold">Gold</SelectItem>
                      <SelectItem value="platinum">Platinum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="notes">Notes / Preferences</Label>
                  <Textarea
                    id="notes"
                    placeholder="Likes specific tables, allergies, etc."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="w-full"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingCustomer ? "Save Changes" : "Create Profile"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center bg-card/40 border border-border/40 p-4 rounded-[1.5rem] backdrop-blur-sm px-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-xs">Filter Tier:</span>
            <Select value={tierFilter} onValueChange={(val) => { setTierFilter(val); setPage(1); }}>
              <SelectTrigger className="w-[180px] rounded-full bg-background/50 border-border/40 h-10">
                <SelectValue placeholder="Filter by VIP tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="none">Standard</SelectItem>
                <SelectItem value="bronze">Bronze</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="platinum">Platinum</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable
          key={tableKey}
          columns={columns}
          data={customersData?.rows || []}
          totalEntries={customersData?.total || 0}
          loading={isLoadingCustomers || isFetching}
          pageIndex={page}
          pageSize={pageSize}
          onQueryChange={handleQueryChange}
          onRefresh={handleRefresh}
          onResetFilters={resetFilters}
          onDeleteRows={handleDeleteRows}
          searchPlaceholder="Search customers by name, email, or phone..."
          enableRowSelection={true}
          syncWithUrl={true}
          exportEndpoint="/hospitality/customers/export"
          resourceName="customers"
        />
      </div>

      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{viewingCustomer?.name}'s History</DialogTitle>
            <DialogDescription>
              Past reservations and service orders for this customer.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {isLoadingHistory ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : customerHistory?.reservations?.data?.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total Spend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerHistory.reservations.data.map((res: any) => {
                    const spend = res.service_orders?.reduce((acc: number, order: any) => acc + Number(order.total_amount), 0) || 0;
                    return (
                      <TableRow key={res.id}>
                        <TableCell>{new Date(res.reservation_time).toLocaleString()}</TableCell>
                        <TableCell>{res.table?.name || "General Admission"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{res.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ETB {spend.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center p-8 text-muted-foreground">
                No history available for this customer.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
