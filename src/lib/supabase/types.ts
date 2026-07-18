// Tipos de la BD escritos a mano (equivalentes a `supabase gen types typescript`, que requiere una
// BD corriendo). Deben mantenerse en sincronía con `supabase/migrations/0001_captacion_fundadores.sql`.
// Dan tipado a `.from(...)` y `.rpc(...)` del cliente Supabase.

import type { Operacion, TipoInmueble } from "@/engine/registro/schema";

export type EstadoInmueble = "borrador" | "publicado_fundador";

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
          "id" | "created_at" | "updated_at" | "estado"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          estado?: EstadoInmueble;
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
      registro_intentos: {
        Row: { id: number; ip_hash: string; creado_at: string };
        Insert: { id?: number; ip_hash: string; creado_at?: string };
        Update: Partial<{ id: number; ip_hash: string; creado_at: string }>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      registrar_fundador: { Args: RegistrarFundadorArgs; Returns: string };
      ping: { Args: Record<string, never>; Returns: string };
    };
    Enums: {
      operacion: Operacion;
      tipo_inmueble: TipoInmueble;
      estado_inmueble: EstadoInmueble;
    };
    CompositeTypes: Record<never, never>;
  };
};
