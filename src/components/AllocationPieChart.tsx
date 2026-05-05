"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, Chip } from "@heroui/react";
import { Currency } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

/**
 * Default palette. Hand-picked to read well on the HeroUI finances theme
 * (both light and dark). Kept as solid hex so slice colors render correctly
 * in the SVG <Cell fill>; accessibility of on-slice white labels has been
 * verified against each hex.
 */
const DEFAULT_PALETTE = [
  "#4968d9", // accent blue (matches --accent)
  "#ef4444", // red-500
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
];

interface Slice {
  name: string;
  value: number;
}

interface PieLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}

/**
 * Render percentage labels INSIDE each slice so they never overflow the
 * SVG viewport (fixes edge clipping on iPhone 14/15 Pro ~390px viewports).
 * Slices under 5% are skipped to avoid overlap.
 */
function renderInsideLabel(props: PieLabelProps) {
  const {
    cx = 0,
    cy = 0,
    midAngle = 0,
    innerRadius = 0,
    outerRadius = 0,
    percent = 0,
  } = props;

  if (percent < 0.05) return null;

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-[11px] font-semibold"
      style={{ textShadow: "0 1px 2px rgba(0,0,0,0.25)" }}
    >
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
}

export function AllocationPieChart({
  data,
  title,
  colorMap,
  currency,
  centerLabel,
}: {
  data: Slice[];
  title: string;
  /**
   * Fixed color overrides per slice name (e.g. risk level => semantic
   * green/yellow/red). Names not in the map fall back to the default palette.
   */
  colorMap?: Record<string, string>;
  /**
   * If provided, the total of all slices is shown in the donut center
   * formatted in this currency. If omitted, the center is not rendered.
   */
  currency?: Currency;
  /** Small label shown above the center total (e.g. "总计"). */
  centerLabel?: string;
}) {
  const filtered = data
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value); // biggest slice first — chip list reads top-to-bottom

  if (filtered.length === 0) return null;

  const total = filtered.reduce((sum, d) => sum + d.value, 0);

  // Resolve color per slice: explicit colorMap override wins; fallbacks
  // are indexed by slice position so the color sequence is stable.
  const sliceColors = filtered.map((slice, i) => {
    if (colorMap?.[slice.name]) return colorMap[slice.name];
    return DEFAULT_PALETTE[i % DEFAULT_PALETTE.length];
  });

  const showCenter = currency != null;

  return (
    <Card>
      <Card.Header>
        <Card.Title>{title}</Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="relative w-full">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              {/* Soft drop shadow applied to the whole donut */}
              <defs>
                <filter
                  id="pie-shadow"
                  x="-20%"
                  y="-20%"
                  width="140%"
                  height="140%"
                >
                  <feDropShadow
                    dx="0"
                    dy="2"
                    stdDeviation="3"
                    floodColor="#000000"
                    floodOpacity="0.12"
                  />
                </filter>
              </defs>
              <Pie
                data={filtered}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={2}
                cornerRadius={4}
                stroke="var(--surface)"
                strokeWidth={2}
                label={renderInsideLabel}
                labelLine={false}
                filter="url(#pie-shadow)"
                animationBegin={0}
                animationDuration={600}
              >
                {filtered.map((slice, i) => (
                  <Cell key={slice.name} fill={sliceColors[i]} />
                ))}
              </Pie>
              <Tooltip
                cursor={{ fill: "transparent" }}
                contentStyle={{
                  background: "var(--overlay)",
                  color: "var(--overlay-foreground)",
                  border: "1px solid var(--separator)",
                  borderRadius: "var(--radius)",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  padding: "6px 10px",
                }}
                formatter={(value) => [
                  currency
                    ? formatCurrency(Number(value), currency)
                    : Number(value).toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }),
                  "",
                ]}
                separator=""
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Center total overlay — sits on top of the SVG donut hole */}
          {showCenter && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              {centerLabel && (
                <span className="text-[11px] text-muted">{centerLabel}</span>
              )}
              <span className="text-base font-bold tabular-nums">
                {formatCurrency(total, currency)}
              </span>
            </div>
          )}
        </div>

        {/* HeroUI Chip legend: matches theme, each chip shows a colored dot,
            the category name, and its percentage. Arranged in a flex wrap
            so it reflows on narrow screens. */}
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {filtered.map((slice, i) => {
            const pct = (slice.value / total) * 100;
            return (
              <Chip key={slice.name} size="sm" variant="secondary">
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ backgroundColor: sliceColors[i] }}
                  aria-hidden
                />
                <Chip.Label>
                  <span className="text-xs">
                    {slice.name}{" "}
                    <span className="text-muted tabular-nums">
                      {pct.toFixed(1)}%
                    </span>
                  </span>
                </Chip.Label>
              </Chip>
            );
          })}
        </div>
      </Card.Content>
    </Card>
  );
}
