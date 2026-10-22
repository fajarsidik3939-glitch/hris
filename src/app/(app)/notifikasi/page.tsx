import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";

export const metadata = { title: "Notifikasi — HRIS" };

async function markAllRead() {
  "use server";
  const user = await requireUser();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
}

export default async function NotifikasiPage() {
  const user = await requireUser();
  const items = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
  const unread = items.some((n) => !n.readAt);
  return (
    <div className="mx-auto max-w-md space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Notifikasi</h1>
        {unread && (
          <form action={markAllRead}>
            <Button type="submit" variant="outline" size="sm">
              Tandai semua dibaca
            </Button>
          </form>
        )}
      </div>
      {items.length === 0 && <p className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">Belum ada notifikasi.</p>}
      <ul className="space-y-2">
        {items.map((n) => (
          <li key={n.id}>
            <Link href={n.link ?? "/beranda"} className={cn("block rounded-lg border bg-white p-3 text-sm", !n.readAt && "border-primary/40 bg-blue-50")}>
              <div className="flex justify-between gap-2">
                <b>{n.title}</b>
                {!n.readAt && <span className="text-xs font-semibold text-primary">Baru</span>}
              </div>
              {n.body && <p className="text-muted-foreground">{n.body}</p>}
              <p className="text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
