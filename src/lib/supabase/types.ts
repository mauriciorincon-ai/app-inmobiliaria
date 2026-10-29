// Tipos de la BD escritos a mano (equivalentes a `supabase gen types typescript`, que requiere una
// BD corriendo). Deben mantenerse en sincronía con las migraciones de `supabase/migrations/`.
// Dan tipado a `.from(...)` y `.rpc(...)` del cliente Supabase.

import type { Operacion, TipoInmueble } from "@/engine/registro/schema";
import type { ArgsBuscar } from "@/engine/busqueda/filtros";
import type {
  EdicionParaCargar,
  FilaProyecto,
} from "@/engine/vivienda-nueva/filas";

export type EstadoInmueble = "borrador" | "publicado_fundador";
export type NivelVerificacion = "fundador" | "verificado";

export type VendedorRow = {
  id: string;
  nombre: string;
  whatsapp: string;
  email: string | null;
  ciudad: string;
  zona: string | null;
  consentimiento_at: string;
  created_at: string;
  // S3 — atribución de referido (código del referente)
  referido_por_codigo: string | null;
  // S5 — idioma en que publicó (los avisos le llegan en ese idioma)
  idioma: "es" | "en";
};

export type InmuebleRow = {
  id: string;
  vendedor_id: string;
  operacion: Operacion;
  tipo: TipoInmueble;
  barrio: string;
  direccion_aproximada: string | null;
  area_m2: number;
  habitaciones: number;
  precio_esperado: number;
  estado: EstadoInmueble;
  created_at: string;
  updated_at: string;
  // S2 — el inmueble completo
  slug: string;
  descripcion: string | null;
  nivel_verificacion: NivelVerificacion;
  matricula: string | null;
  verificado_at: string | null;
  contacto_publico: boolean;
  edit_token_hash: string | null;
  // S3 — zona (cupos) + vigencia (anti-zombie)
  zona_id: string | null;
  vigente_hasta: string;
  vigente: boolean;
  // S6 — barrio del catálogo catastral (lo fija un trigger por nombre + localidad; null = sin barrio del
  // catálogo) y fecha de expedición del CTL (solo en un anuncio verificado).
  sector_codigo: string | null;
  ctl_expedido_el: string | null;
};

export type SectorRow = {
  codigo: string;
  nombre: string;
  localidad: string;
  tipo: "urbano" | "rural" | "mixto";
  // `point` de Postgres tal como lo devuelve PostgREST: «(lon,lat)».
  centroide: string;
};

export type ZonaRow = {
  id: string;
  nombre: string;
  cupo_total: number | null;
  created_at: string;
};

export type ReferidoRow = {
  codigo: string;
  vendedor_id: string;
  created_at: string;
};

export type EnvioRow = {
  id: string;
  plantilla: string;
  filtro: string | null;
  destinatarios: number;
  enviados: number;
  estado: string;
  created_at: string;
};

export type FotoRow = {
  id: string;
  inmueble_id: string;
  r2_key: string;
  orden: number;
  ancho: number;
  alto: number;
  bytes: number;
  es_portada: boolean;
  created_at: string;
};

// Argumentos de la RPC `registrar_fundador` — las claves son los nombres de los parámetros SQL.
export type RegistrarFundadorArgs = {
  p_nombre: string;
  p_whatsapp: string;
  p_email: string | null;
  p_ciudad: string;
  p_zona: string | null;
  p_operacion: Operacion;
  p_tipo: TipoInmueble;
  p_barrio: string;
  p_direccion: string | null;
  p_area: number;
  p_habitaciones: number;
  p_precio: number;
  p_consentimiento: boolean;
  p_ip_hash: string | null;
  // S3 — código de referido (opcional; inválido/ausente se ignora en silencio).
  p_ref?: string | null;
  // S5 — idioma activo al publicar ('es' | 'en'; la RPC rechaza otro valor).
  p_idioma?: "es" | "en";
};

// registrar_fundador ahora devuelve el id + slug + token (en claro, una sola vez).
export type RegistroFundadorResult = {
  id: string;
  slug: string;
  token: string;
};

// Foto embebida en la respuesta de "mi anuncio" (privada: incluye el id para editar).
export type FotoMiAnuncio = {
  id: string;
  r2_key: string;
  orden: number;
  es_portada: boolean;
};

// Respuesta de obtener_mi_anuncio (o null si el token no matchea).
export type MiAnuncioData = {
  id: string;
  slug: string;
  operacion: Operacion;
  tipo: TipoInmueble;
  barrio: string;
  area_m2: number;
  habitaciones: number;
  precio_esperado: number;
  descripcion: string | null;
  contacto_publico: boolean;
  nivel_verificacion: NivelVerificacion;
  // S6 — fecha del CTL (null = verificado sin fecha ⇒ re-verificación pendiente) y barrio del catálogo.
  ctl_expedido_el: string | null;
  sector_codigo: string | null;
  // S3 — vigencia (para el aviso de renovación); `vigente` va derivado (vigente_hasta > now()).
  vigente_hasta: string;
  vigente: boolean;
  fotos: FotoMiAnuncio[];
  // S7 — compradores verificados que contactaron: nombre, últimos 4 dígitos del teléfono y fecha.
  contactos: ContactoRecibido[];
  // S8 — «solo compradores identificados» y las solicitudes de visita con la tarjeta del comprador.
  solo_identificados: boolean;
  solicitudes: SolicitudRecibida[];
};

export type ContactoRecibido = {
  nombre: string;
  telefono_fin: string;
  fecha: string;
};

// S7 — estado de la verificación de una sesión de comprador (sin datos personales). S8: una sesión
// verificada dice además si el comprador ya se identificó con su cédula.
export type EstadoVerificacion =
  | { estado: "sin_codigo" | "vencido" | "otro_numero" }
  | { estado: "verificado"; identificado: boolean }
  | { estado: "esperando"; segundos: number };

// S8 — la solicitud de visita y su ciclo (ver la migración 10).
export type EstadoSolicitud =
  | "en_espera"
  | "pendiente"
  | "propuesta"
  | "confirmada"
  | "rechazada"
  | "cancelada";
export type IntencionVisita = "vivir" | "invertir";
export type FormaPago = "hipotecario" | "ahorros" | "venta_inmueble" | "otro";

export type HorarioPropuesto = { id: string; inicio: string };

// La tarjeta que ve el dueño en «Mi anuncio». Del comprador: nombre, últimos 4 del teléfono, si está
// identificado y su historial de asistencia. El correo JAMÁS viaja. El WhatsApp completo solo en una visita
// confirmada y no cancelada.
export type SolicitudRecibida = {
  id: string;
  estado: EstadoSolicitud;
  fecha: string;
  comprador: {
    nombre: string;
    telefono_fin: string;
    identificado: boolean;
    asistio: number;
    marcadas: number;
  };
  intencion: IntencionVisita;
  presupuesto_min: number | null;
  presupuesto_max: number | null;
  forma_pago: FormaPago[];
  mensaje: string | null;
  ninguno: boolean;
  horarios: HorarioPropuesto[];
  visita: {
    inicio: string;
    cancelada_por: "comprador" | "dueno" | null;
    asistio: boolean | null;
  } | null;
  whatsapp: string | null;
};

// Lo que el comprador ve de SU solicitud (por su token): sin dirección y sin el correo de nadie.
/** La franja que el comprador pide para visitar una sala de ventas (S13). */
export type FranjaVisita = "entre_semana" | "sabado" | "domingo";

/** El proyecto nuevo al que se refiere una solicitud de sala (S13): sin teléfono ni dirección de la sala. */
export type ProyectoDeVisita = {
  slug: string;
  nombre: string;
  edicion: number;
  franja: FranjaVisita;
};

type VisitaDelCompradorBase = {
  estado: EstadoSolicitud;
  fecha: string;
  horarios: HorarioPropuesto[];
  visita: {
    inicio: string;
    cancelada_por: "comprador" | "dueno" | null;
  } | null;
};

/** Lo que el comprador ve de SU solicitud: de un anuncio (`inmueble`) o de una sala de ventas (`proyecto`). */
export type VisitaDelComprador = VisitaDelCompradorBase &
  (
    | {
        inmueble: {
          slug: string;
          operacion: Operacion;
          tipo: TipoInmueble;
          barrio: string;
          nombre_publicador: string;
        };
        proyecto?: undefined;
      }
    | { inmueble: null; proyecto: ProyectoDeVisita }
  );

export type ResultadoSolicitud = {
  solicitud_id: string;
  token: string;
  estado: "en_espera" | "pendiente";
};

// Reserva de una consulta al proveedor de identidad (solo service_role).
export type ReservaIdentidad =
  | { ok: true; consulta_id: string }
  | {
      ok: false;
      motivo:
        | "no_verificado"
        | "ya_identificado"
        | "tope_comprador"
        | "tope_dia"
        | "tope_mes";
    };

// Lo que el servidor necesita para armar los correos de una solicitud (solo service_role).
type DatosCorreoVisitaBase = {
  estado: EstadoSolicitud;
  comprador: { nombre: string; email: string | null; idioma: "es" | "en" };
  dueno: { nombre: string; email: string | null; idioma: "es" | "en" };
  horarios: string[];
  visita: {
    inicio: string;
    cancelada_por: "comprador" | "dueno" | null;
  } | null;
};

/** Los datos de los correos: de un anuncio (`inmueble`) o de una sala (`proyecto`, `dueno` = el equipo, sin correo). */
export type DatosCorreoVisita = DatosCorreoVisitaBase &
  (
    | {
        intencion: IntencionVisita;
        inmueble: {
          slug: string;
          operacion: Operacion;
          tipo: TipoInmueble;
          barrio: string;
        };
        proyecto?: undefined;
      }
    | { intencion: null; inmueble: null; proyecto: ProyectoDeVisita }
  );

// Resultado del canje del código que hace el webhook (solo service_role).
export type ResultadoCanje = "ok" | "otro_numero" | "nada";

// S3 — respuestas de las RPCs de campaña.
// obtener_cupos: solo zonas con cupo fijado (el motor `cupos` calcula los restantes).
export type CupoZona = {
  zona: string;
  cupo_total: number;
  publicados: number;
};
// obtener_zonas_panel: todas las zonas (para fijar cupos en el panel).
export type ZonaPanel = {
  id: string;
  nombre: string;
  cupo_total: number | null;
  publicados: number;
};
// obtener_densidad: densidad K por búsqueda típica (zona × tipo × rango).
export type DensidadFila = {
  zona: string;
  tipo: TipoInmueble;
  rango: "menos-200M" | "200M-400M" | "mas-400M";
  n: number;
};
// obtener_lote: destinatarios de un lote de campaña (operador autenticado).
export type LoteDestinatario = {
  inmueble_id: string;
  email: string;
  nombre: string;
  barrio: string;
  idioma: "es" | "en";
};
// renovar_vigencia: nueva fecha de corte. S15: renovar no quita la pausa del operador; `pausado` lo dice.
export type RenovacionResult = { vigente_hasta: string; pausado?: boolean };

// Foto en la ficha pública (sin id: solo lo que se pinta).
export type FotoFicha = {
  r2_key: string;
  orden: number;
  es_portada: boolean;
};

// Respuesta de obtener_ficha (whitelist de columnas públicas; null si el slug no existe).
export type FichaData = {
  slug: string;
  operacion: Operacion;
  tipo: TipoInmueble;
  barrio: string;
  // S6 — barrio del catálogo y su localidad (null si el anuncio es de antes del catálogo).
  sector_codigo: string | null;
  localidad: string | null;
  ciudad: string;
  area_m2: number;
  habitaciones: number;
  precio_esperado: number;
  descripcion: string | null;
  nivel_verificacion: NivelVerificacion;
  // S6 — fecha del CTL y última confirmación (`vigente_hasta − 60 d` ⇒ «vivo hace N días»).
  ctl_expedido_el: string | null;
  vigente_hasta: string;
  nombre_publicador: string;
  fotos: FotoFicha[];
  // S7 — el WhatsApp del dueño YA NO viaja aquí: solo lo entrega `registrar_contacto` a una sesión de
  // comprador verificada. Email y matrícula JAMÁS salen de la BD.
  contacto_publico: boolean;
  // S8 — el dueño pidió «solo compradores identificados»: la solicitud de un comprador sin identificar queda en espera.
  solo_identificados: boolean;
};

// Una fila de buscar_inmuebles: LISTA BLANCA. Jamás dirección ni datos del vendedor.
export type ResultadoBusqueda = {
  slug: string;
  operacion: Operacion;
  tipo: TipoInmueble;
  barrio: string;
  sector_codigo: string | null;
  localidad: string | null;
  area_m2: number;
  habitaciones: number;
  precio_esperado: number;
  nivel_verificacion: NivelVerificacion;
  ctl_expedido_el: string | null;
  vigente_hasta: string;
  portada: string | null; // r2_key de la foto de portada
};

// ── S9 — guardar y avisar (migración 12) ─────────────────────────────────────────
// Un anuncio de los favoritos, las listas y los resúmenes: la misma LISTA BLANCA que `/buscar`.
export type AnuncioGuardado = ResultadoBusqueda;
export type BajaDePrecio = ResultadoBusqueda & { precio_anterior: number };

// ── S10 — decidir con números (migración 14) ───────────────────────────────────────
// La tasa de vivienda con su fecha (conjunto abierto de la Superfinanciera) y un anuncio comparable de precio.
export type TasaVivienda = {
  fecha_corte: string;
  tasa_ea: number;
  creditos: number;
  entidades: number;
  fuente: string;
};
// ── S13 — la visita a la sala de ventas y los usados para comparar (migración 16) ──────────────────────────────
/** Área y precio de un anuncio visible: sin slug ni barrio (`usados_para_comparar`). */
export type UsadoParaComparar = { area_m2: number; precio_esperado: number };

/** Una fila de la cola del operador (`salas_panel`). El teléfono completo del comprador solo llega con la visita confirmada. */
export type SolicitudSala = {
  id: string;
  estado: EstadoSolicitud;
  fecha: string;
  franja: FranjaVisita;
  sin_respuesta: boolean;
  ninguno: boolean;
  proyecto: {
    slug: string;
    nombre: string;
    edicion: number;
    constructora: string | null;
    paginas: number[] | null;
  };
  comprador: {
    nombre: string;
    telefono_fin: string;
    identificado: boolean;
    idioma: "es" | "en";
  };
  horarios: HorarioPropuesto[];
  visita: {
    inicio: string;
    cancelada_por: "comprador" | "dueno" | null;
  } | null;
  whatsapp: string | null;
  sala: { telefono: string | null; direccion: string | null } | null;
};

// ── S15 — antifraude, la pausa del operador y la sesión de fotos (migración 17) ──────────────────────────────
export type MotivoReporte =
  | "precio_irreal"
  | "fotos_de_otro"
  | "no_es_el_dueno"
  | "pidio_plata"
  | "ya_no_esta"
  | "otra_cosa";
export type ReglaBandera = "precio" | "foto" | "matricula" | "telefono";
export type RazonDescarte =
  | "es_el_dueno"
  | "tiene_explicacion"
  | "mismo_dueno"
  | "sin_fundamento";
export type EstadoSesionFotos = "solicitada" | "agendada" | "hecha" | "cancelada";

/** Una fila de la cola antifraude del operador (`antifraude_cola`). Del que reporta, solo motivos, detalle y fecha. */
export type RevisionAntifraude = {
  id: string;
  slug: string;
  operacion: Operacion;
  tipo: TipoInmueble;
  barrio: string;
  localidad: string | null;
  precio_esperado: number;
  nivel_verificacion: NivelVerificacion;
  ctl_expedido_el: string | null;
  creado: string;
  vigente_hasta: string;
  pausado_at: string | null;
  ctl_pedido_at: string | null;
  dueno: { nombre: string; whatsapp: string; idioma: "es" | "en" };
  banderas: {
    regla: ReglaBandera;
    evidencia: Record<string, string | number>;
    creada: string;
  }[];
  reportes: { motivos: MotivoReporte[]; detalle: string | null; creado: string }[];
};

/** Un anuncio visible con lo que `rangoDePrecio` necesita (`anuncios_para_precio`). */
export type AnuncioParaPrecio = {
  id: string;
  slug: string;
  operacion: Operacion;
  tipo: TipoInmueble;
  localidad: string | null;
  sector_codigo: string | null;
  area_m2: number;
  precio_esperado: number;
};

export type SesionFotos = {
  id: string;
  estado: EstadoSesionFotos;
  franja: FranjaVisita;
  agendada_para: string | null;
  creada: string;
};

/** Lo que «Mi anuncio» suma en el S15 (`mi_anuncio_extra`). */
export type MiAnuncioExtra = {
  pausado: boolean;
  ctl_pedido: boolean;
  sesion: SesionFotos | null;
};

/** Una fila del panel de sesiones de fotos (`sesiones_panel`). */
export type SesionFotosPanel = SesionFotos & {
  cancelada_por: "dueno" | "operador" | null;
  inmueble: {
    slug: string;
    tipo: TipoInmueble;
    barrio: string;
    localidad: string | null;
  };
  dueno: { nombre: string; whatsapp: string; idioma: "es" | "en" };
};

export type ComparablePrecio = {
  slug: string;
  sector_codigo: string | null;
  area_m2: number;
  precio_esperado: number;
};

// ── S12 — vivienda nueva (migración 15) ──────────────────────────────────────────────
// La edición de la revista ya procesada. El anónimo solo lee ediciones PUBLICADAS, por `nuevos_publicados`.
export type EdicionPublicada = {
  numero: number;
  nombre: string;
  desde: string;
  hasta: string;
  paginas: number;
};
export type NuevosPublicados = {
  edicion: EdicionPublicada;
  proyectos: FilaProyecto[];
};
export type EdicionFila = {
  numero: number;
  nombre: string;
  vigente_desde: string;
  vigente_hasta: string;
  paginas: number;
  publicada: boolean;
  cargada_at: string;
  revisada_at: string | null;
  muestra_claves: string[];
  muestra_semilla: number | null;
};

// De la gente solo sale el PRIMER nombre.
export type NotaDeLista = {
  id: string;
  autor: string;
  es_mia: boolean;
  texto: string;
  created_at: string;
};
export type ItemDeLista = ResultadoBusqueda & { notas: NotaDeLista[] };
export type ListaDetalle = {
  id: string;
  nombre: string;
  dueno: string;
  es_dueno: boolean;
  puede_escribir: boolean;
  compartida: boolean;
  no_disponibles: number;
  items: ItemDeLista[];
};
export type ListaResumen = {
  id: string;
  nombre: string;
  compartida: boolean;
  slugs: string[];
  notas: number;
};

export type EstadoAlerta = "sin_confirmar" | "activa" | "pausada";
export type AccionAlerta =
  | "pausar"
  | "reanudar"
  | "bajas_si"
  | "bajas_no"
  | "nuevos_si"
  | "nuevos_no"
  | "borrar";
// Una alerta tal como la ve el teléfono que guarda su token: el correo enmascarado y ningún token.
export type AlertaDelTelefono = {
  indice: number;
  nombre: string;
  estado: EstadoAlerta;
  correo: string;
  operacion: Operacion | null;
  tipo: TipoInmueble | null;
  localidad: string | null;
  precio_min: number | null;
  precio_max: number | null;
  habitaciones_min: number | null;
  poligono: string | null;
  avisar_nuevos: boolean;
  avisar_bajas: boolean;
  ultimo_envio_at: string | null;
  ultimo_resumen: { nuevos: number; bajas: number } | null;
  created_at: string;
};
// Lo que devuelve «Mis alertas»: la alerta más sus criterios ya escritos y el enlace a su búsqueda.
export type AlertaMia = AlertaDelTelefono & { resumen: string; buscar: string };
export type AlertaCreada = {
  alerta_id: string;
  gestionar: string;
  confirmar: string;
  // Migración 13: la baja del correo de confirmación («No la pedí»).
  baja: string;
};
// Un resumen reclamado por el cron: lo que lleva el correo (con el correo de quien lo recibe).
export type ResumenReclamado = {
  alerta_id: string;
  email: string;
  idioma: "es" | "en";
  nombre: string;
  operacion: Operacion | null;
  tipo: TipoInmueble | null;
  localidad: string | null;
  precio_min: number | null;
  precio_max: number | null;
  habitaciones_min: number | null;
  poligono: string | null;
  total_nuevos: number;
  total_bajas: number;
  nuevos: ResultadoBusqueda[];
  bajas: BajaDePrecio[];
  token_gestionar: string;
  token_baja: string;
};
export type ResultadoResumenes = {
  alertas: ResumenReclamado[];
  diferidas: number;
  sin_novedad: number;
};

export type Database = {
  public: {
    Tables: {
      vendedores: {
        Row: VendedorRow;
        Insert: Omit<VendedorRow, "id" | "created_at" | "idioma"> & {
          id?: string;
          created_at?: string;
          idioma?: "es" | "en";
        };
        Update: Partial<VendedorRow>;
        Relationships: [];
      };
      inmuebles: {
        Row: InmuebleRow;
        Insert: Omit<
          InmuebleRow,
          | "id"
          | "created_at"
          | "updated_at"
          | "estado"
          | "nivel_verificacion"
          | "contacto_publico"
          | "descripcion"
          | "matricula"
          | "verificado_at"
          | "edit_token_hash"
          | "sector_codigo"
          | "ctl_expedido_el"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          estado?: EstadoInmueble;
          nivel_verificacion?: NivelVerificacion;
          contacto_publico?: boolean;
          descripcion?: string | null;
          matricula?: string | null;
          verificado_at?: string | null;
          edit_token_hash?: string | null;
          sector_codigo?: string | null;
          ctl_expedido_el?: string | null;
        };
        Update: Partial<InmuebleRow>;
        Relationships: [
          {
            foreignKeyName: "inmuebles_vendedor_id_fkey";
            columns: ["vendedor_id"];
            referencedRelation: "vendedores";
            referencedColumns: ["id"];
          },
        ];
      };
      fotos: {
        Row: FotoRow;
        Insert: Omit<FotoRow, "id" | "created_at" | "es_portada"> & {
          id?: string;
          created_at?: string;
          es_portada?: boolean;
        };
        Update: Partial<FotoRow>;
        Relationships: [
          {
            foreignKeyName: "fotos_inmueble_id_fkey";
            columns: ["inmueble_id"];
            referencedRelation: "inmuebles";
            referencedColumns: ["id"];
          },
        ];
      };
      registro_intentos: {
        Row: { id: number; ip_hash: string; creado_at: string };
        Insert: { id?: number; ip_hash: string; creado_at?: string };
        Update: Partial<{ id: number; ip_hash: string; creado_at: string }>;
        Relationships: [];
      };
      // S8 — tablas CERRADAS a la API (RLS sin políticas): solo las toca la llave del servidor.
      compradores: {
        Row: {
          id: string;
          telefono: string;
          nombre: string;
          idioma: "es" | "en";
          email: string | null;
          consentimiento_at: string;
          verificado_at: string | null;
          created_at: string;
        };
        Insert: never;
        Update: Partial<{ nombre: string; email: string | null }>;
        Relationships: [];
      };
      identidad_consultas: {
        Row: {
          id: string;
          comprador_id: string | null;
          resultado: "identificado" | "no_coincide" | "no_disponible" | null;
          creado_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      solicitudes_visita: {
        Row: { id: string; comprador_id: string; estado: EstadoSolicitud };
        Insert: never;
        Update: Partial<{ estado: EstadoSolicitud }>;
        Relationships: [];
      };
      sectores: {
        Row: SectorRow;
        Insert: SectorRow;
        Update: Partial<SectorRow>;
        Relationships: [];
      };
      zonas: {
        Row: ZonaRow;
        Insert: Omit<ZonaRow, "id" | "created_at" | "cupo_total"> & {
          id?: string;
          created_at?: string;
          cupo_total?: number | null;
        };
        Update: Partial<ZonaRow>;
        Relationships: [];
      };
      referidos: {
        Row: ReferidoRow;
        Insert: Omit<ReferidoRow, "created_at"> & { created_at?: string };
        Update: Partial<ReferidoRow>;
        Relationships: [
          {
            foreignKeyName: "referidos_vendedor_id_fkey";
            columns: ["vendedor_id"];
            referencedRelation: "vendedores";
            referencedColumns: ["id"];
          },
        ];
      };
      envios: {
        Row: EnvioRow;
        Insert: Omit<
          EnvioRow,
          "id" | "created_at" | "destinatarios" | "enviados" | "estado"
        > & {
          id?: string;
          created_at?: string;
          destinatarios?: number;
          enviados?: number;
          estado?: string;
        };
        Update: Partial<EnvioRow>;
        Relationships: [];
      };
      // S9 — tablas CERRADAS a la API (RLS sin políticas): solo las toca la llave del servidor.
      alertas: {
        Row: { id: string; email: string; nombre: string; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      enlaces_alerta: {
        Row: { id: string; alerta_id: string; proposito: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      cambios_de_precio: {
        Row: {
          id: string;
          inmueble_id: string;
          anterior: number;
          nuevo: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      favoritos: {
        Row: { comprador_id: string; inmueble_id: string; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      listas: {
        Row: { id: string; comprador_id: string; nombre: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      lista_inmuebles: {
        Row: { lista_id: string; inmueble_id: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      notas_lista: {
        Row: {
          id: string;
          lista_id: string;
          comprador_id: string;
          texto: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      correos_dia: {
        Row: { dia: string; visita: number; alerta: number };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      tasas_vivienda: {
        Row: TasaVivienda & { leida_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      ediciones: {
        Row: EdicionFila;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      proyectos_nuevos: {
        Row: FilaProyecto & { edicion: number };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      registrar_fundador: {
        Args: RegistrarFundadorArgs;
        Returns: RegistroFundadorResult;
      };
      obtener_mi_anuncio: {
        Args: { p_token: string };
        Returns: MiAnuncioData | null;
      };
      guardar_descripcion: {
        Args: { p_token: string; p_descripcion: string };
        Returns: undefined;
      };
      registrar_foto: {
        Args: {
          p_token: string;
          p_r2_key: string;
          p_ancho: number;
          p_alto: number;
          p_bytes: number;
        };
        Returns: { id: string; orden: number };
      };
      marcar_portada: {
        Args: { p_token: string; p_foto_id: string };
        Returns: undefined;
      };
      eliminar_foto: {
        Args: { p_token: string; p_foto_id: string };
        Returns: undefined;
      };
      guardar_contacto_publico: {
        Args: { p_token: string; p_activo: boolean };
        Returns: undefined;
      };
      obtener_ficha: { Args: { p_slug: string }; Returns: FichaData | null };
      marcar_verificado: {
        Args: { p_inmueble_id: string; p_matricula: string };
        Returns: undefined;
      };
      // S6 — la verificación con fecha del CTL (SOLO authenticated; ≤ 30 días).
      marcar_verificado_ctl: {
        Args: {
          p_inmueble_id: string;
          p_matricula: string;
          p_ctl_expedido_el: string;
        };
        Returns: undefined;
      };
      // S6 — búsqueda pública (anon + authenticated), lista blanca de campos.
      buscar_inmuebles: {
        Args: ArgsBuscar;
        Returns: ResultadoBusqueda[];
      };
      // S7 — comprador verificado por mensaje entrante (anon + authenticated, salvo el canje).
      iniciar_verificacion: {
        Args: {
          p_sesion_hash: string;
          p_nombre: string;
          p_telefono: string;
          p_idioma: string;
          p_ip_hash: string;
          // S8 — el consentimiento Ley 1581 llega a la base (la de 5 argumentos quedó cerrada).
          p_consentimiento: boolean;
        };
        Returns: string;
      };
      estado_verificacion: {
        Args: { p_sesion_hash: string };
        Returns: EstadoVerificacion;
      };
      registrar_contacto: {
        Args: { p_sesion_hash: string; p_slug: string };
        Returns: { whatsapp: string } | null;
      };
      // SOLO service_role: lo llama el webhook tras validar la firma de Meta.
      canjear_codigo_whatsapp: {
        Args: { p_codigo_hash: string; p_telefono: string };
        Returns: ResultadoCanje;
      };
      // S8 — identidad, visitas y agenda. Públicas (anon + authenticated):
      borrar_identificacion: {
        Args: { p_sesion_hash: string };
        Returns: boolean;
      };
      solicitar_visita: {
        Args: {
          p_sesion_hash: string;
          p_slug: string;
          p_intencion: IntencionVisita;
          p_presupuesto_min: number | null;
          p_presupuesto_max: number | null;
          p_forma_pago: FormaPago[];
          p_mensaje: string | null;
          p_email: string;
          // S16: el consentimiento también lo exige la base, no solo la ruta.
          p_consentimiento: boolean;
        };
        Returns: ResultadoSolicitud;
      };
      obtener_visita: {
        Args: { p_token: string };
        Returns: VisitaDelComprador | null;
      };
      // S13 (migración 16) — la visita a una sala de ventas. Pública: pedirla (exige la sesión verificada) y los usados
      // para comparar. Del operador (`authenticated`): la cola, proponer, rechazar, cancelar y guardar el contacto.
      solicitar_visita_sala: {
        Args: {
          p_sesion_hash: string;
          p_slug: string;
          p_franja: FranjaVisita;
          p_email: string;
        };
        Returns: ResultadoSolicitud;
      };
      usados_para_comparar: {
        Args: { p_operacion: Operacion; p_tipo: TipoInmueble };
        Returns: UsadoParaComparar[];
      };
      salas_panel: { Args: Record<string, never>; Returns: SolicitudSala[] };
      proponer_horarios_sala: {
        Args: { p_solicitud_id: string; p_horarios: string[] };
        Returns: undefined;
      };
      rechazar_solicitud_sala: {
        Args: { p_solicitud_id: string };
        Returns: undefined;
      };
      cancelar_visita_sala: {
        Args: { p_solicitud_id: string };
        Returns: undefined;
      };
      guardar_sala: {
        Args: {
          p_slug: string;
          p_telefono: string | null;
          p_direccion: string | null;
        };
        Returns: undefined;
      };
      reclamar_sin_respuesta_salas: {
        Args: { p_antes_de: string };
        Returns: string[];
      };
      // S15 (migración 17) — antifraude y sesión de fotos. Públicas: reportar (exige la sesión verificada) y lo del dueño
      // por su token. Del operador (`authenticated`) y del trabajo diario (`service_role`): la cola, sus acciones, las
      // reglas, las huellas y las sesiones.
      reportar_anuncio: {
        Args: {
          p_sesion_hash: string;
          p_slug: string;
          p_motivos: MotivoReporte[];
          p_detalle: string | null;
        };
        Returns: undefined;
      };
      registrar_huella_foto: {
        Args: { p_token: string; p_foto_id: string; p_huella: string };
        Returns: undefined;
      };
      mi_anuncio_extra: {
        Args: { p_token: string };
        Returns: MiAnuncioExtra | null;
      };
      solicitar_sesion_fotos: {
        Args: { p_token: string; p_franja: FranjaVisita };
        Returns: { id: string; estado: "solicitada" };
      };
      cancelar_sesion_fotos: { Args: { p_token: string }; Returns: undefined };
      antifraude_cola: {
        Args: Record<string, never>;
        Returns: RevisionAntifraude[];
      };
      pausar_anuncio: { Args: { p_inmueble_id: string }; Returns: undefined };
      reactivar_anuncio: {
        Args: { p_inmueble_id: string };
        Returns: undefined;
      };
      pedir_ctl: { Args: { p_inmueble_id: string }; Returns: undefined };
      // S16: el CTL pedido que el dueño no entregó sale de la cola (y un verificado sin CTL vuelve a fundador).
      cerrar_ctl_pedido: { Args: { p_inmueble_id: string }; Returns: undefined };
      // S16: lo que queda del cupo diario de correos (visitas, alertas y campañas de hoy).
      correos_libres_hoy: { Args: { p_tope?: number }; Returns: number };
      descartar_revision: {
        Args: {
          p_inmueble_id: string;
          p_razon: RazonDescarte;
          p_nota: string | null;
        };
        Returns: undefined;
      };
      revisar_banderas: {
        Args: Record<string, never>;
        Returns: Record<Exclude<ReglaBandera, "precio">, number>;
      };
      anuncios_para_precio: {
        Args: Record<string, never>;
        Returns: AnuncioParaPrecio[];
      };
      guardar_banderas_precio: {
        Args: {
          p_hallazgos: Record<
            string,
            { porcentaje: number; n: number; ambito: "barrio" | "localidad" }
          >;
        };
        Returns: number;
      };
      fotos_sin_huella: {
        Args: { p_limite: number };
        Returns: { id: string; r2_key: string }[];
      };
      registrar_huella_operador: {
        Args: { p_foto_id: string; p_huella: string };
        Returns: undefined;
      };
      sesiones_panel: {
        Args: Record<string, never>;
        Returns: SesionFotosPanel[];
      };
      agendar_sesion_fotos: {
        Args: { p_sesion_id: string; p_para: string };
        Returns: undefined;
      };
      marcar_sesion_hecha: {
        Args: { p_sesion_id: string };
        Returns: undefined;
      };
      cancelar_sesion_fotos_operador: {
        Args: { p_sesion_id: string };
        Returns: undefined;
      };
      elegir_horario: {
        Args: { p_token: string; p_horario_id: string | null };
        Returns: undefined;
      };
      cancelar_visita_comprador: {
        Args: { p_token: string };
        Returns: undefined;
      };
      proponer_horarios: {
        Args: { p_token: string; p_solicitud_id: string; p_horarios: string[] };
        Returns: undefined;
      };
      rechazar_solicitud: {
        Args: { p_token: string; p_solicitud_id: string };
        Returns: undefined;
      };
      aceptar_en_espera: {
        Args: { p_token: string; p_solicitud_id: string };
        Returns: undefined;
      };
      cancelar_visita_dueno: {
        Args: { p_token: string; p_solicitud_id: string };
        Returns: undefined;
      };
      marcar_asistencia: {
        Args: { p_token: string; p_solicitud_id: string; p_asistio: boolean };
        Returns: undefined;
      };
      guardar_solo_identificados: {
        Args: { p_token: string; p_activo: boolean };
        Returns: undefined;
      };
      // S8 — SOLO service_role: el proveedor de identidad, los correos de la visita y el cron.
      reservar_consulta_identidad: {
        Args: {
          p_sesion_hash: string;
          p_tope_mes?: number;
          p_tope_dia?: number;
          p_tope_comprador?: number;
        };
        Returns: ReservaIdentidad;
      };
      registrar_identificacion: {
        Args: {
          p_consulta_id: string;
          p_resultado: "identificado" | "no_coincide" | "no_disponible";
          p_proveedor: "didit" | "simulador";
        };
        Returns: undefined;
      };
      datos_correo_visita: {
        Args: { p_solicitud_id: string };
        Returns: DatosCorreoVisita | null;
      };
      reclamar_recordatorios: {
        Args: Record<string, never>;
        Returns: string[];
      };
      // S8 (migración 11) — un enlace nuevo por correo al comprador, y de qué solicitud es un token.
      nuevo_enlace_visita: {
        Args: { p_solicitud_id: string };
        Returns: string | null;
      };
      solicitud_de_token: {
        Args: { p_token: string };
        Returns: string | null;
      };
      purgar_vencidos: {
        Args: Record<string, never>;
        Returns: {
          compradores: number;
          verificaciones: number;
          alertas: number;
          enlaces: number;
          cambios_de_precio: number;
          correos_dia: number;
        };
      };
      // S9 — guardar y avisar. Públicas (anon + authenticated):
      guardar_precio: {
        Args: { p_token: string; p_precio: number };
        Returns: { precio_esperado: number };
      };
      resumen_anuncios: {
        Args: { p_slugs: string[] };
        Returns: ResultadoBusqueda[];
      };
      mis_favoritos: { Args: { p_sesion_hash: string }; Returns: string[] };
      fusionar_favoritos: {
        Args: { p_sesion_hash: string; p_slugs: string[] };
        Returns: string[];
      };
      quitar_favorito: {
        Args: { p_sesion_hash: string; p_slug: string };
        Returns: undefined;
      };
      mis_listas: { Args: { p_sesion_hash: string }; Returns: ListaResumen[] };
      crear_lista: {
        Args: { p_sesion_hash: string; p_nombre: string };
        Returns: string;
      };
      renombrar_lista: {
        Args: { p_sesion_hash: string; p_lista: string; p_nombre: string };
        Returns: undefined;
      };
      borrar_lista: {
        Args: { p_sesion_hash: string; p_lista: string };
        Returns: undefined;
      };
      agregar_a_lista: {
        Args: { p_sesion_hash: string; p_lista: string; p_slug: string };
        Returns: undefined;
      };
      quitar_de_lista: {
        Args: { p_sesion_hash: string; p_lista: string; p_slug: string };
        Returns: undefined;
      };
      compartir_lista: {
        Args: { p_sesion_hash: string; p_lista: string };
        Returns: string;
      };
      revocar_lista: {
        Args: { p_sesion_hash: string; p_lista: string };
        Returns: undefined;
      };
      obtener_lista: {
        Args: {
          p_sesion_hash: string | null;
          p_token: string | null;
          p_lista: string | null;
        };
        Returns: ListaDetalle;
      };
      escribir_nota: {
        Args: {
          p_sesion_hash: string;
          p_lista: string | null;
          p_token: string | null;
          p_slug: string;
          p_texto: string;
        };
        Returns: string;
      };
      borrar_nota: {
        Args: { p_sesion_hash: string; p_nota: string };
        Returns: undefined;
      };
      confirmar_alerta: {
        Args: { p_token: string };
        Returns: { estado: "confirmada" | "ya_confirmada"; nombre: string };
      };
      obtener_alertas: {
        Args: { p_tokens: string[] };
        Returns: AlertaDelTelefono[];
      };
      gestionar_alerta: {
        Args: { p_token: string; p_accion: AccionAlerta };
        Returns:
          | { estado: "borrada" }
          | {
              estado: EstadoAlerta;
              avisar_nuevos: boolean;
              avisar_bajas: boolean;
            };
      };
      baja_alerta: {
        Args: { p_token: string };
        Returns: { estado: "baja"; nombre: string };
      };
      // S9 — SOLO service_role: crear la alerta (devuelve el token de confirmar), el resumen del cron y el cupo.
      crear_alerta: {
        Args: {
          p_email: string;
          p_idioma: "es" | "en";
          p_nombre: string;
          p_operacion: Operacion | null;
          p_tipo: TipoInmueble | null;
          p_localidad: string | null;
          p_precio_min: number | null;
          p_precio_max: number | null;
          p_habitaciones_min: number | null;
          p_poligono: string | null;
          p_avisar_nuevos: boolean;
          p_avisar_bajas: boolean;
          p_consentimiento: boolean;
          p_ip_hash: string;
          p_tope?: number;
        };
        Returns: AlertaCreada;
      };
      reclamar_resumenes: {
        Args: { p_tope?: number; p_alerta?: string };
        Returns: ResultadoResumenes;
      };
      sumar_correos_dia: {
        Args: { p_clase: "visita" | "alerta"; p_n: number };
        Returns: undefined;
      };
      // S10 — decidir con números. Públicas: la última tasa y los comparables. Solo servidor: guardar la tasa.
      tasa_vivienda: {
        Args: Record<string, never>;
        Returns: TasaVivienda | null;
      };
      comparables_precio: {
        Args: {
          p_operacion: Operacion;
          p_tipo: TipoInmueble;
          p_localidad: string;
        };
        Returns: ComparablePrecio[];
      };
      guardar_tasa_vivienda: {
        Args: {
          p_fecha_corte: string;
          p_tasa_ea: number;
          p_creditos: number;
          p_entidades: number;
          p_fuente: string;
        };
        Returns: undefined;
      };
      // S12 — vivienda nueva. Pública: la edición vigente (solo publicadas). Solo servidor: cargar, publicar y retirar.
      nuevos_publicados: {
        Args: { p_hoy: string };
        Returns: NuevosPublicados | null;
      };
      cargar_edicion: {
        Args: { p_edicion: EdicionParaCargar };
        Returns: { numero: number; proyectos: number; publicada: false };
      };
      publicar_edicion: {
        Args: { p_numero: number; p_muestra: string[] };
        Returns: boolean;
      };
      retirar_edicion: { Args: { p_numero: number }; Returns: boolean };
      generar_link_anuncio: {
        Args: { p_inmueble_id: string };
        Returns: string;
      };
      ping: { Args: Record<string, never>; Returns: string };
      // S3 — campaña. Públicas (anon + authenticated):
      obtener_cupos: { Args: Record<string, never>; Returns: CupoZona[] };
      obtener_codigo_referido: {
        Args: { p_token: string };
        Returns: string | null;
      };
      obtener_mis_referidos: { Args: { p_token: string }; Returns: number };
      renovar_vigencia: {
        Args: { p_token: string };
        Returns: RenovacionResult | null;
      };
      // S3 — operador (SOLO authenticated):
      fijar_cupo: {
        Args: { p_zona_id: string; p_cupo: number | null };
        Returns: undefined;
      };
      obtener_zonas_panel: {
        Args: Record<string, never>;
        Returns: ZonaPanel[];
      };
      obtener_densidad: {
        Args: Record<string, never>;
        Returns: DensidadFila[];
      };
      obtener_lote: {
        Args: { p_filtro: string };
        Returns: LoteDestinatario[];
      };
      registrar_envio: {
        Args: {
          p_plantilla: string;
          p_filtro: string | null;
          p_destinatarios: number;
          p_enviados: number;
          p_estado: string;
        };
        Returns: string;
      };
      // S3 — cron (SOLO service_role):
      marcar_vencidos: { Args: Record<string, never>; Returns: number };
    };
    Enums: {
      operacion: Operacion;
      tipo_inmueble: TipoInmueble;
      estado_inmueble: EstadoInmueble;
      nivel_verificacion: NivelVerificacion;
    };
    CompositeTypes: Record<never, never>;
  };
};
