"use client";

import { useState } from "react";

/**
 * Per-shop QR for the counter: customers scan -> /shop/[id] ->
 * login (if needed) -> back to the shop. No extra dependencies;
 * the QR image comes from a public QR API, the link always works.
 */
export function ShopQR({ shopId, shopName }: { shopId: string; shopName: string }) {
  const [origin] = useState(() =>
    typeof window === "undefined" ? "" : window.location.origin,
  );
  const [copied, setCopied] = useState(false);

  const path = `/shop/${shopId}`;
  const absolute = origin ? `${origin}${path}` : path;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(absolute)}`;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-counter border border-line p-4">
      <div className="shrink-0 rounded-xl border border-line bg-white p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrSrc}
          alt={`QR code for ${shopName}`}
          width={132}
          height={132}
          className="h-33 w-33"
        />
      </div>
      <div className="min-w-52 flex-1">
        <h2 className="font-display font-bold text-lg">Counter QR · {shopName}</h2>
        <p className="text-sm text-ink-soft">
          Scan to open this shop. New customers log in or sign up, then land
          back here automatically.
        </p>
        <p className="mt-1 truncate text-sm font-mono text-ink-soft">{absolute}</p>
        <div className="mt-2 flex flex-wrap gap-2 print:hidden">
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(absolute);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                setCopied(false);
              }
            }}
            className="rounded-lg border border-line text-sm font-semibold px-3 py-1.5 hover:bg-ledger"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
          <a
            href={qrSrc}
            download={`qr-${shopId}.png`}
            className="rounded-lg bg-leaf text-white text-sm font-semibold px-3 py-1.5 hover:bg-leaf-deep"
          >
            Download QR
          </a>
          <button
            onClick={() => window.print()}
            className="rounded-lg border border-line text-sm font-semibold px-3 py-1.5 hover:bg-ledger"
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
}
