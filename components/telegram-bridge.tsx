"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname, useRouter } from "next/navigation";

import type { TgWebApp } from "@/lib/use-telegram";

/**
 * Telegram Mini App integration. Outside Telegram it does nothing (initData is empty).
 * Inside: expands the webview, exposes Telegram's safe-area insets as --tg-safe-top / --tg-safe-bottom
 * (used by the header and the bottom nav) and wires Telegram's native "Back" button to router.back().
 * Rendered under <Suspense> because usePathname suspends on dynamic routes with cacheComponents.
 */
export function TelegramBridge() {
  const [app, setApp] = useState<TgWebApp | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  function init() {
    const wa = window.Telegram?.WebApp;
    if (!wa?.initData) return;
    wa.ready();
    wa.expand();
    const apply = () => {
      const root = document.documentElement.style;
      root.setProperty("--tg-safe-top", `${(wa.safeAreaInset?.top ?? 0) + (wa.contentSafeAreaInset?.top ?? 0)}px`);
      root.setProperty("--tg-safe-bottom", `${(wa.safeAreaInset?.bottom ?? 0) + (wa.contentSafeAreaInset?.bottom ?? 0)}px`);
    };
    apply();
    wa.onEvent("safeAreaChanged", apply);
    wa.onEvent("contentSafeAreaChanged", apply);
    document.documentElement.dataset.tg = "1";
    setApp(wa);
  }

  useEffect(() => {
    if (!app) return;
    const back = () => router.back();
    if (pathname === "/") app.BackButton.hide();
    else app.BackButton.show();
    app.BackButton.onClick(back);
    return () => app.BackButton.offClick(back);
  }, [app, pathname, router]);

  return <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" onReady={init} />;
}
