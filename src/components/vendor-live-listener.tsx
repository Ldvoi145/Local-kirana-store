"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface LiveAlert {
  kind: "order" | "request";
  id: string;
  label: string;
  at: number;
}

/**
 * Listens on Supabase Realtime for new orders + customer requests for
 * the selected shop. Shows a banner instead of force-refreshing, so a
 * vendor mid-edit never loses form input.
 */
export function VendorLiveListener({ shopId }: { shopId: string }) {
  const router = useRouter();
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`vendor-live-${shopId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `shop_id=eq.${shopId}`,
        },
        (payload) => {
          const id = (payload.new as { id: string }).id;
          setAlerts((prev) =>
            prev.some((a) => a.id === id)
              ? prev
              : [
                  {
                    kind: "order",
                    id,
                    label: `#${id.slice(0, 8).toUpperCase()}`,
                    at: Date.now(),
                  },
                  ...prev,
                ].slice(0, 5),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "suggestions",
          filter: `shop_id=eq.${shopId}`,
        },
        (payload) => {
          const row = payload.new as { id: string; item_name: string };
          setAlerts((prev) =>
            prev.some((a) => a.id === row.id)
              ? prev
              : [
                  {
                    kind: "request",
                    id: row.id,
                    label: row.item_name,
                    at: Date.now(),
                  },
                  ...prev,
                ].slice(0, 5),
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId]);

  // Shop switched: old shop's alerts don't carry over.
  useEffect(() => {
    setAlerts([]);
  }, [shopId]);

  if (alerts.length === 0) return null;

  const orders = alerts.filter((a) => a.kind === "order");
  const requests = alerts.filter((a) => a.kind === "request");

  function loadFresh() {
    setAlerts([]);
    router.refresh();
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-2xl bg-leaf-deep text-white p-4 flex flex-wrap items-center gap-3 shadow-pop"
    >
      <span aria-hidden className="relative flex h-3 w-3 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-marigold opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-marigold" />
      </span>
      <p className="flex-1 min-w-52 text-sm">
        {orders.length > 0 && (
          <>
            New order{orders.length === 1 ? "" : "s"}:{" "}
            <strong>{orders.map((o) => o.label).join(", ")}</strong>
            {requests.length > 0 && " · "}
          </>
        )}
        {requests.length > 0 && (
          <>
            New request{requests.length === 1 ? "" : "s"}:{" "}
            <strong>{requests.map((r) => r.label).join(", ")}</strong>
          </>
        )}
      </p>
      <button
        onClick={loadFresh}
        className="rounded-lg bg-marigold text-ink text-sm font-bold px-4 py-2 hover:brightness-95"
      >
        Load new {orders.length + requests.length > 1 ? "items" : "item"}
      </button>
      <button
        onClick={() => setAlerts([])}
        className="rounded-lg border border-white/35 text-sm px-3 py-2 hover:bg-white/10"
      >
        Dismiss
      </button>
    </div>
  );
}
