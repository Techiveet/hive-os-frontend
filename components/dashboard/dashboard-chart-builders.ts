import type { ChartOption, ChartTheme } from "@/modules/shared/charts/echarts";
import {
  areaGradient,
  compactNumber,
  donutSeries,
  valueLegend,
  withAlpha,
  type DonutSlice,
} from "@/modules/shared/charts/chart-style";

export type Builder = (theme: ChartTheme) => ChartOption;

// 1. Central Platform Telemetry Area Chart
export function telemetryAreaChart(
  data: Array<{ time: string; requests: number }>,
  seriesLabel: string,
): Builder {
  return (theme) => ({
    grid: { left: 16, right: 16, top: 20, bottom: 20, containLabel: true },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "line" },
      valueFormatter: (v) => `${compactNumber(v)} ${seriesLabel}`,
    },
    xAxis: {
      type: "category",
      data: data.map((d) => d.time),
      axisLine: { lineStyle: { color: theme.border } },
      axisLabel: { color: theme.mutedForeground, fontSize: 10, hideOverlap: true },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      splitNumber: 4,
      axisLabel: {
        color: theme.mutedForeground,
        fontSize: 10,
        formatter: (v: number) => compactNumber(v),
      },
      splitLine: {
        lineStyle: { color: theme.border, opacity: 0.5, type: "dashed" },
      },
    },
    series: [
      {
        name: seriesLabel,
        type: "line",
        smooth: 0.35,
        symbol: "none",
        lineStyle: { width: 2.5, color: theme.categorical[0] },
        areaStyle: {
          color: areaGradient(theme.categorical[0]),
        },
        data: data.map((d) => d.requests),
      },
    ],
  });
}

// 2. Dual Curve Hourly Activity Flow (Actions vs Logins)
export function activityFlowLineChart(
  data: Array<{ hour: string; actions: number; logins: number }>,
  actionsLabel: string,
  loginsLabel: string,
): Builder {
  return (theme) => ({
    grid: { left: 16, right: 20, top: 32, bottom: 20, containLabel: true },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross" },
      valueFormatter: (v) => compactNumber(v),
    },
    legend: {
      data: [actionsLabel, loginsLabel],
      textStyle: { color: theme.foreground, fontSize: 11, fontWeight: 600 },
      right: 12,
      top: 0,
      icon: "circle",
    },
    xAxis: {
      type: "category",
      data: data.map((d) => d.hour),
      axisLine: { lineStyle: { color: theme.border } },
      axisLabel: { color: theme.mutedForeground, fontSize: 10, hideOverlap: true },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      splitNumber: 4,
      axisLabel: {
        color: theme.mutedForeground,
        fontSize: 10,
        formatter: (v: number) => compactNumber(v),
      },
      splitLine: {
        lineStyle: { color: theme.border, opacity: 0.5, type: "dashed" },
      },
    },
    series: [
      {
        name: actionsLabel,
        type: "line",
        smooth: 0.35,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { width: 2.5, color: theme.categorical[0] },
        itemStyle: { color: theme.categorical[0] },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: withAlpha(theme.categorical[0], 0.25) },
              { offset: 1, color: withAlpha(theme.categorical[0], 0.01) },
            ],
          },
        },
        data: data.map((d) => d.actions),
      },
      {
        name: loginsLabel,
        type: "line",
        smooth: 0.35,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { width: 2, color: theme.categorical[1] },
        itemStyle: { color: theme.categorical[1] },
        data: data.map((d) => d.logins),
      },
    ],
  });
}

// 3. Central Multi-Tenant Modules Matrix Bar Chart
export function modulesMatrixBarChart(
  modules: Array<{
    name: string;
    subscribed_tenants: number | null;
    actions: number;
    category?: string;
    monthly_price_etb?: number;
  }>,
): Builder {
  // Sort all registered modules: highest subscriptions first, then by 30d actions, then alphabetical
  const allModules = [...modules].sort((a, b) => {
    const aTenants = a.subscribed_tenants ?? 0;
    const bTenants = b.subscribed_tenants ?? 0;
    if (bTenants !== aTenants) return bTenants - aTenants;
    if (b.actions !== a.actions) return b.actions - a.actions;
    return a.name.localeCompare(b.name);
  });

  return (theme) => ({
    grid: { left: 16, right: 32, top: 28, bottom: 44, containLabel: true },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: theme.card,
      borderColor: theme.border,
      textStyle: { color: theme.foreground, fontSize: 12 },
      formatter: (params: any) => {
        if (!Array.isArray(params) || params.length === 0) return "";
        const title = params[0].name;
        const mod = allModules.find((m) => m.name === title);
        const categoryBadge = mod?.category
          ? `<span style="font-size:10px;padding:1px 6px;border-radius:4px;background-color:${withAlpha(theme.border, 0.6)};color:${theme.mutedForeground};margin-left:6px;">${mod.category}</span>`
          : "";
        const priceInfo = mod?.monthly_price_etb
          ? `<div style="font-size:11px;color:${theme.mutedForeground};margin-top:4px;">Rate: <span style="font-family:monospace;font-weight:600;color:${theme.foreground};">${mod.monthly_price_etb.toLocaleString()} ETB/mo</span></div>`
          : "";

        const items = params.map((p: any) => {
          const markerColor = typeof p.color === 'string' ? p.color : (p.color?.colorStops?.[0]?.color || '#10b981');
          const marker = `<span style="display:inline-block;margin-right:6px;border-radius:3px;width:10px;height:10px;background-color:${markerColor};"></span>`;
          return `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:3px;">
            <span style="color:${theme.mutedForeground};">${marker}${p.seriesName}</span>
            <span style="font-weight:700;font-family:monospace;color:${theme.foreground};">${compactNumber(p.value)}</span>
          </div>`;
        }).join("");

        return `<div style="padding:4px 6px;">
          <div style="font-weight:700;margin-bottom:6px;font-size:13px;display:flex;align-items:center;">
            <span>${title}</span>${categoryBadge}
          </div>
          ${items}
          ${priceInfo}
        </div>`;
      },
    },
    // Legend positioned at bottom so it NEVER collides with top "Only: ..." reset pill or Export button!
    legend: {
      data: ["Subscribed Tenants", "Actions (30d)"],
      textStyle: { color: theme.foreground, fontSize: 11, fontWeight: 600 },
      bottom: 2,
      left: "center",
      icon: "roundRect",
      itemWidth: 14,
      itemHeight: 8,
      itemGap: 20,
    },
    // dataZoom enables scrolling through ALL 55 modules effortlessly without compressing bars
    dataZoom: [
      {
        type: "slider",
        yAxisIndex: 0,
        width: 8,
        right: 4,
        startValue: 0,
        endValue: Math.min(7, allModules.length - 1),
        zoomLock: false,
        brushSelect: false,
        handleSize: "100%",
        showDataShadow: false,
        borderColor: "transparent",
        backgroundColor: withAlpha(theme.border, 0.2),
        fillerColor: withAlpha(theme.categorical[0], 0.4),
        handleStyle: {
          color: theme.foreground,
          borderColor: theme.border,
        },
      },
      {
        type: "inside",
        yAxisIndex: 0,
        zoomOnMouseWheel: false,
        moveOnMouseMove: true,
        moveOnMouseWheel: true,
      },
    ],
    xAxis: {
      type: "value",
      axisLabel: {
        color: theme.mutedForeground,
        fontSize: 10,
        formatter: (v: number) => compactNumber(v),
      },
      splitLine: {
        lineStyle: { color: theme.border, opacity: 0.5, type: "dashed" },
      },
    },
    yAxis: {
      type: "category",
      data: allModules.map((m) => m.name),
      inverse: true,
      axisLine: { lineStyle: { color: theme.border } },
      axisLabel: {
        color: theme.foreground,
        fontSize: 11,
        fontWeight: 600,
        width: 165,
        overflow: "truncate",
      },
      axisTick: { show: false },
    },
    series: [
      {
        name: "Subscribed Tenants",
        type: "bar",
        barMaxWidth: 13,
        barGap: "35%",
        itemStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: "#10b981" },
              { offset: 1, color: "#06b6d4" },
            ],
          },
          borderRadius: [0, 5, 5, 0],
        },
        data: allModules.map((m) => m.subscribed_tenants ?? 0),
      },
      {
        name: "Actions (30d)",
        type: "bar",
        barMaxWidth: 13,
        itemStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: "#6366f1" },
              { offset: 1, color: "#a855f7" },
            ],
          },
          borderRadius: [0, 5, 5, 0],
        },
        data: allModules.map((m) => m.actions),
      },
    ],
  });
}

// 4. Central Storage & Table Size Allocation Bar Chart
export function resourceAllocationBarChart(
  resources: Array<{ name: string; value: number; fill?: string }>,
): Builder {
  const topResources = [...resources].slice(0, 6);

  return (theme) => ({
    grid: { left: 16, right: 30, top: 15, bottom: 15, containLabel: true },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (v) => `${compactNumber(v)} MB`,
    },
    xAxis: {
      type: "value",
      axisLabel: {
        color: theme.mutedForeground,
        fontSize: 10,
        formatter: (v: number) => `${compactNumber(v)} MB`,
      },
      splitLine: {
        lineStyle: { color: theme.border, opacity: 0.5, type: "dashed" },
      },
    },
    yAxis: {
      type: "category",
      data: topResources.map((r) => r.name),
      inverse: true,
      axisLine: { lineStyle: { color: theme.border } },
      axisLabel: {
        color: theme.foreground,
        fontSize: 11,
        fontWeight: 600,
        width: 120,
        overflow: "truncate",
      },
      axisTick: { show: false },
    },
    series: [
      {
        type: "bar",
        barMaxWidth: 14,
        data: topResources.map((r, i) => ({
          value: r.value,
          itemStyle: {
            color: r.fill || theme.categorical[i % theme.categorical.length],
            borderRadius: [0, 6, 6, 0],
          },
        })),
      },
    ],
  });
}

// 5. Tenant Stock Movement Flow (Inbound, Outbound, Internal)
export function stockMovementFlowChart(
  data: Array<{
    period: string;
    inbound: number;
    outbound: number;
    transfers: number;
  }>,
): Builder {
  return (theme) => ({
    grid: { left: 16, right: 16, top: 32, bottom: 25, containLabel: true },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (v) => `${compactNumber(v)} Units`,
    },
    legend: {
      data: ["Inbound Receipts", "Outbound Fulfillment", "Internal Transfers"],
      textStyle: { color: theme.foreground, fontSize: 11, fontWeight: 600 },
      right: 10,
      top: 0,
      icon: "circle",
    },
    xAxis: {
      type: "category",
      data: data.map((d) => d.period),
      axisLine: { lineStyle: { color: theme.border } },
      axisLabel: { color: theme.mutedForeground, fontSize: 10, hideOverlap: true },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      splitNumber: 4,
      axisLabel: {
        color: theme.mutedForeground,
        fontSize: 10,
        formatter: (v: number) => compactNumber(v),
      },
      splitLine: {
        lineStyle: { color: theme.border, opacity: 0.5, type: "dashed" },
      },
    },
    series: [
      {
        name: "Inbound Receipts",
        type: "bar",
        barMaxWidth: 12,
        itemStyle: {
          color: theme.categorical[0],
          borderRadius: [4, 4, 0, 0],
        },
        data: data.map((d) => d.inbound),
      },
      {
        name: "Outbound Fulfillment",
        type: "bar",
        barMaxWidth: 12,
        itemStyle: {
          color: theme.categorical[1],
          borderRadius: [4, 4, 0, 0],
        },
        data: data.map((d) => d.outbound),
      },
      {
        name: "Internal Transfers",
        type: "bar",
        barMaxWidth: 12,
        itemStyle: {
          color: theme.categorical[2],
          borderRadius: [4, 4, 0, 0],
        },
        data: data.map((d) => d.transfers),
      },
    ],
  });
}

// 6. Donut Chart with Center Total
export function donutChartWithTotal(
  slices: Array<{ name: string; value: number; color?: string }>,
  caption: string,
): Builder {
  return (theme) => {
    // Only display top 5 non-zero slices (or original slices if all 0) to avoid legend crowding
    const nonZero = slices.filter((s) => s.value > 0);
    const displayList = (nonZero.length > 0 ? nonZero : slices).slice(0, 5);
    const resolved: DonutSlice[] = displayList.map((s, idx) => ({
      name: s.name,
      value: s.value,
      color: s.color || theme.categorical[idx % theme.categorical.length],
    }));

    return {
      tooltip: {
        trigger: "item",
        valueFormatter: (v) => compactNumber(v),
      },
      legend: valueLegend(resolved, {
        orient: "horizontal",
        bottom: 0,
        textStyle: { color: theme.foreground, fontSize: 11 },
      }),
      series: [donutSeries(resolved, caption, theme)],
    };
  };
}

// 7. Department Operations / Activity Workload Bar Chart
export function departmentActivityBarChart(
  departments: Array<{
    department: string;
    transactions: number;
    pendingTasks: number;
  }>,
): Builder {
  const topDepts = [...departments].slice(0, 6);

  return (theme) => ({
    grid: { left: 16, right: 20, top: 32, bottom: 20, containLabel: true },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (v) => compactNumber(v),
    },
    legend: {
      data: ["Executed Operations", "Pending Queue"],
      textStyle: { color: theme.foreground, fontSize: 11, fontWeight: 600 },
      right: 10,
      top: 0,
      icon: "circle",
    },
    xAxis: {
      type: "value",
      axisLabel: {
        color: theme.mutedForeground,
        fontSize: 10,
        formatter: (v: number) => compactNumber(v),
      },
      splitLine: {
        lineStyle: { color: theme.border, opacity: 0.5, type: "dashed" },
      },
    },
    yAxis: {
      type: "category",
      data: topDepts.map((d) => d.department),
      inverse: true,
      axisLine: { lineStyle: { color: theme.border } },
      axisLabel: {
        color: theme.foreground,
        fontSize: 11,
        fontWeight: 600,
        width: 120,
        overflow: "truncate",
      },
      axisTick: { show: false },
    },
    series: [
      {
        name: "Executed Operations",
        type: "bar",
        barMaxWidth: 12,
        itemStyle: {
          color: theme.categorical[0],
          borderRadius: [0, 4, 4, 0],
        },
        data: topDepts.map((d) => d.transactions),
      },
      {
        name: "Pending Queue",
        type: "bar",
        barMaxWidth: 12,
        itemStyle: {
          color: theme.categorical[2],
          borderRadius: [0, 4, 4, 0],
        },
        data: topDepts.map((d) => d.pendingTasks),
      },
    ],
  });
}
