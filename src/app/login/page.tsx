import { LoginView } from "@/app/login/login-view";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: Props) {
  const sp = searchParams ? await searchParams : {};
  const raw = sp.from;
  const from = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  return <LoginView redirectTo={from && from.startsWith("/") ? from : "/"} />;
}
