"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { addProductState } from "@/app/actions/shop";

export function AddProductForm({
  shopId,
  defaultOpen,
}: {
  shopId: string;
  defaultOpen?: boolean;
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
    <details className="rounded-xl border border-line" open={defaultOpen}>
      <summary className="cursor-pointer px-4 py-3 font-semibold text-sm hover:bg-ledger rounded-xl">
        + Add a new product
      </summary>
      <form
        ref={formRef}
        action={dispatch}
        className="grid sm:grid-cols-2 gap-2 p-4 border-t border-line"
      >
        <input name="name" required placeholder="Product name" aria-label="Product name" className="rounded-lg border border-line px-3 py-2 text-sm" />
        <input name="category" required placeholder="Category" aria-label="Category" className="rounded-lg border border-line px-3 py-2 text-sm" />
        <input name="price" type="number" step="0.5" min="1" required placeholder="Price ₹" aria-label="Price" className="rounded-lg border border-line px-3 py-2 text-sm" />
        <input name="unit" required placeholder="Unit, e.g. 1 kg" aria-label="Unit" className="rounded-lg border border-line px-3 py-2 text-sm" />
        <input name="stock_quantity" type="number" min="0" defaultValue={15} aria-label="Stock quantity" className="rounded-lg border border-line px-3 py-2 text-sm" />
        {message !== null && message !== "added" && (
          <p role="alert" className="text-sm text-chili sm:col-span-2">
            {message}
          </p>
        )}
        {message === "added" && (
          <p role="status" className="text-sm text-leaf font-semibold sm:col-span-2">
            Product added to the rate board.
          </p>
        )}
        <button
          disabled={pending}
          className="rounded-lg bg-leaf text-white text-sm font-semibold px-4 py-2 hover:bg-leaf-deep disabled:opacity-50 sm:col-span-2"
        >
          {pending ? "Adding…" : "Add product"}
        </button>
      </form>
    </details>
  );
}
