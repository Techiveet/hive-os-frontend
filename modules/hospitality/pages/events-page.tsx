"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck2, Plus, Pencil, Trash2, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import { DataTable } from "@/components/datatable/data-table";
import api from "@/modules/shared/api/http";
import type { ColumnDef } from "@tanstack/react-table";

import {
  createHospitalityEvent,
  updateHospitalityEvent,
  deleteHospitalityEvent,
} from "@/modules/hospitality/api";
import type { HospitalityEvent } from "@/modules/hospitality/types";

export default function EventsPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<HospitalityEvent | null>(null);

  // DataTable State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState("start_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState("all");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [tableKey, setTableKey] = useState(0);

  const handleQueryChange = React.useCallback((q: any) => {
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

  const { data, isLoading: isLoadingEvents } = useQuery({
    queryKey: [
      "hospitality",
      "events",
      page,
      pageSize,
      search,
      sortCol,
      sortDir,
      statusFilter,
      eventTypeFilter,
    ],
    queryFn: async () => {
      const params: Record<string, any> = {
        page,
        per_page: pageSize,
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "all") params.status = statusFilter;
      if (eventTypeFilter !== "all") params.event_type = eventTypeFilter;
      if (sortCol) {
        params.sortCol = sortCol;
        params.sortDir = sortDir;
      }

      const res = await api.get("/hospitality/events", { params });
      return {
        rows: res.data?.data || [],
        total: res.data?.meta?.total || res.data?.total || 0,
      };
    },
  });

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    event_type: "party",
    start_at: new Date().toISOString().slice(0, 16),
    end_at: new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 16),
    is_private: false,
    min_guests: "",
    max_guests: "",
    ticket_price: "",
    status: "draft",
    cover_image_url: "",
  });

  const createMutation = useMutation({
    mutationFn: createHospitalityEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitality", "events"] });
      toast.success("Event created successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to create event");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      updateHospitalityEvent(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitality", "events"] });
      toast.success("Event updated successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update event");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHospitalityEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitality", "events"] });
      toast.success("Event deleted");
    },
    onError: (error: any) => {
      toast.error("Failed to delete event");
    },
  });

  const resetForm = () => {
    setEditingEvent(null);
    setFormData({
      name: "",
      description: "",
      event_type: "party",
      start_at: new Date().toISOString().slice(0, 16),
      end_at: new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 16),
      is_private: false,
      min_guests: "",
      max_guests: "",
      ticket_price: "",
      status: "draft",
      cover_image_url: "",
    });
  };

  const openEditDialog = (event: HospitalityEvent) => {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      description: event.description || "",
      event_type: event.event_type,
      start_at: event.start_at.replace(" ", "T").slice(0, 16),
      end_at: event.end_at.replace(" ", "T").slice(0, 16),
      is_private: event.is_private,
      min_guests: event.min_guests ? String(event.min_guests) : "",
      max_guests: event.max_guests ? String(event.max_guests) : "",
      ticket_price: event.ticket_price || "",
      status: event.status,
      cover_image_url: event.cover_image_url || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      start_at: formData.start_at.replace("T", " ") + (formData.start_at.length === 16 ? ":00" : ""),
      end_at: formData.end_at.replace("T", " ") + (formData.end_at.length === 16 ? ":00" : ""),
      min_guests: formData.min_guests ? Number(formData.min_guests) : null,
      max_guests: formData.max_guests ? Number(formData.max_guests) : null,
      ticket_price: formData.ticket_price ? Number(formData.ticket_price) : null,
    };

    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const statusColors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    published: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
    completed: "bg-blue-100 text-blue-700",
  };

  const columns: ColumnDef<HospitalityEvent>[] = [
    { 
      id: "name",
      accessorKey: "name", 
      header: "Event Name", 
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          {row.original.is_private && (
            <Badge variant="outline" className="text-xs bg-slate-50 mt-1">Private Event</Badge>
          )}
        </div>
      )
    },
    { 
      id: "start_at",
      accessorKey: "start_at", 
      header: "Date & Time", 
      cell: ({ row }) => {
        const startDate = new Date(row.original.start_at);
        const endDate = new Date(row.original.end_at);
        return (
          <div>
            <div className="text-sm">{startDate.toLocaleDateString()}</div>
            <div className="text-xs text-muted-foreground">
              {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
              {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        );
      }
    },
    { 
      id: "event_type",
      accessorKey: "event_type", 
      header: "Type & Status", 
      cell: ({ row }) => (
        <div className="flex flex-col items-start gap-1">
          <Badge variant="outline" className="capitalize">{row.original.event_type.replace('_', ' ')}</Badge>
          <Badge className={`capitalize ${statusColors[row.original.status] || "bg-muted"}`} variant="secondary">
            {row.original.status}
          </Badge>
        </div>
      )
    },
    { 
      id: "stats",
      header: "Stats", 
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {row.original.blocked_locations_count || 0} tables blocked
          </div>
          <div className="flex items-center gap-1">
            <CalendarCheck2 className="h-3 w-3" />
            {row.original.reservations_count || 0} reservations
          </div>
        </div>
      )
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openEditDialog(row.original)}
            className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm("Are you sure you want to delete this event?")) {
                deleteMutation.mutate(row.original.id);
              }
            }}
            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const exportUrl = React.useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (eventTypeFilter !== "all") params.set("event_type", eventTypeFilter);
    params.set("sortCol", sortCol);
    params.set("sortDir", sortDir);
    return `/hospitality/events/export?${params.toString()}`;
  }, [search, statusFilter, eventTypeFilter, sortCol, sortDir]);

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <CalendarCheck2 className="h-8 w-8 text-indigo-500" />
            Events Management
          </h1>
          <p className="text-muted-foreground">Schedule parties, private bookings, and live music events.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) resetForm();
          setIsDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button className="rounded-full px-6 shadow-xl shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEvent ? "Edit Event" : "Create New Event"}</DialogTitle>
              <DialogDescription>
                Fill in the details for your upcoming event.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="name">Event Name *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="event_type">Type</Label>
                  <Select
                    value={formData.event_type}
                    onValueChange={(val) => setFormData({ ...formData, event_type: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Event Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="party">Party</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="corporate">Corporate</SelectItem>
                      <SelectItem value="promotion">Promotion</SelectItem>
                      <SelectItem value="live_music">Live Music</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val) => setFormData({ ...formData, status: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start_at">Start Time *</Label>
                  <Input
                    id="start_at"
                    type="datetime-local"
                    required
                    value={formData.start_at}
                    onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_at">End Time *</Label>
                  <Input
                    id="end_at"
                    type="datetime-local"
                    required
                    value={formData.end_at}
                    onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ticket_price">Ticket Price (Optional)</Label>
                  <Input
                    id="ticket_price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 500"
                    value={formData.ticket_price}
                    onChange={(e) => setFormData({ ...formData, ticket_price: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label>Private Event</Label>
                    <p className="text-xs text-muted-foreground">Hide from public calendar.</p>
                  </div>
                  <Switch
                    checked={formData.is_private}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_private: checked })}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  {editingEvent ? "Save Changes" : "Create Event"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 items-center w-full justify-between mb-2">
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="party">Party</SelectItem>
              <SelectItem value="private">Private</SelectItem>
              <SelectItem value="corporate">Corporate</SelectItem>
              <SelectItem value="promotion">Promotion</SelectItem>
              <SelectItem value="live_music">Live Music</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={() => setTableKey(prev => prev + 1)}>
          Refresh Data
        </Button>
      </div>

      <div className="rounded-[2rem] border bg-card overflow-hidden">
        <DataTable
          key={tableKey}
          data={data?.rows || []}
          columns={columns}
          totalEntries={data?.total || 0}
          loading={isLoadingEvents}
          pageIndex={page}
          pageSize={pageSize}
          onQueryChange={handleQueryChange}
          searchPlaceholder="Search events..."
          exportEndpoint={exportUrl}
          resourceName="events"
          syncWithUrl={true}
        />
      </div>
    </div>
  );
}
