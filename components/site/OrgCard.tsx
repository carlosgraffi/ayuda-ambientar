"use client";

import Image from "next/image";
import { Copy, Check, Flame, Instagram, Newspaper, Mail, Share2 } from "lucide-react";
import { useState } from "react";
import type { Organization, OrgLink } from "@/lib/types";
import { ORG_TYPE_LABEL } from "@/lib/types";
import { getRail, primaryChannel } from "@/lib/rails";
import { num } from "@/lib/format";

/**
 * La tarjeta responde tres preguntas antes de pedir plata:
 * qué hacen, QUIÉN RECIBE LA TRANSFERENCIA, y cuánta gente ya transfirió.
 *
 * Jerarquía de acciones, y el orden importa:
 * · Transferir es la única acción con palabra y color (el de Mercado Pago,
 *   que es de ellos y no se toca).
 * · Copiar va pegado al alias, que es donde hace falta.
 * · Compartir e Instagram son sólo ícono.
 * · El titular es dato, no botón.
 *
 * El naranja aparece únicamente en el borde y la píldora de urgencia, donde
 * significa "fuego". Ningún botón de acción es naranja.
 */

const LINK_ICON = {
  instagram: Instagram,
  facebook: Instagram,
  web: Newspaper,
  prensa: Newspaper,
  whatsapp: Share2,
  email: Mail,
} as const;

function LinkButton({ link }: { link: OrgLink }) {
  const Icon = LINK_ICON[link.kind];
  const name = link.label ?? link.handle ?? link.url;
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="btn btn-secondary btn-icon btn-lg"
      title={name}
      aria-label={`${link.kind === "instagram" ? "Instagram" : link.kind === "email" ? "Correo" : "Enlace"}: ${name}`}
    >
      <Icon size={18} strokeWidth={1.75} aria-hidden />
    </a>
  );
}

export function OrgCard({
  org,
  transfers,
  onShare,
  onCopied,
}: {
  org: Organization;
  /**
   * Cuánta gente copió o transfirió desde el sitio. Llega en F3 con los
   * contadores migrados de Firestore. Sin ese dato el bloque no se
   * renderiza: mostrar un número inventado en una tarjeta de donación es
   * exactamente lo que este proyecto existe para evitar.
   */
  transfers?: number;
  onShare: (org: Organization) => void;
  onCopied: (message: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const channel = primaryChannel(org.channels);
  if (!channel) return null;

  const rail = getRail(channel.rail);
  const actions = rail.actions(channel.identifier);
  const deeplink = actions.find((a) => a.kind === "deeplink");

  async function copyAlias() {
    try {
      await navigator.clipboard.writeText(channel!.identifier);
      setCopied(true);
      onCopied("Alias copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onCopied("No se pudo copiar. Seleccionalo y copialo a mano.");
    }
  }

  return (
    <article
      className="card flex flex-col gap-4"
      style={
        org.urgent
          ? { borderColor: "var(--accent-soft)" }
          : undefined
      }
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow" style={{ color: "var(--text-faint)" }}>
            {ORG_TYPE_LABEL[org.type]}
          </p>
          <h3 className="heading-3 mt-1.5">{org.name}</h3>
        </div>
        {org.urgent && (
          <span className="badge badge-accent shrink-0">
            <Flame size={12} strokeWidth={2} aria-hidden />
            Urgente
          </span>
        )}
      </header>

      <p className="grow" style={{ color: "var(--text-muted)" }}>
        {org.description}
      </p>

      {/* Quién recibe la plata. Nunca se omite: si no está declarado, la
          tarjeta lo dice, que es más útil que dejar el hueco. */}
      <div
        className="flex items-end justify-between gap-4 rounded-[14px] px-4 py-3.5"
        style={{ background: "var(--surface-card-subtle)" }}
      >
        {transfers !== undefined && (
          <div className="metric metric-sm shrink-0">
            <p className="metric-label" style={{ fontSize: 10 }}>
              Ya transfirieron
            </p>
            <p className="metric-value">{num(transfers)}</p>
            <p className="metric-sub whitespace-nowrap">desde este sitio</p>
          </div>
        )}
        <div className={transfers === undefined ? "min-w-0" : "min-w-0 text-right"}>
          <p className="metric-label" style={{ fontSize: 10 }}>
            Titular de la cuenta
          </p>
          <p
            className="mt-1.5 text-sm font-medium"
            style={{
              color:
                org.holderStatus === "declarado"
                  ? "var(--text-strong)"
                  : "var(--text-faint)",
            }}
          >
            {org.holderStatus === "declarado"
              ? org.holderName
              : "Sin titular declarado"}
          </p>
        </div>
      </div>

      {/* El alias es lo que la gente efectivamente copia: mono, con cuerpo,
          y el botón de copiar al lado y no en otra fila. */}
      <div
        className="flex items-center justify-between gap-3 rounded-[14px] px-4 py-3"
        style={{ border: "1px solid var(--border-hairline)" }}
      >
        <div className="min-w-0">
          <p className="metric-label" style={{ fontSize: 10 }}>
            {rail.identifierLabel}
          </p>
          {/* Sin `truncate`: el alias es exactamente lo que la persona va a
              copiar o tipear, y cortarlo con puntos suspensivos lo vuelve
              inservible en pantallas angostas. Envuelve. */}
          <p className="alias mt-1">{channel.identifier}</p>
        </div>
        <button
          type="button"
          onClick={copyAlias}
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

      <div className="flex items-center gap-2.5">
        {deeplink && (
          <a
            href={deeplink.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`btn ${deeplink.brandClass} btn-lg grow`}
          >
            <span className="text-base">{deeplink.label}</span>
            {deeplink.brandLogo && (
              <Image
                src={deeplink.brandLogo.src}
                alt={deeplink.brandLogo.alt}
                width={deeplink.brandLogo.width}
                height={deeplink.brandLogo.height}
                className="h-7 w-auto"
              />
            )}
          </a>
        )}
        <button
          type="button"
          onClick={() => onShare(org)}
          className="btn btn-secondary btn-icon btn-lg shrink-0"
          aria-label={`Compartir ${org.name}`}
        >
          <Share2 size={18} strokeWidth={1.75} aria-hidden />
        </button>
        {org.links.slice(0, 2).map((link) => (
          <LinkButton key={link.url} link={link} />
        ))}
      </div>
    </article>
  );
}
