"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { brand } from "@/lib/brand";

/**
 * Entrada al panel por enlace de un solo uso.
 *
 * Sin contraseñas a propósito: los equipos que van a usar esto se arman en
 * medio de una emergencia, con gente que entra y sale, y una contraseña
 * compartida por WhatsApp es la forma más probable de que alguien ajeno
 * termine editando la lista de alias.
 *
 * Quién puede entrar no lo decide esta pantalla: cualquiera puede pedir un
 * enlace, pero sin una membresía en la base no ve ninguna campaña. La
 * autorización vive en las políticas, no acá.
 */
export function Login({ db }: { db: SupabaseClient }) {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"inicial" | "enviando" | "enviado">(
    "inicial",
  );
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    setError(null);
    const { error } = await db.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/admin/` },
    });
    if (error) {
      setError(error.message);
      setEstado("inicial");
    } else {
      setEstado("enviado");
    }
  }

  if (estado === "enviado") {
    return (
      <div className="card flex flex-col gap-3">
        <p className="eyebrow">Revisá tu correo</p>
        <h1 className="heading-2">Te mandamos un enlace a {email}</h1>
        <p style={{ color: "var(--text-muted)" }}>
          Abrilo desde este mismo dispositivo. Vence en una hora.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="card flex flex-col gap-4">
      <div>
        <p className="eyebrow">{brand.name}</p>
        <h1 className="heading-2 mt-2">Panel</h1>
      </div>
      <p style={{ color: "var(--text-muted)" }}>
        Entrá con tu correo. Te mandamos un enlace y no hay contraseña que
        recordar ni que compartir.
      </p>
      <label className="flex flex-col gap-2">
        <span className="metric-label">Correo</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="w-full px-4 py-3"
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--border-hairline)",
            borderRadius: "var(--r-field)",
            color: "var(--text-strong)",
            minHeight: "var(--touch-min)",
          }}
        />
      </label>
      {error && (
        <p className="text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <button
        type="submit"
        className="btn btn-primary btn-md self-start"
        disabled={estado === "enviando"}
      >
        <Mail size={17} strokeWidth={1.75} aria-hidden />
        {estado === "enviando" ? "Enviando…" : "Enviarme el enlace"}
      </button>
    </form>
  );
}
