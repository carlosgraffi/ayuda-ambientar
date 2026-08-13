"use client";

import { useEffect } from "react";

/**
 * Aviso breve. Es `role="status"` y no `alert`: copiar un alias no es una
 * emergencia y no debería interrumpir a quien usa lector de pantalla.
 */
export function Toast({
  message,
  onDismiss,
  ms = 2600,
}: {
  message: string | null;
  onDismiss: () => void;
  ms?: number;
}) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, ms);
    return () => clearTimeout(t);
  }, [message, ms, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-6 z-[200] flex justify-center"
    >
      {message && (
        <p
          className="glass fade rounded-full px-5 py-3 text-sm font-medium shadow-lg"
          style={{ color: "var(--text-strong)" }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
