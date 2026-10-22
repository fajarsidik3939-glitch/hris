import type { PermissionCode } from "./permissions";

export type NavItem = { href: string; label: string; icon: string; permission?: PermissionCode | PermissionCode[]; teamOnly?: boolean };

// Menu bertambah per milestone; item tampil jika pengguna punya salah satu permission-nya.
// teamOnly: disembunyikan bila scope hanya data sendiri (OWN), mis. Kehadiran untuk karyawan biasa.
export const NAV_ITEMS: NavItem[] = [
  { href: "/beranda", label: "Beranda", icon: "home" },
  { href: "/absen", label: "Absen", icon: "camera", permission: "attendance.clock" },
  { href: "/riwayat", label: "Riwayat", icon: "history", permission: "attendance.clock" },
  { href: "/pengajuan", label: "Pengajuan", icon: "file", permission: "attendance.correction.request" },
  { href: "/approval", label: "Approval", icon: "check", permission: ["approval.manager", "approval.hr"] },
  { href: "/kehadiran", label: "Kehadiran", icon: "clipboard", permission: "attendance.read", teamOnly: true },
  { href: "/jadwal", label: "Jadwal", icon: "calendar", permission: "schedule.read" },
  { href: "/karyawan", label: "Karyawan", icon: "id-card", permission: "employee.read" },
  { href: "/organisasi", label: "Organisasi", icon: "building", permission: "org.manage" },
  { href: "/admin/pengguna", label: "Pengguna", icon: "users", permission: "user.manage" },
];

export function visibleNav(permissions: Map<string, unknown>): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    const codes = Array.isArray(item.permission) ? item.permission : [item.permission];
    return codes.some((c) => permissions.has(c) && !(item.teamOnly && permissions.get(c) === "OWN"));
  });
}
