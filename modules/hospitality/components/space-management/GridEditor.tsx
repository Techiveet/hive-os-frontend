"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GripVertical, Loader2, MapPin, Sofa, Utensils } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateHospitalityTable } from "@/modules/hospitality/api";
import { HospitalityLocation, HospitalityZone } from "../../types";

const COLS = 10;
const ROWS = 8;

interface GridEditorProps {
  zones: HospitalityZone[];
  businessType: string;
}

type DragPayload =
  | { kind: "location"; locationId: number }
  | { kind: "cell"; locationId: number; fromX: number; fromY: number };

function parseDrag(data: string): DragPayload | null {
  try {
    return JSON.parse(data) as DragPayload;
  } catch {
    return null;
  }
}

export default function GridEditor({ zones, businessType }: GridEditorProps) {
  const queryClient = useQueryClient();
  const isNightclub = businessType === "nightclub";
  const LocationIcon = isNightclub ? Sofa : Utensils;
  const [activeZoneId, setActiveZoneId] = useState<number | "all">("all");
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);

  const locations = useMemo(() => {
    const list = zones.flatMap((z) =>
      (z.locations || []).map((loc) => ({
        ...loc,
        zone: loc.zone ?? { id: z.id, name: z.name, tenant_id: z.tenant_id },
      })),
    );
    if (activeZoneId === "all") return list;
    return list.filter((l) => l.zone_id === activeZoneId);
  }, [zones, activeZoneId]);

  const placed = useMemo(
    () =>
      locations.filter(
        (l) =>
          l.grid_position &&
          typeof l.grid_position.x === "number" &&
          typeof l.grid_position.y === "number",
      ),
    [locations],
  );

  const unplaced = useMemo(
    () =>
      locations.filter(
        (l) =>
          !l.grid_position ||
          typeof l.grid_position.x !== "number" ||
          typeof l.grid_position.y !== "number",
      ),
    [locations],
  );

  const occupancy = useMemo(() => {
    const map = new Map<string, HospitalityLocation>();
    for (const loc of placed) {
      map.set(`${loc.grid_position!.x},${loc.grid_position!.y}`, loc);
    }
    return map;
  }, [placed]);

  const positionMutation = useMutation({
    mutationFn: ({
      id,
      grid_position,
    }: {
      id: number;
      grid_position: { x: number; y: number } | null;
    }) => updateHospitalityTable(id, { grid_position }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitality", "floor-plan"] });
      queryClient.invalidateQueries({ queryKey: ["hospitality", "tables"] });
    },
    onError: () => toast.error("Could not update table position"),
  });

  const placeAt = async (locationId: number, x: number, y: number) => {
    const occupant = occupancy.get(`${x},${y}`);
    if (occupant && occupant.id !== locationId) {
      toast.error("That cell already has a table");
      return;
    }
    await positionMutation.mutateAsync({
      id: locationId,
      grid_position: { x, y },
    });
    toast.success("Table position saved");
  };

  const clearPosition = async (locationId: number) => {
    await positionMutation.mutateAsync({ id: locationId, grid_position: null });
    toast.success("Table removed from grid");
  };

  const onDropCell = async (x: number, y: number, raw: string) => {
    const payload = parseDrag(raw);
    if (!payload) return;
    await placeAt(payload.locationId, x, y);
    setDraggingId(null);
    setHoverCell(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
            <div className="w-2 h-6 rounded-full bg-primary" />
            Grid Editor
          </h3>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            Drag tables onto the grid to arrange your floor layout. Changes save automatically.
          </p>
        </div>
        {positionMutation.isPending && (
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Saving…
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Button
          variant={activeZoneId === "all" ? "default" : "outline"}
          size="sm"
          className="rounded-full px-4 h-9 font-black uppercase text-[11px] tracking-widest shrink-0"
          onClick={() => setActiveZoneId("all")}
        >
          All Zones
        </Button>
        {zones.map((zone) => (
          <Button
            key={zone.id}
            variant={activeZoneId === zone.id ? "default" : "outline"}
            size="sm"
            className="rounded-full px-4 h-9 font-black uppercase text-[11px] tracking-widest shrink-0"
            onClick={() => setActiveZoneId(zone.id)}
          >
            {zone.name}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-[2rem] border border-border/40 bg-card/30 backdrop-blur-md p-4 sm:p-6 overflow-x-auto">
          <div
            className="grid gap-2 min-w-[640px]"
            style={{
              gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: ROWS * COLS }).map((_, index) => {
              const x = index % COLS;
              const y = Math.floor(index / COLS);
              const key = `${x},${y}`;
              const location = occupancy.get(key);
              const isHover = hoverCell?.x === x && hoverCell?.y === y;

              return (
                <div
                  key={key}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setHoverCell({ x, y });
                  }}
                  onDragLeave={() => {
                    setHoverCell((prev) =>
                      prev?.x === x && prev?.y === y ? null : prev,
                    );
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    void onDropCell(x, y, e.dataTransfer.getData("application/json"));
                  }}
                  className={cn(
                    "aspect-square rounded-2xl border border-dashed border-border/50 bg-background/40 transition-colors relative",
                    isHover && "border-primary bg-primary/10",
                    location && "border-solid border-border/60 bg-background/80",
                  )}
                >
                  {location ? (
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        setDraggingId(location.id);
                        e.dataTransfer.setData(
                          "application/json",
                          JSON.stringify({
                            kind: "cell",
                            locationId: location.id,
                            fromX: x,
                            fromY: y,
                          } satisfies DragPayload),
                        );
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setHoverCell(null);
                      }}
                      onDoubleClick={() => void clearPosition(location.id)}
                      className={cn(
                        "absolute inset-1 rounded-xl flex flex-col items-center justify-center gap-1 p-1 cursor-grab active:cursor-grabbing",
                        "bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 text-foreground",
                        draggingId === location.id && "opacity-40",
                      )}
                      title={`${location.label} — double-click to unplace`}
                    >
                      <LocationIcon className="h-4 w-4 opacity-70" />
                      <span className="text-[10px] font-black uppercase tracking-tight line-clamp-2 text-center leading-tight">
                        {location.label}
                      </span>
                    </button>
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-muted-foreground/30 select-none">
                      {x},{y}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground font-medium">
            Double-click a placed table to return it to the unplaced tray.
          </p>
        </div>

        <div className="rounded-[2rem] border border-border/40 bg-card/30 backdrop-blur-md p-5 space-y-4 h-fit">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              Unplaced
            </h4>
            <Badge variant="outline" className="rounded-full text-[10px] font-black">
              {unplaced.length}
            </Badge>
          </div>

          {unplaced.length === 0 ? (
            <p className="text-xs text-muted-foreground font-medium py-6 text-center">
              All tables in this view are placed on the grid.
            </p>
          ) : (
            <ul className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
              {unplaced.map((location) => (
                <li key={location.id}>
                  <div
                    draggable
                    onDragStart={(e) => {
                      setDraggingId(location.id);
                      e.dataTransfer.setData(
                        "application/json",
                        JSON.stringify({
                          kind: "location",
                          locationId: location.id,
                        } satisfies DragPayload),
                      );
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setHoverCell(null);
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border border-border/40 bg-background/60 px-3 py-2.5 cursor-grab active:cursor-grabbing",
                      draggingId === location.id && "opacity-40",
                    )}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <LocationIcon className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black truncate">{location.label}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground truncate">
                        {location.zone?.name || "No zone"} · Cap {location.capacity}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
