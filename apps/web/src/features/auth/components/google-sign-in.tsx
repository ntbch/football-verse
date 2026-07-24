"use client";

import { useEffect } from "react";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

type GoogleCredentialResponse = { credential?: string };

type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
      }) => void;
      renderButton: (
        element: HTMLElement,
        options: {
          theme: "outline";
          size: "large";
          width: number;
          text: "signin_with" | "signup_with";
          shape: "rectangular";
        },
      ) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

type GoogleSignInProps = {
  buttonId: string;
  label: string;
  buttonText: "signin_with" | "signup_with";
  disabled: boolean;
  onCredential: (credential: string) => void;
  onUnavailable: () => void;
};

export function GoogleSignIn({
  buttonId,
  label,
  buttonText,
  disabled,
  onCredential,
  onUnavailable,
}: GoogleSignInProps) {
  useEffect(() => {
    if (!googleClientId) return;

    const initializeGoogle = () => {
      const identity = window.google?.accounts.id;
      const button = document.getElementById(buttonId);
      if (!identity || !button) return;
      identity.initialize({
        client_id: googleClientId,
        callback: (response) => {
          if (response.credential) onCredential(response.credential);
        },
      });
      identity.renderButton(button, {
        theme: "outline",
        size: "large",
        width: 380,
        text: buttonText,
        shape: "rectangular",
      });
    };

    if (document.getElementById("google-gsi-script")) {
      initializeGoogle();
      return;
    }

    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = initializeGoogle;
    document.head.appendChild(script);
  }, [buttonId, buttonText, onCredential]);

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
          or
        </span>
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>
      <div className="relative mt-2 min-h-[44px] w-full">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!googleClientId) onUnavailable();
          }}
          className="flex min-h-[44px] w-full items-center justify-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-surface)] px-4 py-3 shadow-sm transition-all hover:bg-[var(--color-background-body)] active:scale-[0.98]"
        >
          <GoogleMark />
          <span className="text-xs font-bold text-[var(--color-text-primary)]">{label}</span>
        </button>
        {googleClientId && (
          <div
            id={buttonId}
            className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0 [&>div]:h-full [&>div]:w-full [&_iframe]:h-full [&_iframe]:w-full"
          />
        )}
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
