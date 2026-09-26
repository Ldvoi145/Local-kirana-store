import type { Metadata } from "next";
import { Baloo_2 } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart";
import { SiteHeader } from "@/components/site-header";
import { getSession } from "@/lib/dal";

const display = Baloo_2({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Kirana eStore — Your Local Shops. One Digital Store.",
  description:
    "Discover neighbourhood kirana shops, check live stock, and reorder staples in seconds.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { user, profile } = await getSession();
  return (
    <html lang="en" className={`${display.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <CartProvider>
          <SiteHeader user={user} role={profile?.role ?? null} />
          <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6">
            {children}
          </main>
          <footer className="bg-gradient-to-r from-leaf-deep via-leaf to-jamun-deep text-white mt-10">
            <div className="max-w-6xl mx-auto px-4 py-6 text-center">
              <p className="font-display font-bold text-lg">Kirana eStore</p>
              <p className="text-white/70 text-sm">
                Your local shops. One digital store.
              </p>
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
