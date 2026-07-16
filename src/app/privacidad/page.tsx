import type { Metadata } from "next";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";

export const metadata: Metadata = {
  title: "Política de tratamiento de datos — Innmobiliaria",
};

// Aviso de privacidad (Ley 1581 de 2012 y Decreto 1377 de 2013). Enlazado desde el consentimiento
// del registro. Datos del responsable = placeholder marcado; se confirman antes de publicar (H2a).
// TODO(H2a): reemplazar el correo de contacto por el definitivo del responsable.
const CONTACTO = "privacidad@innmobiliaria.co";

export default function Privacidad() {
  return (
    <>
      <EncabezadoInterior />
      <main className="mx-auto max-w-2xl px-6 py-16 lg:py-20">
        <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Política de tratamiento de datos
        </h1>
        <p className="mt-4 text-sm text-mute">
          Conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013 de la
          República de Colombia.
        </p>

        <div className="mt-10 space-y-8 text-gray">
          <section>
            <h2 className="text-lg font-bold text-ink">
              Responsable del tratamiento
            </h2>
            <p className="mt-2 text-sm leading-relaxed">
              Innmobiliaria, plataforma de captación de vendedores directos en
              Bogotá, Colombia. Para cualquier asunto sobre tus datos
              personales, escríbenos a{" "}
              <a
                href={`mailto:${CONTACTO}`}
                className="font-semibold text-purple underline"
              >
                {CONTACTO}
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink">
              Qué datos recogemos y con qué finalidad
            </h2>
            <p className="mt-2 text-sm leading-relaxed">
              Recogemos únicamente lo necesario para registrar tu inmueble y
              contactarte: tu nombre, tu número de WhatsApp, tu ciudad y los
              datos básicos del inmueble (tipo, zona, área, habitaciones y
              precio esperado). Los usamos para comunicarnos contigo por
              WhatsApp sobre tu publicación y las siguientes etapas hacia el
              lanzamiento. No los vendemos ni los compartimos con terceros con
              fines comerciales.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink">Tu autorización</h2>
            <p className="mt-2 text-sm leading-relaxed">
              Al marcar la casilla de consentimiento en el registro, autorizas
              de forma libre, previa, expresa e informada el tratamiento de tus
              datos para las finalidades descritas. Sin esa autorización no
              realizamos ningún registro.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink">Tus derechos</h2>
            <p className="mt-2 text-sm leading-relaxed">
              Como titular puedes, en cualquier momento: conocer, actualizar y
              rectificar tus datos; solicitar prueba de tu autorización; ser
              informado sobre el uso que les damos; presentar quejas ante la
              Superintendencia de Industria y Comercio; revocar la autorización
              y solicitar la supresión de tus datos cuando no exista un deber
              legal de conservarlos. Para ejercerlos, escríbenos a{" "}
              <a
                href={`mailto:${CONTACTO}`}
                className="font-semibold text-purple underline"
              >
                {CONTACTO}
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink">
              Seguridad y conservación
            </h2>
            <p className="mt-2 text-sm leading-relaxed">
              Tus datos se almacenan con controles de acceso: solo el operador
              autorizado de Innmobiliaria puede consultarlos. Los conservamos
              mientras dure la campaña de expectativa y el proceso de
              lanzamiento, salvo que solicites su supresión antes.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
