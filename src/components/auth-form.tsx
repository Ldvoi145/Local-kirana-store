"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup } from "@/app/actions/auth";

function AuthForm({
  mode,
  next,
}: {
  mode: "login" | "signup";
  next: string;
}) {
  const action = mode === "login" ? login : signup;
  const [error, dispatch, pending] = useActionState(action, null);

  return (
    <div className="max-w-md mx-auto rounded-2xl bg-counter border border-line p-6">
      <h1 className="font-display font-bold text-2xl">
        {mode === "login" ? "Welcome back" : "Join your neighbourhood store"}
      </h1>
      <p className="text-sm text-ink-soft mt-1">
        {mode === "login"
          ? "Log in to order, track orders, and save presets."
          : "One account works at every kirana on the street."}
      </p>
      <form action={dispatch} className="mt-4 space-y-3">
        <input type="hidden" name="next" value={next} />
        {mode === "signup" && (
          <label className="block">
            <span className="text-sm font-semibold">Name</span>
            <input
              name="name"
              required
              minLength={2}
              placeholder="Meera Nair"
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
            />
          </label>
        )}
        <label className="block">
          <span className="text-sm font-semibold">Email</span>
          <input
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="At least 6 characters"
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
          />
        </label>
        {mode === "signup" && (
          <label className="block">
            <span className="text-sm font-semibold">I am a</span>
            <select
              name="role"
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm bg-counter"
            >
              <option value="customer">Customer — I buy groceries</option>
              <option value="vendor">Shopkeeper — I run a store</option>
            </select>
          </label>
        )}
        {error && (
          <p role="alert" className="text-sm text-chili">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-leaf text-white font-semibold py-2.5 hover:bg-leaf-deep disabled:opacity-50"
        >
          {pending
            ? "Please wait"
            : mode === "login"
              ? "Log in"
              : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-sm text-ink-soft">
        {mode === "login" ? (
          <>
            New here? <Link href="/signup" className="text-leaf font-semibold">Create an account</Link>
          </>
        ) : (
          <>
            Already have an account? <Link href="/login" className="text-leaf font-semibold">Log in</Link>
          </>
        )}
      </p>
    </div>
  );
}

export function LoginForm({ next }: { next: string }) {
  return <AuthForm mode="login" next={next} />;
}

export function SignupForm({ next }: { next: string }) {
  return <AuthForm mode="signup" next={next} />;
}
