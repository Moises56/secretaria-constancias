import { redirect } from "next/navigation";

import { LoginForm } from "@/components/forms/LoginForm";
import { auth } from "@/server/auth";

export const metadata = {
  title: "Iniciar sesión — Constancias AMDC",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/");
  }
  const { callbackUrl } = await searchParams;
  return <LoginForm callbackUrl={callbackUrl} />;
}
