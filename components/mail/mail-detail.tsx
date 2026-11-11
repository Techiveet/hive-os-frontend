"use client";

import { VideoCallButton } from "@/components/communications/video-call-button";
import React, { useState } from 'react';
import { useMailStore } from '@/store/mail-store';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash, Reply, Forward, Star, Archive, MailOpen, Mail, Printer, Maximize, Minimize, Lock, Zap, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { SafeRichText } from '@/components/security/safe-rich-text';
import { getMailCallEncryptionMaterial } from '@/lib/mail-e2ee';
import { MailAttachmentList } from '@/components/mail/mail-attachments';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function MailDetail() {
  const { mails, selectedMailId, selectMail, deleteMail, updateMail, setComposeOpen, activeFolder, checkedMailIds, adjustCounts, isFullscreen, setFullscreen, encryptionConfig } = useMailStore();

  const [pendingAction, setPendingAction] = useState<'delete' | 'archive' | 'spam' | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const mail = mails.find((m) => m.mail_message_id === selectedMailId);
  const isMailEncrypted = Boolean(mail?.message?.encryption?.encrypted);
  const isSecureMailEnabled = Boolean(encryptionConfig.enabled);

  if (!mail) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center border-l bg-background text-muted-foreground">
        {checkedMailIds.length > 0 ? (
           <div className="flex flex-col items-center">
             <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 ring-8 ring-primary/5">
                <span className="text-xl font-bold text-primary">{checkedMailIds.length}</span>
             </div>
             <p className="font-semibold text-foreground text-lg mb-1">{checkedMailIds.length} conversations selected</p>
             <p className="text-sm">Choose an action from the toolbar to apply to all selected conversations.</p>
           </div>
        ) : (
           <>
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
              <MailOpen aria-hidden="true" className="size-8 text-primary" />
            </div>
            <p className="font-medium">Select a message to read</p>
           </>
        )}
      </div>
    );
  }

  const handleDelete = async () => {
    setPendingAction('delete');
  };

  const confirmDelete = async () => {
    if (!selectedMailId) return;
    setActionBusy(true);
    try {
      if (activeFolder === 'trash') {
        await api.delete(`/mail/${selectedMailId}`);
        deleteMail(selectedMailId);
        adjustCounts({ trash: -1 });
      } else {
        await api.delete(`/mail/${selectedMailId}`);
        updateMail(selectedMailId, { folder: 'trash' });
        deleteMail(selectedMailId);
        adjustCounts({ [activeFolder]: -1, trash: 1 });
      }
      selectMail(null);
      toast.success(activeFolder === 'trash' ? 'Message deleted permanently' : 'Message moved to trash');
    } catch (err) {
      toast.error('Failed to delete message');
    } finally {
      setActionBusy(false);
      setPendingAction(null);
    }
  };

  const handleArchive = async () => {
    setPendingAction('archive');
  };

  const confirmArchive = async () => {
    if (!selectedMailId) return;
    setActionBusy(true);
    try {
      await api.post('/mail/bulk', { ids: [selectedMailId], action: 'archive' });
      updateMail(selectedMailId, { folder: 'archive' });
      deleteMail(selectedMailId);
      adjustCounts({ [activeFolder]: -1, archive: 1 });
      selectMail(null);
      toast.success('Message archived');
    } catch (err) {
      toast.error('Failed to archive message');
    } finally {
      setActionBusy(false);
      setPendingAction(null);
    }
  };

  const handleSpamToggle = async () => {
    setPendingAction('spam');
  };

  const confirmSpamToggle = async () => {
    if (!selectedMailId) return;
    setActionBusy(true);
    const nextFolder = activeFolder === 'spam' ? 'inbox' : 'spam';

    try {
      await api.post('/mail/bulk', { ids: [selectedMailId], action: nextFolder });
      updateMail(selectedMailId, { folder: nextFolder });
      deleteMail(selectedMailId);
      adjustCounts({ [activeFolder]: -1, [nextFolder]: 1 });
      selectMail(null);
      toast.success(nextFolder === 'spam' ? 'Message moved to spam' : 'Message moved to inbox');
    } catch (err) {
      toast.error(nextFolder === 'spam' ? 'Failed to move message to spam' : 'Failed to move message to inbox');
    } finally {
      setActionBusy(false);
      setPendingAction(null);
    }
  };

  const handleToggleStar = async () => {
    const newVal = !mail.is_starred;
    updateMail(selectedMailId!, { is_starred: newVal });
    adjustCounts({ starred: newVal ? 1 : -1 });
    try {
      await api.put(`/mail/${selectedMailId}`, { is_starred: newVal });
    } catch (err) {
      updateMail(selectedMailId!, { is_starred: !newVal });
      adjustCounts({ starred: !newVal ? 1 : -1 });
      toast.error('Failed to update star');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReply = () => {
    const otherParticipants = (mail.message?.participants || [])
      .map((participant) => participant.user)
      .filter((participant): participant is NonNullable<typeof participant> => Boolean(participant))
      .filter((participant) => String(participant.id) !== String(mail.user_id));
    const replyRecipients = mail.folder === 'sent'
      ? otherParticipants
      : (mail.message?.sender ? [mail.message.sender] : []);

    setComposeOpen(true, {
      to: replyRecipients,
      subject: (mail.message?.subject || '').startsWith('Re:') ? mail.message?.subject : `Re: ${mail.message?.subject || ''}`,
      body: `\n\n\n--- Original Message ---\nFrom: ${mail.message?.sender?.name || 'Unknown'}\nDate: ${mail.message?.created_at ? format(new Date(mail.message.created_at), 'PPPp') : 'Unknown'}\n\n${mail.message?.body || ''}`
    });
  };

  const handleForward = () => {
    setComposeOpen(true, {
      to: [],
      subject: (mail.message?.subject || '').startsWith('Fwd:') ? mail.message?.subject : `Fwd: ${mail.message?.subject || ''}`,
      body: `\n\n\n--- Forwarded Message ---\nFrom: ${mail.message?.sender?.name || 'Unknown'}\nDate: ${mail.message?.created_at ? format(new Date(mail.message.created_at), 'PPPp') : 'Unknown'}\n\n${mail.message?.body || ''}`
    });
  };

  return (
    <TooltipProvider>
      <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-background print:absolute print:inset-0 print:w-full print:border-none">
        <div className="flex-1 overflow-y-auto p-4 @xl:p-8 @3xl:p-10 flex flex-col print:p-0 scrollbar-thin overscroll-none">

          {/* Header Action Toolbar Area matching reference */}
          <div className="mb-6 flex flex-col gap-4 @2xl:mb-8 @2xl:flex-row @2xl:items-start @2xl:justify-between">
            <div className="flex min-w-0 items-center gap-4">
               <Avatar className="size-[52px] border shadow-sm">
                 <AvatarImage src={mail.message?.sender?.avatar_url} />
                 <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                   {mail.message?.sender?.name?.charAt(0) || 'U'}
                 </AvatarFallback>
               </Avatar>
               <div className="flex min-w-0 flex-col">
                 <span className="font-bold text-lg text-foreground truncate">{mail.message?.sender?.name || 'Unknown User'}</span>
                 <span className="text-sm text-muted-foreground font-medium truncate">
                   {mail.message?.sender?.email || 'unknown@example.com'}
                 </span>
               </div>
            </div>

            <div className="flex max-w-full flex-wrap items-center gap-2 print:hidden bg-muted/10 rounded-lg p-1 border border-border/50">
                {mail.message?.status === "sent" && <VideoCallButton
                  key={mail.mail_message_id}
                  kind="mail"
                  id={mail.mail_message_id}
                  title={mail.message.subject || "Mail video call"}
                  isHost={String(mail.message.sender_id) === String(mail.user_id)}
                  resolveEncryptionMaterial={() => getMailCallEncryptionMaterial(mail)}
                />}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Back to mail list" onClick={() => selectMail(null)} className="size-[38px] @3xl:hidden">
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Back</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={mail.is_starred ? 'Unstar message' : 'Star message'} onClick={handleToggleStar} className="size-[38px] shadow-sm">
                      <Star className={cn("w-[18px] h-[18px]", mail.is_starred ? "fill-yellow-400 text-yellow-500" : "text-muted-foreground")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{mail.is_starred ? 'Unstar' : 'Star'}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Archive message" onClick={() => handleArchive()} className="size-[38px] shadow-sm">
                      <Archive className="w-[18px] h-[18px] text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Archive</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={activeFolder === 'spam' ? 'Move message to inbox' : 'Report message as spam'} onClick={() => handleSpamToggle()} className="size-[38px] shadow-sm">
                      {activeFolder === 'spam' ? <Mail className="w-[18px] h-[18px] text-muted-foreground" /> : <Zap className="w-[18px] h-[18px] text-muted-foreground" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{activeFolder === 'spam' ? 'Move to Inbox' : 'Report Spam'}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={isFullscreen ? 'Exit fullscreen' : 'Open fullscreen'} onClick={() => setFullscreen(!isFullscreen)} className="hidden size-[38px] shadow-sm @xl:flex">
                      {isFullscreen ? <Minimize className="w-[18px] h-[18px] text-muted-foreground" /> : <Maximize className="w-[18px] h-[18px] text-muted-foreground" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Print message" onClick={handlePrint} className="hidden size-[38px] shadow-sm @xl:flex">
                      <Printer className="w-[18px] h-[18px] text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Print</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="destructive" size="icon" aria-label={activeFolder === 'trash' ? 'Delete message forever' : 'Move message to trash'} onClick={() => handleDelete()} className="size-[38px] shadow-sm">
                      <Trash className="w-[18px] h-[18px]" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Trash</TooltipContent>
                </Tooltip>
            </div>
          </div>

          <div className="mb-6 flex flex-col gap-2 border-b border-muted pb-5 @xl:mb-8 @xl:flex-row @xl:items-start @xl:justify-between @xl:pb-6">
            <div className="min-w-0 @xl:pr-8">
              <h1 className="break-words text-xl @xl:text-3xl font-extrabold tracking-tight text-foreground animate-in slide-in-from-bottom-2 fade-in">
                {mail.message?.subject || '(No Subject)'}
              </h1>
              {isMailEncrypted && (
                <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-primary">
                  <Lock aria-hidden="true" className="size-3.5" />
                  E2E Encrypted
                </div>
              )}
              {!isMailEncrypted && isSecureMailEnabled && (
                <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                  <Lock aria-hidden="true" className="size-3.5" />
                  Secure Mail On
                </div>
              )}
            </div>
            <div className="text-[13px] font-medium text-muted-foreground @xl:whitespace-nowrap @xl:mt-2">
               {mail.message?.created_at ? format(new Date(mail.message.created_at), 'PPP, p') : ''}
            </div>
          </div>

          <SafeRichText
            className="whitespace-pre-wrap flex-1 text-[15px] leading-relaxed text-foreground/90 pb-8 prose dark:prose-invert max-w-none"
            html={mail.message?.body || ''}
          />

          <MailAttachmentList
            key={mail.mail_message_id}
            messageId={mail.mail_message_id}
            attachments={mail.message?.attachments || []}
          />

          <div className="flex flex-wrap items-center gap-3 mt-auto pt-8 shrink-0 print:hidden">
            <Button variant="outline" className="shrink-0 font-semibold shadow-sm" onClick={handleForward}>
              <Forward aria-hidden="true" data-icon="inline-start" /> Forward
            </Button>
            <Button className="shrink-0 font-semibold shadow-sm" onClick={handleReply}>
              <Reply aria-hidden="true" data-icon="inline-start" /> Reply
            </Button>
          </div>
        </div>

        <AlertDialog open={pendingAction !== null} onOpenChange={(open) => { if (!open && !actionBusy) setPendingAction(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {pendingAction === 'delete'
                  ? (activeFolder === 'trash' ? 'Delete this message forever?' : 'Move this message to trash?')
                  : pendingAction === 'archive'
                    ? 'Archive this message?'
                    : activeFolder === 'spam'
                      ? 'Move this message to inbox?'
                      : 'Report this message as spam?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingAction === 'delete'
                  ? (activeFolder === 'trash'
                    ? 'This will permanently delete the message. This action cannot be undone.'
                    : 'The message will be moved to your trash folder.')
                  : pendingAction === 'archive'
                    ? 'The message will be moved to your archive folder.'
                    : activeFolder === 'spam'
                      ? 'The message will be moved back to your inbox.'
                      : 'The message will be marked as spam and moved to your spam folder.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionBusy}>Cancel</AlertDialogCancel>
              <Button
                type="button"
                variant={pendingAction === 'delete' ? 'destructive' : 'default'}
                disabled={actionBusy}
                onClick={() => {
                  if (pendingAction === 'delete') confirmDelete();
                  else if (pendingAction === 'archive') confirmArchive();
                  else if (pendingAction === 'spam') confirmSpamToggle();
                }}
              >
                {actionBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {pendingAction === 'delete'
                  ? (activeFolder === 'trash' ? 'Delete forever' : 'Move to trash')
                  : pendingAction === 'archive'
                    ? 'Archive'
                    : activeFolder === 'spam'
                      ? 'Move to inbox'
                      : 'Report spam'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
