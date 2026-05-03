"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
      <span className="text-sm text-gray-500">
        默认币种{saving ? " ..." : ""}
      </span>
      <div className="inline-flex rounded-full bg-gray-100 p-0.5">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleChange(opt.value)}
            disabled={saving}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              selected === opt.value
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-500"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
