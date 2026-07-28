export type Theme = "light" | "dark";

export function themeFromValue(value: string | null): Theme {
  return value === "dark" ? "dark" : "light";
}
