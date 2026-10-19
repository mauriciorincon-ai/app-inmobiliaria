import type { Metadata } from "next";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import { leerIdioma, type PropsLang } from "@/i18n/ruta";
import { enIdioma } from "@/i18n/textos";
import { PRIVACIDAD } from "@/textos/privacidad";

export async function generateMetadata({
  params,
}: PropsLang): Promise<Metadata> {
  const lang = await leerIdioma(params);
  return { title: enIdioma(PRIVACIDAD.meta, lang).titulo };
}

// Aviso de privacidad (Ley 1581 de 2012 y Decreto 1377 de 2013). Enlazado desde el consentimiento
// del registro. El correo del responsable entra por variable de build y jamás se versiona (regla de
// producto 9); `next.config.ts` hace fallar el build de producción si falta, para no publicar una
// política sin contacto real.
const CONTACTO = process.env.NEXT_PUBLIC_RESPONSABLE_CORREO ?? "";

function CorreoDelResponsable() {
  return (
    <a
      href={`mailto:${CONTACTO}`}
      className="font-semibold text-purple-600 underline"
    >
      {CONTACTO}
    </a>
  );
}

export default async function Privacidad({ params }: PropsLang) {
  const lang = await leerIdioma(params);
  const t = enIdioma(PRIVACIDAD, lang);
  return (
    <>
      <EncabezadoInterior lang={lang} />
      <main className="mx-auto max-w-2xl px-6 py-16 lg:py-20">
        <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          {t.titulo}
        </h1>
        <p className="mt-4 text-sm text-mute">{t.base}</p>

        <div className="mt-10 space-y-8 text-gray">
          <section>
            <h2 className="text-lg font-bold text-ink">
              {t.responsable.titulo}
            </h2>
            <p className="mt-2 text-sm leading-relaxed">
              {t.responsable.antes}
              <CorreoDelResponsable />.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink">{t.datos.titulo}</h2>
            <p className="mt-2 text-sm leading-relaxed">{t.datos.texto}</p>
            <p className="mt-3 text-sm leading-relaxed">
              {t.datos.correoOpcional}
            </p>
            <p className="mt-3 text-sm leading-relaxed">{t.datos.idioma}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink">{t.ficha.titulo}</h2>
            <p className="mt-2 text-sm leading-relaxed">
              {t.ficha.antes}
              <span className="font-medium">{t.ficha.nombre}</span>
              {t.ficha.medio}
              <span className="font-medium">{t.ficha.whatsapp}</span>
              {t.ficha.despues}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink">
              {t.compradores.titulo}
            </h2>
            <p className="mt-2 text-sm leading-relaxed">
              {t.compradores.texto}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink">
              {t.identificacion.titulo}
            </h2>
            <p className="mt-2 text-sm leading-relaxed">
              {t.identificacion.texto}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink">{t.visitas.titulo}</h2>
            <p className="mt-2 text-sm leading-relaxed">{t.visitas.texto}</p>
            <p className="mt-3 text-sm leading-relaxed">
              {t.visitas.conservacion}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink">{t.alertas.titulo}</h2>
            <p className="mt-2 text-sm leading-relaxed">{t.alertas.texto}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink">{t.guardados.titulo}</h2>
            <p className="mt-2 text-sm leading-relaxed">{t.guardados.texto}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink">
              {t.verificacion.titulo}
            </h2>
            <p className="mt-2 text-sm leading-relaxed">
              {t.verificacion.texto}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink">
              {t.autorizacion.titulo}
            </h2>
            <p className="mt-2 text-sm leading-relaxed">
              {t.autorizacion.texto}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink">{t.derechos.titulo}</h2>
            <p className="mt-2 text-sm leading-relaxed">
              {t.derechos.antes}
              <CorreoDelResponsable />.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink">{t.seguridad.titulo}</h2>
            <p className="mt-2 text-sm leading-relaxed">{t.seguridad.texto}</p>
          </section>
        </div>
      </main>
    </>
  );
}
