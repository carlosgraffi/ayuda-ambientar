"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { brand } from "@/lib/brand";
import { CUENTAS_DEMO, PASSWORD_DEMO, esDemo } from "@/lib/demo";
import { useEffect } from "react";

/**
 * Entrada al panel.
 *
 * Por defecto, enlace de un solo uso al correo. Los equipos que usan esto
 * se arman en medio de una emergencia, con gente que entra y sale, y una
 * contraseña compartida por WhatsApp es la forma más probable de que
 * alguien ajeno termine editando la lista de alias.
 *
 * Pero el enlace depende de que el correo funcione, y en una instancia
 * recién desplegada eso todavía no está configurado: hace falta SMTP, y
 * Supabase arranca con `Site URL` en localhost, así que el enlace lleva a
 * una página que no existe. Sin una segunda puerta, quien despliega la
 * instancia no puede entrar a la instancia que acaba de desplegar.
 *
 * Por eso también se puede entrar con contraseña. No es la vía recomendada
 * para el equipo: es la que permite arrancar, creando el primer usuario
 * desde el panel de Supabase, sin depender de que llegue un correo.
 *
 * Quién puede entrar no lo decide esta pantalla: cualquiera puede pedir un
 * enlace, pero sin una membresía en la base no ve ninguna campaña. La
 * autorización vive en las políticas, no acá.
 */
export function Login({ db }: { db: SupabaseClient }) {
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    void esDemo().then(setDemo);
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [modo, setModo] = useState<"enlace" | "clave">("enlace");
  const [estado, setEstado] = useState<"inicial" | "enviando" | "enviado">(
    "inicial",
  );
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    setError(null);

    if (modo === "clave") {
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      // Con éxito no se hace nada: el cambio de sesión lo detecta el panel.
      setEstado("inicial");
      return;
    }

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

  /* Acceso de un click, sólo en el despliegue de demostración: cinco
     cuentas, una por rol, para recorrer el ciclo completo sin tocar la
     base a mano. */
  if (demo) {
    return (
      <div className="card flex flex-col gap-4">
        <div>
          <p className="eyebrow">{brand.name} · demostración</p>
          <h1 className="heading-2 mt-2">Entrá con un rol</h1>
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Datos ficticios. Cada cuenta muestra lo que su rol puede hacer — y
          lo que no puede, que es la mitad del punto.
        </p>
        <ul className="flex flex-col gap-2">
          {CUENTAS_DEMO.map((c) => (
            <li key={c.email}>
              <button
                type="button"
                className="card card-hover flex w-full items-center justify-between gap-3 text-left"
                style={{ padding: "12px 16px" }}
                onClick={() =>
                  db.auth.signInWithPassword({ email: c.email, password: PASSWORD_DEMO })
                }
              >
                <span>
                  <span className="block" style={{ color: "var(--text-strong)" }}>
                    {c.rol}
                  </span>
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                    {c.detalle}
                  </span>
                </span>
                <span className="badge badge-outline shrink-0">entrar →</span>
              </button>
            </li>
          ))}
        </ul>
        <a href="/tour/" className="text-sm">
          O leé primero el viaje completo de una entidad →
        </a>
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
        {modo === "enlace"
          ? "Entrá con tu correo. Te mandamos un enlace y no hay contraseña que recordar ni que compartir."
          : "Entrá con la contraseña que te crearon en Supabase. Sirve para arrancar cuando el correo todavía no está configurado."}
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
      {modo === "clave" && (
        <label className="flex flex-col gap-2">
          <span className="metric-label">Contraseña</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
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
      )}

      {error && (
        <p className="text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="btn btn-primary btn-md"
          disabled={estado === "enviando"}
        >
          {modo === "enlace" && <Mail size={17} strokeWidth={1.75} aria-hidden />}
          {estado === "enviando"
            ? "Un momento…"
            : modo === "enlace"
              ? "Enviarme el enlace"
              : "Entrar"}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setModo(modo === "enlace" ? "clave" : "enlace");
            setError(null);
          }}
        >
          {modo === "enlace" ? "Entrar con contraseña" : "Prefiero el enlace"}
        </button>
      </div>
    </form>
  );
}
