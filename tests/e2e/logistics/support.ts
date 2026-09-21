export type LogisticsFixtureManifest = {
  fixture_id: string;
  tenant_id: string;
  domain: string;
  frontend_url: string;
  user: {
    email: string;
    password: string;
  };
  references: {
    customer_id: number;
    supplier_id: number;
    warehouse_id: number;
    warehouse_location_id: number;
    forwarding_job_id: number;
    forwarding_job_number: string;
    transport_leg_ids?: number[];
    tracking_event_id?: number;
    job_charge_id: number;
    job_cost_id: number;
    finance_period_id: number;
  };
};
