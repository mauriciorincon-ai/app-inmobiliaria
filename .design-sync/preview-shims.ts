// Shim del runtime de previews (Claude Design): el código cliente de next/* consulta
// process.env.* y en el navegador puro `process` no existe. Debe ser el PRIMER extraEntry
// (el orden del array es el orden de ejecución del bundle).
if (typeof globalThis.process === "undefined") {
  // @ts-expect-error -- shim mínimo, no es el process de Node
  globalThis.process = { env: { NODE_ENV: "production" } };
}

export {};
