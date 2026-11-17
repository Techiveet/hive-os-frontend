"use client";

import React, { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Loader2, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { B2BDash, type B2BAttachment } from "@/modules/b2b-marketplace/api";

// Mirrors the backend rules in AttachmentController (10 MB, 10 files, these types).
export const ATTACHMENT_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt";
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS = 10;

const ALLOWED_EXTENSIONS = ATTACHMENT_ACCEPT.split(",").map((e) => e.slice(1));

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Returns an error message, or null when the file is acceptable. */
export function validateAttachment(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) return `${file.name}: file type not allowed.`;
  if (file.size > MAX_ATTACHMENT_BYTES) return `${file.name}: larger than 10 MB.`;
  return null;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  const e = error as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

type PanelProps = {
  queryKey: unknown[];
  list: () => Promise<B2BAttachment[]>;
  upload: (file: File) => Promise<unknown>;
  download: (file: B2BAttachment) => Promise<void>;
  canUpload?: boolean;
  emptyText?: string;
};

/**
 * Generic attachment list: download for anyone allowed to see the parent,
 * and an "Add file" button when `canUpload` is set. Used for quotes and RFQs.
 */
export function AttachmentsPanel({ queryKey, list, upload, download, canUpload = false, emptyText = "No files attached." }: PanelProps) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);

  const listQ = useQuery({ queryKey, queryFn: list });
  const files = listQ.data ?? [];

  const uploadMut = useMutation({
    mutationFn: async (picked: File[]) => {
      const errors: string[] = [];
      for (const file of picked) {
        const problem = validateAttachment(file);
        if (problem) { errors.push(problem); continue; }
        try {
          await upload(file);
        } catch (e) {
          errors.push(`${file.name}: ${apiErrorMessage(e, "upload failed.")}`);
        }
      }
      if (errors.length) throw new Error(errors.join(" "));
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });

  const downloadMut = useMutation({ mutationFn: (file: B2BAttachment) => download(file) });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <Paperclip className="h-3.5 w-3.5" /> Attachments {files.length > 0 && `(${files.length})`}
        </p>
        {canUpload && (
          <>
            <input
              ref={input}
              type="file"
              multiple
              accept={ATTACHMENT_ACCEPT}
              className="hidden"
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                e.target.value = "";
                if (picked.length) uploadMut.mutate(picked);
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 rounded-lg text-xs"
              disabled={uploadMut.isPending || files.length >= MAX_ATTACHMENTS}
              onClick={() => input.current?.click()}
            >
              {uploadMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />} Add file
            </Button>
          </>
        )}
      </div>

      {listQ.isLoading ? (
        <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
      ) : files.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="space-y-1">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-sm">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate" title={f.name}>{f.name}</span>
              <span className="shrink-0 text-[11px] text-muted-foreground">{formatBytes(f.size_bytes)}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                aria-label={`Download ${f.name}`}
                disabled={downloadMut.isPending && downloadMut.variables?.id === f.id}
                onClick={() => downloadMut.mutate(f)}
              >
                {downloadMut.isPending && downloadMut.variables?.id === f.id
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Download className="h-3.5 w-3.5" />}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {uploadMut.isError && <p className="text-xs text-destructive" role="alert">{(uploadMut.error as Error).message}</p>}
      {downloadMut.isError && <p className="text-xs text-destructive" role="alert">Could not download the file.</p>}
      {canUpload && <p className="text-[11px] text-muted-foreground">PDF, images, Word, Excel, CSV or text · up to 10 MB each · max {MAX_ATTACHMENTS} files.</p>}
    </div>
  );
}

/** Attachments of a quote (supplier uploads, buyer downloads). */
export function QuoteAttachments({ quoteId, canUpload = false }: { quoteId: number; canUpload?: boolean }) {
  return (
    <AttachmentsPanel
      queryKey={["b2b", "quoteAttachments", quoteId]}
      list={() => B2BDash.quoteAttachments(quoteId)}
      upload={(file) => B2BDash.uploadQuoteAttachment(quoteId, file)}
      download={(file) => B2BDash.downloadQuoteAttachment(quoteId, file)}
      canUpload={canUpload}
      emptyText="No files attached to this quote."
    />
  );
}

export function QuoteAttachmentsToggle({ quoteId, canUpload = false }: { quoteId: number; canUpload?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setOpen((o) => !o)}>
        <Paperclip className="h-3.5 w-3.5" /> {open ? "Hide files" : "Files"}
      </Button>
      {open && (
        <div className="mt-2 max-w-md">
          <QuoteAttachments quoteId={quoteId} canUpload={canUpload} />
        </div>
      )}
    </div>
  );
}