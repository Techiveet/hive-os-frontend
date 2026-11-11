"use client";

import { usePermissions } from "@/hooks/use-permissions";
import { useTenantModuleAccess } from "@/hooks/use-tenant-module-access";
import {
  CHAT_ATTACH_PERMISSIONS,
  CHAT_CLEAR_PERMISSIONS,
  CHAT_CREATE_GROUP_PERMISSIONS,
  CHAT_HOST_PERMISSIONS,
  CHAT_LEAVE_PERMISSIONS,
  CHAT_ROUTE_PERMISSIONS,
  CHAT_SEND_PERMISSIONS,
  CHAT_START_CONVERSATION_PERMISSIONS,
} from "@/lib/route-permissions";
import { getTenantId } from "@/lib/runtime-context";

export function useChatAccess() {
  const { hasPermission, hasAnyPermission, isLoaded } = usePermissions();
  const { hasModule } = useTenantModuleAccess();
  const isTenantWorkspace = Boolean(getTenantId());

  const canAccessChat = hasAnyPermission([...CHAT_ROUTE_PERMISSIONS]);
  const canManageChat = hasPermission("manage_chat");
  // One flag per write, matching what the API allows for each.
  const canSendMessages = hasAnyPermission([...CHAT_SEND_PERMISSIONS]);
  const canStartConversation = hasAnyPermission([...CHAT_START_CONVERSATION_PERMISSIONS]);
  const canCreateGroup = hasAnyPermission([...CHAT_CREATE_GROUP_PERMISSIONS]);
  const canCompose = canStartConversation || canCreateGroup;
  const canLeaveConversation = hasAnyPermission([...CHAT_LEAVE_PERMISSIONS]);
  const canClearMessages = hasAnyPermission([...CHAT_CLEAR_PERMISSIONS]);
  const canAttachFiles = hasAnyPermission([...CHAT_ATTACH_PERMISSIONS]);
  const canHostCalls = hasAnyPermission([...CHAT_HOST_PERMISSIONS]);
  const hasMailboxModule = !isTenantWorkspace || hasModule("mailbox");
  const hasChatModule = !isTenantWorkspace || hasModule("chat");
  const hasChatWorkspace = canAccessChat && hasChatModule;

  const canReadStorage = hasAnyPermission(["view_storage", "manage_storage"]);
  const canManageStorage = hasPermission("manage_storage");
  const hasStorageModule = !isTenantWorkspace || hasModule("media_library") || hasModule("file_manager");

  return {
    isLoaded,
    isTenantWorkspace,
    canAccessChat,
    canManageChat,
    canSendMessages,
    canStartConversation,
    canCreateGroup,
    canCompose,
    canLeaveConversation,
    canClearMessages,
    canAttachFiles,
    canHostCalls,
    hasMailboxModule,
    hasChatModule,
    hasChatWorkspace,
    canBrowseAttachments: hasChatWorkspace && canReadStorage && hasStorageModule,
    canSaveAttachments: hasChatWorkspace && canManageStorage && hasStorageModule,
  };
}
