"use client";

import type { Key } from "@heroui/react";
import { ToggleButton, ToggleButtonGroup } from "@heroui/react";
import { Currency } from "@/lib/types";

const OPTIONS: { value: Currency; label: string }[] = [
  { value: "USD", label: "USD" },
  { value: "JPY", label: "JPY" },
  { value: "CNY", label: "CNY" },
];

/**
 * Mutually-exclusive currency selector. Uses ToggleButtonGroup (single
 * selection, empty not allowed) rather than Tabs because the user is
 * picking a state value, not navigating between views.
 */
export function CurrencySwitcher({
  value,
  onChange,
}: {
  value: Currency;
  onChange: (c: Currency) => void;
}) {
  return (
    <ToggleButtonGroup
      aria-label="币种切换"
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={new Set<Key>([value])}
      onSelectionChange={(keys) => {
        const next = [...keys][0];
        if (next) onChange(next as Currency);
      }}
    >
      {OPTIONS.map((opt, i) => (
        <ToggleButton key={opt.value} id={opt.value}>
          {i > 0 && <ToggleButtonGroup.Separator />}
          {opt.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
