// frontend/hooks/use-permissions.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { isTenantSession } from '@/lib/runtime-context';

export function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadFromStorage = useCallback(() => {
    const userStr = localStorage.getItem("hive_user");
    if (!userStr) {
      setPermissions([]);
      setRoles([]);
      setIsLoaded(true);
      return;
    }

    try {
      const parsed = JSON.parse(userStr);
      setPermissions(parsed.permissions || []);
      setRoles(parsed.roles || []);
    } catch (e) {
      console.error("Failed to parse hive_user context", e);
      setPermissions([]);
      setRoles([]);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    loadFromStorage();
    // 🚀 Listen for the event fired by auth-sync.ts
    window.addEventListener("hive_security_cleared", loadFromStorage);
    return () => window.removeEventListener("hive_security_cleared", loadFromStorage);
  }, [loadFromStorage]);

  // Match dashboard-access: Super Admin always; central Admin only on central.
  // Tenant Admin must use real permission grants (API already enforces Spatie).
  const isSuperAdmin = useMemo(() => {
    if (roles.includes('Super Admin')) return true;
    if (!isTenantSession() && roles.includes('Admin')) return true;
    return false;
  }, [roles]);

  const hasPermission = useCallback((permission: string) => {
    if (isSuperAdmin) return true;
    return permissions.includes(permission);
  }, [isSuperAdmin, permissions]);

  const hasAnyPermission = useCallback((perms: string[]) => {
    if (isSuperAdmin) return true;
    return perms.some(p => permissions.includes(p));
  }, [isSuperAdmin, permissions]);

  const hasRole = useCallback((role: string) => {
    return roles.includes(role);
  }, [roles]);

  return { permissions, roles, hasPermission, hasAnyPermission, hasRole, isLoaded, isSuperAdmin };
}
