// Tipos de la BD escritos a mano (equivalentes a `supabase gen types typescript`, que requiere una
// BD corriendo). Deben mantenerse en sincronía con las migraciones de `supabase/migrations/`.
// Dan tipado a `.from(...)` y `.rpc(...)` del cliente Supabase.

import type { Operacion, TipoInmueble } from "@/engine/registro/schema";

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
  fotos: FotoMiAnuncio[];
};

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
  ciudad: string;
  area_m2: number;
  habitaciones: number;
  precio_esperado: number;
  descripcion: string | null;
  nivel_verificacion: NivelVerificacion;
  nombre_publicador: string;
  fotos: FotoFicha[];
  contacto_publico: boolean;
  whatsapp: string | null; // solo con opt-in; email y matrícula JAMÁS salen de la BD.
};

export type Database = {
  public: {
    Tables: {
      vendedores: {
        Row: VendedorRow;
        Insert: Omit<VendedorRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
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
      generar_link_anuncio: {
        Args: { p_inmueble_id: string };
        Returns: string;
      };
      ping: { Args: Record<string, never>; Returns: string };
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
