import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";

// Exercise the actual component with controlled network completion order.
// No DOM, real timers, authenticated traffic, or production data is involved.
const compiled = ts.transpileModule(readFileSync(new URL(
  "../modules/support-bot/components/live-inbox/live-support-inbox.tsx", import.meta.url,
), "utf8"), { compilerOptions: {
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
} }).outputText;

type Node = { type: unknown; props: Record<string, any> };
const children = (node: any): any[] => Array.isArray(node) ? node.flatMap(children)
  : node && typeof node === "object" ? [node, ...children(node.props?.children)] : [];
const text = (node: any): string => Array.isArray(node) ? node.map(text).join(" ")
  : node && typeof node === "object" ? text(node.props?.children) : String(node ?? "");
const deferred = () => {
  let resolve!: (value: any) => void;
  const promise = new Promise<any>((done) => { resolve = done; });
  return { promise, resolve };
};
const conversation = (id: number) => ({
  id, visitor_name: `Acceptance visitor ${id}`, session_id: `test-${id}`,
  status: "escalated", channel: "webchat", created_at: "2026-10-18T20:00:00Z",
  messages: [{ id, content: `Private transcript ${id}`, sender_type: "visitor", created_at: "2026-10-18T20:00:00Z" }],
});

function harness(requested: number | null = 22) {
  let cursor = 0, dirty = true, tree: Node;
  const hooks: any[] = [], setups: (() => void)[] = [];
  const listeners = new Map<string, (...args: any[]) => any>();
  const requests: { id: number; resolve: (value: any) => void }[] = [];
  const listFilters: any[] = [];
  const timers = new Map<number, { callback: () => void; ms: number }>();
  let timerId = 0;
  const same = (a: any[], b: any[]) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    __esModule: true,
    useState(initial: any) {
      const index = cursor++;
      hooks[index] ??= { value: typeof initial === "function" ? initial() : initial };
      return [hooks[index].value, (next: any) => {
        const value = typeof next === "function" ? next(hooks[index].value) : next;
        if (!Object.is(hooks[index].value, value)) { hooks[index].value = value; dirty = true; }
      }];
    },
    useRef(initial: any) { const index = cursor++; return hooks[index] ??= { current: initial }; },
    useCallback(callback: any, deps: any[]) {
      const index = cursor++;
      if (!hooks[index] || !same(hooks[index].deps, deps)) hooks[index] = { callback, deps };
      return hooks[index].callback;
    },
    useEffect(setup: () => any, deps: any[]) {
      const index = cursor++;
      if (!hooks[index] || !same(hooks[index].deps, deps)) {
        const prior = hooks[index];
        hooks[index] = { deps };
        setups.push(() => { prior?.cleanup?.(); hooks[index].cleanup = setup(); });
      }
    },
  };
  const api = {
    getConversations: async (_bot: number, filters: any) => {
      listFilters.push(filters);
      return { data: [conversation(22), conversation(23)] };
    },
    getConversation: (_bot: number, id: number) => {
      const pending = deferred(); requests.push({ id, resolve: pending.resolve }); return pending.promise;
    },
  };
  const channel = {
    listen(name: string, handler: any) { listeners.set(name, handler); return channel; },
    stopListening(name: string) { listeners.delete(name); },
  };
  const fakeWindow = {
    setInterval(callback: () => void, ms: number) { const id = ++timerId; timers.set(id, { callback, ms }); return id; },
    clearInterval(id: number) { timers.delete(id); },
    clearTimeout() {}, setTimeout() { return ++timerId; },
  };
  const exports: any = {};
  runInNewContext(compiled, {
    exports, console, Date, window: fakeWindow,
    setInterval: fakeWindow.setInterval, clearInterval: fakeWindow.clearInterval,
    require(name: string) {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx: (type: any, props: any) => ({ type, props }), jsxs: (type: any, props: any) => ({ type, props }), Fragment: "Fragment" };
      if (name === "next/navigation") return { useSearchParams: () => ({ get: () => requested === null ? null : String(requested) }) };
      if (name.includes("support-bot-api")) return { supportBotApi: api };
      if (name === "@/lib/runtime-context") return { getAccessToken: () => "fixture-only" };
      if (name === "@/lib/echo") return { initEcho: () => ({ private: () => channel }), getSupportBotInboxChannelName: () => "fixture" };
      return new Proxy({}, { get: (_target, key) => String(key) });
    },
  });
  const render = () => {
    cursor = 0; dirty = false; tree = exports.LiveSupportInbox({ bot: { id: 2 } });
    for (const setup of setups.splice(0)) setup();
  };
  const flush = async () => {
    for (let i = 0; i < 12; i++) { await Promise.resolve(); if (dirty) render(); }
  };
  render();
  return {
    requests, listFilters, listeners, timers, flush,
    setRequested(id: number) { requested = id; dirty = true; },
    select(id: number) {
      const row = children(tree).find((node) => node.props?.onClick && text(node).includes(`Acceptance visitor ${id}`));
      assert.ok(row, "The fixture visitor must be listed"); row.props.onClick();
    },
    transcript: () => text(tree),
    replyForms: () => children(tree).filter((node) => node.type === "form"),
  };
}

test("an old conversation response cannot replace the newly selected transcript", async () => {
  const h = harness(); await h.flush();
  const old = h.requests.find((r) => r.id === 22)!;
  h.select(23); await h.flush();
  h.requests.find((r) => r.id === 23)!.resolve(conversation(23)); await h.flush();
  assert.match(h.transcript(), /Private transcript 23/);
  old.resolve(conversation(22)); await h.flush();
  assert.match(h.transcript(), /Private transcript 23/);
  assert.doesNotMatch(h.transcript(), /Private transcript 22/);
});

test("a new selection cannot show or act on the previous visitor while loading", async () => {
  const h = harness(); await h.flush();
  h.requests[0].resolve(conversation(22)); await h.flush();
  assert.equal(h.replyForms().length, 1);
  h.select(23); await h.flush();
  assert.doesNotMatch(h.transcript(), /Private transcript 22/);
  assert.equal(h.replyForms().length, 0, "Hide the reply controls until their displayed conversation matches the selection");
});

test("realtime refresh uses the current notification route and status filter", async () => {
  const h = harness(null); await h.flush();
  assert.equal(h.listFilters.at(-1).status, "escalated");
  h.setRequested(22); await h.flush();
  assert.equal(h.listFilters.at(-1).status, undefined);
  h.listeners.get(".support-bot.escalated")!({ conversation_id: 22 }); await h.flush();
  assert.equal(h.listFilters.at(-1).status, undefined, "Realtime must not restore the old escalated-only query");
});

test("an in-flight realtime read cannot restore a conversation after switching visitors", async () => {
  const h = harness(); await h.flush();
  h.requests[0].resolve(conversation(22)); await h.flush();
  h.listeners.get(".support-bot.message")!({ conversation_id: 22, sender_type: "visitor" });
  await h.flush();
  const oldRealtimeRead = h.requests.at(-1)!;
  h.select(23); await h.flush();
  h.requests.at(-1)!.resolve(conversation(23)); await h.flush();
  oldRealtimeRead.resolve(conversation(22)); await h.flush();
  assert.match(h.transcript(), /Private transcript 23/);
  assert.doesNotMatch(h.transcript(), /Private transcript 22/);
});

test("a slower poll cannot replace a newer snapshot of the same conversation", async () => {
  const h = harness(); await h.flush();
  const old = h.requests[0];
  [...h.timers.values()].find((timer) => timer.ms === 4000)!.callback(); await h.flush();
  const updated = conversation(22);
  updated.messages[0].content = "Latest accepted reply";
  h.requests.at(-1)!.resolve(updated); await h.flush();
  old.resolve(conversation(22)); await h.flush();
  assert.match(h.transcript(), /Latest accepted reply/);
  assert.doesNotMatch(h.transcript(), /Private transcript 22/);
});
