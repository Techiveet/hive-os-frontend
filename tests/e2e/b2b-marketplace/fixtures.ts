import { execFile } from "node:child_process";
import { chmod, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { test as base } from "@playwright/test";
import { startChapaMock, type ChapaMock } from "./chapa-mock";
import type { B2BFixtureManifest } from "./support";

const execFileAsync = promisify(execFile);
const frontendRoot = process.cwd();
const workspaceRoot = path.resolve(frontendRoot, "..");
const fixtureDirectory = path.join(frontendRoot, ".playwright", "fixtures");

const WEBHOOK_SECRET = "acceptance-webhook-secret";
const MOCK_PORT = Number(process.env.HIVE_E2E_CHAPA_MOCK_PORT ?? 4599);
// How the BACKEND reaches this machine (it usually runs in Docker); the browser never talks to the mock.
const MOCK_URL_FOR_BACKEND = process.env.HIVE_E2E_CHAPA_MOCK_URL ?? `http://host.docker.internal:${MOCK_PORT}`;
const BACKEND_URL = process.env.HIVE_E2E_BACKEND_URL ?? "http://localhost:8081";

const composeFile = () =>
  process.env.HIVE_E2E_COMPOSE_FILE ?? path.join(workspaceRoot, "hive-os-infra", "docker-compose.yml");

const compose = (arguments_: string[]) =>
  execFileAsync("docker", ["compose", "-f", composeFile(), ...arguments_], {
    cwd: workspaceRoot,
    env: process.env,
    maxBuffer: 8 * 1024 * 1024,
  });

// Keep it short: the workspace id is embedded in every reference sent to the payment gateway.
const fixtureIdFor = () => `acceptance-b2b-${Date.now().toString(36).slice(-7)}${Math.random().toString(36).slice(2, 5)}`;

const provision = async (fixtureId: string): Promise<B2BFixtureManifest> => {
  const localManifest = path.join(fixtureDirectory, `${fixtureId}.json`);

  await compose([
    "exec", "-T", "backend", "php", "artisan", "b2b:acceptance-fixture",
    `--fixture=${fixtureId}`,
    `--chapa-base-url=${MOCK_URL_FOR_BACKEND}`,
    `--chapa-webhook-secret=${WEBHOOK_SECRET}`,
  ]);
  await execFileAsync("docker", [
    "cp",
    `${process.env.HIVE_E2E_BACKEND_CONTAINER ?? "hive-backend"}:/tmp/hive-b2b-acceptance/${fixtureId}.json`,
    localManifest,
  ]);
  await chmod(localManifest, 0o600);

  return JSON.parse(await readFile(localManifest, "utf8")) as B2BFixtureManifest;
};

type B2BFixtures = { b2b: B2BFixtureManifest; chapa: ChapaMock };

export const test = base.extend<B2BFixtures>({
  b2b: async ({}, provide, testInfo) => {
    // Use a workspace you provisioned yourself (php artisan b2b:acceptance-fixture ...) instead of creating one.
    const external = process.env.HIVE_E2E_B2B_FIXTURE_MANIFEST;
    if (external) {
      await provide(JSON.parse(await readFile(path.resolve(external), "utf8")) as B2BFixtureManifest);
      return;
    }

    testInfo.setTimeout(Math.max(testInfo.timeout + 600_000, 900_000));
    await mkdir(fixtureDirectory, { recursive: true, mode: 0o700 });

    const fixtureId = fixtureIdFor();
    const manifest = await provision(fixtureId);
    testInfo.annotations.push({ type: "fixture", description: fixtureId });
    console.log(`[b2b fixture] ${testInfo.title} -> workspace ${fixtureId} (remove it with your tenant tooling when done)`);

    try {
      await provide(manifest);
    } finally {
      await rm(path.join(fixtureDirectory, `${fixtureId}.json`), { force: true });
    }
  },

  chapa: async ({ b2b }, provide) => {
    const mock = await startChapaMock({
      port: MOCK_PORT,
      publicUrl: `http://localhost:${MOCK_PORT}`,
      webhookSecret: b2b.chapa?.webhook_secret ?? WEBHOOK_SECRET,
      approvalUrl: `${BACKEND_URL}/api/v1/public/b2b/webhooks/chapa-transfer-approval`,
    });

    try {
      await provide(mock);
    } finally {
      await mock.close();
    }
  },
});

export { expect } from "@playwright/test";
