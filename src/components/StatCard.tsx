import { Card } from "@heroui/react";
import { cn } from "@/lib/utils";

/**
 * Small summary card used on the dashboard: a muted label above a
 * tabular numeric value. Kept deliberately tiny so it can be grouped in
 * grids (e.g. grid-cols-3) without layout surprises.
 *
 * Use `tone` to color the value — typically combined with
 * `gainLossTextClass(n)` from lib/currency.ts for gain/loss cards.
 */
export function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <Card className="py-1 text-center">
      <Card.Content>
        <p className="text-xs text-muted">{label}</p>
        <p className={cn("text-sm font-semibold tabular-nums", tone)}>
          {value}
        </p>
      </Card.Content>
    </Card>
  );
}
