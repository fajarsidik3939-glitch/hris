"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Home, IdCard, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: string };

const ICONS: Record<string, LucideIcon> = { home: Home, users: Users, "id-card": IdCard, building: Building2 };

function useActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(href + "/");
}

export function SideNav({ items }: { items: Item[] }) {
  const isActive = useActive();
  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ href, label, icon }) => {
        const Icon = ICONS[icon] ?? Home;
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-800",
              isActive(href) && "bg-primary font-semibold text-white hover:bg-primary",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav({ items }: { items: Item[] }) {
  const isActive = useActive();
  return (
    <nav className="fixed inset-x-0 bottom-0 flex border-t bg-white md:hidden">
      {items.slice(0, 4).map(({ href, label, icon }) => {
        const Icon = ICONS[icon] ?? Home;
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground",
              isActive(href) && "font-bold text-primary",
            )}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
