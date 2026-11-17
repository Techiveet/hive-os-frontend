"use client";

import React, { useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { B2BDash } from "@/modules/b2b-marketplace/api";
import {
  ATTACHMENT_ACCEPT,
  AttachmentsPanel,
  MAX_ATTACHMENTS,
  formatBytes,
  validateAttachment,
} from "@/modules/b2b-marketplace/components/QuoteAttachments";

export function RfqAttachments({ inquiryId, canUpload = false }: { inquiryId: number; canUpload?: boolean }) {
  return (
    <AttachmentsPanel
      queryKey={["b2b", "rfqAttachments", inquiryId]}
      list={() => B2BDash.inquiryAttachments(inquiryId)}
      upload={(file) => B2BDash.uploadInquiryAttachment(inquiryId, file)}
      download={(file) => B2BDash.downloadInquiryAttachment(inquiryId, file)}
      canUpload={canUpload}
      emptyText="No files attached to this RFQ."
    />
  );
}

/**
 * A small "Files" button for RFQ cards. The list is only fetched once opened,
 * so a page with many RFQs does not fire one request per card.
 */
export function RfqAttachmentsToggle({ inquiryId, canUpload = false }: { inquiryId: number; canUpload?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setOpen((o) => !o)}>
        <Paperclip className="h-3.5 w-3.5" /> {open ? "Hide files" : "Files"}
      </Button>
      {open && (
        <div className="mt-2 max-w-md">
          <RfqAttachments inquiryId={inquiryId} canUpload={canUpload} />
        </div>
      )}
    </div>
  );
}

/**
 * File chooser for a form that creates something first and uploads afterwards.
 * Holds nothing but the selection: the parent uploads once the record exists.
 */
export function AttachmentPicker({ files, onChange, disabled = false }: { files: File[]; onChange: (files: File[]) => void; disabled?: boolean }) {
  const picker = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const add = (picked: File[]) => {
    const next = [...files];
    const problems: string[] = [];
    for (const f of picked) {
      const problem = validateAttachment(f);
      if (problem) problems.push(problem);
      else if (next.length >= MAX_ATTACHMENTS) problems.push(`At most ${MAX_ATTACHMENTS} files.`);
      else next.push(f);
    }
    onChange(next);
    setError(problems.length ? problems.join(" ") : null);
  };

  return (
    <div className="space-y-2">
      <input
        ref={picker}
        type="file"
        multiple
        accept={ATTACHMENT_ACCEPT}
        className="hidden"
        onChange={(e) => { add(Array.from(e.target.files ?? [])); e.target.value = ""; }}
      />
      <Button type="button" variant="outline" size="sm" className="gap-1 rounded-lg" disabled={disabled || files.length >= MAX_ATTACHMENTS} onClick={() => picker.current?.click()}>
        <Paperclip className="h-3.5 w-3.5" /> Attach files
      </Button>
      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1 text-sm">
              <span className="min-w-0 flex-1 truncate" title={f.name}>{f.name}</span>
              <span className="shrink-0 text-[11px] text-muted-foreground">{formatBytes(f.size)}</span>
              {!disabled && (
                <button type="button" aria-label={`Remove ${f.name}`} className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => onChange(files.filter((_, j) => j !== i))}>
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-muted-foreground">PDF, images, Word, Excel, CSV or text · up to 10 MB each · max {MAX_ATTACHMENTS} files.</p>
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}