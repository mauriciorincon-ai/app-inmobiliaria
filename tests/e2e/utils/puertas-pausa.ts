// Gate de la pausa (S15): toda función de `public` que lee `inmuebles` está CLASIFICADA. La pausa del operador es una columna
// (`pausado_at`), no un estado: si una función nueva muestra un anuncio sin mirarla, el anuncio pausado se colaría por ahí.
// Puro: recibe el catálogo (nombre y cuerpo) y devuelve los problemas. Lo usan la e2e de la base (el catálogo real) y una
// unitaria con catálogos sintéticos (la demo en rojo).

/** Muestran un anuncio o actúan sobre él en nombre del comprador: su cuerpo mira `pausado_at`. */
export const RESPETAN_PAUSA = [
  "inmuebles_que_cumplen",
  "resumen_anuncios",
  "mis_favoritos",
  "fusionar_favoritos",
  "obtener_ficha",
  "registrar_contacto",
  "solicitar_visita",
  "renovar_vigencia",
  "lista_detalle",
  "mis_listas",
  "agregar_a_lista",
  "reportar_anuncio",
] as const;

/** Filtran por `inmuebles_que_cumplen`, que ya mira la pausa. */
export const DELEGAN = [
  "buscar_inmuebles",
  "comparables_precio",
  "usados_para_comparar",
  "reclamar_resumenes",
  "anuncios_para_precio",
] as const;

/** Leen `inmuebles` pero no le muestran un anuncio a un comprador: por qué no miran la pausa. */
export const EXENTAS: Record<string, string> = {
  generar_slug: "interna: arma el slug de un anuncio nuevo",
  fila_anuncio: "ayudante por id: quien la llama ya filtró",
  registrar_fundador: "crea el anuncio",
  inmueble_de_token: "el dueño, por su token",
  obtener_mi_anuncio: "el dueño ve y arregla su anuncio aunque esté pausado",
  guardar_descripcion: "el dueño, por su token",
  registrar_foto: "el dueño, por su token",
  marcar_portada: "el dueño, por su token",
  eliminar_foto: "el dueño, por su token",
  guardar_contacto_publico: "el dueño, por su token",
  guardar_precio: "el dueño, por su token",
  guardar_solo_identificados: "el dueño, por su token",
  obtener_codigo_referido: "el dueño, por su token",
  obtener_mis_referidos: "el dueño, por su token",
  mi_anuncio_extra: "el dueño, por su token",
  solicitar_sesion_fotos: "el dueño, por su token",
  marcar_verificado: "operador",
  marcar_verificado_ctl: "operador",
  generar_link_anuncio: "operador",
  obtener_zonas_panel: "operador",
  obtener_densidad: "operador",
  obtener_lote: "operador",
  antifraude_cola: "operador",
  revisar_banderas: "operador y trabajo diario",
  aplicar_banderas: "interna: guarda las banderas; mira la pausa solo para reabrir una (S16)",
  guardar_banderas_precio: "operador y trabajo diario",
  pausar_anuncio: "operador",
  reactivar_anuncio: "operador",
  pedir_ctl: "operador",
  cerrar_ctl_pedido: "operador",
  dato_de_bandera: "interna: el dato de una bandera, por id (la llaman aplicar_banderas y resolver_revision)",
  sesiones_panel: "operador",
  marcar_vencidos: "trabajo diario",
  datos_correo_visita: "servidor: una visita que ya existe",
  obtener_visita: "una visita que ya existe: el comprador ya vio el anuncio",
  obtener_cupos: "conteo de la campaña, sin anuncios",
  quitar_favorito: "quitar no muestra nada",
  quitar_de_lista: "quitar no muestra nada",
  escribir_nota: "escribe sobre un anuncio que ya está en la lista; no lo muestra",
};

export type FuncionCatalogo = { nombre: string; cuerpo: string };

export function problemasDePausa(
  funciones: readonly FuncionCatalogo[],
): string[] {
  const problemas: string[] = [];
  const respetan: readonly string[] = RESPETAN_PAUSA;
  const delegan: readonly string[] = DELEGAN;
  for (const f of funciones) {
    if (respetan.includes(f.nombre)) {
      if (!/\bpausado_at\b/.test(f.cuerpo)) {
        problemas.push(`${f.nombre}: debe mirar pausado_at`);
      }
    } else if (delegan.includes(f.nombre)) {
      if (!f.cuerpo.includes("inmuebles_que_cumplen(")) {
        problemas.push(`${f.nombre}: debe filtrar por inmuebles_que_cumplen`);
      }
    } else if (!(f.nombre in EXENTAS)) {
      problemas.push(`${f.nombre}: lee inmuebles y no está clasificada`);
    }
  }
  for (const nombre of [...respetan, ...delegan]) {
    if (!funciones.some((f) => f.nombre === nombre)) {
      problemas.push(`${nombre}: ya no existe (la lista quedó desfasada)`);
    }
  }
  return problemas;
}
