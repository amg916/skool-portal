import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Read-only star display. `value` may be fractional (e.g. 4.3). */
export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "h-3.5 w-3.5",
            value >= n - 0.5 ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
          )}
        />
      ))}
    </span>
  );
}

/** Interactive 1–5 picker. */
export function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
          className="transition-transform hover:scale-110 disabled:opacity-50"
        >
          <Star
            className={cn(
              "h-6 w-6",
              value != null && value >= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </div>
  );
}
