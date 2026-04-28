import { cn } from "@/lib/utils";

/**
 * Base surface for the redesign. White card on canvas, 12px radius,
 * soft shadow, no border. Replaces the dark-theme SectionCard pattern
 * for pages that have been ported to the new design system.
 */
export function Card({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[12px] bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.08)]",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * CardHeader is a flex row with title (+ optional subtitle on the left)
 * and action slot (right). Used at the top of every card. Padding is
 * standardized so cards feel cohesive across the app.
 */
export function CardHeader({
  title,
  subtitle,
  actions,
  className
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-6 pt-6", className)}>
      <div>
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-ink-2">{subtitle}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

/**
 * Body padding helper. Lets the parent decide whether to add a divider
 * by passing a top border, but standardizes inset.
 */
export function CardBody({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-6 py-6", className)}>{children}</div>;
}
