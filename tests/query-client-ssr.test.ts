import assert from "node:assert/strict";
import { getActiveResourcesInfo } from "node:process";
import { test } from "node:test";
import { QueryClient } from "@tanstack/react-query";

import { createQueryClient } from "../lib/query-client";

const timerCount = () => getActiveResourcesInfo().filter((resource) => resource === "Timeout").length;

test("SSR clients retain no 24-hour query GC timers", () => {
  const before = timerCount();
  const clients: QueryClient[] = [];
  try {
    for (let request = 0; request < 25; request++) {
      const client = createQueryClient("server");
      clients.push(client);
      client.setQueryData(["request", request], { tenant: `tenant-${request}` });
    }
    assert.equal(timerCount(), before);
    assert.equal(clients[0].getDefaultOptions().queries?.gcTime, Infinity);
    assert.notEqual(clients[0], clients[1]);
    assert.equal(clients[1].getQueryData(["request", 0]), undefined);
  } finally {
    clients.forEach((client) => client.clear());
  }
});

test("old finite SSR policy reproduces one retained timer per request", () => {
  const before = timerCount();
  const clients: QueryClient[] = [];
  try {
    for (let request = 0; request < 25; request++) {
      const client = new QueryClient({ defaultOptions: { queries: { gcTime: 86400000 } } });
      clients.push(client);
      client.setQueryData(["request", request], { tenant: `tenant-${request}` });
    }
    assert.equal(timerCount(), before + 25);
  } finally {
    clients.forEach((client) => client.clear());
  }
  assert.equal(timerCount(), before);
});

test("browser retention and offline mutation policy are preserved", () => {
  const before = timerCount();
  const client = createQueryClient("browser");
  try {
    const options = client.getDefaultOptions();
    assert.equal(options.queries?.gcTime, 86400000);
    assert.equal(options.queries?.staleTime, 60000);
    assert.equal(options.queries?.retry, false);
    assert.equal(options.queries?.refetchOnWindowFocus, false);
    assert.equal(options.queries?.refetchOnReconnect, true);
    assert.equal(options.mutations?.networkMode, "always");
    client.setQueryData(["offline"], { preserved: true });
    assert.equal(timerCount(), before + 1);
    assert.deepEqual(client.getQueryData(["offline"]), { preserved: true });
  } finally {
    client.clear();
  }
  assert.equal(timerCount(), before);
});
