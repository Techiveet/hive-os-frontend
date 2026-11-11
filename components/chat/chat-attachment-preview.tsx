"use client";

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Download, FolderDown, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PdfViewer } from '@/components/ui/pdf-viewer';
import { DocumentViewer } from '@/components/ui/document-viewer';
import { BlobMedia, getPreviewKind } from '@/components/mail/mail-attachments';
import { authenticatedDownload } from '@/lib/authenticated-download';
import { getErrorMessage } from '@/lib/errors';
import { getAuthHeaders } from '@/lib/runtime-context';
import { getChatAttachmentLabel } from '@/lib/chat-utils';
import type { ChatAttachmentMetadata } from '@/store/chat-store';

const withDownloadFlag = (url: string) => (url.includes('?') ? `${url}&download=1` : `${url}?download=1`);

interface ChatAttachmentPreviewDialogProps {
  conversationId: number | null;
  messageId: number | null;
  attachment: ChatAttachmentMetadata | null;
  /** Same permission the chat already uses for "Save to File Manager". */
  canSave: boolean;
  onClose: () => void;
}

/** Opens a chat attachment inside the chat: preview where possible, Download always, Save if allowed. */
export function ChatAttachmentPreviewDialog({
  conversationId,
  messageId,
  attachment,
  canSave,
  onClose,
}: ChatAttachmentPreviewDialogProps) {
  const [busy, setBusy] = useState<'download' | 'save' | null>(null);

  if (!attachment || !attachment.url) {
    return null;
  }

  const url = attachment.url;
  const label = getChatAttachmentLabel(attachment) || 'Attachment';
  const fileName = attachment.download_name || attachment.name || attachment.title || 'attachment';
  const kind = getPreviewKind({ name: fileName, mime_type: attachment.mime_type });
  const headers = getAuthHeaders();
  const downloadUrl = withDownloadFlag(url);

  const handleDownload = async () => {
    setBusy('download');
    try {
      await authenticatedDownload(downloadUrl, { filename: fileName, headers });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to download attachment.'));
    } finally {
      setBusy(null);
    }
  };

  const handleSave = async () => {
    if (!conversationId || !messageId) {
      return;
    }

    setBusy('save');
    try {
      const { data } = await api.post(`/chat/conversations/${conversationId}/messages/${messageId}/save-attachment`);
      toast.success(data?.message || 'Attachment saved to File Manager.');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save attachment to File Manager.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-4 overflow-hidden sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{label}</DialogTitle>
          <DialogDescription>
            {[attachment.human_size, attachment.mime_type].filter(Boolean).join(' · ') || 'Chat attachment'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[240px] flex-1 overflow-auto rounded-xl border border-border/60 bg-muted/20">
          {kind === 'pdf' ? (
            <div className="h-[65vh]">
              <PdfViewer
                src={url}
                fetchUrl={url}
                fetchHeaders={headers}
                downloadUrl={downloadUrl}
                title={fileName}
              />
            </div>
          ) : kind === 'image' || kind === 'video' || kind === 'audio' ? (
            <BlobMedia attachment={{ name: label, url }} kind={kind} />
          ) : (
            <DocumentViewer
              url={url}
              type={kind === 'text' ? 'text' : kind === 'office' ? 'office' : 'unknown'}
              fetchUrl={url}
              fetchHeaders={headers}
              downloadUrl={downloadUrl}
              previewUrl={kind === 'office' ? `${url.split('?')[0]}/preview` : undefined}
              previewHeaders={headers}
              title={fileName}
            />
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {canSave && (
            <Button type="button" variant="outline" onClick={handleSave} disabled={busy !== null}>
              {busy === 'save' ? <Loader2 aria-hidden="true" className="mr-2 size-4 animate-spin" /> : <FolderDown aria-hidden="true" className="mr-2 size-4" />}
              Save to my Files
            </Button>
          )}
          <Button type="button" onClick={handleDownload} disabled={busy !== null}>
            {busy === 'download' ? <Loader2 aria-hidden="true" className="mr-2 size-4 animate-spin" /> : <Download aria-hidden="true" className="mr-2 size-4" />}
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
