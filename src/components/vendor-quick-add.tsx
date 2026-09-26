"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { addProductState } from "@/app/actions/shop";

/**
 * Owner-only quick-add panel rendered on the shop storefront itself.
 * Same `addProduct` path as the vendor Inventory tab; failures
 * (role, ownership, RLS) surface here as plain text.
 */
export function VendorQuickAdd({
  shopId,
  shopName,
}: {
  shopId: string;
  shopName: string;
}) {
  const [message, dispatch, pending] = useActionState(
    addProductState.bind(null, shopId),
    null,
  );
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (message === "added") {
      formRef.current?.reset();
      router.refresh();
    }
  }, [message, router]);

  return (
    <section
      aria-label={`Add items to ${shopName}`}
      className="rounded-2xl border-2 border-dashed border-leaf/40 bg-leaf/5 p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-52">
          <h2 className="font-display font-bold text-lg">
            Add items to your shop
          </h2>
          <p className="text-sm text-ink-soft">
            Only you see this — customers see the rate board below.
          </p>
        </div>
        <Link
          href={`/vendor?shop=${shopId}&tab=inventory`}
          className="rounded-lg border border-leaf text-leaf text-sm font-semibold px-3 py-1.5 hover:bg-leaf/10"
        >
          Full inventory →
        </Link>
      </div>
      <form
        ref={formRef}
        action={dispatch}
        className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2"
      >
        <input name="name" required placeholder="Product name" aria-label="Product name" className="rounded-lg border border-line px-3 py-2 text-sm bg-counter" />
        <input name="category" required placeholder="Category" aria-label="Category" className="rounded-lg border border-line px-3 py-2 text-sm bg-counter" />
        <input name="price" type="number" step="0.5" min="1" required placeholder="Price ₹" aria-label="Price" className="rounded-lg border border-line px-3 py-2 text-sm bg-counter" />
        <input name="unit" required placeholder="Unit, e.g. 1 kg" aria-label="Unit" className="rounded-lg border border-line px-3 py-2 text-sm bg-counter" />
        <input name="stock_quantity" type="number" min="0" defaultValue={15} aria-label="Stock quantity" className="rounded-lg border border-line px-3 py-2 text-sm bg-counter" />
        <button
          disabled={pending}
          className="rounded-lg bg-leaf text-white text-sm font-bold px-4 py-2 hover:bg-leaf-deep disabled:opacity-50"
        >
          {pending ? "Adding…" : "+ Add item"}
        </button>
      </form>
      {message !== null && message !== "added" && (
        <p role="alert" className="mt-2 text-sm text-chili">
          {message}
        </p>
      )}
      {message === "added" && (
        <p role="status" className="mt-2 text-sm text-leaf font-semibold">
          Item added — it is live on the rate board below.
        </p>
      )}
    </section>
  );
}
