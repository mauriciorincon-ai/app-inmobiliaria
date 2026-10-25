// ¿Es esta persona el operador? La sesión de Supabase Auth solo existe para el operador, pero el panel y sus rutas exigen
// además que su correo sea el de la allowlist (`OPERADOR_EMAIL`): una cuenta creada por error no abre nada. Puro: recibe el
// correo de la sesión y el de la allowlist. Sin allowlist configurada, nadie entra.
export function esOperador(
  correoDeLaSesion: string | null | undefined,
  allowlist: string | null | undefined,
): boolean {
  if (!correoDeLaSesion || !allowlist) return false;
  return correoDeLaSesion.toLowerCase() === allowlist.toLowerCase();
}
