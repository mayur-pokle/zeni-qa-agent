import { cn, formatDate } from "@/lib/utils";

export function StatCard({
  label,
  value,
  helper
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="border border-[#f5f5f4]/20 p-4">
      <p className="text-xs uppercase tracking-[0.28em] text-[#f5f5f4]/55">{label}</p>
      <p className="mt-3 text-3xl uppercase tracking-[0.14em]">{value}</p>
      {helper ? <p className="mt-2 text-xs text-[#f5f5f4]/60">{helper}</p> : null}
    </div>
  );
}

export function StatusPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center border border-[#f5f5f4]/30 px-2 py-1 text-[10px] uppercase tracking-[0.3em]">
      {label}
    </span>
  );
}

export function SectionCard({
  title,
  children,
  className,
  headerAdornment
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerAdornment?: React.ReactNode;
}) {
  return (
    <section className={cn("border border-[#f5f5f4]/20 p-5", className)}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm uppercase tracking-[0.28em]">{title}</h2>
          {headerAdornment}
        </div>
      </div>
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  copy
}: {
  title: string;
  copy: string;
}) {
  return (
    <div className="border border-dashed border-[#f5f5f4]/20 p-8 text-center">
      <p className="text-sm uppercase tracking-[0.28em]">{title}</p>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#f5f5f4]/70">{copy}</p>
    </div>
  );
}

export function TimelineRow({
  label,
  value,
  detail,
  formatAsDate = false
}: {
  label: string;
  value: React.ReactNode | Date;
  detail?: string;
  formatAsDate?: boolean;
}) {
  const renderedValue: React.ReactNode = formatAsDate
    ? formatDate(value as string | Date | null | undefined)
    : (value as React.ReactNode);

  return (
    <div className="grid gap-1 border-t border-[#f5f5f4]/10 py-3 text-sm md:grid-cols-[200px_1fr] md:gap-4">
      <div className="uppercase tracking-[0.22em] text-[#f5f5f4]/55">{label}</div>
      <div>
        <div>{renderedValue}</div>
        {detail ? <div className="mt-1 text-xs text-[#f5f5f4]/60">{detail}</div> : null}
      </div>
    </div>
  );
}
