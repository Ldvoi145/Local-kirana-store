"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/lib/cart";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/types";

export function SiteHeader({
  user,
  role,
}: {
  user: User | null;
  role: UserRole | null;
}) {
  const { count } = useCart();
  const [query, setQuery] = useState("");
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="bg-leaf-deep text-white sticky top-0 z-10 shadow-md">
      <div className="max-w-6xl mx-auto px-4 pt-3 pb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="Kirana eStore home">
          <span
            aria-hidden
            className="grid place-items-center w-9 h-9 rounded-lg bg-marigold text-leaf-deep font-display font-extrabold text-xl"
          >
            क
          </span>
          <span className="leading-tight">
            <span className="block font-display font-bold text-lg tracking-tight">
              Kirana eStore
            </span>
            <span className="hidden sm:block text-white/65 text-xs">
              Your local shops. One digital store.
            </span>
          </span>
        </Link>

        <form
          role="search"
          className="flex w-full sm:w-auto sm:flex-1 sm:max-w-xl sm:mx-auto order-last sm:order-none"
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) router.push(`/?q=${encodeURIComponent(query.trim())}`);
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shops, atta, milk, dal…"
            aria-label="Search shops and products"
            className="flex-1 min-w-0 rounded-l-lg border-2 border-r-0 border-marigold px-3 py-1.5 text-ink text-sm"
          />
          <button
            type="submit"
            aria-label="Search"
            className="rounded-r-lg bg-marigold text-ink font-bold px-4 text-sm hover:brightness-95 active:brightness-90 flex items-center gap-1.5 border-2 border-marigold"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" />
            </svg>
            <span className="hidden md:inline">Search</span>
          </button>
        </form>

        <nav className="flex items-center gap-2 text-sm ml-auto" aria-label="Account">
          <Link
            href="/cart"
            className="rounded-lg border border-white/35 px-3 py-1.5 hover:bg-white/10 focus-visible:outline-white"
          >
            Cart
            <span
              aria-label={`${count} items in cart`}
              className="ml-1.5 inline-grid place-items-center min-w-5 h-5 px-1 rounded-full bg-marigold text-ink text-xs font-bold tnum"
            >
              {count}
            </span>
          </Link>
          {role === "vendor" && (
            <Link
              href="/vendor"
              className="rounded-lg bg-white/10 border border-white/25 px-3 py-1.5 font-semibold hover:bg-white/15"
            >
              Vendor
            </Link>
          )}
          {role === "customer" && (
            <Link
              href="/presets"
              className="rounded-lg border border-white/35 px-3 py-1.5 hover:bg-white/10"
            >
              Presets
            </Link>
          )}
          {user ? (
            <button
              onClick={signOut}
              className="rounded-lg border border-white/35 px-3 py-1.5 hover:bg-white/10"
            >
              Log out
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-white text-leaf-deep font-bold px-3 py-1.5 hover:bg-ledger"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
