export function StockStamp({
  stock,
  available,
}: {
  stock: number;
  available: boolean;
}) {
  if (!available || stock <= 0)
    return (
      <span className="inline-block rounded-full bg-chili/10 text-chili border border-chili/30 text-xs font-semibold px-2.5 py-0.5">
        Out of stock
      </span>
    );
  if (stock <= 5)
    return (
      <span className="inline-block rounded-full bg-marigold-soft text-ink border border-marigold text-xs font-semibold px-2.5 py-0.5">
        Only {stock} left
      </span>
    );
  return (
    <span className="inline-block rounded-full bg-leaf/10 text-leaf border border-leaf/30 text-xs font-semibold px-2.5 py-0.5">
      In stock
    </span>
  );
}
