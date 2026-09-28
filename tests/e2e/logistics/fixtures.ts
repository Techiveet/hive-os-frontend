import { execFile } from "node:child_process";
import { chmod, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { test as base } from "@playwright/test";
import type { LogisticsFixtureManifest } from "./support";

const execFileAsync = promisify(execFile);
const frontendRoot = process.cwd();
const workspaceRoot = path.resolve(frontendRoot, "..");
const fixtureDirectory = path.join(frontendRoot, ".playwright", "fixtures");
const fixturePrefix = "acceptance-logistics-";
const maxFixtureIdLength = 50;

const composeFile = () =>
  process.env.HIVE_E2E_COMPOSE_FILE ??
  path.join(workspaceRoot, "hive-os-infra", "docker-compose.yml");

const compose = async (arguments_: string[]) => {
  await execFileAsync("docker", ["compose", "-f", composeFile(), ...arguments_], {
    cwd: workspaceRoot,
    env: process.env,
    maxBuffer: 8 * 1024 * 1024,
  });
};

const fixtureIdFor = (title: string) => {
  const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const room = maxFixtureIdLength - fixturePrefix.length - unique.length - 1;
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, Math.max(room, 0))
    .replace(/-+$/g, "");

  return `${fixturePrefix}${slug || "journey"}-${unique}`;
};

const provision = async (fixtureId: string): Promise<LogisticsFixtureManifest> => {
  const localManifest = path.join(fixtureDirectory, `${fixtureId}.json`);
  const containerManifest = `/tmp/hive-logistics-acceptance/${fixtureId}.json`;

  await compose([
    "exec",
    "-T",
    "backend",
    "php",
    "artisan",
    "logistics:acceptance-fixture",
    `--fixture=${fixtureId}`,
  ]);
  await execFileAsync("docker", [
    "cp",
    `${process.env.HIVE_E2E_BACKEND_CONTAINER ?? "hive-backend"}:${containerManifest}`,
    localManifest,
  ]);
  await chmod(localManifest, 0o600);

  return JSON.parse(await readFile(localManifest, "utf8")) as LogisticsFixtureManifest;
};

const cleanup = async (fixtureId: string) => {
  try {
    await compose([
      "exec",
      "-T",
      "backend",
      "php",
      "artisan",
      "logistics:acceptance-fixture",
      `--fixture=${fixtureId}`,
      "--cleanup",
    ]);
  } finally {
    await rm(path.join(fixtureDirectory, `${fixtureId}.json`), { force: true });
  }
};

type LogisticsFixtures = {
  logisticsFixture: LogisticsFixtureManifest;
};

export const test = base.extend<LogisticsFixtures>({
  logisticsFixture: async ({}, provide, testInfo) => {
    const externalManifest = process.env.HIVE_E2E_LOGISTICS_FIXTURE_MANIFEST;
    if (externalManifest) {
      await provide(
        JSON.parse(
          await readFile(path.resolve(externalManifest), "utf8"),
        ) as LogisticsFixtureManifest,
      );
      return;
    }

    // Provisioning runs the complete tenant, entitlement, role, and shared-master
    // seed path before the test body can adjust its own timeout. Keep this bound
    // high enough for the Docker/WSL development runtime while remaining finite.
    testInfo.setTimeout(Math.max(testInfo.timeout + 600_000, 900_000));
    await mkdir(fixtureDirectory, { recursive: true, mode: 0o700 });
    await chmod(fixtureDirectory, 0o700);

    const fixtureId = fixtureIdFor(testInfo.title);
    let manifest: LogisticsFixtureManifest;
    try {
      manifest = await provision(fixtureId);
    } catch (error) {
      await cleanup(fixtureId).catch(() => undefined);
      throw error;
    }

    testInfo.annotations.push({ type: "fixture", description: fixtureId });
    console.log(`[logistics fixture] ${testInfo.title} -> tenant ${fixtureId}`);

    try {
      await provide(manifest);
    } finally {
      await cleanup(fixtureId);
    }
  },
});

export { expect } from "@playwright/test";
