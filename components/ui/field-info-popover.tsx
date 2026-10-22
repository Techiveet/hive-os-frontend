"use client";

import * as React from "react";
import { Info, Lightbulb } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type FieldInfoData = {
  title?: string;
  description: string;
  example?: string;
  bestPractice?: string;
};

export function FieldInfoPopover({
  label,
  required,
  info,
  className,
}: {
  label: string;
  required?: boolean;
  info?: FieldInfoData | string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);

  const resolvedInfo: FieldInfoData | null = React.useMemo(() => {
    if (typeof info === "string") {
      return { description: info };
    }
    if (info && typeof info === "object") {
      return info;
    }
    return null;
  }, [info]);

  if (!resolvedInfo) return null;

  const title = resolvedInfo.title || label;

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <button
          type="button"
          tabIndex={0}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((prev) => !prev);
          }}
          className={cn(
            "group/info -my-0.5 inline-flex size-4.5 items-center justify-center rounded-full text-muted-foreground/50 transition-all hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60 cursor-pointer active:scale-90",
            open && "bg-primary/15 text-primary ring-1 ring-primary/40 shadow-xs",
            className
          )}
          aria-label={`Field explanation for ${label}`}
          title={`Click to read guide: ${label}`}
        >
          <Info className="size-3 transition-transform duration-200 group-hover/info:scale-115" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={6}
        className="z-[9999] w-84 max-w-[calc(100vw-2rem)] rounded-2xl border border-border/70 bg-popover/95 p-4 shadow-2xl backdrop-blur-xl outline-none text-left normal-case tracking-normal animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-150"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 shadow-xs">
              <Info className="size-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-foreground tracking-tight line-clamp-1">{title}</h4>
              <p className="text-[10px] text-muted-foreground/75 font-medium uppercase tracking-wider">Field Guide</p>
            </div>
          </div>
          {required ? (
            <Badge variant="destructive" className="h-5 px-2 text-[9px] font-bold uppercase tracking-wider bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/25 shrink-0">
              Required
            </Badge>
          ) : (
            <Badge variant="outline" className="h-5 px-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/80 bg-muted/40 border-border/60 shrink-0">
              Optional
            </Badge>
          )}
        </div>

        <div className="mt-3 space-y-2.5">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {resolvedInfo.description}
          </p>

          {resolvedInfo.example ? (
            <div className="rounded-xl border border-border/50 bg-muted/30 p-2.5 text-[11px] leading-snug">
              <div className="flex items-center gap-1.5 font-semibold text-foreground/90 mb-1">
                <span className="inline-block size-1.5 rounded-full bg-primary/70" />
                <span>Example / Format</span>
              </div>
              <p className="font-mono text-muted-foreground break-all text-[11px] pl-3 border-l-2 border-primary/30">
                {resolvedInfo.example}
              </p>
            </div>
          ) : null}

          {resolvedInfo.bestPractice ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 text-[11px] leading-snug text-muted-foreground">
              <Lightbulb className="size-4 shrink-0 text-amber-500 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground/90 block mb-0.5">Best Practice</span>
                <span>{resolvedInfo.bestPractice}</span>
              </div>
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
