"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs } from "@heroui/react";
import { Currency } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

const OPTIONS: { value: Currency; label: string }[] = [
  { value: "USD", label: "USD $" },
  { value: "JPY", label: "JPY ¥" },
  { value: "CNY", label: "CNY ¥" },
];

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
      <Tabs
        selectedKey={selected}
        onSelectionChange={(k) => handleChange(k as Currency)}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="默认币种">
            {OPTIONS.map((opt) => (
              <Tabs.Tab key={opt.value} id={opt.value} isDisabled={saving}>
                {opt.label}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
    </div>
  );
}
