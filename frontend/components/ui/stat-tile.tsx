import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

/**
 * KPI tile. Big bold number is the visual anchor; small label above
 * (sentence case, muted); optional delta and helper line below.
 *
 * Example use:
 *   <StatTile label="Failed checks" value={12} tone="error" delta="+3 vs last run" />
 */
export type StatTone = "neutral" | "success" | "warning" | "error" | "info";

const TONE_NUMBER_COLOR: Record<StatTone, string> = {
  neutral: "text-ink",
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
  info: "text-info"
};

export function StatTile({
  label,
  value,
  helper,
  tone = "neutral",
  icon
}: {
  label: string;
  value: React.ReactNode;
  helper?: React.ReactNode;
  tone?: StatTone;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="px-6 py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink-2">{label}</p>
          <p
            className={cn(
              "mt-3 text-3xl font-semibold leading-none tabular-nums",
              TONE_NUMBER_COLOR[tone]
            )}
          >
            {value}
          </p>
          {helper ? <p className="mt-3 text-xs text-ink-3">{helper}</p> : null}
        </div>
        {icon ? (
          <div className="grid h-8 w-8 place-items-center rounded-[8px] bg-icon-bg text-icon">
            {icon}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
