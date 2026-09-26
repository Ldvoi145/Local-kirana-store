import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import { LoginForm } from "@/components/auth-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const { user } = await getSession();
  if (user) redirect(next ?? "/");
  return <LoginForm next={next ?? "/"} />;
}
