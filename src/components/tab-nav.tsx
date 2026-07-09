"use client";

import { Camera, GalleryVerticalEnd, Shirt } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "撮る", icon: Camera },
  { href: "/snaps", label: "スナップ", icon: GalleryVerticalEnd },
  { href: "/closet", label: "クローゼット", icon: Shirt },
] as const;

/** 下部タブナビ。カメラ画面では映像に重なるため半透明+ブラーで浮かせる。 */
export function TabNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="メインナビゲーション"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md border-t border-border bg-background/80 backdrop-blur-md"
    >
      <ul className="flex pb-safe">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[0.625rem] tracking-wide transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.2 : 1.6} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
