"use client";

import * as React from "react";
import { toast } from "sonner";

const QUEUE_RESULT_EVENT_NAME = "hive_offline_queue_result";

type OfflineQueueResult =
  | { type: "queued"; id: string; label: string; url?: string }
  | { type: "processed"; id: string; label: string; url?: string }
  | { type: "dropped"; id: string; label: string; reason: string; url?: string };

const seenIds = new Set<string>();
const MAX_SEEN = 200;

const pruneSeen = (): void => {
  if (seenIds.size <= MAX_SEEN) return;
  const overflow = seenIds.size - MAX_SEEN;
  const it = seenIds.values();
  for (let i = 0; i < overflow; i++) {
    const v = it.next().value;
    if (v) seenIds.delete(v);
  }
};

const formatLabel = (label: string): string => {
  if (!label) return "Change";
  if (label.length > 80) return `${label.slice(0, 77)}...`;
  return label;
};

const QUEUED_BATCH_WINDOW_MS = 400;
let queuedBatchTimer: ReturnType<typeof setTimeout> | null = null;
let queuedBatch: Array<{ id: string; label: string }> = [];
let queuedBatchToastId: string | number | null = null;

const flushQueuedBatch = (): void => {
  queuedBatchTimer = null;
  const items = queuedBatch;
  queuedBatch = [];
  if (items.length === 0) return;

  const summary =
    items.length === 1
      ? `Queued: ${formatLabel(items[0]!.label)}`
      : `Queued ${items.length} changes (will sync when you're back online)`;

  const opts =
    items.length === 1
      ? { description: items[0]!.label }
      : {
          description: items
            .slice(0, 3)
            .map((i) => formatLabel(i.label))
            .join("\n") + (items.length > 3 ? `\n+${items.length - 3} more` : ""),
        };

  if (queuedBatchToastId !== null) {
    toast.success(summary, {
      id: queuedBatchToastId,
      ...opts,
    });
  } else {
    queuedBatchToastId = toast.success(summary, opts);
  }

  window.setTimeout(() => {
    queuedBatchToastId = null;
  }, QUEUED_BATCH_WINDOW_MS + 100);
};

const scheduleQueuedBatch = (id: string, label: string): void => {
  if (typeof window === "undefined") return;
  queuedBatch.push({ id, label });
  if (queuedBatchTimer !== null) {
    clearTimeout(queuedBatchTimer);
  }
  queuedBatchTimer = setTimeout(flushQueuedBatch, QUEUED_BATCH_WINDOW_MS);
};

export function OfflineQueueToastListener() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (event: Event) => {
      const custom = event as CustomEvent<OfflineQueueResult>;
      const detail = custom.detail;
      if (!detail) return;

      if (detail.type === "queued") {
        scheduleQueuedBatch(detail.id, detail.label);
        return;
      }

      const dedupeKey = `${detail.type}::${detail.id}`;
      if (seenIds.has(dedupeKey)) return;
      seenIds.add(dedupeKey);
      pruneSeen();

      if (detail.type === "processed") {
        toast.success(`Synced: ${formatLabel(detail.label)}`, {
          description: detail.url ? detail.url : undefined,
        });
      } else if (detail.type === "dropped") {
        toast.error(`Dropped: ${formatLabel(detail.label)}`, {
          description: detail.reason,
        });
      }
    };

    window.addEventListener(QUEUE_RESULT_EVENT_NAME, handler as EventListener);
    return () => {
      window.removeEventListener(QUEUE_RESULT_EVENT_NAME, handler as EventListener);
      if (queuedBatchTimer !== null) {
        clearTimeout(queuedBatchTimer);
        queuedBatchTimer = null;
      }
    };
  }, []);

  return null;
}
