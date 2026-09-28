"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { propertyApi } from "@/modules/property/api";
import { DocumentsPanel } from "@/modules/property/components/documents-panel";
import {
  FormDialog,
  type FormField,
  type FormValues,
  SectionTabs,
  SimpleTable,
  StatusBadge,
  dateTime,
  errorText,
  humanize,
  money,
  optionsFrom,
  rowsOf,
} from "@/modules/property/components/property-ui";
import { propertyFields } from "@/modules/property/pages/PropertiesPage";
import { UNIT_TYPES } from "@/modules/property/pages/UnitsPage";
import { EmptyPanel, LoadingPanel, Panel, StatTile } from "@/modules/shared/charts/primitives";

type Tab = "structure" | "units" | "parking" | "visitors" | "documents";

const SPACE_TYPES = ["general", "reserved", "visitor", "tenant", "employee", "disabled", "ev_charging"] as const;

type DialogKind = "edit" | "building" | "floor" | "zone" | "unit" | "parking-area" | "parking-space" | "visitor" | null;

export default function PropertyDetailPage() {
  const params = useParams();
  const propertyId = String(params?.id ?? "");
  const queryClient = useQueryClient();
  const [tab, setTab] = React.useState<Tab>("structure");
  const [dialog, setDialog] = React.useState<DialogKind>(null);
  const [selectedBuilding, setSelectedBuilding] = React.useState<number | null>(null);
  const [selectedArea, setSelectedArea] = React.useState<number | null>(null);

  const propertyQuery = useQuery({
    queryKey: ["property", "property", propertyId],
    queryFn: () => propertyApi.getProperty(propertyId).then((res) => res.data),
    enabled: Boolean(propertyId),
  });
  const buildingsQuery = useQuery({
    queryKey: ["property", "buildings", propertyId],
    queryFn: () => propertyApi.listBuildings(propertyId).then((res) => res.data),
    enabled: Boolean(propertyId),
  });
  const zonesQuery = useQuery({
    queryKey: ["property", "zones", propertyId],
    queryFn: () => propertyApi.listZones(propertyId).then((res) => res.data),
    enabled: Boolean(propertyId),
  });
  const unitsQuery = useQuery({
    queryKey: ["property", "units", { property_id: propertyId }],
    queryFn: () => propertyApi.listUnits({ property_id: propertyId, per_page: 200 }).then((res) => res.data),
    enabled: Boolean(propertyId) && tab === "units",
  });
  const areasQuery = useQuery({
    queryKey: ["property", "parking-areas", propertyId],
    queryFn: () => propertyApi.listParkingAreas(propertyId).then((res) => res.data),
    enabled: Boolean(propertyId) && tab === "parking",
  });
  const spacesQuery = useQuery({
    queryKey: ["property", "parking-spaces", selectedArea],
    queryFn: () => propertyApi.listParkingSpaces(selectedArea as number).then((res) => res.data),
    enabled: selectedArea !== null,
  });
  const visitorsQuery = useQuery({
    queryKey: ["property", "visitors", propertyId],
    queryFn: () => propertyApi.listVisitors(propertyId, { per_page: 100 }).then((res) => res.data),
    enabled: Boolean(propertyId) && tab === "visitors",
  });

  const buildings = rowsOf<any>(buildingsQuery.data);
  const zones = rowsOf<any>(zonesQuery.data);

  // Floors for every building: the unit and zone forms offer any of them.
  const floorQueries = useQueries({
    queries: buildings.map((building) => ({
      queryKey: ["property", "floors", building.id],
      queryFn: () => propertyApi.listFloors(building.id).then((res) => res.data),
    })),
  });
  const floorsByBuilding = React.useMemo(() => {
    const map = new Map<number, any[]>();
    buildings.forEach((building, index) => map.set(building.id, rowsOf<any>(floorQueries[index]?.data)));
    return map;
  }, [buildings, floorQueries]);
  const allFloors = React.useMemo(
    () =>
      buildings.flatMap((building) =>
        (floorsByBuilding.get(building.id) ?? []).map((floor) => ({ ...floor, building_name: building.name })),
      ),
    [buildings, floorsByBuilding],
  );

  React.useEffect(() => {
    if (selectedBuilding === null && buildings.length > 0) setSelectedBuilding(buildings[0].id);
  }, [buildings, selectedBuilding]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["property"] });
  const onError = (error: unknown) => toast.error(errorText(error, "Could not save it."));

  const save = useMutation({
    mutationFn: ({ kind, values }: { kind: Exclude<DialogKind, null>; values: FormValues }) => {
      switch (kind) {
        case "edit":
          return propertyApi.updateProperty(propertyId, values);
        case "building":
          return propertyApi.createBuilding(propertyId, values);
        case "floor":
          return propertyApi.createFloor(selectedBuilding as number, values);
        case "zone":
          return propertyApi.createZone(propertyId, values);
        case "unit":
          return propertyApi.createUnit(propertyId, values);
        case "parking-area":
          return propertyApi.createParkingArea(propertyId, values);
        case "parking-space":
          return propertyApi.createParkingSpace(selectedArea as number, values);
        case "visitor":
          return propertyApi.registerVisitor(propertyId, values);
      }
    },
    onSuccess: () => {
      toast.success("Saved.");
      setDialog(null);
      invalidate();
    },
    onError,
  });

  const action = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      toast.success("Done.");
      invalidate();
    },
    onError: (error) => toast.error(errorText(error, "That did not work.")),
  });

  const property = propertyQuery.data;

  if (propertyQuery.isLoading) return <LoadingPanel label="Loading property…" />;
  if (!property) return <EmptyPanel label="This property could not be found." />;

  const buildingOptions = buildings.map((b) => ({ value: b.id, label: b.name }));
  const floorOptions = allFloors.map((f) => ({ value: f.id, label: `${f.building_name} · ${f.name || f.code}` }));
  const zoneOptions = zones.map((z) => ({ value: z.id, label: z.name }));

  const dialogs: Record<Exclude<DialogKind, null>, { title: string; fields: FormField[]; initial?: FormValues }> = {
    edit: { title: "Edit property", fields: propertyFields, initial: property },
    building: {
      title: "Add building",
      fields: [
        { name: "name", label: "Name", required: true },
        { name: "code", label: "Code" },
        { name: "type", label: "Type", placeholder: "e.g. tower, block, annex" },
        { name: "floors_count", label: "Floors above ground", type: "number", min: 0 },
        { name: "underground_floors_count", label: "Floors below ground", type: "number", min: 0 },
        { name: "year_built", label: "Year built", placeholder: "YYYY" },
        { name: "gross_floor_area", label: "Gross floor area (m²)", type: "number", min: 0 },
        { name: "net_leasable_area", label: "Net leasable area (m²)", type: "number", min: 0 },
      ],
    },
    floor: {
      title: "Add floor",
      fields: [
        { name: "code", label: "Code", required: true, placeholder: "e.g. G, 1, B1" },
        { name: "name", label: "Name" },
        { name: "level", label: "Level", type: "number", required: true, help: "0 for ground, negative for basements." },
        { name: "gross_area", label: "Gross area (m²)", type: "number", min: 0 },
      ],
    },
    zone: {
      title: "Add zone",
      fields: [
        { name: "code", label: "Code", required: true },
        { name: "name", label: "Name", required: true },
        { name: "type", label: "Type", placeholder: "e.g. food court, wing" },
        { name: "floor_id", label: "Floor", type: "select", options: floorOptions },
      ],
    },
    unit: {
      title: "Add unit",
      fields: [
        { name: "unit_code", label: "Unit code", placeholder: "Generated when left empty" },
        { name: "unit_type", label: "Type", type: "select", options: optionsFrom(UNIT_TYPES), required: true },
        { name: "building_id", label: "Building", type: "select", options: buildingOptions },
        { name: "floor_id", label: "Floor", type: "select", options: floorOptions },
        { name: "zone_id", label: "Zone", type: "select", options: zoneOptions },
        { name: "usage_type", label: "Usage", placeholder: "e.g. residential, retail" },
        { name: "floor_area", label: "Floor area (m²)", type: "number", min: 0 },
        { name: "rentable_area", label: "Rentable area (m²)", type: "number", min: 0 },
        { name: "bedrooms", label: "Bedrooms", type: "number", min: 0 },
        { name: "bathrooms", label: "Bathrooms", type: "number", min: 0 },
        { name: "rent_rate", label: "Asking rent", type: "number", min: 0 },
        { name: "min_rent_rate", label: "Minimum rent", type: "number", min: 0 },
        { name: "availability_date", label: "Available from", type: "date" },
        { name: "is_furnished", label: "Furnished", type: "checkbox" },
      ],
    },
    "parking-area": {
      title: "Add parking area",
      fields: [
        { name: "code", label: "Code", required: true },
        { name: "name", label: "Name", required: true },
        { name: "level", label: "Level", placeholder: "e.g. B1, ground" },
        { name: "description", label: "Description", type: "textarea" },
      ],
    },
    "parking-space": {
      title: "Add parking space",
      fields: [
        { name: "code", label: "Code", required: true },
        { name: "space_type", label: "Type", type: "select", options: optionsFrom(SPACE_TYPES) },
      ],
    },
    visitor: {
      title: "Register visitor",
      fields: [
        { name: "visitor_name", label: "Visitor name", required: true },
        { name: "visitor_contact", label: "Phone or email" },
        { name: "host_name", label: "Visiting" },
        { name: "vehicle_plate", label: "Vehicle plate" },
        { name: "scheduled_at", label: "Expected at", type: "datetime-local" },
        { name: "notes", label: "Notes", type: "textarea" },
      ],
    },
  };

  const activeDialog = dialog ? dialogs[dialog] : null;
  const buildingFloors = selectedBuilding ? floorsByBuilding.get(selectedBuilding) ?? [] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Link href="/dashboard/property/properties" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Properties
          </Link>
          <h1 className="text-3xl font-black tracking-tight">{property.name}</h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono text-xs">{property.code}</span>
            <span className="capitalize">{humanize(property.type)}</span>
            <StatusBadge status={property.status} />
            {property.city ? <span>{[property.sub_city, property.city].filter(Boolean).join(", ")}</span> : null}
          </p>
        </div>
        <Button variant="outline" className="rounded-full" onClick={() => setDialog("edit")}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Buildings" value={String(buildings.length)} />
        <StatTile label="Zones" value={String(zones.length)} />
        <StatTile label="Leasable area" value={property.leasable_area ? `${Number(property.leasable_area).toLocaleString()} m²` : "—"} />
        <StatTile label="Parking capacity" value={property.parking_capacity ? String(property.parking_capacity) : "—"} />
      </div>

      <SectionTabs<Tab>
        tabs={[
          { id: "structure", label: "Buildings, floors & zones" },
          { id: "units", label: "Units" },
          { id: "parking", label: "Parking" },
          { id: "visitors", label: "Visitors" },
          { id: "documents", label: "Documents" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "structure" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel
            title="Buildings"
            action={
              <Button size="sm" variant="outline" onClick={() => setDialog("building")}>
                <Plus className="mr-1 h-4 w-4" /> Building
              </Button>
            }
          >
            <SimpleTable
              loading={buildingsQuery.isLoading}
              rows={buildings}
              empty="No buildings yet."
              columns={[
                {
                  key: "name",
                  label: "Building",
                  render: (row) => (
                    <button
                      type="button"
                      onClick={() => setSelectedBuilding(row.id)}
                      className={`text-left font-semibold ${selectedBuilding === row.id ? "text-primary" : "hover:underline"}`}
                    >
                      {row.name}
                    </button>
                  ),
                },
                { key: "code", label: "Code" },
                { key: "floors_count", label: "Floors" },
                {
                  key: "actions",
                  label: "",
                  className: "text-right",
                  render: (row) => (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      aria-label="Delete building"
                      onClick={() => {
                        if (window.confirm(`Delete ${row.name}?`)) action.mutate(() => propertyApi.deleteBuilding(propertyId, row.id));
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ),
                },
              ]}
            />
          </Panel>

          <Panel
            title={`Floors${selectedBuilding ? ` · ${buildings.find((b) => b.id === selectedBuilding)?.name ?? ""}` : ""}`}
            action={
              <Button size="sm" variant="outline" disabled={!selectedBuilding} onClick={() => setDialog("floor")}>
                <Plus className="mr-1 h-4 w-4" /> Floor
              </Button>
            }
          >
            <SimpleTable
              rows={[...buildingFloors].sort((a, b) => Number(a.level) - Number(b.level))}
              empty={selectedBuilding ? "No floors yet." : "Add a building first."}
              columns={[
                { key: "level", label: "Level" },
                { key: "code", label: "Code" },
                { key: "name", label: "Name" },
                {
                  key: "actions",
                  label: "",
                  className: "text-right",
                  render: (row) => (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      aria-label="Delete floor"
                      onClick={() => {
                        if (window.confirm("Delete this floor?")) action.mutate(() => propertyApi.deleteFloor(selectedBuilding as number, row.id));
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ),
                },
              ]}
            />
          </Panel>

          <Panel
            title="Zones"
            description="Wings, food courts or other areas used to group units."
            action={
              <Button size="sm" variant="outline" onClick={() => setDialog("zone")}>
                <Plus className="mr-1 h-4 w-4" /> Zone
              </Button>
            }
          >
            <SimpleTable
              loading={zonesQuery.isLoading}
              rows={zones}
              empty="No zones yet."
              columns={[
                { key: "code", label: "Code" },
                { key: "name", label: "Name" },
                { key: "type", label: "Type" },
                {
                  key: "actions",
                  label: "",
                  className: "text-right",
                  render: (row) => (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      aria-label="Delete zone"
                      onClick={() => {
                        if (window.confirm("Delete this zone?")) action.mutate(() => propertyApi.deleteZone(propertyId, row.id));
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ),
                },
              ]}
            />
          </Panel>
        </div>
      ) : null}

      {tab === "units" ? (
        <Panel
          title="Units"
          action={
            <Button size="sm" onClick={() => setDialog("unit")}>
              <Plus className="mr-1 h-4 w-4" /> Unit
            </Button>
          }
        >
          <SimpleTable
            loading={unitsQuery.isLoading}
            rows={rowsOf<any>(unitsQuery.data)}
            empty="No units yet."
            columns={[
              {
                key: "unit_code",
                label: "Unit",
                render: (row) => (
                  <Link href={`/dashboard/property/units/${row.id}`} className="font-semibold text-primary hover:underline">
                    {row.unit_code}
                  </Link>
                ),
              },
              { key: "unit_type", label: "Type" },
              { key: "building", label: "Building", render: (row) => row.building?.name ?? "—" },
              { key: "floor", label: "Floor", render: (row) => row.floor?.name ?? row.floor?.level ?? "—" },
              { key: "rentable_area", label: "Area (m²)" },
              { key: "rent_rate", label: "Asking rent", render: (row) => (row.rent_rate ? money(row.rent_rate, row.currency || "ETB") : "—") },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
            ]}
          />
        </Panel>
      ) : null}

      {tab === "parking" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel
            title="Parking areas"
            action={
              <Button size="sm" variant="outline" onClick={() => setDialog("parking-area")}>
                <Plus className="mr-1 h-4 w-4" /> Area
              </Button>
            }
          >
            <SimpleTable
              loading={areasQuery.isLoading}
              rows={rowsOf<any>(areasQuery.data)}
              empty="No parking areas yet."
              columns={[
                {
                  key: "name",
                  label: "Area",
                  render: (row) => (
                    <button
                      type="button"
                      onClick={() => setSelectedArea(row.id)}
                      className={`text-left font-semibold ${selectedArea === row.id ? "text-primary" : "hover:underline"}`}
                    >
                      {row.name}
                    </button>
                  ),
                },
                { key: "code", label: "Code" },
                { key: "level", label: "Level" },
              ]}
            />
          </Panel>
          <Panel
            title="Spaces"
            description={selectedArea ? undefined : "Pick an area to see its spaces."}
            action={
              <Button size="sm" variant="outline" disabled={!selectedArea} onClick={() => setDialog("parking-space")}>
                <Plus className="mr-1 h-4 w-4" /> Space
              </Button>
            }
          >
            <SimpleTable
              loading={spacesQuery.isLoading && selectedArea !== null}
              rows={rowsOf<any>(spacesQuery.data)}
              empty={selectedArea ? "No spaces yet." : "No area selected."}
              columns={[
                { key: "code", label: "Space" },
                { key: "space_type", label: "Type" },
                { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
                {
                  key: "actions",
                  label: "",
                  className: "text-right",
                  render: (row) =>
                    row.assigned_lease_id || row.assigned_employee_id ? (
                      <Button size="sm" variant="ghost" onClick={() => action.mutate(() => propertyApi.releaseParkingSpace(row.id))}>
                        Release
                      </Button>
                    ) : null,
                },
              ]}
            />
          </Panel>
        </div>
      ) : null}

      {tab === "visitors" ? (
        <Panel
          title="Visitors"
          description="Register expected visitors, then check them in and out at the gate."
          action={
            <Button size="sm" onClick={() => setDialog("visitor")}>
              <Plus className="mr-1 h-4 w-4" /> Visitor
            </Button>
          }
        >
          <SimpleTable
            loading={visitorsQuery.isLoading}
            rows={rowsOf<any>(visitorsQuery.data)}
            empty="No visitors registered."
            columns={[
              { key: "visitor_name", label: "Visitor", render: (row) => <span className="font-medium">{row.visitor_name}</span> },
              { key: "host_name", label: "Visiting" },
              { key: "vehicle_plate", label: "Vehicle" },
              { key: "scheduled_at", label: "Expected", render: (row) => dateTime(row.scheduled_at) },
              { key: "arrived_at", label: "Arrived", render: (row) => dateTime(row.arrived_at) },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
              {
                key: "actions",
                label: "",
                className: "text-right",
                render: (row) => (
                  <div className="flex justify-end gap-1">
                    {!row.arrived_at && row.status !== "cancelled" ? (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => action.mutate(() => propertyApi.visitorAction(row.id, "check-in"))}>
                          Check in
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => action.mutate(() => propertyApi.visitorAction(row.id, "cancel"))}>
                          Cancel
                        </Button>
                      </>
                    ) : null}
                    {row.arrived_at && !row.departed_at ? (
                      <Button size="sm" variant="ghost" onClick={() => action.mutate(() => propertyApi.visitorAction(row.id, "check-out"))}>
                        Check out
                      </Button>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
        </Panel>
      ) : null}

      {tab === "documents" ? <DocumentsPanel type="property" id={propertyId} /> : null}

      {activeDialog && dialog ? (
        <FormDialog
          open
          onOpenChange={(open) => !open && setDialog(null)}
          title={activeDialog.title}
          fields={activeDialog.fields}
          initial={activeDialog.initial}
          submitting={save.isPending}
          onSubmit={(values) => save.mutate({ kind: dialog, values })}
        />
      ) : null}
    </div>
  );
}
