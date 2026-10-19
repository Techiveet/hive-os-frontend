import assert from "node:assert/strict";
import { hikvisionDevicePayload, hikvisionOrigin, saveHikvisionRegistration, testHikvisionConnection, validateHikvisionRegistration, type AttendanceRequest, type HikvisionRegistration } from "../../modules/attendance/hikvision-registration";

const input: HikvisionRegistration = { address: "https://192.168.100.186/doc/index.html#/", port: "443", name: "Office terminal", deviceCode: "HIK-OFFICE", username: " admin ", password: "synthetic-test-only", groupId: "12", timezone: "Africa/Addis_Ababa", verifyTls: true };
assert.equal(hikvisionOrigin(input.address), "https://192.168.100.186");
assert.equal(hikvisionOrigin("192.168.100.186", "8443"), "https://192.168.100.186:8443");
assert.equal(hikvisionOrigin("https://terminal.example:8443/doc/index.html#/"), "https://terminal.example:8443");
for (const address of ["", "http://192.168.100.186", "https://admin:password@192.168.100.186", "file:///tmp/a", "javascript:alert(1)"]) assert.throws(() => hikvisionOrigin(address));
for (const port of ["0", "65536", "443abc", "1.5"]) assert.throws(() => hikvisionOrigin(input.address, port));
assert.deepEqual(validateHikvisionRegistration(input), {});
assert.ok(validateHikvisionRegistration({ ...input, password: "" }).password);
assert.ok(validateHikvisionRegistration({ ...input, timezone: "not/a/timezone" }).timezone);
assert.ok(validateHikvisionRegistration({ ...input, groupId: "-1" }).groupId);
assert.ok(validateHikvisionRegistration({ ...input, port: "65536" }).port);
const payload = hikvisionDevicePayload(input);
assert.equal(payload.organization_unit_id, 12);
assert.equal(payload.configuration.verify_tls, true);
assert.equal(payload.configuration.allow_http, false);
assert.equal(JSON.stringify(payload).includes(input.password), false);
assert.equal(hikvisionDevicePayload({ ...input, groupId: "", verifyTls: false }).organization_unit_id, null);

async function main() {
  const calls: { path: string; body: Record<string, unknown> }[] = [];
  let failCredential = true;
  const request: AttendanceRequest = async <T>(path: string, options?: RequestInit): Promise<T> => {
    assert.equal(options?.headers && (options.headers as Record<string, string>)["x-skip-offline-queue"], "1");
    const body = JSON.parse(String(options?.body ?? "{}"));
    calls.push({ path, body });
    if (path === "/attendance/devices") return { data: { device_code: input.deviceCode, name: input.name } } as T;
    if (failCredential) throw new Error("simulated credential endpoint failure");
    return {} as T;
  };
  let created: { device_code: string; name: string } | null = null;
  await assert.rejects(saveHikvisionRegistration(request, input, null, (device) => { created = device; }));
  assert.ok(created);
  failCredential = false;
  await saveHikvisionRegistration(request, input, created, () => {});
  assert.equal(calls.filter((call) => call.path === "/attendance/devices").length, 1, "credential retry must not create a duplicate");
  assert.equal(calls.at(-1)?.body.principal, "admin");
  assert.equal(calls.at(-1)?.body.secret, input.password);
  assert.equal(calls[0].body.secret, undefined);
  assert.equal(calls[0].body.password, undefined);
  const pass: AttendanceRequest = async <T>() => ({ data: { ok: true } } as T);
  const fail: AttendanceRequest = async <T>() => ({ data: { ok: false } } as T);
  const invalid: AttendanceRequest = async <T>() => ({ data: { ok: "true" } } as T);
  assert.equal(await testHikvisionConnection(pass, input.deviceCode), true);
  assert.equal(await testHikvisionConnection(fail, input.deviceCode), false);
  assert.equal(await testHikvisionConnection(invalid, input.deviceCode), false);
  console.log("PASS: Hikvision registration validation, HTTPS origin normalization, scoped payloads, explicit TLS, credential-only retry and honest connection results.");
}
void main();
