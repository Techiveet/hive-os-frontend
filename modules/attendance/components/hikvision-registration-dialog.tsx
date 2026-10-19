"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Cable, Eye, EyeOff, PlusCircle, ShieldCheck, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { attendanceFetch } from "@/modules/attendance/api";
import { hrFetch, type AttendanceDevice, type OrganizationUnit, type Paginated } from "@/modules/humanresources/api";
import { hikvisionOrigin, saveHikvisionRegistration, testHikvisionConnection, validateHikvisionRegistration, type HikvisionRegistration, type RegistrationErrors } from "@/modules/attendance/hikvision-registration";

type Props = { scope: string; devices: AttendanceDevice[]; onSaved: () => void };

export function HikvisionRegistrationDialog({ scope, devices, onSaved }: Props) {
  const id = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [failure, setFailure] = useState("");
  const [created, setCreated] = useState<{ device_code: string; name: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [connection, setConnection] = useState<"untested" | "testing" | "connected" | "unreachable">("untested");
  const [values, setValues] = useState<HikvisionRegistration>({ address: "", port: "443", name: "Hikvision terminal", deviceCode: "", username: "admin", password: "", groupId: "", timezone: "Africa/Addis_Ababa", verifyTls: true });
  const groups = useQuery({
    queryKey: ["hr-hikvision-groups", scope],
    queryFn: () => hrFetch<Paginated<OrganizationUnit>>("/organization-units?per_page=200"),
    enabled: open,
  });
  function update<K extends keyof HikvisionRegistration>(key: K, value: HikvisionRegistration[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }
  function changeOpen(next: boolean) {
    if (pendingRef.current) return;
    setOpen(next);
    setShowPassword(false);
    if (!next && saved) {
      setCreated(null);
      setSaved(false);
      setConnection("untested");
      setFailure("");
      setErrors({});
      setValues({ address: "", port: "443", name: "Hikvision terminal", deviceCode: "", username: "admin", password: "", groupId: "", timezone: "Africa/Addis_Ababa", verifyTls: true });
      return;
    }
    setValues((current) => ({ ...current, password: "", deviceCode: current.deviceCode || `HIK-${crypto.randomUUID().slice(0, 12)}` }));
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingRef.current) return;
    const invalid = validateHikvisionRegistration(values);
    if (!created && !invalid.address) {
      const origin = hikvisionOrigin(values.address, values.port);
      const duplicate = devices.some((device) => {
        if (device.adapter_type !== "hikvision_isapi" || device.status === "inactive") return false;
        try { return hikvisionOrigin(device.configuration?.base_url ?? "") === origin; } catch { return false; }
      });
      if (duplicate) invalid.address = "This terminal is already registered. Use its Test or connector settings instead of creating a duplicate.";
    }
    setErrors(invalid);
    setFailure("");
    if (Object.keys(invalid).length) {
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    pendingRef.current = true;
    setBusy(true);
    try {
      await saveHikvisionRegistration(attendanceFetch, values, created, setCreated);
      setSaved(true);
      setValues((current) => ({ ...current, password: "" }));
      setShowPassword(false);
      onSaved();
      requestAnimationFrame(() => statusRef.current?.focus());
    } catch {
      setValues((current) => ({ ...current, password: "" }));
      setShowPassword(false);
      setFailure("Registration could not be completed. If the device was created, retry saving its credentials here; it will not be created again. Re-enter the terminal password. Check your device and credential permissions.");
      onSaved();
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      pendingRef.current = false;
      setBusy(false);
    }
  }
  async function testConnection() {
    if (!created || pendingRef.current) return;
    pendingRef.current = true;
    setConnection("testing");
    try { setConnection(await testHikvisionConnection(attendanceFetch, created.device_code) ? "connected" : "unreachable"); }
    catch { setConnection("unreachable"); }
    finally { pendingRef.current = false; onSaved(); }
  }
  const fieldId = (key: string) => `${id}-${key}`;
  function focusField(key: string) {
    const element = document.getElementById(fieldId(key));
    const details = element?.closest("details");
    if (details) details.open = true;
    element?.focus();
  }
  function error(key: keyof HikvisionRegistration) {
    return errors[key] ? <p id={fieldId(`${key}-error`)} className="text-sm text-destructive">{errors[key]}</p> : null;
  }
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild><Button type="button" className="min-h-11"><PlusCircle aria-hidden="true" data-icon="inline-start" />Add Hikvision</Button></DialogTrigger>
      <DialogContent showCloseButton={false} className="hikvision-registration max-h-[90dvh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-xl" onOpenAutoFocus={(event) => { event.preventDefault(); titleRef.current?.focus(); }} onEscapeKeyDown={(event) => { if (pendingRef.current) event.preventDefault(); }} onInteractOutside={(event) => { if (pendingRef.current) event.preventDefault(); }}>
        <DialogHeader className="text-left">
          <div className="flex items-start justify-between gap-3">
            <DialogTitle ref={titleRef} tabIndex={-1}>Add Hikvision device</DialogTitle>
            <Button type="button" variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label="Close registration" disabled={busy || connection === "testing"} onClick={() => changeOpen(false)}><X aria-hidden="true" /></Button>
          </div>
          <DialogDescription>Register an attendance terminal by IP, then test the connection from Hive’s server.</DialogDescription>
        </DialogHeader>
        {saved ? (
          <div className="flex flex-col gap-5">
            <Alert role="group" tabIndex={-1} ref={statusRef}>
              <ShieldCheck aria-hidden="true" />
              <AlertTitle>Device and credentials saved</AlertTitle>
              <AlertDescription>The terminal has not been verified yet. Saving is not proof of a working connection.</AlertDescription>
            </Alert>
            <Button type="button" className="min-h-11" disabled={connection === "testing"} onClick={testConnection}><Cable aria-hidden="true" data-icon="inline-start" />{connection === "testing" ? "Testing connection…" : "Test device connection"}</Button>
            {connection !== "untested" && <p role="status" className="text-sm leading-6">{connection === "connected" ? "Connection verified: Hikvision ISAPI responded successfully." : connection === "testing" ? "Contacting the terminal from Hive’s server…" : "Connection is not verified. Check the terminal credentials, TLS trust and the private network/VPN route from Hive’s server. Your PC being on the same Wi-Fi is not enough."}</p>}
            <Button type="button" variant="outline" className="min-h-11" disabled={connection === "testing"} onClick={() => changeOpen(false)}>Done</Button>
          </div>
        ) : (
          <form onSubmit={save} noValidate className="flex flex-col gap-6">
            {(failure || Object.values(errors).some(Boolean)) && <div ref={errorRef} tabIndex={-1} className="rounded-md border border-destructive p-3 text-sm"><p className="font-semibold">Check the registration details</p>{failure ? <p>{failure}</p> : <ul className="list-disc pl-5">{Object.entries(errors).filter(([, message]) => message).map(([key, message]) => <li key={key}><a href={`#${fieldId(key)}`} onClick={(event) => { event.preventDefault(); focusField(key); }}>{message}</a></li>)}</ul>}</div>}
            <FieldSet disabled={busy}>
              <FieldLegend variant="label" id={fieldId("mode-label")}>Adding mode</FieldLegend>
              <RadioGroup defaultValue="ip" aria-labelledby={fieldId("mode-label")} aria-describedby={fieldId("mode-help")} className="flex flex-wrap gap-4">
                {[{ value: "ip", label: "IP", disabled: false }, { value: "segment", label: "IP Segment", disabled: true }, { value: "batch", label: "Batch Import", disabled: true }].map((item) => <Field key={item.value} orientation="horizontal" className="w-auto min-h-11" data-disabled={item.disabled}><RadioGroupItem id={fieldId(item.value)} value={item.value} disabled={item.disabled} /><FieldLabel htmlFor={fieldId(item.value)}>{item.label}</FieldLabel></Field>)}
              </RadioGroup>
              <FieldDescription id={fieldId("mode-help")}>Single-IP registration is available. Network discovery and device batch import are not implemented here.</FieldDescription>
            </FieldSet>
            <FieldSet disabled={busy}>
              <FieldLegend variant="label" id={fieldId("protocol-label")}>Protocol type</FieldLegend>
              <RadioGroup defaultValue="isapi" aria-labelledby={fieldId("protocol-label")} aria-describedby={fieldId("protocol-help")} className="flex flex-wrap gap-4">
                {["Adaptive", "ISAPI", "Private", "OTAP"].map((label) => <Field key={label} orientation="horizontal" className="w-auto min-h-11" data-disabled={label !== "ISAPI"}><RadioGroupItem id={fieldId(label)} value={label.toLowerCase()} disabled={label !== "ISAPI"} /><FieldLabel htmlFor={fieldId(label)}>{label}</FieldLabel></Field>)}
              </RadioGroup>
              <FieldDescription id={fieldId("protocol-help")}>Uses Hikvision ISAPI over HTTPS with Digest authentication. Adaptive, Private SDK and OTAP are not supported by Hive.</FieldDescription>
            </FieldSet>
            <FieldGroup>
              <Field data-invalid={Boolean(errors.address)}>
                <FieldLabel htmlFor={fieldId("address")}>IP address or HTTPS URL (required)</FieldLabel>
                <Input id={fieldId("address")} required value={values.address} readOnly={Boolean(created)} disabled={busy} onChange={(event) => update("address", event.target.value)} placeholder="192.168.100.186" aria-invalid={Boolean(errors.address)} aria-describedby={`${fieldId("address-help")}${errors.address ? ` ${fieldId("address-error")}` : ""}`} />
                <FieldDescription id={fieldId("address-help")}>Paste the IP or the device’s web-interface URL. Hive removes /doc/index.html#/ before calling ISAPI.</FieldDescription>{error("address")}
              </Field>
              <Field data-invalid={Boolean(errors.username)}>
                <FieldLabel htmlFor={fieldId("username")}>User name (required)</FieldLabel>
                <Input id={fieldId("username")} required autoComplete="off" value={values.username} disabled={busy} onChange={(event) => update("username", event.target.value)} aria-invalid={Boolean(errors.username)} aria-describedby={errors.username ? fieldId("username-error") : undefined} />{error("username")}
              </Field>
              <Field data-invalid={Boolean(errors.password)}>
                <FieldLabel htmlFor={fieldId("password")}>Password (required)</FieldLabel>
                <InputGroup className="min-h-11">
                  <InputGroupInput id={fieldId("password")} required type={showPassword ? "text" : "password"} autoComplete="off" value={values.password} disabled={busy} onChange={(event) => update("password", event.target.value)} aria-invalid={Boolean(errors.password)} aria-describedby={`${fieldId("password-help")}${errors.password ? ` ${fieldId("password-error")}` : ""}`} />
                  <InputGroupAddon align="inline-end"><Button type="button" variant="ghost" size="icon" className="min-h-11 min-w-11" disabled={busy} aria-label={showPassword ? "Hide device password" : "Show device password"} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</Button></InputGroupAddon>
                </InputGroup>
                <FieldDescription id={fieldId("password-help")}>Enter the terminal’s password, not your Hive login. It is saved through Hive’s encrypted device-credential endpoint.</FieldDescription>{error("password")}
              </Field>
              <Separator />
              <Field data-invalid={Boolean(errors.groupId)}>
                <FieldLabel htmlFor={fieldId("groupId")}>Device group — add to group</FieldLabel>
                <NativeSelect id={fieldId("groupId")} value={values.groupId} disabled={busy || Boolean(created)} onChange={(event) => update("groupId", event.target.value)} aria-invalid={Boolean(errors.groupId)} aria-describedby={`${fieldId("group-help")}${errors.groupId ? ` ${fieldId("groupId-error")}` : ""}`}>
                  <NativeSelectOption value="">Ungrouped Devices</NativeSelectOption>
                  {(groups.data?.data ?? []).filter((group) => group.is_active).map((group) => <NativeSelectOption key={group.id} value={group.id}>{group.name}</NativeSelectOption>)}
                </NativeSelect>
                <FieldDescription id={fieldId("group-help")}>Groups use existing HR organization units in this workspace.{groups.isError ? " Groups could not be loaded; you can register ungrouped or retry after refreshing." : groups.isLoading ? " Loading groups…" : ""}</FieldDescription>{error("groupId")}
              </Field>
              <Field data-invalid={Boolean(errors.name)}><FieldLabel htmlFor={fieldId("name")}>Device name (required)</FieldLabel><Input id={fieldId("name")} required maxLength={160} value={values.name} readOnly={Boolean(created)} disabled={busy} onChange={(event) => update("name", event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? fieldId("name-error") : undefined} />{error("name")}</Field>
              <Field><FieldLabel htmlFor={fieldId("tls")}>TLS certificate verification</FieldLabel><NativeSelect id={fieldId("tls")} value={String(values.verifyTls)} disabled={busy} onChange={(event) => update("verifyTls", event.target.value === "true")} aria-describedby={fieldId("tls-help")}><NativeSelectOption value="true">Verify certificate (recommended)</NativeSelectOption><NativeSelectOption value="false">Self-signed terminal on an isolated LAN/VPN</NativeSelectOption></NativeSelect><FieldDescription id={fieldId("tls-help")}>Only select the self-signed option for a terminal reached over a trusted private network. This does not create a network connection or VPN.</FieldDescription></Field>
              <details>
                <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">Advanced connection settings</summary>
                <FieldGroup className="pt-3">
                  <Field data-invalid={Boolean(errors.port)}>
                    <FieldLabel htmlFor={fieldId("port")}>HTTPS port (required)</FieldLabel>
                    <Input id={fieldId("port")} required inputMode="numeric" value={values.port} disabled={busy || Boolean(created)} onChange={(event) => update("port", event.target.value)} aria-invalid={Boolean(errors.port)} aria-describedby={errors.port ? fieldId("port-error") : undefined} />{error("port")}
                  </Field>
                  <Field data-invalid={Boolean(errors.deviceCode)}>
                    <FieldLabel htmlFor={fieldId("deviceCode")}>Device code (required)</FieldLabel>
                    <Input id={fieldId("deviceCode")} required maxLength={80} value={values.deviceCode} disabled={busy || Boolean(created)} onChange={(event) => update("deviceCode", event.target.value)} aria-invalid={Boolean(errors.deviceCode)} aria-describedby={errors.deviceCode ? fieldId("deviceCode-error") : undefined} />{error("deviceCode")}
                  </Field>
                  <Field data-invalid={Boolean(errors.timezone)}>
                    <FieldLabel htmlFor={fieldId("timezone")}>Timezone (required)</FieldLabel>
                    <Input id={fieldId("timezone")} required value={values.timezone} disabled={busy || Boolean(created)} onChange={(event) => update("timezone", event.target.value)} aria-invalid={Boolean(errors.timezone)} aria-describedby={errors.timezone ? fieldId("timezone-error") : undefined} />{error("timezone")}
                  </Field>
                </FieldGroup>
              </details>
            </FieldGroup>
            <Alert role="note"><Cable aria-hidden="true" /><AlertTitle>Hive must be able to reach this IP</AlertTitle><AlertDescription>A cloud server cannot reach your Wi-Fi just because this browser can. Use a private VPN or supported local connector. No router port-forwarding is required by this form.</AlertDescription></Alert>
            <div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => changeOpen(false)}>Cancel</Button><Button type="submit" className="min-h-11" disabled={busy}>{busy ? "Saving device…" : created ? "Retry saving credentials" : "Add device"}</Button></div>
            {created && <Link href="/dashboard/attendance/devices" className="text-sm underline">The device record is saved. You can also manage it in Devices &amp; Sync.</Link>}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
