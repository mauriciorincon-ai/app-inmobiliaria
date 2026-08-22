import Link from "next/link";
import Campo from "@/components/ui/Campo";
import { formatearCOP, parsearCOP } from "@/engine/format/cop";
import { normalizarWhatsapp } from "@/engine/format/whatsapp";
import type { EstadoFormulario } from "@/engine/registro/wizard";

type Props = {
  datos: EstadoFormulario;
  set: (campo: keyof EstadoFormulario, valor: string) => void;
  consentimiento: boolean;
  onConsentimiento: (valor: boolean) => void;
  errorConsentimiento?: string;
  errorEmail?: string;
};

const etiquetaOperacion: Record<string, string> = {
  venta: "Venta",
  arriendo: "Arriendo",
};
const etiquetaTipo: Record<string, string> = {
  apartamento: "Apartamento",
  casa: "Casa",
  apartaestudio: "Apartaestudio",
  otro: "Otro",
};

// Paso 3 — Revisión + consentimiento Ley 1581. Sin marcar la casilla no se puede enviar.
export default function Paso3Revision({
  datos,
  set,
  consentimiento,
  onConsentimiento,
  errorConsentimiento,
  errorEmail,
}: Props) {
  const precio = parsearCOP(datos.precio_esperado);
  const whatsapp = normalizarWhatsapp(datos.whatsapp) ?? datos.whatsapp;

  const filas: Array<[string, string]> = [
    ["Nombre", datos.nombre],
    ["WhatsApp", whatsapp],
    ["Ciudad", datos.ciudad],
    ["Operación", etiquetaOperacion[datos.operacion] ?? datos.operacion],
    ["Tipo", etiquetaTipo[datos.tipo] ?? datos.tipo],
    ["Localidad", datos.localidad],
    ["Barrio", datos.barrio],
    ["Área", datos.area_m2 ? `${datos.area_m2} m²` : ""],
    ["Habitaciones", datos.habitaciones],
    [
      "Precio esperado",
      precio !== null ? formatearCOP(precio) : datos.precio_esperado,
    ],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-ink">
          Revisa y publica
        </h2>
        <p className="mt-1 text-sm text-gray">
          Confirma que todo esté bien antes de enviar.
        </p>
      </div>

      <dl className="divide-y divide-purple-200 rounded-[2rem] bg-cream px-6 py-2">
        {filas.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-3 text-sm">
            <dt className="text-mute">{k}</dt>
            <dd className="text-right font-semibold text-ink">{v || "—"}</dd>
          </div>
        ))}
      </dl>

      <Campo
        id="email"
        type="email"
        label="Tu correo (opcional)"
        value={datos.email}
        onChange={(v) => set("email", v)}
        error={errorEmail}
        hint="Para enviarte el paquete fundador y avisos de la campaña. Si lo dejas vacío, te escribimos por WhatsApp."
        placeholder="tucorreo@ejemplo.com"
      />

      <div>
        <label className="flex items-start gap-3 text-sm text-gray">
          <input
            type="checkbox"
            checked={consentimiento}
            onChange={(e) => onConsentimiento(e.target.checked)}
            aria-describedby={
              errorConsentimiento ? "consentimiento-error" : undefined
            }
            aria-invalid={errorConsentimiento ? true : undefined}
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-purple-200 accent-purple"
          />
          <span>
            Autorizo el tratamiento de mis datos según la{" "}
            <Link
              href="/privacidad"
              className="font-semibold text-purple-600 underline"
            >
              política de privacidad
            </Link>{" "}
            (Ley 1581 de 2012).
          </span>
        </label>
        {errorConsentimiento && (
          <p
            id="consentimiento-error"
            role="alert"
            className="mt-1.5 text-sm font-medium text-red-600"
          >
            {errorConsentimiento}
          </p>
        )}
      </div>
    </div>
  );
}
