import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Three button variants.
 *
 *  primary   = bg-brand (#0B2F2A dark teal), white text — used for the
 *              single most important action on a screen (Run QA, Save
 *              Project, Create Project). At most one per screen.
 *  secondary = surface bg with line border, ink text — used for Edit /
 *              Cancel / Duplicate.
 *  ghost     = no fill or border, ink-2 text — used for low-emphasis
 *              actions like "View older" links inline with content.
 *
 * Renders as <Link> when `href` is provided, <button> otherwise.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "md" | "sm";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-[8px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  // Force `!text-white` so the inherited body color (`--foreground`,
  // still legacy `#f5f5f4` for now) can never bleed through onto the
  // primary button label.
  primary: "bg-brand !text-white hover:bg-[#0E3D37] active:bg-[#072420]",
  secondary:
    "bg-surface text-ink border border-line hover:bg-hover hover:border-ink-3",
  ghost: "text-ink-2 hover:bg-hover hover:text-ink"
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: "h-10 px-4 text-sm",
  sm: "h-8 px-3 text-sm"
};

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps & {
  href: string;
  download?: boolean;
  target?: string;
  rel?: string;
};

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const variant = props.variant ?? "secondary";
  const size = props.size ?? "md";
  const classes = cn(BASE, VARIANT_CLASSES[variant], SIZE_CLASSES[size], props.className);

  if ("href" in props && props.href) {
    const { children, href, download, target, rel } = props;
    return (
      <Link href={href} download={download} target={target} rel={rel} className={classes}>
        {children}
      </Link>
    );
  }

  const { children, ...rest } = props as ButtonAsButton;
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
