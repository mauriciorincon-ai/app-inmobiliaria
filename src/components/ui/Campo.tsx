"use client";

import type { ReactNode } from "react";

export type Opcion = { value: string; label: string };

type Base = {
  id: string;
  label: string;
  value: string;
  onChange: (valor: string) => void;
  error?: string;
  hint?: string;
  requerido?: boolean;
  placeholder?: string;
};

type Props = Base &
  (
    | {
        control?: "text";
        type?: string;
        inputMode?: "text" | "numeric" | "tel";
        autoComplete?: string;
      }
    | { control: "textarea" }
    | { control: "select"; opciones: Opcion[] }
  );

const claseControl =
  "mt-1.5 w-full rounded-2xl border border-purple-200 bg-white px-4 py-3 text-base text-ink " +
  "placeholder:text-mute focus:border-purple focus:outline-none focus-visible:outline-none " +
  "aria-[invalid=true]:border-red-500";

// Campo con label REAL siempre (el formulario ES el producto) + error por campo asociado con
// aria-describedby y anunciado con role="alert". Cubre input, textarea y select con la misma
// mecánica de accesibilidad.
export default function Campo(props: Props) {
  const { id, label, value, onChange, error, hint, requerido, placeholder } =
    props;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined;

  const comun = {
    id,
    value,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    "aria-required": requerido || undefined,
    className: claseControl,
    placeholder,
  } as const;

  let control: ReactNode;
  if (props.control === "textarea") {
    control = (
      <textarea
        {...comun}
        rows={2}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  } else if (props.control === "select") {
    control = (
      <select {...comun} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>
          {placeholder ?? "Elige una opción"}
        </option>
        {props.opciones.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  } else {
    control = (
      <input
        {...comun}
        type={props.type ?? "text"}
        inputMode={props.inputMode}
        autoComplete={props.autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
        {requerido && <span className="text-purple-600"> *</span>}
      </label>
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-mute">
          {hint}
        </p>
      )}
      {control}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 text-sm font-medium text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}

// Export nombrado además del default: `export *` (barriles, design-sync) no re-exporta defaults.
export { Campo };
