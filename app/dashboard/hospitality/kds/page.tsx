"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchKdsOrders,
  updateKdsItemStatus,
  fetchPreparationStations,
  type HospitalityKdsItem,
} from "@/modules/hospitality/api";
import { Clock, RefreshCw, ChefHat } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { initEcho } from "@/lib/echo";
import { getAccessToken, getTenantId } from "@/lib/runtime-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type KdsRealtimeEvent = {
  event_id?: string;
  item_id?: number;
  preparation_status?: string;
};

const nextPreparationStatus = (status: string) => {
  if (status === "new") return "accepted";
  if (status === "accepted") return "preparing";
  if (status === "preparing") return "ready";
  return "ready";
};

export default function KdsPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canManageKds = hasPermission("manage_hospitality_kds");
  const [selectedStationId, setSelectedStationId] = useState<number | "all">(
    "all",
  );
  const [openOrderId, setOpenOrderId] = useState<number | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "live" | "offline">("connecting");
  const handledRealtimeEventIds = useRef(new Set<string>());

  const { data: stationsData } = useQuery({
    queryKey: ["preparation-stations"],
    queryFn: () => fetchPreparationStations(),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["kds-orders", selectedStationId],
    queryFn: () =>
      fetchKdsOrders(
        selectedStationId === "all" ? {} : { station_id: selectedStationId },
      ),
    refetchInterval: 5000,
  });

  const orders = data ?? [];
  const stations = stationsData ?? [];
  const realtimeOutletId = stations[0]?.outlet_id ?? undefined;

  const openOrder = useMemo(
    () => orders.find((order) => order.id === openOrderId) ?? null,
    [orders, openOrderId],
  );

  useEffect(() => {
    const token = getAccessToken() ?? (typeof window !== "undefined" ? localStorage.getItem("token") : null);
    const tenantId = getTenantId();
    const outletId = realtimeOutletId;

    if (!token || !tenantId || !outletId) {
      setRealtimeStatus("offline");
      return;
    }

    const channelName = `tenant.${tenantId}.outlet.${outletId}.kds`;
    try {
      const echo = initEcho(token);
      if (!echo) return;
      const channel = echo.private(channelName);
      const onSubscribed = () => setRealtimeStatus("live");
      const onSubscriptionError = () => setRealtimeStatus("offline");
      const stopConnectionWatch = echo.connector.onConnectionChange((status) => {
        setRealtimeStatus(status === "connected" ? "live" : status === "connecting" ? "connecting" : "offline");
      });
      const onUpdate = (event: KdsRealtimeEvent) => {
        const eventId = event.event_id;
        if (eventId) {
          if (handledRealtimeEventIds.current.has(eventId)) return;
          handledRealtimeEventIds.current.add(eventId);
          if (handledRealtimeEventIds.current.size > 100) {
            handledRealtimeEventIds.current.delete(handledRealtimeEventIds.current.values().next().value as string);
          }
        }

        setRealtimeStatus("live");
        void queryClient.invalidateQueries({ queryKey: ["kds-orders"] });
      };

      channel.subscribed(onSubscribed);
      channel.error(onSubscriptionError);
      channel.listen(".kds.item.updated", onUpdate);
      onSubscribed();

      return () => {
        stopConnectionWatch();
        echo.leave(channelName);
      };
    } catch {
      setRealtimeStatus("offline");
    }
  }, [queryClient, realtimeOutletId]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updateKdsItemStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kds-orders"] });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return "bg-rose-500/10 text-rose-600 border-rose-500/30";
      case "accepted":
      case "preparing":
        return "bg-amber-500/10 text-amber-600 border-amber-500/30 animate-pulse";
      case "ready":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const advanceItem = (item: HospitalityKdsItem) => {
    updateStatusMutation.mutate({
      id: item.id,
      status: nextPreparationStatus(item.preparation_status),
    });
  };

  const renderItemRow = (item: HospitalityKdsItem, compact = false) => (
    <div
      key={item.id}
      data-testid={`kds-item-${item.id}`}
      className={`rounded-lg border border-border bg-background flex items-center justify-between gap-2 ${
        compact ? "p-2.5" : "p-3"
      }`}
    >
      <div className="min-w-0">
        <div className="font-bold text-sm text-foreground flex items-center gap-2">
          <span className="w-6 h-6 shrink-0 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
            {item.quantity}x
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={compact ? "truncate" : "break-words"}>{item.item_name}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-left">
              {item.item_name}
            </TooltipContent>
          </Tooltip>
        </div>
        {(item.seat_number || item.course_number) && (
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {item.seat_number ? `Seat: #${item.seat_number}` : null}
            {item.seat_number && item.course_number ? " | " : null}
            {item.course_number ? `Course: #${item.course_number}` : null}
          </div>
        )}
        {!compact && item.notes ? (
          <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{item.notes}</p>
        ) : null}
      </div>

      {canManageKds && (
        <button
          type="button"
          disabled={updateStatusMutation.isPending}
          onClick={(event) => {
            event.stopPropagation();
            advanceItem(item);
          }}
          className={`shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all active:scale-95 ${getStatusBadge(
            item.preparation_status,
          )}`}
        >
          {item.preparation_status.toUpperCase()}
        </button>
      )}
    </div>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="p-4 md:p-6 space-y-6 max-w-[1800px] mx-auto min-h-screen bg-background">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <ChefHat className="w-7 h-7 text-primary" />
              Kitchen Display System (KDS)
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time station order queue & ticket preparation status.
              Auto-refreshes every 5s. Click a ticket to open full details.
            </p>
            <p className="mt-1 text-xs text-muted-foreground" role="status" aria-live="polite">
              Live intake: {realtimeStatus === "live" ? "connected" : realtimeStatus === "connecting" ? "connecting" : "reconnecting"}.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="sr-only" htmlFor="kds-station-filter">Kitchen station</label>
            <select
              id="kds-station-filter"
              value={selectedStationId}
              onChange={(e) =>
                setSelectedStationId(
                  e.target.value === "all" ? "all" : Number(e.target.value),
                )
              }
              className="px-3 py-1.5 text-xs font-semibold border border-border rounded-lg bg-card text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <option value="all">All Kitchen & Bar Stations</option>
              {stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => refetch()}
              aria-label="Refresh kitchen tickets"
              className="p-2 border border-border rounded-lg bg-card text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse">
            Loading active kitchen tickets...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-16 text-center border border-dashed border-border rounded-xl text-muted-foreground flex flex-col items-center gap-2">
            <ChefHat className="w-10 h-10 text-muted-foreground/40" />
            <span className="font-bold text-base">
              All clear! No pending kitchen orders.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders.map((order) => (
              <article
                key={order.id}
                className="bg-card border-2 border-border rounded-xl flex flex-col justify-between overflow-hidden shadow-lg transition-colors hover:border-primary"
              >
                <button
                  type="button"
                  onClick={() => setOpenOrderId(order.id)}
                  aria-label={`Open kitchen ticket ${order.order_number}`}
                  className="p-3 bg-muted/50 border-b border-border flex w-full items-center justify-between gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                >
                  <div className="min-w-0">
                    <div className="font-extrabold text-base text-foreground truncate">
                      {order.order_number}
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-xs text-primary font-bold truncate">
                          {order.location?.label ?? "Dine-In Table"}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {order.location?.label ?? "Dine-In Table"}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {new Date(order.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Open
                    </div>
                  </div>
                </button>

                <div
                  className="p-3 space-y-2.5 flex-1 max-h-[400px] overflow-y-auto cursor-pointer"
                  onClick={() => setOpenOrderId(order.id)}
                >
                  {order.items.map((item) => renderItemRow(item, true))}
                </div>
              </article>
            ))}
          </div>
        )}

        <Dialog
          open={Boolean(openOrder)}
          onOpenChange={(open) => {
            if (!open) setOpenOrderId(null);
          }}
        >
          <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {openOrder ? `Ticket ${openOrder.order_number}` : "Kitchen ticket"}
              </DialogTitle>
              <DialogDescription>
                {openOrder
                  ? `${openOrder.location?.label ?? "Dine-In Table"} · ${new Date(openOrder.created_at).toLocaleString()}`
                  : "Review kitchen ticket details and preparation status."}
              </DialogDescription>
            </DialogHeader>

            {openOrder ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {openOrder.items.length} item{openOrder.items.length === 1 ? "" : "s"} on this ticket.
                  {canManageKds
                    ? " Use the status buttons to advance preparation."
                    : " Status changes require manage_hospitality_kds."}
                </p>
                <div className="space-y-2.5">
                  {openOrder.items.map((item) => renderItemRow(item, false))}
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
