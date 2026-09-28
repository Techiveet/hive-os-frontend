"use client";

import { useEffect, useRef } from "react";
import { getLogisticsOperationsChannelName, initEcho } from "@/lib/echo";
import { getAccessToken } from "@/lib/runtime-context";

export type LogisticsOperationalUpdate = {
  entity_type: string;
  entity_id: number;
  action: string;
  forwarding_job_id: number | null;
  occurred_at: string;
};

export function useLogisticsOperationsRealtime(onUpdate: (event: LogisticsOperationalUpdate) => void) {
  const callback = useRef(onUpdate);
  callback.current = onUpdate;

  useEffect(() => {
    const token = getAccessToken();
    const channelName = getLogisticsOperationsChannelName();
    if (!token || !channelName) return;

    const echo = initEcho(token);
    if (!echo) return;
    const channel = echo.private(channelName);
    const handleUpdate = (event: LogisticsOperationalUpdate) => callback.current(event);
    channel.listen(".logistics.operational.updated", handleUpdate);

    return () => {
      channel.stopListening(".logistics.operational.updated", handleUpdate);
      echo.leave(channelName);
    };
  }, []);
}
