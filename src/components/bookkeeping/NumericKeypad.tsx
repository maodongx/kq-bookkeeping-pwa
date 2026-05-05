"use client";

import { Button } from "@heroui/react";
import { Delete } from "lucide-react";

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Phone-dialer-style numeric keypad for amount entry.
 *
 *   7 8 9
 *   4 5 6
 *   1 2 3
 *   . 0 ⌫
 *
 * No clear button — tap backspace repeatedly if you need to wipe.
 * Max two decimal places; single decimal point; tapping `.` on an
 * empty value produces `0.` (not a bare `.`) for nicer UX.
 *
 * Amount display and action buttons are the parent's responsibility;
 * this component is just the grid. That keeps QuickEntryModal free
 * to lay out the pieces (amount readout, notes bar, date, confirm)
 * without fighting the keypad's internal layout.
 */
export function NumericKeypad({ value, onChange }: NumericKeypadProps) {
  const BACKSPACE = "⌫";

  const handleKey = (key: string) => {
    if (key === BACKSPACE) {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === ".") {
      if (value.includes(".")) return;
      if (!value) onChange("0.");
      else onChange(value + ".");
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

  // Row-major phone-dialer order: 7-8-9 on top, `.` `0` `⌫` on bottom.
  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", BACKSPACE];

  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map((key) => {
        const isBackspace = key === BACKSPACE;
        return (
          <Button
            key={key}
            variant={isBackspace ? "tertiary" : "outline"}
            size="lg"
            className="h-14 text-xl font-medium"
            onPress={() => handleKey(key)}
            aria-label={isBackspace ? "删除" : key}
          >
            {isBackspace ? <Delete className="size-6" /> : key}
          </Button>
        );
      })}
    </div>
  );
}
