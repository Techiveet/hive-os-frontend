"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Database, HardDrive, Loader2, ShieldCheck } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SettingsPanelSkeleton } from "@/components/ui/loading-states";
import { getErrorMessage } from "@/lib/errors";
import { getAuthHeaders, getBackendApiRoot, getWorkspaceScopeKey } from "@/lib/runtime-context";

type ProviderOption = {
  id: string;
  label: string;
  disk?: string;
  configured: boolean;
  recommended?: boolean;
  purpose?: string;
};

type CentralStorageSettings = {
  scope: "central";
  primary_provider: string;
  active_disk: string;
  archive_provider: string;
  archive_enabled: boolean;
  providers: ProviderOption[];
  archive_providers: ProviderOption[];
  credentials_managed_by_environment: boolean;
  recommendation: string;
};

type TenantStorageUser = {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  storage_quota_mb: number | null;
  effective_quota_mb: number;
  used_bytes: number;
};

type TenantStorageSettings = {
  scope: "tenant";
  plan: string;
  plan_quota_mb: number;
  default_user_quota_mb: number;
  allocated_mb: number;
  remaining_allocation_mb: number;
  used_bytes: number;
  remaining_bytes: number;
  primary_provider: string;
  users: TenantStorageUser[];
};

type StorageSettingsData = CentralStorageSettings | TenantStorageSettings;

const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${getBackendApiRoot()}${endpoint}`;
  const headers = getAuthHeaders(
    typeof options.body === "string" ? { "Content-Type": "application/json" } : {},
  );
  const response = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const validationMessage = payload?.errors
      ? Object.values(payload.errors).flat().find((message) => typeof message === "string")
      : null;
    throw new Error(validationMessage || payload?.message || "Storage settings request failed.");
  }

  return payload;
};

const formatStorage = (bytes: number) => {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

export function StorageSettings() {
  const queryClient = useQueryClient();
  const workspaceScope = getWorkspaceScopeKey();
  const [primaryProvider, setPrimaryProvider] = useState("seaweedfs");
  const [archiveProvider, setArchiveProvider] = useState("sftp");
  const [archiveEnabled, setArchiveEnabled] = useState(false);
  const [defaultQuota, setDefaultQuota] = useState(512);
  const [userQuotas, setUserQuotas] = useState<Record<number, string>>({});

  const settingsQuery = useQuery({
    queryKey: ["storageSettings", workspaceScope],
    queryFn: () => apiFetch("/settings/storage"),
  });
  const data = settingsQuery.data?.data as StorageSettingsData | undefined;

  useEffect(() => {
    if (!data) return;

    if (data.scope === "central") {
      setPrimaryProvider(data.primary_provider);
      setArchiveProvider(data.archive_provider);
      setArchiveEnabled(data.archive_enabled);
      return;
    }

    setDefaultQuota(data.default_user_quota_mb);
    setUserQuotas(
      Object.fromEntries(
        data.users.map((user) => [
          user.id,
          user.storage_quota_mb === null ? "" : String(user.storage_quota_mb),
        ]),
      ),
    );
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!data) throw new Error("Storage settings are still loading.");

      const body =
        data.scope === "central"
          ? {
              primary_provider: primaryProvider,
              archive_provider: archiveProvider,
              archive_enabled: archiveEnabled,
            }
          : {
              default_user_quota_mb: defaultQuota,
              users: data.users.map((user) => ({
                id: user.id,
                storage_quota_mb:
                  userQuotas[user.id] === "" || userQuotas[user.id] === undefined
                    ? null
                    : Number(userQuotas[user.id]),
              })),
            };

      return apiFetch("/settings/storage", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: (result) => {
      toast.success(result.message || "Storage settings saved.");
      queryClient.invalidateQueries({ queryKey: ["storageSettings", workspaceScope] });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Could not save storage settings.")),
  });

  const testMutation = useMutation({
    mutationFn: () => apiFetch("/settings/storage/test", { method: "POST" }),
    onSuccess: (result) => toast.success(result.message || "Storage write/read validation passed."),
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Storage validation failed.")),
  });

  const draftAllocatedMb = useMemo(() => {
    if (!data || data.scope !== "tenant") return 0;

    return data.users.reduce((sum, user) => {
      const raw = userQuotas[user.id];
      return sum + (raw === "" || raw === undefined ? defaultQuota : Math.max(0, Number(raw) || 0));
    }, 0);
  }, [data, defaultQuota, userQuotas]);

  if (settingsQuery.isLoading) return <SettingsPanelSkeleton />;

  if (!data || settingsQuery.isError) {
    return (
      <Card className="rounded-3xl border-border/60 p-6">
        <h2 className="text-xl font-semibold">Storage settings unavailable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {getErrorMessage(settingsQuery.error, "The storage settings could not be loaded.")}
        </p>
        <Button className="mt-4" type="button" onClick={() => settingsQuery.refetch()}>
          Try again
        </Button>
      </Card>
    );
  }

  if (data.scope === "central") {
    const selectedProvider = data.providers.find((provider) => provider.id === primaryProvider);

    return (
      <section aria-labelledby="storage-settings-title" className="space-y-6">
        <Card className="rounded-3xl border-border/60 bg-card/70 p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-2xl bg-primary/10 p-3 text-[hsl(var(--primary-readable))]">
                <HardDrive aria-hidden="true" className="h-6 w-6" />
              </div>
              <h2 id="storage-settings-title" className="text-2xl font-semibold tracking-tight">
                Storage providers
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                Select the configured target for new uploads. Existing media keeps its original disk,
                so provider changes do not orphan older files.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={testMutation.isPending}
              onClick={() => testMutation.mutate()}
            >
              {testMutation.isPending ? (
                <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck aria-hidden="true" className="mr-2 h-4 w-4" />
              )}
              Test write and read
            </Button>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="storage-primary-provider">Primary upload provider</Label>
              <Select value={primaryProvider} onValueChange={setPrimaryProvider}>
                <SelectTrigger id="storage-primary-provider" aria-describedby="storage-primary-help">
                  <SelectValue placeholder="Choose a provider" />
                </SelectTrigger>
                <SelectContent>
                  {data.providers.map((provider) => (
                    <SelectItem
                      key={provider.id}
                      value={provider.id}
                      disabled={!provider.configured && provider.id !== data.primary_provider}
                    >
                      {provider.label}
                      {provider.recommended ? " - recommended" : ""}
                      {!provider.configured ? " - not configured" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p id="storage-primary-help" className="text-sm text-muted-foreground">
                Active Laravel disk: <span className="font-medium text-foreground">{data.active_disk}</span>.
                Credentials and endpoints stay in deployment environment variables.
              </p>
              {selectedProvider?.purpose ? (
                <p className="text-sm text-muted-foreground">{selectedProvider.purpose}</p>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="storage-archive-provider">Archive provider</Label>
                <Select value={archiveProvider} onValueChange={setArchiveProvider}>
                  <SelectTrigger id="storage-archive-provider">
                    <SelectValue placeholder="Choose an archive target" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.archive_providers.map((provider) => (
                      <SelectItem
                        key={provider.id}
                        value={provider.id}
                        disabled={!provider.configured && provider.id !== data.archive_provider}
                      >
                        {provider.label}
                        {!provider.configured ? " - not configured" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex min-h-11 items-center justify-between gap-4 rounded-2xl border border-border/60 p-4">
                <div>
                  <Label htmlFor="storage-archive-enabled">Enable offsite archives</Label>
                  <p id="storage-archive-description" className="mt-1 text-sm text-muted-foreground">
                    Intended for scheduled cPanel SFTP backups, not live application reads.
                  </p>
                </div>
                <Switch
                  id="storage-archive-enabled"
                  checked={archiveEnabled}
                  onCheckedChange={setArchiveEnabled}
                  aria-describedby="storage-archive-description"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-border/60 bg-muted/35 p-4">
            <p className="flex gap-2 text-sm leading-6">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--primary-readable))]" />
              <span>{data.recommendation}</span>
            </p>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? (
                <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save storage providers
            </Button>
          </div>
        </Card>
      </section>
    );
  }

  const overAllocated = draftAllocatedMb > data.plan_quota_mb;

  return (
    <section aria-labelledby="tenant-storage-title" className="space-y-6">
      <Card className="rounded-3xl border-border/60 bg-card/70 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-2xl bg-primary/10 p-3 text-[hsl(var(--primary-readable))]">
              <Database aria-hidden="true" className="h-6 w-6" />
            </div>
            <h2 id="tenant-storage-title" className="text-2xl font-semibold tracking-tight">
              User storage allocations
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Divide the {data.plan_quota_mb.toLocaleString()} MB {data.plan} plan entitlement among
              tenant users. A blank user value inherits the default allocation.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={testMutation.isPending}
            onClick={() => testMutation.mutate()}
          >
            {testMutation.isPending ? (
              <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck aria-hidden="true" className="mr-2 h-4 w-4" />
            )}
            Test storage
          </Button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 p-4">
            <p className="text-sm text-muted-foreground">Plan quota</p>
            <p className="mt-1 text-xl font-semibold">{data.plan_quota_mb.toLocaleString()} MB</p>
          </div>
          <div className="rounded-2xl border border-border/60 p-4">
            <p className="text-sm text-muted-foreground">Draft allocation</p>
            <p className="mt-1 text-xl font-semibold">{draftAllocatedMb.toLocaleString()} MB</p>
          </div>
          <div className="rounded-2xl border border-border/60 p-4">
            <p className="text-sm text-muted-foreground">Stored now</p>
            <p className="mt-1 text-xl font-semibold">{formatStorage(data.used_bytes)}</p>
          </div>
        </div>

        <div className="mt-6 max-w-sm space-y-2">
          <Label htmlFor="storage-default-user-quota">Default allocation per user (MB)</Label>
          <Input
            id="storage-default-user-quota"
            type="number"
            inputMode="numeric"
            min={0}
            max={data.plan_quota_mb}
            value={defaultQuota}
            onChange={(event) => setDefaultQuota(Math.max(0, Number(event.target.value) || 0))}
            aria-describedby="storage-default-user-quota-help"
          />
          <p id="storage-default-user-quota-help" className="text-sm text-muted-foreground">
            Applied when a user has no explicit override.
          </p>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-border/60">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <caption className="sr-only">Storage quota and usage for each tenant user</caption>
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">User</th>
                <th scope="col" className="px-4 py-3 font-semibold">Current usage</th>
                <th scope="col" className="px-4 py-3 font-semibold">Allocation</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => (
                <tr key={user.id} className="border-t border-border/60">
                  <td className="px-4 py-3">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-muted-foreground">{user.email}</p>
                    {!user.is_active ? <p className="text-muted-foreground">Inactive</p> : null}
                  </td>
                  <td className="px-4 py-3">{formatStorage(user.used_bytes)}</td>
                  <td className="px-4 py-3">
                    <div className="max-w-xs space-y-1">
                      <Label htmlFor={`storage-user-${user.id}`} className="text-xs text-muted-foreground">
                        Quota for {user.name} (MB)
                      </Label>
                      <Input
                        id={`storage-user-${user.id}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={data.plan_quota_mb}
                        placeholder={`Default: ${defaultQuota} MB`}
                        value={userQuotas[user.id] ?? ""}
                        onChange={(event) =>
                          setUserQuotas((current) => ({ ...current, [user.id]: event.target.value }))
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {overAllocated ? (
          <p role="alert" className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive dark:text-destructive-foreground">
            Reduce allocations by {(draftAllocatedMb - data.plan_quota_mb).toLocaleString()} MB to
            stay within the subscription limit.
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            {(data.plan_quota_mb - draftAllocatedMb).toLocaleString()} MB remains unallocated.
          </p>
        )}

        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            disabled={saveMutation.isPending || overAllocated}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? (
              <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Save user allocations
          </Button>
        </div>
      </Card>
    </section>
  );
}
