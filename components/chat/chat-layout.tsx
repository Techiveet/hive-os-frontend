"use client";

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/store/chat-store';
import ChatSidebar from './chat-sidebar';
import ChatList from './chat-list';
import ChatDetail from './chat-detail';
import ComposeChatModal from './compose-chat-modal';
import { ChatErrorBoundary } from './chat-error-boundary';

export default function ChatLayout() {
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const conversations = useChatStore((state) => state.conversations);
  const setActiveConversation = useChatStore((state) => state.setActiveConversation);
  const setPendingVideoCallConversationId = useChatStore((state) => state.setPendingVideoCallConversationId);
  const isFullscreen = useChatStore((state) => state.isFullscreen);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const inviteHandledRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const params = new URLSearchParams(window.location.search);
    const conversationId = Number(params.get('conversation'));
    if (!Number.isInteger(conversationId) || conversationId <= 0) return;

    const wantsCall = params.get('call') === '1';
    const handleKey = `${conversationId}:${wantsCall ? 'call' : 'open'}`;
    const found = conversations.some((conversation) => Number(conversation.id) === conversationId);

    const clearCallParam = () => {
      const next = new URLSearchParams(window.location.search);
      next.delete('call');
      const query = next.toString();
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
    };

    const clearInviteParams = () => {
      const next = new URLSearchParams(window.location.search);
      next.delete('conversation');
      next.delete('call');
      const query = next.toString();
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
    };

    if (found) {
      setActiveConversation(conversationId);
      if (wantsCall) {
        setPendingVideoCallConversationId(conversationId);
        clearCallParam();
      }
      return;
    }

    // Conversation not in the local list yet — verify membership before calling it an invalid invite.
    if (inviteHandledRef.current === handleKey) return;
    inviteHandledRef.current = handleKey;

    let alive = true;
    void (async () => {
      try {
        await api.get(`/chat/conversations/${conversationId}/call`);
        if (!alive) return;
        // Member, but local chat list has not caught up yet. Keep the URL so sync can open it.
      } catch {
        if (!alive) return;
        toast.error(
          wantsCall
            ? "You were not invited to this meeting. Ask the host to invite you from Video conferencing or Chat."
            : "That conversation is not available in your Chat.",
        );
        clearInviteParams();
      }
    })();

    return () => {
      alive = false;
    };
  }, [conversations, mounted, setActiveConversation, setPendingVideoCallConversationId]);

  if (!mounted) {
    return null;
  }

  const showSidebar = !isMobile || (isMobile && !activeConversationId);
  const showList = !isMobile || (isMobile && !activeConversationId);
  const showDetail = !isMobile || (isMobile && Boolean(activeConversationId));

  return (
    <div
      className={cn(
        "relative flex size-full overflow-hidden bg-background/40",
        isFullscreen && "fixed inset-0 z-[100] h-[100dvh] w-screen rounded-none bg-background"
      )}
    >
      {showSidebar && (
        <aside aria-label="Chat navigation" className={cn("h-full shrink-0", isMobile ? "w-16" : "w-16 lg:w-48")}>
          <ChatSidebar />
        </aside>
      )}

      {showList && (
        <aside aria-label="Conversations" className={cn("h-full shrink-0 border-r border-border/60", isMobile ? "min-w-0 flex-1" : "w-72 xl:w-80")}>
          <ChatErrorBoundary label="conversation list">
            <ChatList />
          </ChatErrorBoundary>
        </aside>
      )}

      {showDetail && (
        <main className="h-full min-w-0 flex-1">
          <ChatErrorBoundary label="conversation" resetKey={activeConversationId}>
            <ChatDetail />
          </ChatErrorBoundary>
        </main>
      )}

      <ComposeChatModal />
    </div>
  );
}
