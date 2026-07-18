// Setup global de Vitest (referenciado por vitest.config.ts).
// Matchers de Testing Library (toBeInTheDocument, toHaveAccessibleName, ...).
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Sin `globals: true` en la config, Testing Library no registra su auto-cleanup → los renders se
// acumularían entre tests (elementos duplicados). Lo hacemos explícito.
afterEach(cleanup);
