"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playMessageSound, unlockMessageSound } from "@/lib/message-sound";

export function useMessageSound(scope: string) {
  const [enabled, setEnabled] = useState(true);
  const enabledRef = useRef(true);
  const storageKey = `hive-message-sound:${scope}`;
  useEffect(() => {
    const load = () => {
      try {
        enabledRef.current = localStorage.getItem(storageKey) !== "muted";
        setEnabled(enabledRef.current);
      } catch { /* A private browser can keep the preference in memory. */ }
    };
    load();
    const unlock = (event: Event) => {
      if (event.isTrusted && enabledRef.current) unlockMessageSound();
    };
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      window.removeEventListener("storage", load);
    };
  }, [storageKey]);
  const toggle = () => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);
    try { localStorage.setItem(storageKey, next ? "enabled" : "muted"); } catch { /* In-memory fallback. */ }
    if (next) unlockMessageSound();
  };
  const play = useCallback((id: string) => {
    if (enabledRef.current) playMessageSound(`${scope}:${id}`);
  }, [scope]);
  return { enabled, toggle, play };
}
