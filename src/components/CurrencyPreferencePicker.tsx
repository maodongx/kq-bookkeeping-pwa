"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Key } from "@heroui/react";
import { ToggleButton, ToggleButtonGroup } from "@heroui/react";
import { Currency } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

const OPTIONS: { value: Currency; label: string }[] = [
  { value: "USD", label: "USD $" },
  { value: "JPY", label: "JPY ¥" },
  { value: "CNY", label: "CNY ¥" },
];

/**
 * Settings-page variant of the currency picker. Persists the choice
 * into Supabase `user_metadata.default_currency` so other devices pick
 * it up on next load. Uses ToggleButtonGroup for the same reason as
 * CurrencySwitcher — this is a state toggle, not navigation.
 */
export function CurrencyPreferencePicker({
  current,
}: {
  current: Currency;
}) {
  const [selected, setSelected] = useState<Currency>(current);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleChange(c: Currency) {
    setSelected(c);
    setSaving(true);
    await supabase.auth.updateUser({ data: { default_currency: c } });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted">
        默认币种{saving ? " ..." : ""}
      </span>
      <ToggleButtonGroup
        aria-label="默认币种"
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={new Set<Key>([selected])}
        isDisabled={saving}
        onSelectionChange={(keys) => {
          const next = [...keys][0];
          if (next) handleChange(next as Currency);
        }}
      >
        {OPTIONS.map((opt, i) => (
          <ToggleButton key={opt.value} id={opt.value}>
            {i > 0 && <ToggleButtonGroup.Separator />}
            {opt.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  );
}
