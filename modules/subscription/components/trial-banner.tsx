"use client";

import * as React from "react";
import { Zap, Clock, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/store/use-translation";

type Props = {
  plan: string;
  daysUntilExpiration: number | null;
  isExpiringSoon: boolean;
  needsRenewal: boolean;
  onUpgrade: () => void;
};

export function TrialBanner({ plan, daysUntilExpiration, isExpiringSoon, needsRenewal, onUpgrade }: Props) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed || (plan.toLowerCase() !== "larva" && plan.toLowerCase() !== "startup")) {
    return null;
  }

  const isExpired = daysUntilExpiration !== null && daysUntilExpiration <= 0;
  const isUrgent = isExpiringSoon || needsRenewal;
  // The API reports a fractional day count (29.97…). Round up so the last
  // partial day still reads "1 day left" rather than "0".
  const daysLeft = daysUntilExpiration === null ? null : Math.max(0, Math.ceil(daysUntilExpiration));
  const daysLabel = daysLeft === 1
    ? t("trial.one_day_left", "1 day left in your trial")
    : t("trial.days_left", ":days days left in your trial", { days: daysLeft ?? 0 });

  return (
    <div className={cn(
      "relative border-b px-4 py-3 flex items-center justify-between gap-4 text-sm",
      isExpired ? "bg-destructive/10 border-destructive/20" :
        isUrgent ? "bg-amber-500/10 border-amber-500/20" :
          "bg-primary/10 border-primary/20"
    )}>
      <div className="flex items-center gap-3">
        {isExpired ? (
          <Zap className="h-5 w-5 text-destructive shrink-0" />
        ) : isUrgent ? (
          <Clock className="h-5 w-5 text-amber-600 shrink-0" />
        ) : (
          <Zap className="h-5 w-5 text-primary shrink-0" />
        )}
        <div>
          <p className="font-semibold">
            {isExpired
              ? t("trial.expired_title", "Your trial has expired")
              : daysLeft === null
                ? t("trial.active_title_undated", "You are on a trial plan")
                : daysLabel}
          </p>
          <p className="text-xs text-muted-foreground">
            {isExpired
              ? t("trial.expired_desc", "Upgrade now to keep access to your workspace and data.")
              : t("trial.active_desc", "Upgrade now to continue using all features without interruption.")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          onClick={onUpgrade}
          className={cn(
            "rounded-full gap-1.5",
            isExpired ? "bg-destructive hover:bg-destructive/90" : ""
          )}>
          {t("trial.upgrade_button", "Upgrade Now")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-full p-1 hover:bg-background/50 transition-colors"
          aria-label={t("global.dismiss", "Dismiss")}>
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
