'use client';

import React, { useMemo, useState } from 'react';
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
import { Plus, Loader2, Trash2, ChevronLeft, ChevronRight, Paperclip, Download } from 'lucide-react';
import { hrFetch, hrReferenceOptions, type Paginated, type LocalizedReferenceName } from '@/modules/humanresources/api';
import { getAuthHeaders, getBackendApiRoot, getWorkspaceScopeKey } from '@/lib/runtime-context';
import { PanelTableSkeleton } from '@/components/ui/loading-states';
import { useUser } from '@/hooks/use-user';

type ExpenseRow = {
  id: number;
  claim_number: string;
  category: string;
  amount: number | string;
  currency?: string;
  expense_date: string;
  description?: string | null;
  status: string;
  approved_by?: string | null;
  paid_at?: string | null;
  has_receipt?: boolean;
  employee?: { id: number; primary_name?: string; employee_number?: string };
};

const FALLBACK_CATEGORIES = [
  { code: 'travel', label: 'Business Travel' },
  { code: 'per_diem', label: 'Per Diem Allowance' },
  { code: 'medical', label: 'Medical Reimbursement' },
  { code: 'supplies', label: 'Office Supplies' },
  { code: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'reimbursed', label: 'Reimbursed' },
] as const;

function statusClass(status: string) {
  if (status === 'reimbursed') return 'bg-emerald-100 text-emerald-800';
  if (status === 'approved') return 'bg-blue-100 text-blue-800';
  if (status === 'rejected') return 'bg-red-100 text-red-800';
  return 'bg-amber-100 text-amber-800';
}

function categoryLabel(code: string, categories: Array<{ code: string; label: string }>) {
  return categories.find((c) => c.code === code)?.label ?? code.replaceAll('_', ' ');
}

export function HrExpensesPanel({
  employees,
  canManage = false,
}: {
  employees: any[];
  canManage?: boolean;
}) {
  const queryClient = useQueryClient();
  const scope = getWorkspaceScopeKey();
  const { user } = useUser();
  const [createOpen, setCreateOpen] = useState(false);
  const [updatingAction, setUpdatingAction] = useState<{ id: number; status: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [claimToDelete, setClaimToDelete] = useState<ExpenseRow | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    employee_id: '',
    category: 'travel',
    amount: '',
    expense_date: new Date().toISOString().slice(0, 10),
    description: '',
  });

  const categoriesQuery = useQuery({
    queryKey: ['hr-expense-categories', scope],
    queryFn: async () => {
      try {
        const options = await hrReferenceOptions('expense-categories');
        const mapped = options
          .map((opt) => ({
            code: opt.code || '',
            label:
              (opt.label as LocalizedReferenceName)?.en ||
              (opt.label as LocalizedReferenceName)?.am ||
              (opt.code || '').replaceAll('_', ' '),
          }))
          .filter((opt) => opt.code);
        return mapped.length ? mapped : FALLBACK_CATEGORIES;
      } catch {
        return FALLBACK_CATEGORIES;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const categories = categoriesQuery.data ?? FALLBACK_CATEGORIES;

  const expensesQuery = useQuery({
    queryKey: ['hr-expenses', scope, statusFilter, employeeFilter, page],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('per_page', '25');
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (employeeFilter !== 'all') params.set('employee_id', employeeFilter);
      return hrFetch<Paginated<ExpenseRow>>(`/expenses?${params.toString()}`);
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const body = new FormData();
      body.append('employee_id', String(Number(form.employee_id)));
      body.append('category', form.category);
      body.append('amount', String(Number(form.amount)));
      body.append('expense_date', form.expense_date);
      if (form.description) body.append('description', form.description);
      if (receiptFile) body.append('receipt', receiptFile);
      return hrFetch('/expenses', { method: 'POST', body });
    },
    onSuccess: () => {
      toast.success('Expense claim filed.');
      setCreateOpen(false);
      setReceiptFile(null);
      setForm({
        employee_id: '',
        category: 'travel',
        amount: '',
        expense_date: new Date().toISOString().slice(0, 10),
        description: '',
      });
      queryClient.invalidateQueries({ queryKey: ['hr-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['hr-expenses-summary'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Could not file expense claim.'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      hrFetch(`/expenses/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          approved_by: user?.name || user?.email || undefined,
        }),
      }),
    onMutate: ({ id, status }) => {
      setUpdatingAction({ id, status });
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.status === 'reimbursed'
          ? 'Expense reimbursed. Finance will post if an account mapping exists.'
          : 'Expense status updated.',
      );
      queryClient.invalidateQueries({ queryKey: ['hr-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['hr-expenses-summary'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Could not update expense status.'),
    onSettled: () => {
      setUpdatingAction(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => hrFetch(`/expenses/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Expense claim deleted.');
      setDeleteConfirmOpen(false);
      setClaimToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['hr-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['hr-expenses-summary'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Could not delete expense claim.'),
  });

  const expenses = expensesQuery.data?.data ?? [];
  const meta = expensesQuery.data?.meta;
  const currentPage = meta?.current_page ?? page;
  const lastPage = meta?.last_page ?? 1;
  const total = meta?.total ?? expenses.length;
  const canPaginate = lastPage > 1;

  const selectClass =
    'mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

  const employeeOptions = useMemo(
    () =>
      [...employees].sort((a, b) =>
        String(a.primary_name || '').localeCompare(String(b.primary_name || '')),
      ),
    [employees],
  );

  async function downloadReceipt(claimId: number, claimNumber: string) {
    try {
      const response = await fetch(
        `${getBackendApiRoot()}/hr/expenses/${claimId}/receipt`,
        { headers: getAuthHeaders() },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Receipt download failed.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${claimNumber}-receipt`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.message || 'Could not download receipt.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold">Expense Claims & Per Diem Reimbursements</h3>
          <p className="text-xs text-slate-500">
            Submit expense reports for business travel, per diem, medical, and supplies reimbursement.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> File Expense Claim
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-[180px]">
          <Label className="text-[11px] text-slate-500">Status</Label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value);
            }}
            className={selectClass}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[220px]">
          <Label className="text-[11px] text-slate-500">Employee</Label>
          <select
            value={employeeFilter}
            onChange={(e) => {
              setPage(1);
              setEmployeeFilter(e.target.value);
            }}
            className={selectClass}
          >
            <option value="all">All employees</option>
            {employeeOptions.map((emp: any) => (
              <option key={emp.id} value={emp.id}>
                {emp.primary_name} ({emp.employee_number})
              </option>
            ))}
          </select>
        </div>
      </div>

      {expensesQuery.isLoading ? (
        <PanelTableSkeleton rows={6} cols={8} />
      ) : (
        <div className="rounded-xl border bg-white overflow-x-auto dark:bg-slate-950">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-slate-50 font-bold dark:bg-slate-900">
              <tr>
                <th className="p-3">Claim #</th>
                <th className="p-3">Employee</th>
                <th className="p-3">Category</th>
                <th className="p-3">Date</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Receipt</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-slate-500">
                    No expense claims match these filters.
                  </td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                    <td className="p-3 font-mono font-bold">{e.claim_number}</td>
                    <td className="p-3 font-bold">{e.employee?.primary_name}</td>
                    <td className="p-3 capitalize">
                      {categoryLabel(e.category, categories)}
                    </td>
                    <td className="p-3 text-slate-500">{e.expense_date}</td>
                    <td className="p-3 font-bold text-teal-600">
                      {Number(e.amount).toLocaleString()} {e.currency || 'ETB'}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold uppercase ${statusClass(e.status)}`}
                      >
                        {e.status}
                      </span>
                      {e.status === 'reimbursed' && e.paid_at ? (
                        <div className="mt-1 text-[10px] font-medium text-emerald-700">
                          Finance source event eligible
                        </div>
                      ) : null}
                      {e.approved_by ? (
                        <div className="mt-1 text-[10px] text-slate-500">by {e.approved_by}</div>
                      ) : null}
                    </td>
                    <td className="p-3">
                      {e.has_receipt ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px]"
                          onClick={() => downloadReceipt(e.id, e.claim_number)}
                        >
                          <Download className="mr-1 h-3 w-3" /> Receipt
                        </Button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-1">
                      {canManage && e.status === 'submitted' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() =>
                              updateStatusMutation.mutate({ id: e.id, status: 'approved' })
                            }
                            disabled={updatingAction !== null}
                            className="h-7 text-[11px] bg-blue-600 hover:bg-blue-700"
                          >
                            {updatingAction?.id === e.id && updatingAction?.status === 'approved' ? (
                              <>
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Approving...
                              </>
                            ) : (
                              'Approve'
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateStatusMutation.mutate({ id: e.id, status: 'rejected' })
                            }
                            disabled={updatingAction !== null}
                            className="h-7 text-[11px] text-red-600"
                          >
                            {updatingAction?.id === e.id && updatingAction?.status === 'rejected' ? (
                              <>
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Rejecting...
                              </>
                            ) : (
                              'Reject'
                            )}
                          </Button>
                        </>
                      )}
                      {canManage && e.status === 'approved' && (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateStatusMutation.mutate({ id: e.id, status: 'reimbursed' })
                          }
                          disabled={updatingAction !== null}
                          className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700"
                        >
                          {updatingAction?.id === e.id &&
                          updatingAction?.status === 'reimbursed' ? (
                            <>
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Reimbursing...
                            </>
                          ) : (
                            'Reimburse Payout'
                          )}
                        </Button>
                      )}
                      {canManage && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] text-red-600"
                          onClick={() => {
                            setClaimToDelete(e);
                            setDeleteConfirmOpen(true);
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {canPaginate && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            Page {currentPage} of {lastPage} · {total} claims
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage <= 1 || expensesQuery.isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage >= lastPage || expensesQuery.isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>File Expense Claim</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div>
              <Label>Employee</Label>
              <select
                value={form.employee_id}
                onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                className={selectClass}
              >
                <option value="">Select Employee</option>
                {employeeOptions.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.primary_name} ({emp.employee_number})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Expense Category</Label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={selectClass}
              >
                {categories.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Expense Date</Label>
              <Input
                type="date"
                value={form.expense_date}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Amount (ETB)</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="1500.00"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Purpose of expense..."
              />
            </div>
            <div>
              <Label>Receipt (optional)</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
              />
              {receiptFile ? (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                  <Paperclip className="h-3 w-3" /> {receiptFile.name}
                </p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={
                createMutation.isPending ||
                !form.employee_id ||
                !form.amount ||
                !form.expense_date
              }
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Filing...
                </>
              ) : (
                'File Claim'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense claim?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete claim{' '}
              <strong>{claimToDelete?.claim_number}</strong>
              {claimToDelete?.employee?.primary_name
                ? ` for ${claimToDelete.employee.primary_name}`
                : ''}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending || !claimToDelete}
              onClick={(ev) => {
                ev.preventDefault();
                if (claimToDelete) deleteMutation.mutate(claimToDelete.id);
              }}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
