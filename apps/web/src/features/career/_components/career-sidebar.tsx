import Link from "next/link";
import type { Tab } from "../_navigation";
import { TABS } from "../_navigation";

const ICONS: Record<Tab, string> = {
  overview: "M3 11.5 12 4l9 7.5M5 10v10h14V10M9 20v-6h6v6",
  fixtures: "M5 3v3m14-3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Zm3 7h3m2 0h3m-8 4h3m2 0h3",
  squad: "M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1m7-9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 1a4 4 0 0 1 4 4v1m-2-9a4 4 0 0 0-3-3.87",
  tactics: "m12 3 9 9-9 9-9-9 9-9Zm0 5v8m-4-4h8",
  transfers: "M4 7h14m-3-3 3 3-3 3m5 7H6m3 3-3-3 3-3",
  table: "M4 5h16M4 10h16M4 15h16M4 20h16",
  manager: "M12 15a6 6 0 0 0-6 6h12a6 6 0 0 0-6-6Zm0-3a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z",
  history: "M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5m4-1v5l3 2",
};

export function CareerSidebar({ tab, open, clubMark, clubName, dirty, onClose, onSelect }: {
  tab: Tab; open: boolean; clubMark: string; clubName: string; dirty: boolean;
  onClose: () => void; onSelect: (tab: Tab) => void;
}) {
  return <>
    {open && <button className="career-nav-scrim" aria-label="Close navigation" onClick={onClose} />}
    <aside className={`career-sidebar ${open ? "is-open" : ""}`} aria-label="Career navigation">
      <div className="career-sidebar-brand"><span className="career-club-mark" aria-hidden="true">{clubMark}</span><div className="career-sidebar-copy"><strong>{clubName}</strong><span>Manager career</span></div></div>
      <nav className="career-nav">{TABS.map((item) => <button key={item.id} title={item.label} aria-label={item.label} aria-current={tab === item.id ? "page" : undefined} onClick={() => onSelect(item.id)}><span className="career-nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS[item.id]} /></svg></span><span className="career-sidebar-copy">{item.label}</span></button>)}</nav>
      <div className="career-sidebar-footer"><Link href="/" title="Back to site" aria-label="Back to site" onClick={(event) => { if (dirty && !window.confirm("Discard unsaved tactics changes?")) event.preventDefault(); }}><span aria-hidden="true">←</span><span className="career-sidebar-copy">Back to site</span></Link></div>
    </aside>
  </>;
}
