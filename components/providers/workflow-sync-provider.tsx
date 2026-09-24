"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { initEcho, getUserNotificationChannelNames, getWorkflowChannelName } from '@/lib/echo';
import { getAccessToken } from '@/lib/runtime-context';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateHrWorkflowSurfaces } from '@/modules/humanresources/query-invalidation';

type WorkflowNotificationPayload = {
  id?: string;
  type?: string;
  category?: string;
  title?: string;
  body?: string;
  url?: string;
  status?: string;
  subject?: string;
  module_slug?: string;
  submodule_slug?: string;
  functionality?: string;
  target_url?: string;
  target_type?: string;
  surface_label?: string;
  approvable_type?: string;
  created_at?: string;
  data?: WorkflowNotificationPayload;
};

type WorkflowRealtimeEvent = {
  approval?: {
    id?: number;
    approvable_type?: string;
    approvable_id?: number;
    status?: string;
    sequence?: number;
    subject?: string;
    module?: string;
    module_slug?: string;
    submodule_slug?: string;
    functionality?: string;
    target_url?: string;
    target_type?: string;
    surface_label?: string;
    requester?: string;
    group?: string;
    actioned_by?: string;
  };
  old_status?: string;
  new_status?: string;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const unwrapNotification = (
  notification: WorkflowNotificationPayload
): WorkflowNotificationPayload => {
  const nested = asRecord(notification.data);
  if (Object.keys(nested).length === 0) {
    return notification;
  }

  return {
    ...notification,
    ...(nested as WorkflowNotificationPayload),
  };
};

const invalidateWorkflowSurfaces = (
  queryClient: ReturnType<typeof useQueryClient>,
  event?: WorkflowRealtimeEvent
) => {
  queryClient.invalidateQueries({ queryKey: ['workflow', 'approvals'] });
  queryClient.invalidateQueries({ queryKey: ['workflow', 'inline-approval'] });
  queryClient.invalidateQueries({ queryKey: ['workflow-dashboard'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard-notifications'] });

  const type = event?.approval?.approvable_type || '';
  if (type.includes('Inventory\\Models\\Product')) queryClient.invalidateQueries({ queryKey: ['inventory', 'products'] });
  if (type.includes('ProductCategory')) queryClient.invalidateQueries({ queryKey: ['inventory', 'product-categories'] });
  if (type.includes('Supplier')) queryClient.invalidateQueries({ queryKey: ['inventory', 'suppliers'] });
  if (type.includes('InventoryDocument')) queryClient.invalidateQueries({ queryKey: ['inventory', 'documents'] });
  if (type.includes('InventoryEntityRecord')) queryClient.invalidateQueries({ queryKey: ['inventory', 'product-batches'] });
  if (type.includes('Warehouse\\Models\\StockMovement')) queryClient.invalidateQueries({ queryKey: ['warehouse', 'movements'] });
  if (type.includes('Identity\\Models\\User')) queryClient.invalidateQueries({ queryKey: ['users'] });

  void invalidateHrWorkflowSurfaces(queryClient, {
    module_slug: event?.approval?.module_slug,
    submodule_slug: event?.approval?.submodule_slug,
    functionality: event?.approval?.functionality,
    target_url: event?.approval?.target_url,
    approvable_type: event?.approval?.approvable_type,
    target_type: event?.approval?.target_type,
    subject: [event?.approval?.subject, event?.approval?.surface_label]
      .filter((part): part is string => Boolean(part && part.trim()))
      .join(' '),
  });

  if (event?.approval?.module_slug) queryClient.invalidateQueries({ queryKey: [event.approval.module_slug] });
  if (event?.approval?.submodule_slug) queryClient.invalidateQueries({ queryKey: [event.approval.submodule_slug] });
};

const eventFromNotification = (
  notification: WorkflowNotificationPayload
): WorkflowRealtimeEvent => ({
  approval: {
    approvable_type: notification.approvable_type,
    status: notification.status,
    // Include title/body/label so phrases like "Create Employee" / "HR Leave Request"
    // still match when the display name is a person or record title.
    subject: [
      notification.subject,
      notification.surface_label,
      notification.title,
      notification.body,
    ]
      .filter((part): part is string => Boolean(part && part.trim()))
      .join(' '),
    module_slug: notification.module_slug,
    submodule_slug: notification.submodule_slug,
    functionality: notification.functionality,
    target_url: notification.target_url || notification.url,
    target_type: notification.target_type,
    surface_label: notification.surface_label,
  },
  new_status: notification.status,
});

export function WorkflowSyncProvider() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = getAccessToken() || localStorage.getItem('token');
    const storedUser = localStorage.getItem('hive_user');
    const user = storedUser ? JSON.parse(storedUser) : null;
    
    if (!token || !user) {
      return;
    }

    const echo = initEcho(token);
    if (!echo) return;
    
    // Channel 1: Laravel notifications. Listen on every supported user channel
    // because tenant-aware notifications can be delivered with different model names.
    const notificationChannelNames = getUserNotificationChannelNames(user.id);
    const seenNotificationIds = new Set<string>();
    notificationChannelNames.forEach((channelName) => echo.leave(channelName));
    notificationChannelNames.forEach((channelName) => {
      echo.private(channelName).notification((notification: WorkflowNotificationPayload) => {
        if (notification.id && seenNotificationIds.has(notification.id)) {
          return;
        }
        if (notification.id) {
          seenNotificationIds.add(notification.id);
        }

        const payload = unwrapNotification(notification);
        console.log('New notification received:', payload);
        
        if (payload.category === 'workflow') {
          toast.info(payload.title || 'Workflow Update', {
            description: payload.body,
            duration: 8000,
            action: {
              label: 'View',
              onClick: () => {
                const url = payload.target_url || payload.url;
                if (url) {
                  router.push(url);
                }
              },
            },
          });
          invalidateWorkflowSurfaces(queryClient, eventFromNotification(payload));
        }
      });
    });

    // Channel 2: Real-time workflow events
    const workflowChannel = echo.private(getWorkflowChannelName(user.id));
    
    workflowChannel.listen('.workflow.approval.requested', (event: WorkflowRealtimeEvent) => {
      console.log('Workflow approval requested:', event);
      invalidateWorkflowSurfaces(queryClient, event);
    });

    workflowChannel.listen('.workflow.approval.status_changed', (event: WorkflowRealtimeEvent) => {
      console.log('Workflow status changed:', event);
      invalidateWorkflowSurfaces(queryClient, event);
    });

    return () => {
      notificationChannelNames.forEach((channelName) => echo.leave(channelName));
      echo.leave(getWorkflowChannelName(user.id));
    };
  }, [router, queryClient]);

  return null;
}
