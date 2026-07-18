import { Boton } from "app-inmobiliaria";

// CTA principal de la marca (variante por defecto).
export const Primario = () => (
  <Boton href="/publicar">Publica tu inmueble como fundador</Boton>
);

export const Oscuro = () => (
  <Boton variante="oscuro" href="/publicar">
    Conoce el beneficio fundador
  </Boton>
);

export const Texto = () => (
  <Boton variante="texto" href="/privacidad">
    Política de privacidad
  </Boton>
);

// Sin `href` renderiza <button> (submit de formularios).
export const EnFormulario = () => (
  <Boton type="submit" onClick={() => {}}>
    Publicar mi inmueble
  </Boton>
);
