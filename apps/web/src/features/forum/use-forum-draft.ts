"use client";

import { useEffect, useRef, useState } from "react";

export type ForumDraft = Record<string, string>;

export function parseForumDraft(value: string | null): ForumDraft | null {
  if (!value) return null;
  try {
    const draft = JSON.parse(value);
    if (!draft || typeof draft !== "object" || Array.isArray(draft)) return null;
    return Object.fromEntries(Object.entries(draft).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  } catch {
    return null;
  }
}

export function clearForumDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage can be unavailable; drafts remain an optional convenience.
  }
}

export function useForumDraft<T extends ForumDraft>({
  key,
  value,
  enabled,
  isMeaningful,
  onRestore,
}: {
  key: string;
  value: T;
  enabled: boolean;
  isMeaningful: (draft: T) => boolean;
  onRestore: (draft: T) => void;
}) {
  const [status, setStatus] = useState("No draft");
  const readyKey = useRef<string | null>(null);
  const savedValue = useRef<string | null>(null);
  const skipRestoredSave = useRef(false);
  const restoreRef = useRef(onRestore);
  const meaningfulRef = useRef(isMeaningful);

  useEffect(() => { restoreRef.current = onRestore; }, [onRestore]);
  useEffect(() => { meaningfulRef.current = isMeaningful; }, [isMeaningful]);

  useEffect(() => {
    readyKey.current = null;
    savedValue.current = null;
    skipRestoredSave.current = false;
    if (!enabled) {
      setStatus("No draft");
      return;
    }

    try {
      const serialized = localStorage.getItem(key);
      const draft = parseForumDraft(serialized) as T | null;
      if (draft && meaningfulRef.current(draft)) {
        restoreRef.current(draft);
        savedValue.current = serialized;
        skipRestoredSave.current = true;
        setStatus("Draft restored");
      } else {
        setStatus("No draft");
      }
    } catch {
      setStatus("Draft unavailable");
    }
    readyKey.current = key;
  }, [enabled, key]);

  useEffect(() => {
    if (!enabled || readyKey.current !== key) return;
    if (skipRestoredSave.current) {
      skipRestoredSave.current = false;
      return;
    }
    if (!meaningfulRef.current(value)) {
      if (savedValue.current) clearForumDraft(key);
      savedValue.current = null;
      setStatus("No draft");
      return;
    }

    const serialized = JSON.stringify(value);
    if (serialized === savedValue.current) return;
    try {
      localStorage.setItem(key, serialized);
      savedValue.current = serialized;
      setStatus("Saved locally");
    } catch {
      setStatus("Draft unavailable");
    }
  }, [enabled, key, value]);

  const clear = () => {
    clearForumDraft(key);
    savedValue.current = null;
    setStatus("No draft");
    onRestore(Object.fromEntries(Object.keys(value).map((field) => [field, ""])) as T);
  };

  return { clear, hasDraft: isMeaningful(value), status };
}
