"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getNext(formData: FormData) {
  const next = formData.get("next");
  return typeof next === "string" && next.startsWith("/") ? next : "/";
}

export async function signup(_prev: string | null, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = formData.get("role") === "vendor" ? "vendor" : "customer";
  if (name.length < 2) return "Name must be at least 2 characters long.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return "Please enter a valid email.";
  if (password.length < 6) return "Password must be at least 6 characters long.";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, role } },
  });
  if (error) return error.message;
  if (!data.session)
    return "Account created. Confirm the link in your email, then log in.";
  revalidatePath("/", "layout");
  redirect(getNext(formData));
}

export async function login(_prev: string | null, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return "Invalid email or password.";
  revalidatePath("/", "layout");
  redirect(getNext(formData));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
