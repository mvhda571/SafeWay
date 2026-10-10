"use client";
import { useEffect, useState } from "react";

/** Minimal Telegram WebApp shape — only what SafeWay uses. */
export interface TgWebApp {
  ready(): void;
  expand(): void;
  close(): void;
  colorScheme: "light" | "dark";
  initData: string;
  initDataUnsafe: { user?: { id: number; first_name: string; last_name?: string; username?: string } };
  themeParams: { bg_color?: string; text_color?: string; button_color?: string; button_text_color?: string };
  safeAreaInset?: { top: number; bottom: number };
  contentSafeAreaInset?: { top: number; bottom: number };
  onEvent(event: string, cb: () => void): void;
  MainButton: {
    text: string;
    isVisible: boolean;
    show(): void;
    hide(): void;
    enable(): void;
    disable(): void;
    setText(t: string): void;
    onClick(fn: () => void): void;
    offClick(fn: () => void): void;
    showProgress(leaveActive?: boolean): void;
    hideProgress(): void;
  };
  BackButton: { isVisible: boolean; show(): void; hide(): void; onClick(fn: () => void): void; offClick(fn: () => void): void };
  HapticFeedback: {
    impactOccurred(style: "light" | "medium" | "heavy" | "rigid" | "soft"): void;
    notificationOccurred(type: "error" | "success" | "warning"): void;
    selectionChanged(): void;
  };
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
}

declare global {
  interface Window { Telegram?: { WebApp?: TgWebApp } }
}

let _tg: TgWebApp | null = null;

export function useTelegram() {
  const [tg, setTg] = useState<TgWebApp | null>(null);

  useEffect(() => {
    if (_tg) { setTg(_tg); return; }
    const wa = window.Telegram?.WebApp;
    if (!wa?.initData) return;
    wa.ready();
    wa.expand();
    _tg = wa;
    setTg(wa);
  }, []);

  return { tg, isInTelegram: !!tg };
}
