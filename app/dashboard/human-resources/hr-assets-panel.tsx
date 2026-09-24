'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Loader2, Trash2 } from 'lucide-react';
import { hrFetch } from '@/modules/humanresources/api';
import { getWorkspaceScopeKey } from '@/lib/runtime-context';
import { PanelTableSkeleton } from '@/components/ui/loading-states';

type AssetRow = {
  id: number;
  asset_name: string;
  asset_category: string;
  serial_number?: string | null;
  issued_date?: string | null;
  return_date?: string | null;
  status: string;
  notes?: string | null;
  employee?: { id: number; primary_name?: string };
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'issued', label: 'Issued' },
  { value: 'returned', label: 'Returned' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'lost', label: 'Lost' },
] as const;

function statusClass(status: string) {
  if (status === 'issued') return 'bg-blue-100 text-blue-800';
  if (status === 'returned') return 'bg-emerald-100 text-emerald-800';
  if (status === 'damaged') return 'bg-amber-100 text-amber-900';
  return 'bg-rose-100 text-rose-900';
}

export function HrAssetsPanel({ employees }: { employees: any[] }) {
  const queryClient = useQueryClient();
  const scope = getWorkspaceScopeKey();
  const [createOpen, setCreateOpen] = useState(false);
  const [resolveAsset, setResolveAsset] = useState<AssetRow | null>(null);
  const [resolveStatus, setResolveStatus] = useState<'returned' | 'damaged' | 'lost'>('returned');
  const [resolveDate, setResolveDate] = useState(new Date().toISOString().slice(0, 10));
  const [resolveNotes, setResolveNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<AssetRow | null>(null);

  const [form, setForm] = useState({
    employee_id: '',
    asset_name: '',
    asset_category: 'it_laptop',
    serial_number: '',
    issued_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const assetsQuery = useQuery({
    queryKey: ['hr-assets', scope, statusFilter],
    queryFn: () =>
      hrFetch<any>(
        '/assets' + (statusFilter !== 'all' ? `?status=${encodeURIComponent(statusFilter)}` : ''),
      ),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['hr-assets'] });
    queryClient.invalidateQueries({ queryKey: ['hr-assets-summary'] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      hrFetch('/assets', {
        method: 'POST',
        body: JSON.stringify({ ...form, employee_id: Number(form.employee_id) }),
      }),
    onSuccess: () => {
      toast.success('Asset custody registered.');
      setCreateOpen(false);
      setForm({
        employee_id: '',
        asset_name: '',
        asset_category: 'it_laptop',
        serial_number: '',
        issued_date: new Date().toISOString().slice(0, 10),
        notes: '',
      });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || 'Could not issue asset.'),
  });

  const resolveMutation = useMutation({
    mutationFn: () =>
      hrFetch(`/assets/${resolveAsset!.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: resolveStatus,
          return_date: resolveDate,
          notes: resolveNotes || undefined,
        }),
      }),
    onMutate: () => setBusyId(resolveAsset?.id ?? null),
    onSuccess: () => {
      toast.success('Asset custody updated.');
      setResolveAsset(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || 'Could not update asset.'),
    onSettled: () => setBusyId(null),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => hrFetch(`/assets/${id}`, { method: 'DELETE' }),
    onMutate: (id) => setBusyId(id),
    onSuccess: () => {
      toast.success('Asset custody deleted.');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || 'Could not delete asset.'),
    onSettled: () => setBusyId(null),
  });

  const assets: AssetRow[] = assetsQuery.data?.data ?? [];

  function openResolve(asset: AssetRow) {
    setResolveAsset(asset);
    setResolveStatus('returned');
    setResolveDate(new Date().toISOString().slice(0, 10));
    setResolveNotes(asset.notes || '');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold">Equipment & Fleet Asset Custody</h3>
          <p className="text-xs text-slate-500">
            Issue equipment to employees, then mark returned / damaged / lost. Open issued items also
            block offboarding clearance until they are resolved here.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Issue Asset Custody
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Label htmlFor="asset-status-filter" className="text-xs">
          Filter
        </Label>
        <select
          id="asset-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-950"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {assetsQuery.isLoading ? (
        <PanelTableSkeleton rows={6} cols={8} />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white dark:bg-slate-950">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-slate-50 font-bold dark:bg-slate-900">
              <tr>
                <th className="p-3">Asset Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Serial / Plate #</th>
                <th className="p-3">Custodian</th>
                <th className="p-3">Issued</th>
                <th className="p-3">Returned</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-slate-500">
                    No asset custodies match this filter.
                  </td>
                </tr>
              ) : (
                assets.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                    <td className="p-3 font-bold">{a.asset_name}</td>
                    <td className="p-3 capitalize">{a.asset_category.replaceAll('_', ' ')}</td>
                    <td className="p-3 font-mono text-slate-500">{a.serial_number || 'N/A'}</td>
                    <td className="p-3 font-semibold">{a.employee?.primary_name}</td>
                    <td className="p-3 text-slate-500">{a.issued_date || '—'}</td>
                    <td className="p-3 text-slate-500">{a.return_date || '—'}</td>
                    <td className="p-3">
                      <span
                        className={
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-bold uppercase ' +
                          statusClass(a.status)
                        }
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="space-x-1 p-3 text-right">
                      {a.status === 'issued' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openResolve(a)}
                          disabled={busyId !== null}
                          className="h-7 text-[11px]"
                        >
                          Resolve…
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setAssetToDelete(a);
                          setDeleteConfirmOpen(true);
                        }}
                        disabled={busyId !== null}
                        className="h-7 text-[11px]"
                      >
                        {busyId === a.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Issue Asset Custody</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div>
              <Label>Employee</Label>
              <select
                value={form.employee_id}
                onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="">Select Employee</option>
                {employees.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.primary_name} ({emp.employee_number})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Asset Name</Label>
              <Input
                value={form.asset_name}
                onChange={(e) => setForm({ ...form, asset_name: e.target.value })}
                placeholder="MacBook Pro 16-inch / Toyota Hilux"
              />
            </div>
            <div>
              <Label>Category</Label>
              <select
                value={form.asset_category}
                onChange={(e) => setForm({ ...form, asset_category: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="it_laptop">IT Laptop / Computer</option>
                <option value="mobile_device">Mobile Phone / Tablet</option>
                <option value="vehicle">Company Vehicle</option>
                <option value="fuel_card">Fuel Card</option>
                <option value="access_badge">Building Access Badge</option>
                <option value="uniform">Work Uniform / Gear</option>
              </select>
            </div>
            <div>
              <Label>Serial / License Plate Number</Label>
              <Input
                value={form.serial_number}
                onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                placeholder="C02G12345 / 3-12345 AA"
              />
            </div>
            <div>
              <Label>Issued date</Label>
              <Input
                type="date"
                value={form.issued_date}
                onChange={(e) => setForm({ ...form, issued_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.employee_id || !form.asset_name}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Issuing…
                </>
              ) : (
                'Issue Asset'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(resolveAsset)} onOpenChange={(open) => !open && setResolveAsset(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve custody — {resolveAsset?.asset_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <p className="text-slate-500">
              Custodian: {resolveAsset?.employee?.primary_name || 'Unknown'}. Resolving closes this
              issued row and unblocks offboarding for this employee (once all issued items are closed).
            </p>
            <div>
              <Label htmlFor="resolve-status">Outcome</Label>
              <select
                id="resolve-status"
                value={resolveStatus}
                onChange={(e) => setResolveStatus(e.target.value as 'returned' | 'damaged' | 'lost')}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="returned">Returned (good condition)</option>
                <option value="damaged">Damaged</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <div>
              <Label htmlFor="resolve-date">Return / resolve date</Label>
              <Input
                id="resolve-date"
                type="date"
                value={resolveDate}
                onChange={(e) => setResolveDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="resolve-notes">Notes</Label>
              <Input
                id="resolve-notes"
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="Optional condition or recovery notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveAsset(null)} disabled={resolveMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={() => resolveMutation.mutate()} disabled={resolveMutation.isPending}>
              {resolveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                'Save outcome'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-[2rem] border-border/60 bg-background/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete custody record?</AlertDialogTitle>
            <AlertDialogDescription>
              {assetToDelete && (
                <>
                  This will delete the custody record for <strong>{assetToDelete.asset_name}</strong> from{" "}
                  {assetToDelete.employee?.primary_name || 'the employee'}. This does not delete a physical asset
                  inventory item — only this assignment row.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (assetToDelete) {
                  deleteMutation.mutate(assetToDelete.id);
                }
                setDeleteConfirmOpen(false);
              }}
              className="rounded-xl bg-destructive hover:bg-destructive/90"
            >
              Delete record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
