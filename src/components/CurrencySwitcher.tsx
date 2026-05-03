"use client";

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
    <div className="inline-flex rounded-full bg-gray-100 p-0.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
            value === opt.value
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-500"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
