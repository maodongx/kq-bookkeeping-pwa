"use client";

import { Tabs } from "@heroui/react";
import { Currency } from "@/lib/types";

const OPTIONS: { value: Currency; label: string }[] = [
  { value: "USD", label: "USD" },
  { value: "JPY", label: "JPY" },
  { value: "CNY", label: "CNY" },
];

export function CurrencySwitcher({
  value,
  onChange,
}: {
  value: Currency;
  onChange: (c: Currency) => void;
}) {
  return (
    <Tabs
      selectedKey={value}
      onSelectionChange={(k) => onChange(k as Currency)}
    >
      <Tabs.ListContainer>
        <Tabs.List aria-label="币种切换">
          {OPTIONS.map((opt) => (
            <Tabs.Tab key={opt.value} id={opt.value}>
              {opt.label}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
    </Tabs>
  );
}
