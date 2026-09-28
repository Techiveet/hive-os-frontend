"use client";

import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Activity, Anchor, Plane, Save, TrainFront, Truck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { usePermissions } from "@/hooks/use-permissions";
import { logisticsApi } from "@/modules/logistics/api";
import type {
  LogisticsReferences,
  LogisticsSelectorOption,
  TransportLeg,
} from "@/modules/logistics/types";
import { useTranslation } from "@/store/use-translation";

const EVENTS: Record<string, string[]> = {
  OCEAN: [
    "loading",
    "departed",
    "transshipment",
    "arrived",
    "discharged",
    "completed",
  ],
  AIR: ["departed", "arrived", "completed"],
  ROAD: ["pickup", "departed", "delivered"],
  RAIL: ["departed", "arrived", "completed"],
};
const ICONS = { OCEAN: Anchor, AIR: Plane, ROAD: Truck, RAIL: TrainFront };

export function LogisticsLegOperations({
  jobId,
  leg,
  refs,
  onChanged,
}: {
  jobId: number;
  leg: TransportLeg;
  refs?: LogisticsReferences;
  onChanged: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const { hasAnyPermission } = usePermissions();
  const mode = (leg.transport_mode?.code ?? "").toUpperCase();
  const canManage = hasAnyPermission([
    `manage_logistics_${mode.toLowerCase()}`,
    "manage_logistics",
  ]);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const canSeeDrivers = hasAnyPermission([
    "view_logistics_driver_details",
    "manage_logistics",
  ]);
  const fleetVehicles = useQuery({
    queryKey: ["logistics", "fleet-vehicles"],
    queryFn: () =>
      logisticsApi
        .selector("fleet_vehicles")
        .then(
          (response) => (response.data.data ?? []) as LogisticsSelectorOption[],
        ),
    enabled: mode === "ROAD" && canManage,
  });
  const fleetDrivers = useQuery({
    queryKey: ["logistics", "fleet-drivers"],
    queryFn: () =>
      logisticsApi
        .selector("fleet_drivers")
        .then(
          (response) => (response.data.data ?? []) as LogisticsSelectorOption[],
        ),
    enabled: mode === "ROAD" && canManage && canSeeDrivers,
  });
  const update = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      logisticsApi.updateLegOperation(jobId, leg.id, payload),
    onSuccess: async () => {
      await onChanged();
      setError("");
      setNotice(t("logistics.messages.operation_saved"));
    },
    onError: (value: unknown) =>
      setError(
        (value as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? t("logistics.errors.operations"),
      ),
  });
  const record = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      logisticsApi.recordLegOperation(jobId, leg.id, payload),
    onSuccess: async () => {
      await onChanged();
      setError("");
      setNotice(t("logistics.messages.operation_saved"));
    },
    onError: (value: unknown) =>
      setError(
        (value as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? t("logistics.errors.operations"),
      ),
  });
  if (!EVENTS[mode]) return null;
  const Icon = ICONS[mode as keyof typeof ICONS];
  const detail =
    (mode === "OCEAN"
      ? leg.ocean_detail
      : mode === "AIR"
        ? leg.air_detail
        : mode === "ROAD"
          ? leg.road_detail
          : leg.rail_detail) ?? {};
  const values = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload: Record<string, unknown> = {};
    new FormData(event.currentTarget).forEach((value, key) => {
      payload[key] = value === "" ? null : value;
    });
    return payload;
  };
  return (
    <details className="mt-4 rounded-xl border border-primary/20 bg-primary/[0.025] p-4">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-semibold">
        <Icon aria-hidden="true" className="size-5 text-primary" />
        {t(`logistics.operations.${mode.toLowerCase()}`)}
      </summary>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("logistics.operations.description")}
      </p>
      <div aria-live="polite" className="mt-3">
        {notice ? (
          <Alert>
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        ) : null}
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>
      <form
        className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        onSubmit={(event) => update.mutate(values(event))}
      >
        <Field>
          <FieldLabel htmlFor={`operation-provider-${leg.id}`}>
            {t("logistics.fields.provider")}
          </FieldLabel>
          <NativeSelect
            id={`operation-provider-${leg.id}`}
            name={
              mode === "OCEAN"
                ? "shipping_line_supplier_id"
                : mode === "AIR"
                  ? "airline_supplier_id"
                  : mode === "ROAD"
                    ? "transporter_supplier_id"
                    : "operator_supplier_id"
            }
            defaultValue={String(
              (detail as Record<string, unknown>)[
                mode === "OCEAN"
                  ? "shipping_line_supplier_id"
                  : mode === "AIR"
                    ? "airline_supplier_id"
                    : mode === "ROAD"
                      ? "transporter_supplier_id"
                      : "operator_supplier_id"
              ] ?? "",
            )}
            disabled={!canManage}
          >
            <option value="">{t("logistics.optional.any_provider")}</option>
            {refs?.suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {mode === "OCEAN" ? (
          <>
            <OperationInput
              id={`vessel-${leg.id}`}
              name="vessel_name"
              label={t("logistics.fields.vessel")}
              value={detail.vessel_name}
            />
            <OperationInput
              id={`voyage-${leg.id}`}
              name="voyage_number"
              label={t("logistics.fields.voyage")}
              value={detail.voyage_number}
            />
            <OperationInput
              id={`booking-${leg.id}`}
              name="booking_reference"
              label={t("logistics.fields.carrier_reference")}
              value={detail.booking_reference}
            />
          </>
        ) : null}
        {mode === "AIR" ? (
          <>
            <OperationInput
              id={`flight-${leg.id}`}
              name="flight_number"
              label={t("logistics.fields.flight")}
              value={detail.flight_number}
            />
            <OperationInput
              id={`mawb-${leg.id}`}
              name="master_airway_bill_reference"
              label={t("logistics.fields.air_waybill")}
              value={detail.master_airway_bill_reference}
            />
            <Field>
              <FieldLabel htmlFor={`weight-profile-${leg.id}`}>
                {t("logistics.fields.weight")}
              </FieldLabel>
              <NativeSelect
                id={`weight-profile-${leg.id}`}
                name="weight_profile_id"
                defaultValue={String(detail.weight_profile_id ?? "")}
                disabled={!canManage}
              >
                <option value="">{t("logistics.optional.none")}</option>
                {refs?.air_weight_profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name} · {profile.divisor}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <input type="hidden" name="recalculate_weight" value="1" />
          </>
        ) : null}
        {mode === "ROAD" ? (
          <>
            <Field>
              <FieldLabel htmlFor={`vehicle-${leg.id}`}>
                {t("logistics.fields.vehicle")}
              </FieldLabel>
              <NativeSelect
                id={`vehicle-${leg.id}`}
                name="fleet_vehicle_id"
                defaultValue={String(detail.fleet_vehicle_id ?? "")}
                disabled={!canManage || fleetVehicles.isLoading}
              >
                <option value="">{t("logistics.optional.none")}</option>
                {fleetVehicles.data?.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {canSeeDrivers ? (
              <Field>
                <FieldLabel htmlFor={`driver-${leg.id}`}>
                  {t("logistics.fields.driver")}
                </FieldLabel>
                <NativeSelect
                  id={`driver-${leg.id}`}
                  name="fleet_driver_id"
                  defaultValue={String(detail.fleet_driver_id ?? "")}
                  disabled={!canManage || fleetDrivers.isLoading}
                >
                  <option value="">{t("logistics.optional.none")}</option>
                  {fleetDrivers.data?.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            ) : null}
            <OperationInput
              id={`dispatch-${leg.id}`}
              name="dispatch_reference"
              label={t("logistics.fields.provider_reference")}
              value={detail.dispatch_reference}
            />
            <OperationInput
              id={`pickup-${leg.id}`}
              name="pickup_appointment_at"
              type="datetime-local"
              label={t("logistics.fields.departure")}
              value={detail.pickup_appointment_at}
            />
            <OperationInput
              id={`delivery-${leg.id}`}
              name="delivery_appointment_at"
              type="datetime-local"
              label={t("logistics.fields.arrival")}
              value={detail.delivery_appointment_at}
            />
          </>
        ) : null}
        {mode === "RAIL" ? (
          <>
            <OperationInput
              id={`train-${leg.id}`}
              name="train_service_number"
              label={t("logistics.fields.train_service")}
              value={detail.train_service_number}
            />
            <OperationInput
              id={`wagon-${leg.id}`}
              name="wagon_number"
              label={t("logistics.fields.wagon")}
              value={detail.wagon_number}
            />
            <OperationInput
              id={`rail-booking-${leg.id}`}
              name="rail_booking_reference"
              label={t("logistics.fields.carrier_reference")}
              value={detail.rail_booking_reference}
            />
          </>
        ) : null}
        {canManage ? (
          <Button
            type="submit"
            className="min-h-11 self-end xl:col-span-4 xl:justify-self-end"
            disabled={update.isPending}
          >
            <Save aria-hidden="true" />
            {t("logistics.actions.save_operation")}
          </Button>
        ) : null}
      </form>
      {canManage ? (
        <form
          className="mt-4 grid gap-3 border-t pt-4 md:grid-cols-[1fr_1fr_auto]"
          onSubmit={(event) => record.mutate(values(event))}
        >
          <Field>
            <FieldLabel htmlFor={`operation-event-${leg.id}`}>
              {t("logistics.fields.operation_event")}
            </FieldLabel>
            <NativeSelect
              id={`operation-event-${leg.id}`}
              name="event"
              required
            >
              {EVENTS[mode].map((value) => (
                <option key={value} value={value}>
                  {t(`logistics.status.${value}`, value.replaceAll("_", " "))}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor={`operation-time-${leg.id}`}>
              {t("logistics.fields.event_time")}
            </FieldLabel>
            <Input
              id={`operation-time-${leg.id}`}
              name="event_at"
              type="datetime-local"
              required
            />
          </Field>
          <Button
            type="submit"
            variant="outline"
            className="min-h-11 self-end"
            disabled={record.isPending}
          >
            <Activity aria-hidden="true" />
            {t("logistics.actions.record_operation")}
          </Button>
        </form>
      ) : null}
    </details>
  );
}

function OperationInput({
  id,
  name,
  label,
  value,
  type = "text",
}: {
  id: string;
  name: string;
  label: string;
  value: unknown;
  type?: string;
}) {
  const formatted =
    type === "datetime-local" && value
      ? new Date(String(value)).toISOString().slice(0, 16)
      : String(value ?? "");
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} name={name} type={type} defaultValue={formatted} />
    </Field>
  );
}
