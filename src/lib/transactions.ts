import type { Order, OrderEvent } from "@/lib/types";

export interface TxFilters {
  status: string;
  type: string;
  payment: string;
  from: string;
  to: string;
  q: string;
}

export const EMPTY_TX_FILTERS: TxFilters = {
  status: "",
  type: "",
  payment: "",
  from: "",
  to: "",
  q: "",
};

export interface TxRow {
  id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  shop_name: string;
  type: string;
  payment_method: string;
  status: string;
  item_count: number;
  total_amount: number;
}

export function toTxRow(o: {
  id: string;
  created_at: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  shop_name?: string | null;
  shops?: { name: string } | null;
  type: string;
  payment_method: string;
  status: string;
  total_amount: number | string;
  order_items?: { quantity: number }[] | null;
}): TxRow {
  return {
    id: o.id,
    created_at: o.created_at,
    customer_name: o.customer_name ?? "",
    customer_phone: o.customer_phone ?? "",
    shop_name: o.shop_name ?? o.shops?.name ?? "",
    type: o.type,
    payment_method: o.payment_method,
    status: o.status,
    item_count: (o.order_items ?? []).reduce((n, i) => n + i.quantity, 0),
    total_amount: Number(o.total_amount),
  };
}

export function filterTxRows<T extends TxRow>(rows: T[], f: TxFilters): T[] {
  const q = f.q.trim().toLowerCase();
  const fromMs = f.from ? new Date(f.from).getTime() : null;
  const toMs = f.to ? new Date(`${f.to}T23:59:59`).getTime() : null;
  return rows.filter((r) => {
    if (f.status && r.status !== f.status) return false;
    if (f.type && r.type !== f.type) return false;
    if (f.payment && r.payment_method !== f.payment) return false;
    const t = new Date(r.created_at).getTime();
    if (fromMs !== null && t < fromMs) return false;
    if (toMs !== null && t > toMs) return false;
    if (
      q &&
      !`${r.id} ${r.customer_name} ${r.customer_phone} ${r.shop_name}`.toLowerCase().includes(q)
    )
      return false;
    return true;
  });
}

export function paymentBreakdown(rows: TxRow[]) {
  const byPay = new Map<string, { orders: number; revenue: number }>();
  for (const r of rows) {
    if (r.status === "Cancelled") continue;
    const cur = byPay.get(r.payment_method) ?? { orders: 0, revenue: 0 };
    cur.orders += 1;
    cur.revenue += r.total_amount;
    byPay.set(r.payment_method, cur);
  }
  return [...byPay.entries()]
    .map(([payment, v]) => ({ payment, ...v }))
    .sort((a, b) => b.revenue - a.revenue);
}

function csvCell(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function vendorTxCsv(rows: TxRow[]) {
  const head = [
    "order_id",
    "date",
    "customer",
    "phone",
    "type",
    "payment",
    "status",
    "items",
    "total",
  ];
  const lines = rows.map((r) =>
    [
      r.id,
      r.created_at,
      r.customer_name,
      r.customer_phone,
      r.type,
      r.payment_method,
      r.status,
      r.item_count,
      r.total_amount.toFixed(2),
    ]
      .map(csvCell)
      .join(","),
  );
  return [head.join(","), ...lines].join("\n");
}

export function customerTxCsv(rows: TxRow[]) {
  const head = [
    "order_id",
    "date",
    "shop",
    "type",
    "payment",
    "status",
    "items",
    "total",
  ];
  const lines = rows.map((r) =>
    [
      r.id,
      r.created_at,
      r.shop_name,
      r.type,
      r.payment_method,
      r.status,
      r.item_count,
      r.total_amount.toFixed(2),
    ]
      .map(csvCell)
      .join(","),
  );
  return [head.join(","), ...lines].join("\n");
}

export function describeEvent(e: OrderEvent) {
  if (!e.from_status) return `Placed · ${e.to_status}`;
  if (e.from_status === e.to_status) return e.to_status;
  return `${e.from_status} → ${e.to_status}`;
}

/** Canonical timeline order for display. Unknown states sort last. */
export function sortEvents(events: OrderEvent[]) {
  return [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

export type { Order, OrderEvent };
