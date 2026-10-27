"use client";

import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDuration, formatMsSinceMidnight } from "@/lib/format";
import type { ArrivalPoint, OfficeTimePoint } from "@/components/office/chart-data";

const AXIS_TICK = { fontSize: 11 };

function isOfficePoint(value: unknown): value is OfficeTimePoint {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const point = value as Partial<OfficeTimePoint>;
  return typeof point.fullDate === "string" && typeof point.officeMs === "number";
}

function isArrivalPoint(value: unknown): value is ArrivalPoint {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const point = value as Partial<ArrivalPoint>;
  return typeof point.fullDate === "string" && typeof point.clock === "string";
}

export function OfficeTimeChart({
  points,
}: {
  points: readonly OfficeTimePoint[];
}) {
  return (
    <div className="h-56 w-full min-w-0">
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: 640, height: 224 }}
      >
        <BarChart
          data={[...points]}
          margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
        >
          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            interval={points.length > 14 ? "preserveStartEnd" : 0}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={AXIS_TICK}
            width={64}
            tickLine={false}
            axisLine={false}
            domain={[0, "auto"]}
            tickFormatter={(value: number) => formatDuration(value)}
          />
          <Tooltip
            isAnimationActive={false}
            cursor={{ fill: "var(--muted)" }}
            content={(props) => {
              if (!props.active || !props.payload?.length) {
                return null;
              }
              const point = props.payload[0]?.payload;
              if (!isOfficePoint(point)) {
                return null;
              }
              return (
                <div className="rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground ring-1 ring-foreground/10">
                  <p>{point.fullDate}</p>
                  <p>{formatDuration(point.officeMs)}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="officeMs" isAnimationActive={false} radius={[2, 2, 0, 0]}>
            {points.map((point) => (
              <Cell
                key={point.date}
                fill={point.future ? "var(--muted-foreground)" : "var(--office)"}
                fillOpacity={point.future ? 0.35 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ArrivalChart({
  points,
}: {
  points: readonly ArrivalPoint[];
}) {
  const values = points.map((point) => point.arrivalMs);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const pad = 30 * 60 * 1000;
  const domainStart = Math.max(0, low - pad);
  let domainEnd = Math.min(86_400_000, high + pad);
  if (domainEnd <= domainStart) {
    domainEnd = Math.min(86_400_000, domainStart + 60 * 60 * 1000);
  }

  return (
    <div className="h-56 w-full min-w-0">
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: 640, height: 224 }}
      >
        <LineChart
          data={[...points]}
          margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
        >
          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            interval={points.length > 14 ? "preserveStartEnd" : 0}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={AXIS_TICK}
            width={52}
            tickLine={false}
            axisLine={false}
            domain={[domainStart, domainEnd]}
            tickFormatter={(value: number) => formatMsSinceMidnight(value)}
          />
          <Tooltip
            isAnimationActive={false}
            content={(props) => {
              if (!props.active || !props.payload?.length) {
                return null;
              }
              const point = props.payload[0]?.payload;
              if (!isArrivalPoint(point)) {
                return null;
              }
              return (
                <div className="rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground ring-1 ring-foreground/10">
                  <p>{point.fullDate}</p>
                  <p>{point.clock}</p>
                </div>
              );
            }}
          />
          <Line
            type="linear"
            dataKey="arrivalMs"
            stroke="var(--foreground)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--foreground)" }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
