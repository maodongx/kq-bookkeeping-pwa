import { cn } from "@/lib/utils";

/**
 * A label on the left, a value on the right, with the value styled as
 * monospace for numeric alignment. Used anywhere a key/value pair
 * needs to display inside a card (asset detail, future settings rows,
 * etc.).
 */
export function LabelValueRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  /** Extra classes applied to the value span (e.g. gain/loss color). */
  className?: string;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className={cn("font-mono", className)}>{value}</span>
    </div>
  );
}
