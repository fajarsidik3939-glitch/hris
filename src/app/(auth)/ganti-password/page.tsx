import { requireUser } from "@/server/auth";
import { ChangePasswordForm } from "./change-password-form";

export const metadata = { title: "Ganti Password — HRIS" };

export default async function ChangePasswordPage() {
  const user = await requireUser({ allowPendingPasswordChange: true });
  return <ChangePasswordForm forced={user.mustChangePassword} />;
}
