"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type State = "idle" | "subscribed" | "busy" | "denied" | "unsupported";

export function PushBell({ className }: { className?: string }) {
  const [state, setState] = useState<State>("idle");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") { setState("denied"); return; }
    navigator.serviceWorker.register("/sw.js").then((reg) =>
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) setState("subscribed");
      }),
    ).catch(() => setState("unsupported"));
  }, []);

  async function toggle() {
    if (!VAPID_KEY) return;
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();

      if (existing) {
        await existing.unsubscribe();
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        setState("idle");
        return;
      }

      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState("denied"); return; }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
      });
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      setState("subscribed");
    } catch {
      setState("idle");
    }
  }

  if (state === "unsupported" || !VAPID_KEY) return null;

  return (
    <button
      onClick={toggle}
      disabled={state === "busy" || state === "denied"}
      aria-label={state === "subscribed" ? "Bildirishnomani o'chirish" : "Bildirishnomani yoqish"}
      title={
        state === "denied"
          ? "Brauzer bloklagan — sozlamalardan ruxsat bering"
          : state === "subscribed"
          ? "Bildirishnomalar yoqilgan"
          : "Yangi xavflar haqida bildirishnoma olish"
      }
      className={cn(
        "grid size-9 place-items-center rounded-xl transition",
        state === "subscribed"
          ? "text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
          : "text-zinc-500 hover:bg-zinc-900/5 dark:hover:bg-white/10",
        state === "denied" && "opacity-40 cursor-not-allowed",
        className,
      )}
    >
      {state === "busy" ? (
        <Loader2 className="size-[18px] animate-spin" />
      ) : state === "subscribed" ? (
        <Bell className="size-[18px]" />
      ) : (
        <BellOff className="size-[18px]" />
      )}
    </button>
  );
}
