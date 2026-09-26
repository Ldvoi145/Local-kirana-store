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
    <header className="bg-leaf text-white sticky top-0 z-10 shadow">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <span
            aria-hidden
            className="grid place-items-center w-9 h-9 rounded-lg bg-marigold text-ink font-display font-extrabold text-xl"
          >
            क
          </span>
          <span className="leading-tight">
            <span className="block font-display font-bold text-xl">
              Kirana eStore
            </span>
            <span className="block text-white/70 text-xs">
              Your local shops. One digital store.
            </span>
          </span>
        </Link>

        <form
          className="flex flex-1 min-w-52 max-w-xl mx-auto"
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) router.push(`/?q=${encodeURIComponent(query.trim())}`);
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search atta, milk, dal across local stores"
            aria-label="Search products"
            className="flex-1 rounded-l-lg px-3 py-1.5 text-ink bg-counter text-sm"
          />
          <button
            type="submit"
            className="rounded-r-lg bg-marigold text-ink font-semibold px-4 text-sm hover:brightness-95"
          >
            Search
          </button>
        </form>

        <nav className="flex items-center gap-2 text-sm ml-auto">
          <Link
            href="/cart"
            className="rounded-lg border border-white/40 px-3 py-1.5 hover:bg-white/10"
          >
            Cart · {count}
          </Link>
          {role === "vendor" && (
            <Link
              href="/vendor"
              className="rounded-lg bg-marigold text-ink font-semibold px-3 py-1.5 hover:brightness-95"
            >
              Vendor
            </Link>
          )}
          {role === "customer" && (
            <Link
              href="/presets"
              className="rounded-lg border border-white/40 px-3 py-1.5 hover:bg-white/10"
            >
              Presets
            </Link>
          )}
          {user ? (
            <button
              onClick={signOut}
              className="rounded-lg border border-white/40 px-3 py-1.5 hover:bg-white/10"
            >
              Log out
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-counter text-ink font-semibold px-3 py-1.5 hover:bg-white/90"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
