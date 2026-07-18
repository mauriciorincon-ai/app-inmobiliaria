import { Campo } from "app-inmobiliaria";

const noop = () => {};

export const Texto = () => (
  <div className="w-80">
    <Campo
      id="nombre"
      label="Tu nombre"
      value="Ana María Vélez"
      onChange={noop}
      requerido
      autoComplete="name"
    />
  </div>
);

export const ConPista = () => (
  <div className="w-80">
    <Campo
      id="whatsapp"
      label="Tu WhatsApp"
      hint="Solo lo usamos para avisarte de interesados."
      value="310 555 12 34"
      onChange={noop}
      inputMode="tel"
      requerido
    />
  </div>
);

export const ConError = () => (
  <div className="w-80">
    <Campo
      id="precio"
      label="Precio esperado"
      value="cuatrocientos"
      onChange={noop}
      error="Escribe solo números, sin puntos ni signos."
      requerido
    />
  </div>
);

export const Select = () => (
  <div className="w-80">
    <Campo
      id="tipo"
      control="select"
      label="Tipo de inmueble"
      value="apartamento"
      onChange={noop}
      opciones={[
        { value: "apartamento", label: "Apartamento" },
        { value: "casa", label: "Casa" },
        { value: "apartaestudio", label: "Apartaestudio" },
        { value: "otro", label: "Otro" },
      ]}
      requerido
    />
  </div>
);

export const AreaDeTexto = () => (
  <div className="w-80">
    <Campo
      id="zona"
      control="textarea"
      label="Zona o barrio"
      placeholder="Ej: Chapinero Alto"
      value=""
      onChange={noop}
    />
  </div>
);
