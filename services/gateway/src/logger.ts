type Level = "info" | "warn" | "error";

function emit(level: Level, message: string, meta: unknown[]): void {
  const entry: Record<string, unknown> = { ts: new Date().toISOString(), level, msg: message };
  if (meta.length > 0) entry.meta = meta;
  const line = JSON.stringify(entry, (_key, value) =>
    value instanceof Error ? { name: value.name, message: value.message } : value,
  );
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/** Single-line JSON lifecycle logging so container log drivers can parse events. */
export const logInfo = (message: string, ...meta: unknown[]): void => emit("info", message, meta);
export const logWarn = (message: string, ...meta: unknown[]): void => emit("warn", message, meta);
export const logError = (message: string, ...meta: unknown[]): void => emit("error", message, meta);
