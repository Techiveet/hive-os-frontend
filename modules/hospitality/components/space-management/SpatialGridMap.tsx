"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { HospitalityLocation, HospitalityZone } from "../../types";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sofa, Users, Sparkles, User, Utensils } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SpatialGridMapProps {
  zones: HospitalityZone[];
  businessType: string;
  onLocationClick: (location: HospitalityLocation) => void;
}

const statusColors = {
  available: "bg-emerald-500 shadow-emerald-500/40",
  reserved: "bg-amber-500 shadow-amber-500/40",
  occupied: "bg-destructive shadow-destructive/40",
  dirty: "bg-sky-500 shadow-sky-500/40",
};

const statusGradients = {
  available: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-500",
  reserved: "from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-500",
  occupied: "from-destructive/20 to-destructive/5 border-destructive/20 text-destructive",
  dirty: "from-sky-500/20 to-sky-500/5 border-sky-500/20 text-sky-500",
};

const statusLabels: Record<HospitalityLocation["status"], string> = {
  available: "Available",
  reserved: "Reserved",
  occupied: "Occupied",
  dirty: "Needs Cleaning",
};

function hasGridPosition(location: HospitalityLocation) {
  return (
    !!location.grid_position &&
    typeof location.grid_position.x === "number" &&
    typeof location.grid_position.y === "number"
  );
}

function LocationTile({
  location,
  isNightclub,
  LocationIcon,
  onLocationClick,
  compact = false,
}: {
  location: HospitalityLocation;
  isNightclub: boolean;
  LocationIcon: typeof Sofa;
  onLocationClick: (location: HospitalityLocation) => void;
  compact?: boolean;
}) {
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.05, y: -6 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onLocationClick(location)}
          className={cn(
            "rounded-[2rem] p-4 sm:p-5 flex flex-col items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden group border w-full h-full",
            "bg-gradient-to-br shadow-lg",
            statusGradients[location.status],
            compact ? "aspect-square min-h-[4.5rem]" : "aspect-square",
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div
            className={cn(
              "absolute top-3 right-3 h-2 w-2 rounded-full animate-pulse shadow-lg",
              statusColors[location.status],
            )}
          />

          <div className="relative">
            <LocationIcon
              className={cn(
                "h-7 w-7 sm:h-9 sm:w-9 transition-all duration-300 group-hover:scale-110",
                location.status === "occupied" && "animate-bounce",
              )}
            />
            {location.assigned_staff_id && (
              <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-white text-black flex items-center justify-center border-2 border-card">
                <User className="h-2.5 w-2.5" />
              </div>
            )}
          </div>

          <div className="flex flex-col items-center text-center px-1">
            <span className="text-xs sm:text-sm font-black tracking-tighter uppercase line-clamp-1">
              {location.label}
            </span>
            <span className="text-[10px] font-black opacity-60 uppercase tracking-[0.15em] mt-0.5">
              Cap: {location.capacity}
            </span>
          </div>

          {isNightclub && location.min_spend && (
            <div className="absolute bottom-2 flex items-center gap-1 bg-primary/20 px-2 py-0.5 rounded-full border border-primary/20">
              <Sparkles className="h-2 w-2 text-primary" />
              <span className="text-[7px] font-black text-primary uppercase tracking-tighter">
                VIP
              </span>
            </div>
          )}
        </motion.button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="rounded-2xl px-4 py-3 border border-border/60 bg-card/95 backdrop-blur-xl shadow-xl"
      >
        <div className="space-y-1.5 min-w-[140px]">
          <p className="text-sm font-black tracking-tight">{location.label}</p>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 rounded-full shrink-0",
                statusColors[location.status],
              )}
            />
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {statusLabels[location.status]}
            </p>
          </div>
          <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 pt-1 border-t border-border/40">
            <Users className="h-3 w-3 opacity-50" />
            {location.capacity} guests
            {location.table_type ? ` · ${location.table_type}` : ""}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export default function SpatialGridMap({
  zones,
  businessType,
  onLocationClick,
}: SpatialGridMapProps) {
  const isNightclub = businessType === "nightclub";
  const LocationIcon = isNightclub ? Sofa : Utensils;

  return (
    <TooltipProvider>
      <div className="space-y-12">
        {zones?.map((zone) => {
          const locations = zone.locations || [];
          const positioned = locations.filter(hasGridPosition);
          const unpositioned = locations.filter((l) => !hasGridPosition(l));
          const useSpatial =
            positioned.length > 0 &&
            positioned.length >= Math.ceil(locations.length / 2);

          return (
            <ZoneBlock
              key={zone.id}
              zone={zone}
              isNightclub={isNightclub}
              LocationIcon={LocationIcon}
              onLocationClick={onLocationClick}
              positioned={positioned}
              unpositioned={unpositioned}
              useSpatial={useSpatial}
            />
          );
        })}
      </div>
    </TooltipProvider>
  );
}

function ZoneBlock({
  zone,
  isNightclub,
  LocationIcon,
  onLocationClick,
  positioned,
  unpositioned,
  useSpatial,
}: {
  zone: HospitalityZone;
  isNightclub: boolean;
  LocationIcon: typeof Sofa;
  onLocationClick: (location: HospitalityLocation) => void;
  positioned: HospitalityLocation[];
  unpositioned: HospitalityLocation[];
  useSpatial: boolean;
}) {
  const bounds = useMemo(() => {
    if (!useSpatial || positioned.length === 0) {
      return { cols: 8, rows: 1 };
    }
    const maxX = Math.max(...positioned.map((l) => l.grid_position!.x), 0);
    const maxY = Math.max(...positioned.map((l) => l.grid_position!.y), 0);
    return {
      cols: Math.min(Math.max(maxX + 1, 4), 12),
      rows: Math.max(maxY + 1, 1),
    };
  }, [positioned, useSpatial]);

  const cellMap = useMemo(() => {
    const map = new Map<string, HospitalityLocation>();
    for (const loc of positioned) {
      map.set(`${loc.grid_position!.x},${loc.grid_position!.y}`, loc);
    }
    return map;
  }, [positioned]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 px-2">
        <h3 className="text-2xl font-black tracking-tighter uppercase">{zone.name}</h3>
        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
        <Badge
          variant="outline"
          className="rounded-full px-4 py-1 border-white/10 bg-white/5 text-[11px] font-black opacity-60"
        >
          {zone.locations?.length || 0} {isNightclub ? "Units" : "Tables"}
        </Badge>
      </div>

      <div className="rounded-[3rem] border border-white/5 bg-card/20 backdrop-blur-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

        {useSpatial ? (
          <div className="space-y-6 relative z-10">
            <div
              className="grid gap-3 sm:gap-4"
              style={{
                gridTemplateColumns: `repeat(${bounds.cols}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: bounds.rows * bounds.cols }).map((_, index) => {
                const x = index % bounds.cols;
                const y = Math.floor(index / bounds.cols);
                const location = cellMap.get(`${x},${y}`);

                return (
                  <div key={`${x}-${y}`} className="aspect-square min-h-0">
                    {location ? (
                      <LocationTile
                        location={location}
                        isNightclub={isNightclub}
                        LocationIcon={LocationIcon}
                        onLocationClick={onLocationClick}
                        compact
                      />
                    ) : (
                      <div className="h-full w-full rounded-[1.5rem] border border-dashed border-white/5 bg-white/[0.02]" />
                    )}
                  </div>
                );
              })}
            </div>

            {unpositioned.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-white/5">
                <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-1">
                  Unplaced on layout
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                  {unpositioned.map((location) => (
                    <LocationTile
                      key={location.id}
                      location={location}
                      isNightclub={isNightclub}
                      LocationIcon={LocationIcon}
                      onLocationClick={onLocationClick}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6 relative z-10">
            {(zone.locations || []).map((location) => (
              <LocationTile
                key={location.id}
                location={location}
                isNightclub={isNightclub}
                LocationIcon={LocationIcon}
                onLocationClick={onLocationClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
