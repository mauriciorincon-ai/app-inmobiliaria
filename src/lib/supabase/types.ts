// Tipos de la BD escritos a mano (equivalentes a `supabase gen types typescript`, que requiere una
// BD corriendo). Deben mantenerse en sincronía con las migraciones de `supabase/migrations/`.
// Dan tipado a `.from(...)` y `.rpc(...)` del cliente Supabase.

import type { Operacion, TipoInmueble } from "@/engine/registro/schema";
import type { ArgsBuscar } from "@/engine/busqueda/filtros";

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
export type VisitaDelComprador = {
  estado: EstadoSolicitud;
  fecha: string;
  inmueble: {
    slug: string;
    operacion: Operacion;
    tipo: TipoInmueble;
    barrio: string;
    nombre_publicador: string;
  };
  horarios: HorarioPropuesto[];
  visita: {
    inicio: string;
    cancelada_por: "comprador" | "dueno" | null;
  } | null;
};

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
export type DatosCorreoVisita = {
  estado: EstadoSolicitud;
  intencion: IntencionVisita;
  comprador: { nombre: string; email: string | null; idioma: "es" | "en" };
  dueno: { nombre: string; email: string | null; idioma: "es" | "en" };
  inmueble: {
    slug: string;
    operacion: Operacion;
    tipo: TipoInmueble;
    barrio: string;
  };
  horarios: string[];
  visita: {
    inicio: string;
    cancelada_por: "comprador" | "dueno" | null;
  } | null;
};

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
// renovar_vigencia: nueva fecha de corte.
export type RenovacionResult = { vigente_hasta: string };

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
        };
        Returns: ResultadoSolicitud;
      };
      obtener_visita: {
        Args: { p_token: string };
        Returns: VisitaDelComprador | null;
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
        Returns: { compradores: number; verificaciones: number };
      };
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
