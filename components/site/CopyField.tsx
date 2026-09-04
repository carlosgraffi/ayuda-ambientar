"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * Un dato para copiar (alias, CVU) con su botón al lado, en el mismo
 * formato que usa OrgCard: mono, sin truncar, porque es exactamente lo
 * que la persona va a pegar en su banco.
 */
export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin clipboard (permisos, http): el valor queda a la vista para
      // seleccionarlo a mano, así que no hace falta más aviso.
    }
  }

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-[14px] px-4 py-3"
      style={{ border: "1px solid var(--border-hairline)" }}
    >
      <div className="min-w-0">
        <p className="metric-label" style={{ fontSize: 10 }}>
          {label}
        </p>
        <p className="alias mt-1">{value}</p>
      </div>
      <button
        type="button"
        onClick={copiar}
        className="btn btn-secondary btn-sm shrink-0"
      >
        {copied ? (
          <Check size={15} strokeWidth={1.75} aria-hidden />
        ) : (
          <Copy size={15} strokeWidth={1.75} aria-hidden />
        )}
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
