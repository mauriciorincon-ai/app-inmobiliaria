import Link from "next/link";
import Campo from "@/components/ui/Campo";
import { formatearCOP, parsearCOP } from "@/engine/format/cop";
import { normalizarWhatsapp } from "@/engine/format/whatsapp";
import type { EstadoFormulario } from "@/engine/registro/wizard";
import type { Idioma } from "@/i18n/idiomas";
import type { Proyectado } from "@/i18n/textos";
import type { PUBLICAR } from "@/textos/publicar";
import type { Dominio } from "@/components/publicar/Paso2Inmueble";

export type TextosPaso3 = Proyectado<typeof PUBLICAR.paso3>;

type Props = {
  t: TextosPaso3;
  dominio: Dominio;
  lang: Idioma;
  datos: EstadoFormulario;
  set: (campo: keyof EstadoFormulario, valor: string) => void;
  consentimiento: boolean;
  onConsentimiento: (valor: boolean) => void;
  errorConsentimiento?: string;
  errorEmail?: string;
};

// Ejemplo de formato, no es texto de la interfaz: no se traduce.
const EJEMPLO_CORREO = "tucorreo@ejemplo.com";

// Etiqueta del dominio para un valor de la columna; si no la conoce, muestra el valor tal cual.
const etiquetaDe = (mapa: Record<string, string>, valor: string) =>
  mapa[valor] ?? valor;

// Paso 3 — Revisión + consentimiento Ley 1581. Sin marcar la casilla no se puede enviar.
export default function Paso3Revision({
  t,
  dominio,
  lang,
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
    [t.filas.nombre, datos.nombre],
    [t.filas.whatsapp, whatsapp],
    [t.filas.ciudad, datos.ciudad],
    [t.filas.operacion, etiquetaDe(dominio.operacion, datos.operacion)],
    [t.filas.tipo, etiquetaDe(dominio.tipo, datos.tipo)],
    [t.filas.localidad, datos.localidad],
    [t.filas.barrio, datos.barrio],
    [t.filas.area, datos.area_m2 ? `${datos.area_m2} m²` : ""],
    [t.filas.habitaciones, datos.habitaciones],
    [
      t.filas.precio,
      precio !== null ? formatearCOP(precio, lang) : datos.precio_esperado,
    ],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-ink">
          {t.titulo}
        </h2>
        <p className="mt-1 text-sm text-gray">{t.subtitulo}</p>
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
        label={t.correo.etiqueta}
        value={datos.email}
        onChange={(v) => set("email", v)}
        error={errorEmail}
        hint={t.correo.ayuda}
        placeholder={EJEMPLO_CORREO}
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
            {t.consentimiento.antes}
            <Link
              href="/privacidad"
              className="font-semibold text-purple-600 underline"
            >
              {t.consentimiento.enlace}
            </Link>
            {t.consentimiento.despues}
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
