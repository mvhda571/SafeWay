"use client";

import { useEffect, useState } from "react";

/** Applies and remembers the colour theme (the inline script in app/layout.tsx restores it before paint). */
export function setTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  try { localStorage.setItem("sw_theme", dark ? "dark" : "light"); } catch {}
}

export function toggleTheme() {
  setTheme(!document.documentElement.classList.contains("dark"));
}

/** Tracks the `dark` class on <html>, whichever control changed it. */
export function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const update = () => setDark(el.classList.contains("dark"));
    update();
    const mo = new MutationObserver(update);
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  return dark;
}
