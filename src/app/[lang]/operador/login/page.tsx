import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import FormLogin from "@/components/operador/FormLogin";
import { leerIdioma, type PropsLang } from "@/i18n/ruta";
import { enIdioma } from "@/i18n/textos";
import { OPERADOR } from "@/textos/operador";

// Login del operador. La página es de servidor (cabecera + textos del idioma) y el formulario es
// un componente cliente que recibe solo los textos de su idioma.
export default async function Login({ params }: PropsLang) {
  const lang = await leerIdioma(params);
  const t = enIdioma(OPERADOR.login, lang);
  return (
    <>
      <EncabezadoInterior lang={lang} />
      <main className="mx-auto max-w-sm px-6 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          {t.titulo}
        </h1>
        <p className="mt-2 text-sm text-gray">{t.aviso}</p>
        <FormLogin t={t} />
      </main>
    </>
  );
}
