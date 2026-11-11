"use client";

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Download, File as FileIcon, FileText, FolderDown, Image as ImageIcon, Loader2, Music, Paperclip, Video } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PdfViewer } from '@/components/ui/pdf-viewer';
import { DocumentViewer } from '@/components/ui/document-viewer';
import { authenticatedDownload } from '@/lib/authenticated-download';
import { getErrorMessage } from '@/lib/errors';
import { getAuthHeaders, getTenantId } from '@/lib/runtime-context';
import { usePermissions } from '@/hooks/use-permissions';
import { useTenantModuleAccess } from '@/hooks/use-tenant-module-access';
import type { MailAttachmentInfo } from '@/store/mail-store';

type PreviewKind = 'image' | 'pdf' | 'video' | 'audio' | 'text' | 'office' | 'other';

const OFFICE_EXTENSIONS = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf'];
const TEXT_EXTENSIONS = ['txt', 'csv', 'log', 'md', 'json', 'xml'];

const getExtension = (name: string) => {
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index + 1).toLowerCase() : '';
};

const getPreviewKind = (attachment: { name: string; mime_type?: string | null }): PreviewKind => {
  const mime = (attachment.mime_type || '').toLowerCase();
  const extension = getExtension(attachment.name);

  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf' || extension === 'pdf') return 'pdf';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'text/plain' || mime === 'text/csv' || TEXT_EXTENSIONS.includes(extension)) return 'text';
  if (OFFICE_EXTENSIONS.includes(extension) || mime.includes('officedocument') || mime.includes('msword') || mime.includes('ms-excel') || mime.includes('ms-powerpoint')) return 'office';

  return 'other';
};

const withDownloadFlag = (url: string) => (url.includes('?') ? `${url}&download=1` : `${url}?download=1`);

const AttachmentIcon = ({ kind, className }: { kind: PreviewKind; className?: string }) => {
  if (kind === 'image') return <ImageIcon aria-hidden="true" className={className} />;
  if (kind === 'video') return <Video aria-hidden="true" className={className} />;
  if (kind === 'audio') return <Music aria-hidden="true" className={className} />;
  if (kind === 'pdf' || kind === 'text' || kind === 'office') return <FileText aria-hidden="true" className={className} />;
  return <FileIcon aria-hidden="true" className={className} />;
};

/** Image, video and audio need the login header, so they are fetched as a blob and shown from a local URL. */
export function BlobMedia({ attachment, kind }: { attachment: { name: string; url: string }; kind: 'image' | 'video' | 'audio' }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    setObjectUrl(null);
    setError(null);

    (async () => {
      try {
        const response = await fetch(attachment.url, { headers: getAuthHeaders() });

        if (!response.ok) {
          throw new Error('Failed to load the preview.');
        }

        const blob = await response.blob();
        createdUrl = URL.createObjectURL(blob);

        if (!active) {
          URL.revokeObjectURL(createdUrl);
          return;
        }

        setObjectUrl(createdUrl);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load the preview.');
        }
      }
    })();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [attachment.url]);

  if (error) {
    return <p className="p-8 text-center text-sm text-muted-foreground">{error} You can still download the file.</p>;
  }

  if (!objectUrl) {
    return (
      <div className="flex min-h-[240px] items-center justify-center gap-2 text-muted-foreground" role="status">
        <Loader2 aria-hidden="true" className="size-5 animate-spin" />
        <span className="text-sm">Loading preview</span>
      </div>
    );
  }

  if (kind === 'image') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={objectUrl} alt={attachment.name} className="mx-auto max-h-[65vh] max-w-full object-contain" />;
  }

  if (kind === 'video') {
    return <video src={objectUrl} controls className="mx-auto max-h-[65vh] max-w-full" />;
  }

  return (
    <div className="flex min-h-[160px] items-center justify-center p-6">
      <audio src={objectUrl} controls className="w-full max-w-xl" />
    </div>
  );
}

function useCanSaveToFiles() {
  const { hasPermission } = usePermissions();
  const { hasModule } = useTenantModuleAccess();
  const isTenantWorkspace = Boolean(getTenantId());
  const hasStorageModule = !isTenantWorkspace || hasModule('media_library') || hasModule('file_manager');

  return hasPermission('manage_storage') && hasStorageModule;
}

interface PreviewDialogProps {
  messageId: number;
  attachment: MailAttachmentInfo | null;
  onClose: () => void;
}

export function MailAttachmentPreviewDialog({ messageId, attachment, onClose }: PreviewDialogProps) {
  const canSaveToFiles = useCanSaveToFiles();
  const [busy, setBusy] = useState<'download' | 'save' | null>(null);

  if (!attachment) {
    return null;
  }

  const kind = getPreviewKind(attachment);
  const headers = getAuthHeaders();
  const downloadUrl = withDownloadFlag(attachment.url);

  const handleDownload = async () => {
    setBusy('download');
    try {
      await authenticatedDownload(downloadUrl, { filename: attachment.name, headers });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to download attachment.'));
    } finally {
      setBusy(null);
    }
  };

  const handleSave = async () => {
    setBusy('save');
    try {
      const { data } = await api.post(`/mail/${messageId}/attachments/${attachment.id}/save`);
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
          <DialogTitle className="truncate pr-8">{attachment.name}</DialogTitle>
          <DialogDescription>
            {[attachment.human_size, attachment.mime_type].filter(Boolean).join(' · ') || 'Email attachment'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[240px] flex-1 overflow-auto rounded-xl border border-border/60 bg-muted/20">
          {kind === 'pdf' ? (
            <div className="h-[65vh]">
              <PdfViewer
                src={attachment.url}
                fetchUrl={attachment.url}
                fetchHeaders={headers}
                downloadUrl={downloadUrl}
                title={attachment.name}
              />
            </div>
          ) : kind === 'image' || kind === 'video' || kind === 'audio' ? (
            <BlobMedia attachment={attachment} kind={kind} />
          ) : (
            <DocumentViewer
              url={attachment.url}
              type={kind === 'text' ? 'text' : kind === 'office' ? 'office' : 'unknown'}
              fetchUrl={attachment.url}
              fetchHeaders={headers}
              downloadUrl={downloadUrl}
              previewUrl={kind === 'office' ? `${attachment.url.split('?')[0]}/preview` : undefined}
              previewHeaders={headers}
              title={attachment.name}
            />
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {canSaveToFiles && (
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

interface AttachmentListProps {
  messageId: number;
  attachments: MailAttachmentInfo[];
}

/** Attachments of a received/sent message. Clicking one opens the preview dialog. */
export function MailAttachmentList({ messageId, attachments }: AttachmentListProps) {
  const [selected, setSelected] = useState<MailAttachmentInfo | null>(null);

  if (!attachments.length) {
    return null;
  }

  return (
    <section aria-label="Attachments" className="mb-8 shrink-0 print:hidden">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Paperclip aria-hidden="true" className="size-4 text-muted-foreground" />
        {attachments.length === 1 ? '1 attachment' : `${attachments.length} attachments`}
      </h2>
      <ul className="flex flex-wrap gap-2">
        {attachments.map((attachment) => (
          <li key={attachment.id}>
            <button
              type="button"
              onClick={() => setSelected(attachment)}
              className="flex max-w-[260px] items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-2 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <AttachmentIcon kind={getPreviewKind(attachment)} className="size-5 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">{attachment.name}</span>
                <span className="block text-xs text-muted-foreground">{attachment.human_size}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <MailAttachmentPreviewDialog messageId={messageId} attachment={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

export { AttachmentIcon, getPreviewKind };
