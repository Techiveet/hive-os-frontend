"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, Minimize, PlusCircle } from "lucide-react";
import MailSidebar from "./mail-sidebar";
import MailList from "./mail-list";
import MailDetail from "./mail-detail";
import ComposeModal from "./compose-modal";
import { Button } from "@/components/ui/button";
import { useMailStore, MailOnlineUser } from "@/store/mail-store";
import { cn } from "@/lib/utils";
import { initEcho } from "@/lib/echo";
import { getAccessToken, getTenantId } from "@/lib/runtime-context";


export default function MailLayout() {
  const {
    selectedMailId,
    checkedMailIds,
    isFullscreen,
    setFullscreen,
    setOnlineUsers,
    activeFolder,
    setComposeOpen,
  } = useMailStore();
  const [foldersOpen, setFoldersOpen] = useState(false);
  const hasSelection = Boolean(selectedMailId) || checkedMailIds.length > 0;

  useEffect(() => {
    const token = getAccessToken() || localStorage.getItem("token");

    if (!token) {
      return;
    }

    try {
      const echo = initEcho(token);
      if (!echo) return;
      const tenantId = getTenantId();
      const presenceChannelName = tenantId ? `tenant.${tenantId}.mail.presence` : "mail.presence";

      echo
        .join(presenceChannelName)
        .here((users: MailOnlineUser[]) => setOnlineUsers(users))
        .joining((joiningUser: MailOnlineUser) => {
          const current = useMailStore.getState().onlineUsers;
          setOnlineUsers([...current, joiningUser]);
        })
        .leaving((leavingUser: MailOnlineUser) => {
          const current = useMailStore.getState().onlineUsers;
          setOnlineUsers(current.filter((user) => user.id !== leavingUser.id));
        });

      return () => {
        echo.leave(presenceChannelName);
      };
    } catch (error) {
      console.error("Echo initialization failed", error);
    }
  }, [setOnlineUsers]);

  // The workspace is rendered into its own container element so it can be moved to <body>
  // for fullscreen. The dashboard wraps pages in a card with backdrop-blur + overflow-hidden,
  // which turns `position: fixed` into "fixed to that card" and clips it, so fullscreen
  // can never be truly full from inside the page. Moving the container (instead of
  // re-creating the tree) keeps the list, the open message and scroll positions intact.
  const slotRef = useRef<HTMLDivElement>(null);
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const element = document.createElement("div");
    element.className = "size-full";
    setHost(element);

    return () => {
      element.remove();
    };
  }, []);

  useLayoutEffect(() => {
    if (!host) return;

    if (isFullscreen) {
      // `contents`: the container adds no box of its own to <body> (the workspace is fixed anyway).
      host.className = "contents";
      document.body.appendChild(host);
    } else {
      host.className = "size-full";
      slotRef.current?.appendChild(host);
    }
  }, [host, isFullscreen]);

  // Fullscreen is a property of the open message: leave it when there is none, and never
  // carry it over to the next time the mail page is opened.
  useEffect(() => {
    if (isFullscreen && !hasSelection) {
      setFullscreen(false);
    }
  }, [isFullscreen, hasSelection, setFullscreen]);

  useEffect(() => {
    return () => setFullscreen(false);
  }, [setFullscreen]);

  useEffect(() => {
    setFoldersOpen(false);
  }, [activeFolder, selectedMailId]);

  useEffect(() => {
    if (!isFullscreen && !foldersOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      // Radix dialogs (compose, confirmations) call preventDefault() when they handle Escape.
      if (event.key !== "Escape" || event.defaultPrevented) return;

      if (foldersOpen) {
        setFoldersOpen(false);
      } else {
        setFullscreen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen, foldersOpen, setFullscreen]);

  const folderLabel = activeFolder === "all" ? "All Mails" : activeFolder;

  const workspace = (
    <div
      className={cn(
        "@container flex flex-col overflow-hidden bg-background",
        isFullscreen
          ? "fixed inset-0 z-40 h-[100dvh] w-screen pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          : "relative size-full bg-background/40"
      )}
    >
      {isFullscreen ? (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-card/80 px-3 py-2 backdrop-blur-xl print:hidden @xl:px-5">
          <p className="min-w-0 truncate text-sm font-semibold capitalize text-foreground">{folderLabel}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => setFullscreen(false)}>
            <Minimize aria-hidden="true" className="mr-2 size-4" />
            Exit fullscreen
            <kbd className="ml-2 hidden rounded border border-border/60 bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground @xl:inline">
              Esc
            </kbd>
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            "shrink-0 items-center gap-2 border-b border-border/60 bg-card/70 px-3 py-2 print:hidden",
            hasSelection ? "hidden @3xl:flex @5xl:hidden" : "flex @5xl:hidden"
          )}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={foldersOpen}
            aria-controls="mail-folders"
            onClick={() => setFoldersOpen(true)}
          >
            <Menu aria-hidden="true" className="mr-2 size-4" />
            Folders
          </Button>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold capitalize text-foreground">{folderLabel}</p>
          <Button type="button" size="sm" onClick={() => setComposeOpen(true)}>
            <PlusCircle aria-hidden="true" className="mr-2 size-4" />
            Compose
          </Button>
        </div>
      )}

      <div className="relative flex min-h-0 w-full flex-1 overflow-hidden">
        {foldersOpen && !isFullscreen && (
          <button
            type="button"
            aria-label="Close folders"
            onClick={() => setFoldersOpen(false)}
            className="absolute inset-0 z-40 bg-black/40 @5xl:hidden"
          />
        )}

        <div
          id="mail-folders"
          className={cn(
            "absolute inset-y-0 left-0 z-50 w-72 max-w-[85%] shrink-0 border-r border-border/60 bg-card shadow-2xl transition-[transform,visibility] duration-300",
            "@5xl:relative @5xl:z-auto @5xl:w-64 @5xl:max-w-none @5xl:translate-x-0 @5xl:bg-card/80 @5xl:shadow-none @5xl:backdrop-blur-xl",
            foldersOpen ? "translate-x-0" : "invisible -translate-x-full @5xl:visible",
            isFullscreen && "hidden"
          )}
        >
          <MailSidebar />
        </div>

        <div
          className={cn(
            "absolute inset-0 z-20 w-full shrink-0 border-r border-border/60 bg-card/70 backdrop-blur-xl transition-transform duration-300",
            "@3xl:relative @3xl:z-auto @3xl:w-[320px] @5xl:w-[340px] @7xl:w-[360px]",
            hasSelection ? "-translate-x-full @3xl:translate-x-0" : "translate-x-0",
            isFullscreen && "hidden"
          )}
        >
          <MailList />
        </div>

        <div
          className={cn(
            "absolute inset-0 z-30 flex min-w-0 flex-col overflow-hidden transition-transform duration-300 print:block print:w-full",
            "@3xl:relative @3xl:z-auto @3xl:flex-1",
            hasSelection
              ? "translate-x-0 bg-background/90 backdrop-blur-sm"
              : "translate-x-full bg-muted/20 @3xl:translate-x-0",
            isFullscreen && "relative z-auto flex-1 translate-x-0 bg-background"
          )}
        >
          <MailDetail />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div ref={slotRef} className="size-full" />
      {host ? createPortal(workspace, host) : null}
      <ComposeModal />
    </>
  );
}
