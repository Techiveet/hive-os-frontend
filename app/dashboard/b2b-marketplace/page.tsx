"use client";

import React, { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/use-permissions";
import B2BAnalyticsDashboard from "@/modules/b2b-marketplace/pages/B2BAnalyticsDashboard";
import BuyerDashboard from "@/modules/b2b-marketplace/pages/BuyerDashboard";
import SellerDashboard from "@/modules/b2b-marketplace/pages/SellerDashboard";

export default function B2BMarketplacePage() {
  const { hasPermission, isLoaded } = usePermissions();

  const tabs = useMemo(
    () =>
      [
        { value: "overview", label: "Overview", perm: "view_b2b_dashboard", node: <B2BAnalyticsDashboard /> },
        { value: "buyer", label: "Buyer Portal", perm: "manage_b2b_inquiries", node: <BuyerDashboard /> },
        { value: "seller", label: "Seller Portal", perm: "manage_b2b_products", node: <SellerDashboard /> },
      ].filter((t) => hasPermission(t.perm)),
    [hasPermission],
  );

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">B2B Marketplace</h2>
      </div>

      {!isLoaded ? null : tabs.length === 0 ? (
        <div className="rounded-3xl border border-border/60 bg-card/50 p-10 text-center text-sm text-muted-foreground">
          You don't have access to any marketplace areas yet. Ask an administrator to assign you a
          buyer, seller, or admin role.
        </div>
      ) : (
        <Tabs defaultValue={tabs[0].value} className="space-y-4">
          <TabsList>
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((t) => (
            <TabsContent key={t.value} value={t.value} className="space-y-4">
              {t.node}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
