import type { PermissionCode } from "./permissions";

export type NavItem = { href: string; label: string; icon: string; permission?: PermissionCode };

// Menu bertambah per milestone; item hanya tampil jika pengguna punya permission-nya.
export const NAV_ITEMS: NavItem[] = [
  { href: "/beranda", label: "Beranda", icon: "home" },
  { href: "/absen", label: "Absen", icon: "camera", permission: "attendance.clock" },
  { href: "/riwayat", label: "Riwayat", icon: "history", permission: "attendance.clock" },
  { href: "/karyawan", label: "Karyawan", icon: "id-card", permission: "employee.read" },
  { href: "/organisasi", label: "Organisasi", icon: "building", permission: "org.manage" },
  { href: "/admin/pengguna", label: "Pengguna", icon: "users", permission: "user.manage" },
];

export function visibleNav(permissions: Map<string, unknown>): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.permission || permissions.has(item.permission));
}
