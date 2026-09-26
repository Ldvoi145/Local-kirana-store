import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import { SignupForm } from "@/components/auth-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const { user } = await getSession();
  if (user) redirect(next ?? "/");
  return <SignupForm next={next ?? "/"} />;
}
