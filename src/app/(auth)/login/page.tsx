import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Masuk — HRIS" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/beranda");
  return <LoginForm />;
}
