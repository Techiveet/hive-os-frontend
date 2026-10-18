"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/store/use-translation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  activateAccessCredential,
  cancelVisitor,
  checkInVisitor,
  checkOutVisitor,
  createParkingArea,
  createParkingSpace,
  fetchAccessCredentials,
  fetchParkingAreas,
  fetchParkingSpaces,
  fetchProperties,
  fetchVehicles,
  fetchVisitors,
  issueAccessCredential,
  registerVehicle,
  registerVisitor,
  reportAccessCredentialLost,
  returnAccessCredential,
  revokeAccessCredential,
} from "@/modules/property/api";
import {
  ACCESS_CREDENTIAL_TYPES,
  PARKING_SPACE_TYPES,
  type PropertyAccessCredential,
  type PropertyParkingArea,
  type PropertyVehicle,
  type PropertyVisitorEntry,
} from "@/modules/property/types";

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? fallback;
  }
  return fallback;
};

function PropertyPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { t } = useTranslation();
  const propertiesQuery = useQuery({ queryKey: ["property", "properties", "picker"], queryFn: () => fetchProperties({ per_page: 200 }) });

  return (
    <select className="h-10 w-64 rounded-md border border-input bg-background px-3 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{t("property.mall.select_property", "Select a property...")}</option>
      {(propertiesQuery.data?.data ?? []).map((property) => (
        <option key={property.id} value={property.id}>
          {property.name}
        </option>
      ))}
    </select>
  );
}

function ParkingTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [propertyId, setPropertyId] = React.useState("");
  const [areaOpen, setAreaOpen] = React.useState(false);
  const [areaForm, setAreaForm] = React.useState({ code: "", name: "", level: "" });
  const [spaceArea, setSpaceArea] = React.useState<PropertyParkingArea | null>(null);
  const [spaceForm, setSpaceForm] = React.useState({ code: "", space_type: "general" });

  const areasQuery = useQuery({
    queryKey: ["property", "parking-areas", propertyId],
    queryFn: () => fetchParkingAreas(Number(propertyId)),
    enabled: !!propertyId,
  });

  const spacesQuery = useQuery({
    queryKey: ["property", "parking-spaces", spaceArea?.id],
    queryFn: () => fetchParkingSpaces(spaceArea!.id),
    enabled: spaceArea !== null,
  });

  const createAreaMutation = useMutation({
    mutationFn: () => createParkingArea(Number(propertyId), areaForm),
    onSuccess: () => {
      toast.success(t("property.parking.area_created", "Parking area created."));
      setAreaOpen(false);
      setAreaForm({ code: "", name: "", level: "" });
      queryClient.invalidateQueries({ queryKey: ["property", "parking-areas", propertyId] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  const createSpaceMutation = useMutation({
    mutationFn: () => createParkingSpace(spaceArea!.id, spaceForm),
    onSuccess: () => {
      toast.success(t("property.parking.space_created", "Parking space created."));
      setSpaceForm({ code: "", space_type: "general" });
      queryClient.invalidateQueries({ queryKey: ["property", "parking-spaces", spaceArea?.id] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PropertyPicker value={propertyId} onChange={setPropertyId} />
        {propertyId && (
          <Button size="sm" className="rounded-full" onClick={() => setAreaOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            {t("property.parking.new_area", "New Area")}
          </Button>
        )}
      </div>

      {propertyId && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            {(areasQuery.data ?? []).map((area) => (
              <button
                key={area.id}
                type="button"
                onClick={() => setSpaceArea(area)}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm ${spaceArea?.id === area.id ? "border-primary bg-primary/5" : "border-border/50"}`}
              >
                <p className="font-semibold">{area.name}</p>
                <p className="text-xs text-muted-foreground">{area.code} · {area.spaces_count ?? 0} {t("property.parking.spaces", "spaces")}</p>
              </button>
            ))}
            {areasQuery.data?.length === 0 && <p className="text-sm text-muted-foreground">{t("property.parking.no_areas", "No parking areas yet.")}</p>}
          </div>

          <div className="space-y-2">
            {spaceArea && (
              <>
                <div className="flex items-center gap-2">
                  <Input placeholder={t("property.mall.col_code", "Code")} value={spaceForm.code} onChange={(e) => setSpaceForm((p) => ({ ...p, code: e.target.value }))} />
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={spaceForm.space_type}
                    onChange={(e) => setSpaceForm((p) => ({ ...p, space_type: e.target.value }))}
                  >
                    {PARKING_SPACE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" className="rounded-full" disabled={!spaceForm.code || createSpaceMutation.isPending} onClick={() => createSpaceMutation.mutate()}>
                    {createSpaceMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                {(spacesQuery.data ?? []).map((space) => (
                  <div key={space.id} className="flex items-center justify-between rounded-xl border border-border/50 px-4 py-2 text-sm">
                    <span>{space.code} · {space.space_type}</span>
                    <Badge variant={space.status === "available" ? "default" : "secondary"}>{space.status}</Badge>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      <Dialog open={areaOpen} onOpenChange={setAreaOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle>{t("property.parking.new_area", "New Area")}</DialogTitle>
            </DialogHeader>
          </div>
          <div className="grid gap-4 px-6 py-5">
            <div className="space-y-1">
              <Label>{t("property.mall.col_code", "Code")}</Label>
              <Input value={areaForm.code} onChange={(e) => setAreaForm((p) => ({ ...p, code: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{t("property.common.name", "Name")}</Label>
              <Input value={areaForm.name} onChange={(e) => setAreaForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{t("property.parking.level", "Level")}</Label>
              <Input value={areaForm.level} onChange={(e) => setAreaForm((p) => ({ ...p, level: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="border-t border-border/40 bg-muted/20 px-6 py-4 sm:justify-end">
            <Button variant="outline" className="rounded-full" onClick={() => setAreaOpen(false)}>
              {t("property.common.cancel", "Cancel")}
            </Button>
            <Button className="rounded-full" disabled={!areaForm.code || !areaForm.name || createAreaMutation.isPending} onClick={() => createAreaMutation.mutate()}>
              {createAreaMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("property.common.create", "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VehiclesTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState({ plate_number: "", vehicle_type: "" });

  const vehiclesQuery = useQuery({ queryKey: ["property", "vehicles"], queryFn: () => fetchVehicles({ per_page: 20 }) });

  const registerMutation = useMutation({
    mutationFn: () => registerVehicle(form),
    onSuccess: () => {
      toast.success(t("property.parking.vehicle_registered", "Vehicle registered."));
      setForm({ plate_number: "", vehicle_type: "" });
      queryClient.invalidateQueries({ queryKey: ["property", "vehicles"] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-2xl border border-border/50 p-4">
        <Input placeholder={t("property.parking.plate", "Plate Number")} value={form.plate_number} onChange={(e) => setForm((p) => ({ ...p, plate_number: e.target.value }))} />
        <Input placeholder={t("property.parking.vehicle_type", "Vehicle Type")} value={form.vehicle_type} onChange={(e) => setForm((p) => ({ ...p, vehicle_type: e.target.value }))} />
        <Button size="sm" className="rounded-full" disabled={!form.plate_number || registerMutation.isPending} onClick={() => registerMutation.mutate()}>
          {registerMutation.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1 h-3.5 w-3.5" />}
          {t("property.common.create", "Register")}
        </Button>
      </div>

      <div className="space-y-2">
        {(vehiclesQuery.data?.data ?? []).map((vehicle: PropertyVehicle) => (
          <div key={vehicle.id} className="flex items-center justify-between rounded-xl border border-border/50 px-4 py-3 text-sm">
            <span>{vehicle.plate_number} · {vehicle.vehicle_type ?? "—"}</span>
            <span className="text-muted-foreground">{vehicle.parkingSpace?.code ?? t("property.parking.unparked", "not parked")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccessCredentialsTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ credential_type: "access_card", reference_code: "" });

  const credentialsQuery = useQuery({ queryKey: ["property", "access-credentials"], queryFn: () => fetchAccessCredentials({ per_page: 20 }) });

  const issueMutation = useMutation({
    mutationFn: () => issueAccessCredential(form),
    onSuccess: () => {
      toast.success(t("property.parking.credential_issued", "Credential issued."));
      setOpen(false);
      setForm({ credential_type: "access_card", reference_code: "" });
      queryClient.invalidateQueries({ queryKey: ["property", "access-credentials"] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "activate" | "lost" | "return" | "revoke" }) => {
      if (action === "activate") return activateAccessCredential(id);
      if (action === "lost") return reportAccessCredentialLost(id);
      if (action === "return") return returnAccessCredential(id);
      return revokeAccessCredential(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["property", "access-credentials"] }),
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="rounded-full" onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          {t("property.parking.issue_credential", "Issue Credential")}
        </Button>
      </div>

      <div className="space-y-2">
        {(credentialsQuery.data?.data ?? []).map((credential: PropertyAccessCredential) => (
          <div key={credential.id} className="flex items-center justify-between rounded-xl border border-border/50 px-4 py-3 text-sm">
            <div>
              <p className="font-medium">{credential.reference_code} · {credential.credential_type}</p>
              <p className="text-xs text-muted-foreground">
                {credential.occupant?.name ?? credential.owner?.name ?? credential.employee?.primary_name ?? "—"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={credential.status === "active" ? "default" : "secondary"}>{credential.status}</Badge>
              {credential.status === "issued" && (
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => actionMutation.mutate({ id: credential.id, action: "activate" })}>
                  {t("property.parking.activate", "Activate")}
                </Button>
              )}
              {["issued", "active"].includes(credential.status) && (
                <>
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => actionMutation.mutate({ id: credential.id, action: "lost" })}>
                    {t("property.parking.report_lost", "Lost")}
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => actionMutation.mutate({ id: credential.id, action: "return" })}>
                    {t("property.parking.return", "Return")}
                  </Button>
                  <Button size="sm" variant="destructive" className="rounded-full" onClick={() => actionMutation.mutate({ id: credential.id, action: "revoke" })}>
                    {t("property.parking.revoke", "Revoke")}
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle>{t("property.parking.issue_credential", "Issue Credential")}</DialogTitle>
            </DialogHeader>
          </div>
          <div className="grid gap-4 px-6 py-5">
            <div className="space-y-1">
              <Label>{t("property.parking.credential_type", "Type")}</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.credential_type}
                onChange={(e) => setForm((p) => ({ ...p, credential_type: e.target.value }))}
              >
                {ACCESS_CREDENTIAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>{t("property.parking.reference_code", "Reference Code")}</Label>
              <Input value={form.reference_code} onChange={(e) => setForm((p) => ({ ...p, reference_code: e.target.value }))} />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("property.parking.holder_note", "Attach an occupant, owner, or employee holder via the API — this quick form issues an unassigned credential you can bind next.")}
            </p>
          </div>
          <DialogFooter className="border-t border-border/40 bg-muted/20 px-6 py-4 sm:justify-end">
            <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
              {t("property.common.cancel", "Cancel")}
            </Button>
            <Button className="rounded-full" disabled={!form.reference_code || issueMutation.isPending} onClick={() => issueMutation.mutate()}>
              {issueMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("property.common.create", "Issue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VisitorsTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [propertyId, setPropertyId] = React.useState("");
  const [form, setForm] = React.useState({ visitor_name: "", visitor_contact: "", host_name: "" });

  const visitorsQuery = useQuery({
    queryKey: ["property", "visitors", propertyId],
    queryFn: () => fetchVisitors(Number(propertyId), { per_page: 20 }),
    enabled: !!propertyId,
  });

  const registerMutation = useMutation({
    mutationFn: () => registerVisitor(Number(propertyId), form),
    onSuccess: () => {
      toast.success(t("property.parking.visitor_registered", "Visitor registered."));
      setForm({ visitor_name: "", visitor_contact: "", host_name: "" });
      queryClient.invalidateQueries({ queryKey: ["property", "visitors", propertyId] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "check-in" | "check-out" | "cancel" }) => {
      if (action === "check-in") return checkInVisitor(id);
      if (action === "check-out") return checkOutVisitor(id);
      return cancelVisitor(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["property", "visitors", propertyId] }),
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  return (
    <div className="space-y-4">
      <PropertyPicker value={propertyId} onChange={setPropertyId} />

      {propertyId && (
        <>
          <div className="flex items-end gap-2 rounded-2xl border border-border/50 p-4">
            <div className="space-y-1">
              <Label>{t("property.parking.visitor_name", "Name")}</Label>
              <Input value={form.visitor_name} onChange={(e) => setForm((p) => ({ ...p, visitor_name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{t("property.parking.host", "Host")}</Label>
              <Input value={form.host_name} onChange={(e) => setForm((p) => ({ ...p, host_name: e.target.value }))} />
            </div>
            <Button size="sm" className="rounded-full" disabled={!form.visitor_name || registerMutation.isPending} onClick={() => registerMutation.mutate()}>
              {registerMutation.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1 h-3.5 w-3.5" />}
              {t("property.common.create", "Register")}
            </Button>
          </div>

          <div className="space-y-2">
            {(visitorsQuery.data?.data ?? []).map((entry: PropertyVisitorEntry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-xl border border-border/50 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{entry.visitor_name}</p>
                  <p className="text-xs text-muted-foreground">{entry.host_name ?? "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={entry.status === "checked_in" ? "default" : "secondary"}>{entry.status}</Badge>
                  {entry.status === "expected" && (
                    <>
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => actionMutation.mutate({ id: entry.id, action: "check-in" })}>
                        {t("property.parking.check_in", "Check In")}
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => actionMutation.mutate({ id: entry.id, action: "cancel" })}>
                        {t("property.common.cancel", "Cancel")}
                      </Button>
                    </>
                  )}
                  {entry.status === "checked_in" && (
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => actionMutation.mutate({ id: entry.id, action: "check-out" })}>
                      {t("property.parking.check_out", "Check Out")}
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {visitorsQuery.data?.data?.length === 0 && <p className="text-sm text-muted-foreground">{t("property.parking.no_visitors", "No visitors yet.")}</p>}
          </div>
        </>
      )}
    </div>
  );
}

export default function ParkingPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">{t("property.parking.title", "Parking & Access")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("property.parking.subtitle", "Parking areas and spaces, vehicle permits, access credentials and visitor check-in.")}
        </p>
      </div>

      <Tabs defaultValue="parking">
        <TabsList>
          <TabsTrigger value="parking">{t("property.parking.tab_parking", "Parking")}</TabsTrigger>
          <TabsTrigger value="vehicles">{t("property.parking.tab_vehicles", "Vehicles")}</TabsTrigger>
          <TabsTrigger value="access">{t("property.parking.tab_access", "Access Credentials")}</TabsTrigger>
          <TabsTrigger value="visitors">{t("property.parking.tab_visitors", "Visitors")}</TabsTrigger>
        </TabsList>
        <TabsContent value="parking" className="pt-4">
          <ParkingTab />
        </TabsContent>
        <TabsContent value="vehicles" className="pt-4">
          <VehiclesTab />
        </TabsContent>
        <TabsContent value="access" className="pt-4">
          <AccessCredentialsTab />
        </TabsContent>
        <TabsContent value="visitors" className="pt-4">
          <VisitorsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
