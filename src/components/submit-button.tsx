"use client";

import { useFormStatus } from "react-dom";

/**
 * Pending-aware submit button for server-action forms. Greys out while the
 * action runs so toggles like open/closed read as in-progress, not dead.
 */
export function SubmitButton({
  label,
  pendingLabel,
  className,
  ariaLabel,
  danger,
}: {
  label: string;
  pendingLabel?: string;
  className?: string;
  ariaLabel?: string;
  danger?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={ariaLabel ?? label}
      className={
        className ??
        (danger
          ? "rounded-lg text-sm text-chili hover:underline px-2 py-1.5 disabled:opacity-50"
          : "rounded-lg border border-line px-2 text-sm font-bold hover:bg-ledger disabled:opacity-50")
      }
    >
      {pending ? (pendingLabel ?? `${label}…`) : label}
    </button>
  );
}
