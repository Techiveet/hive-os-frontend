"use client";

import { useEffect, useRef } from "react";
import { getInventoryChannelName, initEcho } from "@/lib/echo";
import { getAccessToken } from "@/lib/runtime-context";

export type InventoryDashboardUpdate = {
  action: "created" | "updated" | "deleted";
  resource: string;
  record_id: string;
  tenant_id: string;
  occurred_at: string;
};

/**
 * Subscribes to `tenant.{id}.inventory` and fires `onUpdate` for every Good /
 * GoodBatch / Product / ProductCategory / cost-layer / valuation-entry write —
 * the same signal the backend's InventoryDashboardObserver emits. Carries no
 * business payload on purpose (see InventoryDashboardUpdated): callers use it
 * to invalidate their own react-query keys, not to read state off the event.
 */
export function useInventoryRealtime(onUpdate: (event: InventoryDashboardUpdate) => void) {
  const callback = useRef(onUpdate);
  callback.current = onUpdate;

  useEffect(() => {
    const token = getAccessToken();
    const channelName = getInventoryChannelName();
    if (!token || !channelName) return;

    const echo = initEcho(token);
    if (!echo) return;

    const channel = echo.private(channelName);
    const handleUpdate = (event: InventoryDashboardUpdate) => callback.current(event);
    channel.listen(".inventory.updated", handleUpdate);

    return () => {
      channel.stopListening(".inventory.updated", handleUpdate);
      echo.leave(channelName);
    };
  }, []);
}
