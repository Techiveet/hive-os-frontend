"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { propertyApi } from "@/modules/property/api";
import {
  FormDialog,
  type FormField,
  type FormValues,
  PageHeader,
  PropertyPicker,
  SectionTabs,
  SimpleTable,
  StatusBadge,
  dateOnly,
  errorText,
  optionsFrom,
  rowsOf,
  useOccupierOptions,
} from "@/modules/property/components/property-ui";
import { Panel } from "@/modules/shared/charts/primitives";
import { useTranslation } from "@/store/use-translation";

type Tab = "credentials" | "vehicles";

const CREDENTIAL_TYPES = ["access_card", "qr_pass", "visitor_pass", "key", "rfid"] as const;

function AssignSpaceDialog({ vehicle, onClose, onAssign, busy }: { vehicle: any; onClose: () => void; onAssign: (spaceId: string) => void; busy: boolean }) {
  const [propertyId, setPropertyId] = React.useState("");
  const [areaId, setAreaId] = React.useState("");
  const [spaceId, setSpaceId] = React.useState("");

  const areasQuery = useQuery({
    queryKey: ["property", "parking-areas", propertyId],
    queryFn: () => propertyApi.listParkingAreas(propertyId).then((res) => res.data),
    enabled: Boolean(propertyId),
  });
  const spacesQuery = useQuery({
    queryKey: ["property", "parking-spaces", areaId],
    queryFn: () => propertyApi.listParkingSpaces(areaId).then((res) => res.data),
    enabled: Boolean(areaId),
  });
  const freeSpaces = rowsOf<any>(spacesQuery.data).filter((s) => s.status === "available");
  const selectClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-[2rem] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign a parking space to {vehicle.plate_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <PropertyPicker value={propertyId} onChange={(v) => { setPropertyId(v); setAreaId(""); setSpaceId(""); }} />
          <div className="space-y-1">
            <Label htmlFor="assign-area" className="text-xs">Parking area</Label>
            <select id="assign-area" className={selectClass} value={areaId} onChange={(e) => { setAreaId(e.target.value); setSpaceId(""); }}>
              <option value="">Select…</option>
              {rowsOf<any>(areasQuery.data).map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="assign-space" className="text-xs">Free space</Label>
            <select id="assign-space" className={selectClass} value={spaceId} onChange={(e) => setSpaceId(e.target.value)}>
              <option value="">{areaId && freeSpaces.length === 0 ? "No free spaces" : "Select…"}</option>
              {freeSpaces.map((s) => (
                <option key={s.id} value={s.id}>{s.code} · {s.space_type}</option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!spaceId || busy} onClick={() => onAssign(spaceId)}>Assign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AccessPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [tab, setTab] = React.useState<Tab>("credentials");
  const [dialog, setDialog] = React.useState<"credential" | "vehicle" | { revoke: any } | null>(null);
  const [assigning, setAssigning] = React.useState<any | null>(null);
  const occupierOptions = useOccupierOptions();

  const credentialsQuery = useQuery({
    queryKey: ["property", "credentials"],
    queryFn: () => propertyApi.listCredentials({ per_page: 200 }).then((res) => res.data),
    enabled: tab === "credentials",
  });
  const vehiclesQuery = useQuery({
    queryKey: ["property", "vehicles"],
    queryFn: () => propertyApi.listVehicles({ per_page: 200 }).then((res) => res.data),
    enabled: tab === "vehicles",
  });

  const run = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      toast.success("Done.");
      setDialog(null);
      setAssigning(null);
      queryClient.invalidateQueries({ queryKey: ["property"] });
    },
    onError: (error) => toast.error(errorText(error, "That did not work.")),
  });

  let config: { title: string; fields: FormField[]; initial?: FormValues; submit: (v: FormValues) => Promise<unknown> } | null = null;
  if (dialog === "credential") {
    config = {
      title: "Issue access credential",
      fields: [
        { name: "credential_type", label: "Type", type: "select", options: optionsFrom(CREDENTIAL_TYPES), required: true },
        { name: "reference_code", label: "Card / pass number", required: true },
        { name: "property_tenant_id", label: "Occupier", type: "select", options: occupierOptions },
        { name: "expires_at", label: "Expires", type: "date" },
      ],
      initial: { credential_type: "access_card" },
      submit: (v) => propertyApi.issueCredential(v),
    };
  } else if (dialog === "vehicle") {
    config = {
      title: "Register vehicle",
      fields: [
        { name: "plate_number", label: "Plate number", required: true },
        { name: "vehicle_type", label: "Vehicle type", placeholder: "e.g. car, van" },
        { name: "property_tenant_id", label: "Occupier", type: "select", options: occupierOptions },
        { name: "access_card_reference", label: "Access card" },
        { name: "permit_start_date", label: "Permit from", type: "date" },
        { name: "permit_end_date", label: "Permit to", type: "date" },
        { name: "notes", label: "Notes", type: "textarea" },
      ],
      submit: (v) => propertyApi.createVehicle(v),
    };
  } else if (dialog && typeof dialog === "object") {
    const credential = dialog.revoke;
    config = {
      title: `Revoke ${credential.reference_code}`,
      fields: [{ name: "reason", label: "Reason", type: "textarea" }],
      submit: (v) => propertyApi.credentialAction(credential.id, "revoke", v.reason),
    };
  }

  const credentialActions = (row: any) => {
    const act = (action: "activate" | "lost" | "return") => run.mutate(() => propertyApi.credentialAction(row.id, action));
    if (["revoked", "returned", "lost", "expired"].includes(row.status)) return null;
    return (
      <div className="flex justify-end gap-1">
        {row.status !== "active" ? <Button size="sm" variant="ghost" onClick={() => act("activate")}>Activate</Button> : null}
        <Button size="sm" variant="ghost" onClick={() => act("return")}>Returned</Button>
        <Button size="sm" variant="ghost" onClick={() => act("lost")}>Lost</Button>
        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDialog({ revoke: row })}>Revoke</Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("property.access.title", "Access & vehicles")}
        subtitle={t("property.access.subtitle", "Access cards, passes and keys issued to occupiers and staff, and the vehicles allowed to park.")}
        actions={
          <Button className="rounded-full px-5" onClick={() => setDialog(tab === "credentials" ? "credential" : "vehicle")}>
            <Plus className="mr-2 h-4 w-4" /> {tab === "credentials" ? "Issue credential" : "Register vehicle"}
          </Button>
        }
      />

      <SectionTabs<Tab>
        tabs={[
          { id: "credentials", label: "Access credentials" },
          { id: "vehicles", label: "Vehicles" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "credentials" ? (
        <Panel title="Access credentials">
          <SimpleTable
            loading={credentialsQuery.isLoading}
            rows={rowsOf<any>(credentialsQuery.data)}
            empty="No credentials issued."
            columns={[
              { key: "reference_code", label: "Number", render: (row) => <span className="font-mono text-xs">{row.reference_code}</span> },
              { key: "credential_type", label: "Type" },
              { key: "holder", label: "Holder", render: (row) => row.occupant?.name ?? row.property_tenant?.name ?? row.owner?.name ?? "—" },
              { key: "expires_at", label: "Expires", render: (row) => dateOnly(row.expires_at) },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
              { key: "actions", label: "", className: "text-right", render: credentialActions },
            ]}
          />
        </Panel>
      ) : (
        <Panel title="Vehicles">
          <SimpleTable
            loading={vehiclesQuery.isLoading}
            rows={rowsOf<any>(vehiclesQuery.data)}
            empty="No vehicles registered."
            columns={[
              { key: "plate_number", label: "Plate", render: (row) => <span className="font-mono text-xs">{row.plate_number}</span> },
              { key: "vehicle_type", label: "Type" },
              { key: "holder", label: "Occupier", render: (row) => row.occupant?.name ?? row.property_tenant?.name ?? "—" },
              { key: "permit", label: "Permit", render: (row) => `${dateOnly(row.permit_start_date)} → ${dateOnly(row.permit_end_date)}` },
              { key: "space", label: "Space", render: (row) => row.parking_space?.code ?? (row.parking_space_id ? `#${row.parking_space_id}` : "—") },
              {
                key: "actions",
                label: "",
                className: "text-right",
                render: (row) =>
                  row.parking_space_id ? (
                    <Button size="sm" variant="ghost" onClick={() => run.mutate(() => propertyApi.releaseVehicleSpace(row.id))}>
                      Release space
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setAssigning(row)}>
                      Assign space
                    </Button>
                  ),
              },
            ]}
          />
        </Panel>
      )}

      {config ? (
        <FormDialog
          open
          onOpenChange={(open) => !open && setDialog(null)}
          title={config.title}
          fields={config.fields}
          initial={config.initial}
          submitting={run.isPending}
          onSubmit={(values) => run.mutate(() => config!.submit(values))}
        />
      ) : null}

      {assigning ? (
        <AssignSpaceDialog
          vehicle={assigning}
          busy={run.isPending}
          onClose={() => setAssigning(null)}
          onAssign={(spaceId) => run.mutate(() => propertyApi.assignVehicleSpace(assigning.id, spaceId))}
        />
      ) : null}
    </div>
  );
}
