import { Badge } from "@packages/ui/components/badge";
import {
  ENTRY_TYPE_REGISTRY,
  type EntryTypeKind,
} from "@packages/ui/lib/entry-type";
import { cn } from "@packages/ui/lib/utils";

type Props = {
  type: EntryTypeKind;
  /** Also targets the icon — Badge forces `[&>svg]:size-3!`, so override
   * icon size via e.g. `"[&>svg]:size-4!"` here, not via icon props. */
  className?: string;
  /** Render just the icon (no label text), e.g. for compact list rows. */
  iconOnly?: boolean;
};

/** Icon (+ optional label) badge for a WORK/BREAK time entry. */
export function EntryTypeBadge({ type, className, iconOnly }: Props) {
  const { label, icon: Icon, badgeVariant } = ENTRY_TYPE_REGISTRY[type];
  return (
    <Badge
      variant={badgeVariant}
      title={label}
      aria-label={iconOnly ? label : undefined}
      className={cn(iconOnly && "aspect-square px-0", className)}
    >
      <Icon />
      {!iconOnly && label}
    </Badge>
  );
}
