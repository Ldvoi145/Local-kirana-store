"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  claimShopState,
  createShopState,
  deleteShop,
} from "@/app/actions/shop";

export function ClaimButton({
  shopId,
  shopName,
}: {
  shopId: string;
  shopName: string;
}) {
  const [message, dispatch, pending] = useActionState(claimShopState.bind(null, shopId), null);
  const router = useRouter();
  useEffect(() => {
    if (message === null) return;
    if (message === "claimed") router.refresh();
  }, [message, router]);

  return (
    <form action={dispatch} className="flex items-center gap-2">
      {message !== null && message !== "claimed" && (
        <span role="alert" className="text-xs text-chili">
          {message}
        </span>
      )}
      <button
        disabled={pending}
        aria-label={`Claim ${shopName}`}
        className="rounded-lg bg-marigold text-ink text-sm font-bold px-3 py-1.5 hover:brightness-95 disabled:opacity-50"
      >
        {pending ? "Claiming" : "Claim"}
      </button>
    </form>
  );
}

export function CreateShopForm() {
  const [message, dispatch, pending] = useActionState(createShopState, null);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (message === "created") {
      formRef.current?.reset();
      router.refresh();
    }
  }, [message, router]);

  return (
    <details className="mt-3 rounded-xl border border-line">
      <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold hover:bg-ledger rounded-xl">
        Add your own shop
      </summary>
      <form
        ref={formRef}
        action={dispatch}
        className="grid sm:grid-cols-3 gap-2 p-4 border-t border-line"
      >
        <input name="name" required minLength={2} placeholder="Shop name" aria-label="Shop name" className="rounded-lg border border-line px-3 py-2 text-sm" />
        <input name="address" placeholder="Address" aria-label="Address" className="rounded-lg border border-line px-3 py-2 text-sm" />
        <input name="timings" placeholder="Timings" aria-label="Timings" className="rounded-lg border border-line px-3 py-2 text-sm" />
        {message !== null && message !== "created" && (
          <p role="alert" className="text-sm text-chili sm:col-span-3">
            {message}
          </p>
        )}
        {message === "created" && (
          <p role="status" className="text-sm text-leaf font-semibold sm:col-span-3">
            Shop created — loading your dashboard…
          </p>
        )}
        <button
          disabled={pending}
          className="rounded-lg bg-leaf text-white text-sm font-semibold px-4 py-2 hover:bg-leaf-deep disabled:opacity-50 sm:col-span-3"
        >
          {pending ? "Adding shop" : "Add shop"}
        </button>
      </form>
    </details>
  );
}

export function DeleteShopButton({
  shopId,
  shopName,
}: {
  shopId: string;
  shopName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function destroy() {
    setBusy(true);
    setError(null);
    try {
      await deleteShop(shopId);
      router.push("/vendor");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove shop.");
      setConfirming(false);
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="rounded-lg text-sm text-chili hover:underline px-2 py-1.5"
      >
        Remove shop
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-chili/30 bg-chili/5 px-3 py-1.5 text-sm">
      <span className="font-semibold">Remove “{shopName}” and its items?</span>
      <button
        onClick={destroy}
        disabled={busy}
        className="rounded-lg bg-chili text-white text-xs font-bold px-3 py-1.5 hover:brightness-95 disabled:opacity-50"
      >
        {busy ? "Removing…" : "Yes, remove"}
      </button>
      <button
        onClick={() => {
          setConfirming(false);
          setError(null);
        }}
        className="rounded-lg border border-line text-xs font-semibold px-3 py-1.5 hover:bg-ledger"
      >
        Keep
      </button>
      {error && (
        <span role="alert" className="text-xs text-chili w-full">
          {error}
        </span>
      )}
    </span>
  );
}
