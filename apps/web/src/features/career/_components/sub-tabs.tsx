"use client";

export function SubTabs<T extends string>({ items, value, onChange, label }: {
  items: readonly { id: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return <nav className="career-subtabs" aria-label={label}>
    {items.map((item) => <button key={item.id} type="button" aria-current={value === item.id ? "page" : undefined}
      onClick={() => onChange(item.id)}>{item.label}{item.count != null && <span>{item.count}</span>}</button>)}
  </nav>;
}
