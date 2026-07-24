"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function DetailPanel({ eyebrow, title, subtitle, children, onClose }: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    opener.current = document.activeElement as HTMLElement | null;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close.current();
      if (event.key !== "Tab" || !matchMedia("(max-width: 1023px)").matches || !panel.current) return;
      const focusable = [...panel.current.querySelectorAll<HTMLElement>("button, a, input, select, textarea, [tabindex]:not([tabindex='-1'])")].filter((item) => !item.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    panel.current?.querySelector<HTMLElement>("button")?.focus();
    return () => {
      document.removeEventListener("keydown", keydown);
      opener.current?.focus();
    };
  }, []);

  return <>
    <button className="career-detail-backdrop" type="button" aria-label="Close details" onClick={onClose} />
    <aside ref={panel} className="career-detail-panel" aria-label={`${title} details`}>
      <header><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{subtitle && <span>{subtitle}</span>}</div>
        <button type="button" onClick={onClose} aria-label="Close details">×</button></header>
      <div className="career-detail-body">{children}</div>
    </aside>
  </>;
}
