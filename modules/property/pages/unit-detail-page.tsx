"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/store/use-translation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { enableUnitMaintenance, fetchUnit } from "@/modules/property/api";
import { serviceApi } from "@/modules/service/api";
import type { Paginated, RequestStatus, ServiceRequest } from "@/modules/service/types";

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? fallback;
  }
  return fallback;
};

// Mirrors ServiceRequest::TRANSITIONS on the backend.
const NEXT_STATUSES: Record<RequestStatus, RequestStatus[]> = {
  new: ["acknowledged", "in_progress", "cancelled"],
  acknowledged: ["in_progress", "on_hold", "cancelled"],
  in_progress: ["resolved", "on_hold", "cancelled"],
  on_hold: ["in_progress", "cancelled"],
  resolved: ["closed", "in_progress"],
  closed: [],
  cancelled: [],
};

export default function UnitDetailPage() {
  const params = useParams<{ id: string }>();
  const unitId = Number(params.id);
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [requestOpen, setRequestOpen] = React.useState(false);
  const [requestForm, setRequestForm] = React.useState({ subject: "", description: "", priority: "normal" });

  const unitQuery = useQuery({
    queryKey: ["property", "units", unitId],
    queryFn: () => fetchUnit(unitId),
    enabled: Number.isFinite(unitId),
  });

  const assetId = unitQuery.data?.service_asset_id ?? undefined;

  const requestsQuery = useQuery({
    queryKey: ["service", "requests", "by-asset", assetId],
    queryFn: async () => (await serviceApi.listRequests({ asset_id: assetId })).data as Paginated<ServiceRequest>,
    enabled: !!assetId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["property", "units", unitId] });
    queryClient.invalidateQueries({ queryKey: ["service", "requests", "by-asset", assetId] });
  };

  const enableMutation = useMutation({
    mutationFn: () => enableUnitMaintenance(unitId),
    onSuccess: () => {
      toast.success(t("property.maintenance.enabled", "Maintenance tracking enabled."));
      invalidate();
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  const createRequestMutation = useMutation({
    mutationFn: async () => serviceApi.createRequest({ asset_id: assetId, ...requestForm }),
    onSuccess: () => {
      toast.success(t("property.maintenance.request_raised", "Request raised."));
      setRequestOpen(false);
      setRequestForm({ subject: "", description: "", priority: "normal" });
      invalidate();
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  const transitionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: RequestStatus }) => serviceApi.transitionRequest(id, status),
    onSuccess: () => {
      toast.success(t("property.maintenance.status_updated", "Status updated."));
      invalidate();
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  if (unitQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const unit = unitQuery.data;
  if (!unit) {
    return <p className="text-sm text-muted-foreground">{t("property.detail.not_found", "Not found.")}</p>;
  }

  const requests = requestsQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">{unit.unit_code}</h1>
        <p className="text-sm text-muted-foreground">
          {unit.property?.name} · {unit.unit_type.replace(/_/g, " ")}
        </p>
        <div className="mt-2">
          <Badge>{unit.status.replace(/_/g, " ")}</Badge>
        </div>
      </div>

      <Card className="rounded-[2rem] border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("property.maintenance.title", "Maintenance")}</CardTitle>
          {assetId && (
            <Button size="sm" className="rounded-full" onClick={() => setRequestOpen(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t("property.maintenance.raise_request", "Raise Request")}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {!assetId ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t("property.maintenance.not_enabled", "Maintenance tracking is not enabled for this unit yet.")}
              </p>
              <Button size="sm" className="rounded-full" disabled={enableMutation.isPending} onClick={() => enableMutation.mutate()}>
                {enableMutation.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                {t("property.maintenance.enable", "Enable Maintenance Tracking")}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map((request) => (
                <div key={request.id} className="rounded-xl border border-border/50 px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{request.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {request.request_number} · {request.priority}
                      </p>
                    </div>
                    <Badge variant="outline">{request.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {NEXT_STATUSES[request.status].map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        disabled={transitionMutation.isPending}
                        onClick={() => transitionMutation.mutate({ id: request.id, status })}
                      >
                        {status.replace(/_/g, " ")}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
              {requests.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("property.maintenance.no_requests", "No maintenance requests yet.")}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle>{t("property.maintenance.raise_request", "Raise Request")}</DialogTitle>
              <DialogDescription>{t("property.maintenance.request_desc", "Tracked through Service Management.")}</DialogDescription>
            </DialogHeader>
          </div>
          <div className="grid gap-4 px-6 py-5">
            <div className="space-y-2">
              <Label htmlFor="request-subject">{t("property.maintenance.subject", "Subject")}</Label>
              <Input id="request-subject" value={requestForm.subject} onChange={(e) => setRequestForm((p) => ({ ...p, subject: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-description">{t("property.common.description", "Description")}</Label>
              <Input id="request-description" value={requestForm.description} onChange={(e) => setRequestForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t("property.maintenance.priority", "Priority")}</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={requestForm.priority}
                onChange={(e) => setRequestForm((p) => ({ ...p, priority: e.target.value }))}
              >
                <option value="low">low</option>
                <option value="normal">normal</option>
                <option value="high">high</option>
                <option value="critical">critical</option>
              </select>
            </div>
          </div>
          <DialogFooter className="border-t border-border/40 bg-muted/20 px-6 py-4 sm:justify-end">
            <Button variant="outline" className="rounded-full" onClick={() => setRequestOpen(false)}>
              {t("property.common.cancel", "Cancel")}
            </Button>
            <Button className="rounded-full" disabled={!requestForm.subject.trim() || createRequestMutation.isPending} onClick={() => createRequestMutation.mutate()}>
              {createRequestMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("property.common.create", "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
