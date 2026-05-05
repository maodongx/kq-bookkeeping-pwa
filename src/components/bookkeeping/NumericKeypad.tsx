"use client";

import { Button } from "@heroui/react";
import { Delete } from "lucide-react";

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
}

/**
 * Calculator-style keypad for amount entry. Max two decimal places; single
 * leading zero; single decimal point. Backspace deletes one char; `C`
 * clears.
 */
export function NumericKeypad({
  value,
  onChange,
  onConfirm,
}: NumericKeypadProps) {
  const handleKey = (key: string) => {
    if (key === "C") {
      onChange("");
      return;
    }
    if (key === "⌫") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === ".") {
      if (value.includes(".")) return;
      onChange(value + ".");
      return;
    }
    const parts = value.split(".");
    if (parts[1]?.length >= 2) return;
    if (value === "0" && key !== ".") {
      onChange(key);
      return;
    }
    onChange(value + key);
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "."];

  return (
    <div className="flex flex-col gap-3">
      <div className="min-h-[60px] px-2 py-4 text-right text-4xl font-semibold">
        {value || "0"}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {keys.map((key) => (
          <Button
            key={key}
            variant={key === "C" ? "tertiary" : "outline"}
            size="lg"
            className="h-14 text-xl font-medium"
            onPress={() => handleKey(key)}
          >
            {key}
          </Button>
        ))}
        <Button
          variant="tertiary"
          size="lg"
          className="h-14"
          onPress={() => handleKey("⌫")}
          aria-label="删除"
        >
          <Delete className="size-6" />
        </Button>
      </div>
      <Button
        variant="primary"
        size="lg"
        className="mt-2 h-14 text-lg font-semibold"
        onPress={onConfirm}
        isDisabled={!value || value === "0" || value === "."}
      >
        确认
      </Button>
    </div>
  );
}
