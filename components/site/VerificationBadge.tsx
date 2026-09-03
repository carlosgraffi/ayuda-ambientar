import { ShieldCheck, Users } from "lucide-react";
import { VERIFICATION_LABEL, type VerificationLevel } from "@/lib/types";

/**
 * El badge de confianza. No es un gate binario sino información: nivel 2
 * (verde) es verificación completa con checklist de moderador; nivel 1
 * (ámbar) es el aval de la comunidad, y el perfil muestra quiénes avalan.
 *
 * El nivel 0 no tiene badge porque no tiene página: una entidad sin
 * verificar no se publica.
 *
 * Sobre el verde: el sistema lo reserva para "acción disponible" y éxito
 * (--success). Un estado de confianza confirmada es exactamente eso.
 */
export function VerificationBadge({ level }: { level: VerificationLevel }) {
  if (level === 0) return null;

  if (level === 2) {
    return (
      <span
        className="badge shrink-0"
        style={{ background: "var(--verde-50)", color: "var(--verde-700)" }}
        title="Titularidad de la cuenta y registro confirmados por una persona moderadora"
      >
        <ShieldCheck size={12} strokeWidth={2} aria-hidden />
        {VERIFICATION_LABEL[2]}
      </span>
    );
  }

  return (
    <span
      className="badge badge-warning shrink-0"
      title="Otras organizaciones verificadas dan fe de que existe y es quien dice ser"
    >
      <Users size={12} strokeWidth={2} aria-hidden />
      {VERIFICATION_LABEL[1]}
    </span>
  );
}
