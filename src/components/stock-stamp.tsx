export function StockStamp({
  stock,
  available,
}: {
  stock: number;
  available: boolean;
}) {
  if (!available || stock <= 0)
    return (
      <span className="inline-block rounded-full bg-chili/10 text-chili border border-chili/30 text-xs font-semibold px-2.5 py-0.5 whitespace-nowrap">
        Out of stock
      </span>
    );
  if (stock <= 5)
    return (
      <span className="inline-block rounded-full bg-marigold-soft text-ink border border-marigold-deep/50 text-xs font-semibold px-2.5 py-0.5 whitespace-nowrap tnum">
        Only {stock} left
      </span>
    );
  return (
    <span className="inline-block rounded-full bg-fresh/10 text-leaf-deep border border-fresh/40 text-xs font-semibold px-2.5 py-0.5 whitespace-nowrap">
      In stock
    </span>
  );
}
