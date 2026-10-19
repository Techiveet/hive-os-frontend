export type HikvisionRegistration = {
  address: string;
  port: string;
  name: string;
  deviceCode: string;
  username: string;
  password: string;
  groupId: string;
  timezone: string;
  verifyTls: boolean;
};

export type RegistrationErrors = Partial<Record<keyof HikvisionRegistration, string>>;

export function hikvisionOrigin(address: string, port = "443"): string {
  const value = address.trim();
  if (value.includes("://") && !/^https:\/\//i.test(value)) {
    throw new Error("Use an HTTPS terminal address.");
  }
  const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  if (url.protocol !== "https:" || url.username || url.password || !url.hostname) {
    throw new Error("Enter a device IP address or HTTPS URL without login credentials.");
  }
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    throw new Error("Enter an HTTPS port between 1 and 65535.");
  }
  // Accept the terminal's copied /doc/index.html#/ URL, but never send that UI path to ISAPI.
  if (url.port && port === "443") return url.origin;
  url.port = port === "443" ? "" : String(Number(port));
  return url.origin;
}

export function validateHikvisionRegistration(input: HikvisionRegistration): RegistrationErrors {
  const errors: RegistrationErrors = {};
  if (!/^\d+$/.test(input.port) || Number(input.port) < 1 || Number(input.port) > 65535) errors.port = "Enter an HTTPS port between 1 and 65535.";
  try {
    hikvisionOrigin(input.address, errors.port ? "443" : input.port);
  } catch {
    errors.address = "Enter the device IP address or HTTPS URL without login credentials.";
  }
  if (!input.name.trim() || input.name.trim().length > 160) errors.name = "Enter a device name of 1–160 characters.";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(input.deviceCode)) errors.deviceCode = "Enter a device code of 1–80 letters, numbers, dots, underscores or hyphens.";
  if (!input.username.trim() || input.username.trim().length > 160) errors.username = "Enter the terminal user name (up to 160 characters).";
  if (!input.password || input.password.length > 2000) errors.password = "Enter the terminal password (up to 2000 characters).";
  if (input.groupId && !/^[1-9]\d*$/.test(input.groupId)) errors.groupId = "Choose a valid device group.";
  try { new Intl.DateTimeFormat("en", { timeZone: input.timezone }); } catch { errors.timezone = "Enter a valid timezone, such as Africa/Addis_Ababa."; }
  return errors;
}

export function hikvisionDevicePayload(input: HikvisionRegistration) {
  return {
    device_code: input.deviceCode,
    name: input.name.trim(),
    adapter_type: "hikvision_isapi",
    manufacturer: "Hikvision",
    timezone: input.timezone,
    organization_unit_id: input.groupId ? Number(input.groupId) : null,
    configuration: {
      base_url: hikvisionOrigin(input.address, input.port),
      verify_tls: input.verifyTls,
      allow_http: false,
      event_limit: 100,
      lookback_days: 2,
    },
  };
}

type DeviceReference = { device_code: string; name: string };
export type AttendanceRequest = <T>(path: string, options?: RequestInit) => Promise<T>;

export async function saveHikvisionRegistration(
  request: AttendanceRequest,
  input: HikvisionRegistration,
  existing: DeviceReference | null,
  onCreated: (device: DeviceReference) => void,
): Promise<DeviceReference> {
  if (Object.keys(validateHikvisionRegistration(input)).length) throw new Error("Correct the highlighted device fields.");
  const payload = hikvisionDevicePayload(input);
  const device = existing ?? (await request<{ data: DeviceReference }>("/attendance/devices", {
    method: "POST",
    headers: { "x-skip-offline-queue": "1" },
    body: JSON.stringify(payload),
  })).data;
  // Keep the created reference even if credential saving fails; retry must not create another terminal.
  onCreated(device);
  await request(`/attendance/devices/${encodeURIComponent(device.device_code)}/credentials/rotate`, {
    method: "POST",
    headers: { "x-skip-offline-queue": "1" },
    body: JSON.stringify({
      credential_type: "hikvision_isapi",
      principal: input.username.trim(),
      secret: input.password,
      configuration: payload.configuration,
    }),
  });
  return device;
}

export async function testHikvisionConnection(request: AttendanceRequest, deviceCode: string): Promise<boolean> {
  const response = await request<{ data: { ok: boolean } }>(
    `/attendance/devices/${encodeURIComponent(deviceCode)}/test`,
    { method: "POST", headers: { "x-skip-offline-queue": "1" } },
  );
  return response.data.ok === true;
}
