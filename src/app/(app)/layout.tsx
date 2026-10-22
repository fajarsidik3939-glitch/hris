import Link from "next/link";
import { KeyRound, LogOut } from "lucide-react";
import { ROLES, type RoleCode } from "@/lib/permissions";
import { visibleNav } from "@/lib/nav";
import { requireUser } from "@/server/auth";
import { logout } from "../(auth)/actions";
import { BottomNav, SideNav } from "./nav-links";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Tampilan menu saja; setiap halaman tetap memeriksa izinnya sendiri.
  const user = await requireUser();
  const items = visibleNav(user.permissions).map(({ href, label, icon }) => ({ href, label, icon }));
  const roleNames = user.roles.map((r) => ROLES[r as RoleCode] ?? r).join(", ");

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-56 shrink-0 flex-col gap-1 bg-slate-900 p-3 text-slate-300 md:flex">
        <div className="px-2 pt-1 pb-4 text-lg font-extrabold text-white">HRIS</div>
        <SideNav items={items} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b bg-white px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{user.displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{roleNames}</p>
          </div>
          <Link
            href="/ganti-password"
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-md px-2 text-sm hover:bg-slate-100"
            aria-label="Ganti password"
          >
            <KeyRound className="size-4" />
            <span className="hidden sm:inline">Ganti password</span>
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-md px-2 text-sm hover:bg-slate-100"
              aria-label="Keluar"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </form>
        </header>

        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-6">{children}</main>
        <BottomNav items={items} />
      </div>
    </div>
  );
}
