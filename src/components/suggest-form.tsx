"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { suggestItemState } from "@/app/actions/shop";

/** Customer-only write path: cart + order already exist; this asks the shop to stock X. */
export function SuggestForm({ shopId, shopName }: { shopId: string; shopName: string }) {
  const [message, dispatch, pending] = useActionState(
    suggestItemState.bind(null, shopId),
    null,
  );
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (message === "sent") {
      formRef.current?.reset();
      router.refresh();
    }
  }, [message, router]);

  return (
    <section className="rounded-2xl bg-counter border border-line p-5">
      <h2 className="font-display font-bold text-xl">Can&apos;t find it?</h2>
      <p className="text-sm text-ink-soft">
        Ask {shopName} to stock it. The shopkeeper sees your request in the Vendor dashboard.
      </p>
      <form ref={formRef} action={dispatch} className="mt-3 grid sm:grid-cols-2 gap-2">
        <input
          name="item_name"
          required
          minLength={2}
          maxLength={80}
          placeholder="e.g. Amul Kool Kesar 200 ml"
          aria-label="Item you want"
          className="rounded-lg border border-line px-3 py-2 text-sm sm:col-span-1"
        />
        <input
          name="note"
          maxLength={240}
          placeholder="Note for the shopkeeper (optional)"
          aria-label="Note for the shopkeeper"
          className="rounded-lg border border-line px-3 py-2 text-sm sm:col-span-1"
        />
        {message !== null && message !== "sent" && (
          <p role="alert" className="text-sm text-chili sm:col-span-2">
            {message}
          </p>
        )}
        {message === "sent" && (
          <p role="status" className="text-sm text-leaf font-semibold sm:col-span-2">
            Sent — the shopkeeper will see it under Vendor → Requests.
          </p>
        )}
        <button
          disabled={pending}
          className="rounded-lg bg-marigold text-ink text-sm font-bold px-4 py-2 hover:brightness-95 disabled:opacity-50 sm:col-span-2"
        >
          {pending ? "Sending…" : "Send suggestion"}
        </button>
      </form>
    </section>
  );
}
