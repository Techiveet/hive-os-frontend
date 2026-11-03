"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  Headphones,
  User,
  Bot,
  Send,
  CheckCircle2,
  Search,
  RefreshCw,
  Inbox,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSupportBotInboxChannelName, initEcho } from "@/lib/echo";
import { getAccessToken } from "@/lib/runtime-context";
import { supportBotApi } from "../../api/support-bot-api";
import {
  SupportBot,
  SupportBotConversation,
  SupportBotMessage,
} from "../../types";

interface Props {
  /** Single-bot inbox (e.g. /support-bot/2/inbox). */
  bot?: SupportBot;
  /** Multi-bot agent console with selector (e.g. /support-bot/inbox). */
  bots?: SupportBot[];
}

export function LiveSupportInbox({ bot, bots }: Props) {
  const scopedBot = bot ?? null;
  const availableBots = React.useMemo(
    () => (scopedBot ? [scopedBot] : bots ?? []),
    [scopedBot, bots],
  );
  const multiBot = !scopedBot && availableBots.length > 0;

  const requestedConversation = Number(useSearchParams().get("conversation")) || null;
  const [botFilter, setBotFilter] = React.useState<string>("all");
  const [conversations, setConversations] = React.useState<
    SupportBotConversation[]
  >([]);
  const [selectedConvId, setSelectedConvId] = React.useState<number | null>(
    requestedConversation,
  );
  const [activeConv, setActiveConv] =
    React.useState<SupportBotConversation | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<string>(
    requestedConversation ? "all" : "escalated",
  );
  React.useEffect(() => {
    if (requestedConversation) {
      setSelectedConvId(requestedConversation);
      setStatusFilter("all");
    }
  }, [requestedConversation]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [replyText, setReplyText] = React.useState("");
  const [visitorTyping, setVisitorTyping] = React.useState(false);
  const [unreadByConversation, setUnreadByConversation] = React.useState<
    Record<number, number>
  >({});

  const typingTimerRef = React.useRef<number | null>(null);
  const typingSentAtRef = React.useRef(0);
  const selectedConvIdRef = React.useRef<number | null>(selectedConvId);
  selectedConvIdRef.current = selectedConvId;
  const conversationsRef = React.useRef(conversations);
  conversationsRef.current = conversations;
  const activeConvRef = React.useRef(activeConv);
  activeConvRef.current = activeConv;
  const conversationReadRef = React.useRef(0);

  const botNameById = React.useMemo(() => {
    const map = new Map<number, SupportBot>();
    for (const b of availableBots) map.set(b.id, b);
    return map;
  }, [availableBots]);

  /** API calls always use the conversation's own bot — never the filter. */
  const resolveBotId = React.useCallback(
    (conversation?: SupportBotConversation | null, fallbackId?: number | null) => {
      if (conversation?.bot_id) return conversation.bot_id;
      if (fallbackId) return fallbackId;
      if (scopedBot) return scopedBot.id;
      return null;
    },
    [scopedBot],
  );

  const pingTyping = (conversationId: number) => {
    const now = Date.now();
    if (now - typingSentAtRef.current < 2000) return;
    typingSentAtRef.current = now;

    const conv =
      conversationsRef.current.find((c) => c.id === conversationId) ||
      (activeConvRef.current?.id === conversationId ? activeConvRef.current : null);
    const botId = resolveBotId(conv);
    if (!botId) return;
    void supportBotApi.sendTyping(botId, conversationId);
  };
  const [sending, setSending] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const loadConversations = React.useCallback(
    async (quiet = false) => {
      try {
        if (!quiet) setLoading(true);
        const status = statusFilter === "all" ? undefined : statusFilter;

        const res = scopedBot
          ? await supportBotApi.getConversations(scopedBot.id, { status })
          : await supportBotApi.getAllConversations({
              status,
              bot_id: botFilter === "all" ? undefined : Number(botFilter),
            });

        const list = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
        setConversations(list);

        setSelectedConvId((current) =>
          current === requestedConversation ||
          list.some((item: SupportBotConversation) => item.id === current)
            ? current
            : (list[0]?.id ?? null),
        );
      } catch (e) {
        console.error("Failed to load conversations", e);
        setConversations([]);
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [scopedBot, botFilter, statusFilter, requestedConversation],
  );

  React.useEffect(() => {
    void loadConversations();
    const timer = window.setInterval(() => void loadConversations(true), 5000);
    return () => window.clearInterval(timer);
  }, [loadConversations]);

  const refreshConversation = React.useCallback(
    async (conversationId: number) => {
      const listed = conversationsRef.current.find((c) => c.id === conversationId);
      const open =
        activeConvRef.current?.id === conversationId ? activeConvRef.current : null;
      const botId = resolveBotId(listed || open, scopedBot?.id ?? null);
      if (!botId) return;

      const request = ++conversationReadRef.current;
      const data = await supportBotApi.getConversation(botId, conversationId);
      if (
        selectedConvIdRef.current === conversationId &&
        conversationReadRef.current === request
      ) {
        setActiveConv(data);
      }
    },
    [resolveBotId, scopedBot?.id],
  );

  React.useEffect(() => {
    if (!selectedConvId) {
      setActiveConv(null);
      return;
    }

    const loadSingle = async () => {
      try {
        await refreshConversation(selectedConvId);
      } catch (e) {
        console.error("Failed to load conversation details", e);
      }
    };

    loadSingle();
    const interval = setInterval(loadSingle, 4000);
    return () => {
      ++conversationReadRef.current;
      clearInterval(interval);
    };
  }, [refreshConversation, selectedConvId]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages]);

  React.useEffect(() => {
    if (selectedConvId === null) return;

    setVisitorTyping(false);
    setUnreadByConversation((current) => {
      if (!current[selectedConvId]) return current;

      const next = { ...current };
      delete next[selectedConvId];
      return next;
    });
  }, [selectedConvId]);

  React.useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    let echo: ReturnType<typeof initEcho> | null = null;
    const channelName = getSupportBotInboxChannelName();

    try {
      echo = initEcho(token);
    } catch {
      return;
    }

    if (!echo) return;

    const channel = echo.private(channelName);

    const refreshOpenConversation = async (conversationId: number) => {
      if (selectedConvIdRef.current !== conversationId) return;

      try {
        await refreshConversation(conversationId);
      } catch {
        // The poll will catch up.
      }
    };

    channel.listen(
      ".support-bot.escalated",
      () => {
        void loadConversations();
      },
    );

    channel.listen(
      ".support-bot.message",
      (event: { conversation_id: number; sender_type?: string }) => {
        void refreshOpenConversation(event.conversation_id);
        void loadConversations();

        if (
          event.sender_type === "visitor" &&
          selectedConvIdRef.current !== event.conversation_id
        ) {
          setUnreadByConversation((current) => ({
            ...current,
            [event.conversation_id]: (current[event.conversation_id] ?? 0) + 1,
          }));
        }
      },
    );

    channel.listen(
      ".support-bot.typing",
      (event: { conversation_id: number; who: string; name?: string }) => {
        if (event.who !== "visitor") return;
        if (selectedConvIdRef.current !== event.conversation_id) return;

        setVisitorTyping(true);

        if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
        typingTimerRef.current = window.setTimeout(
          () => setVisitorTyping(false),
          4000,
        );
      },
    );

    return () => {
      channel.stopListening(".support-bot.escalated");
      channel.stopListening(".support-bot.message");
      channel.stopListening(".support-bot.typing");
    };
  }, [loadConversations, refreshConversation]);

  const handleSendReply = async () => {
    if (
      !replyText.trim() ||
      !selectedConvId ||
      activeConv?.id !== selectedConvId ||
      sending
    )
      return;

    const botId = resolveBotId(activeConv);
    if (!botId) return;

    try {
      setSending(true);
      await supportBotApi.sendAgentMessage(botId, selectedConvId, replyText);
      if (selectedConvIdRef.current !== selectedConvId) return;
      setReplyText("");
      await refreshConversation(selectedConvId);
    } catch (e) {
      console.error("Failed to send agent reply", e);
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (
    status: "active" | "escalated" | "resolved" | "closed",
  ) => {
    if (!selectedConvId || activeConv?.id !== selectedConvId) return;
    const botId = resolveBotId(activeConv);
    if (!botId) return;
    try {
      await supportBotApi.updateConversationStatus(botId, selectedConvId, status);
      void loadConversations();
      await refreshConversation(selectedConvId);
    } catch (e) {
      console.error("Failed to update status", e);
    }
  };

  const filteredList = conversations.filter((c) => {
    const term = searchQuery.toLowerCase();
    return (
      (c.visitor_name && c.visitor_name.toLowerCase().includes(term)) ||
      (c.visitor_email && c.visitor_email.toLowerCase().includes(term)) ||
      (c.bot?.name && c.bot.name.toLowerCase().includes(term)) ||
      c.session_id.toLowerCase().includes(term)
    );
  });

  const labelForConversation = (c: SupportBotConversation) =>
    c.bot?.name || botNameById.get(c.bot_id)?.name || `Bot #${c.bot_id}`;

  return (
    <div className="flex h-[calc(100vh-14rem)] rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
      <div className="w-80 border-r border-border/60 flex flex-col bg-muted/10">
        <div className="p-3 border-b border-border/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Headphones className="h-3.5 w-3.5 text-primary" /> Live Inbox
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void loadConversations()}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>

          {multiBot && (
            <Select value={botFilter} onValueChange={setBotFilter}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="All bots" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All bots</SelectItem>
                {availableBots.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex gap-1">
            {["escalated", "active", "resolved", "all"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`flex-1 rounded-md py-1 text-[11px] font-medium capitalize transition-colors ${
                  statusFilter === status
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search visitor..."
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border/40">
          {loading && conversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Loading inbox...
            </div>
          ) : filteredList.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Inbox className="h-7 w-7 mx-auto mb-2 opacity-40" />
              <p className="text-xs">No {statusFilter} chats.</p>
            </div>
          ) : (
            filteredList.map((c) => {
              const isSelected = c.id === selectedConvId;
              const isEscalated = c.status === "escalated";

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedConvId(c.id)}
                  className={`p-3 text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-primary/10 border-l-2 border-primary"
                      : "hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-foreground truncate max-w-[110px]">
                      {c.visitor_name || "Visitor"}
                    </span>
                    <div className="flex items-center gap-1">
                      {(unreadByConversation[c.id] ?? 0) > 0 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                          {unreadByConversation[c.id] > 9
                            ? "9+"
                            : unreadByConversation[c.id]}
                        </span>
                      )}
                      <Badge
                        variant={isEscalated ? "destructive" : "outline"}
                        className="text-[10px] px-1.5 py-0 capitalize"
                      >
                        {c.status}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground truncate">
                    {c.visitor_email || c.session_id.substring(0, 14)}
                  </p>

                  <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground gap-2">
                    <span className="capitalize truncate">
                      {multiBot ? labelForConversation(c) : c.channel}
                    </span>
                    <span className="shrink-0">
                      {new Date(
                        c.last_activity_at || c.created_at,
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-background">
        {activeConv && activeConv.id === selectedConvId ? (
          <>
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-4 py-2.5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                  {activeConv.visitor_name?.charAt(0) || "V"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      {activeConv.visitor_name || "Visitor"}
                    </span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {activeConv.status}
                    </Badge>
                    {multiBot && (
                      <Badge variant="secondary" className="text-[10px]">
                        {labelForConversation(activeConv)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {activeConv.visitor_email || "No email"} · Channel:{" "}
                    {activeConv.channel}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeConv.status === "escalated" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus("active")}
                    className="h-8 text-xs text-blue-600 border-blue-500/40"
                  >
                    Return to Bot
                  </Button>
                )}

                {activeConv.status !== "resolved" && (
                  <Button
                    size="sm"
                    onClick={() => handleUpdateStatus("resolved")}
                    className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Resolve Ticket
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-muted/5">
              {activeConv.messages?.map((msg: SupportBotMessage) => {
                const isVisitor = msg.sender_type === "visitor";
                const isAgent = msg.sender_type === "agent";
                const isBot = msg.sender_type === "bot";

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${isAgent ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs text-white ${
                        isAgent
                          ? "bg-primary"
                          : isBot
                            ? "bg-blue-600"
                            : "bg-emerald-600"
                      }`}
                    >
                      {isAgent ? (
                        <Headphones className="h-3.5 w-3.5" />
                      ) : isBot ? (
                        <Bot className="h-3.5 w-3.5" />
                      ) : (
                        <User className="h-3.5 w-3.5" />
                      )}
                    </div>

                    <div
                      className={`max-w-[75%] space-y-1 ${isAgent ? "items-end text-right" : "items-start"}`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground px-1">
                        <span className="font-semibold">
                          {msg.sender_name || msg.sender_type}
                        </span>
                        <span>·</span>
                        <span>
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div
                        className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                          isAgent
                            ? "bg-primary text-primary-foreground rounded-tr-none"
                            : isBot
                              ? "bg-muted/90 text-foreground border border-border/60 rounded-tl-none"
                              : "bg-emerald-500/10 text-foreground border border-emerald-500/20 rounded-tl-none"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {visitorTyping && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50" />
                  </div>
                  {activeConv.visitor_name || "Visitor"} is typing…
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-border/60 p-3 bg-muted/10">
              <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1">
                <span className="text-[10px] text-muted-foreground shrink-0">
                  Canned:
                </span>
                {[
                  "Hello, I am reviewing your request now.",
                  "Could you provide your invoice or order number?",
                  "Your issue has been resolved. Is there anything else?",
                ].map((canned, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setReplyText(canned)}
                    className="rounded-full border border-border/80 bg-background px-2.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground shrink-0"
                  >
                    {canned.substring(0, 30)}...
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSendReply();
                }}
                className="flex items-center gap-2"
              >
                <Input
                  value={replyText}
                  onChange={(e) => {
                    setReplyText(e.target.value);
                    if (selectedConvId) pingTyping(selectedConvId);
                  }}
                  placeholder="Type your reply as support agent..."
                  className="h-9 text-xs rounded-full bg-background"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!replyText.trim() || sending}
                  className="h-9 px-4 rounded-full gap-1.5 text-xs shadow"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <MessageSquare className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm font-semibold">
              Select a conversation from the left inbox
            </p>
            <p className="text-xs max-w-sm mt-1">
              You will see live chat history and be able to reply directly to
              customers.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
