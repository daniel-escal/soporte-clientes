// Generado con el MCP de Supabase (generate_typescript_types). No editar a mano: regenerar tras cada migración.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          creado_en: string
          es_demo: boolean
          id: string
          nombre: string
        }
        Insert: {
          creado_en?: string
          es_demo?: boolean
          id?: string
          nombre: string
        }
        Update: {
          creado_en?: string
          es_demo?: boolean
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      conversaciones: {
        Row: {
          actualizado_en: string
          cliente_id: string
          creado_en: string
          estado: Database["public"]["Enums"]["estado_conversacion"]
          id: string
          perfil_id: string
        }
        Insert: {
          actualizado_en?: string
          cliente_id: string
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_conversacion"]
          id?: string
          perfil_id: string
        }
        Update: {
          actualizado_en?: string
          cliente_id?: string
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_conversacion"]
          id?: string
          perfil_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversaciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversaciones_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      faq: {
        Row: {
          activa: boolean
          actualizado_en: string
          categoria: Database["public"]["Enums"]["categoria"]
          creado_en: string
          id: string
          pregunta: string
          respuesta: string
        }
        Insert: {
          activa?: boolean
          actualizado_en?: string
          categoria?: Database["public"]["Enums"]["categoria"]
          creado_en?: string
          id?: string
          pregunta: string
          respuesta: string
        }
        Update: {
          activa?: boolean
          actualizado_en?: string
          categoria?: Database["public"]["Enums"]["categoria"]
          creado_en?: string
          id?: string
          pregunta?: string
          respuesta?: string
        }
        Relationships: []
      }
      mensajes: {
        Row: {
          autor: Database["public"]["Enums"]["autor"]
          contenido: string
          conversacion_id: string
          creado_en: string
          id: string
        }
        Insert: {
          autor: Database["public"]["Enums"]["autor"]
          contenido: string
          conversacion_id: string
          creado_en?: string
          id?: string
        }
        Update: {
          autor?: Database["public"]["Enums"]["autor"]
          contenido?: string
          conversacion_id?: string
          creado_en?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensajes_conversacion_id_fkey"
            columns: ["conversacion_id"]
            isOneToOne: false
            referencedRelation: "conversaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          cliente_id: string | null
          creado_en: string
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["rol"]
        }
        Insert: {
          cliente_id?: string | null
          creado_en?: string
          id: string
          nombre?: string
          rol?: Database["public"]["Enums"]["rol"]
        }
        Update: {
          cliente_id?: string | null
          creado_en?: string
          id?: string
          nombre?: string
          rol?: Database["public"]["Enums"]["rol"]
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          actualizado_en: string
          categoria: Database["public"]["Enums"]["categoria"]
          cliente_id: string
          conversacion_id: string | null
          creado_en: string
          descripcion: string
          estado: Database["public"]["Enums"]["estado_ticket"]
          estado_desde: string
          id: string
          numero: number
          origen: Database["public"]["Enums"]["origen_ticket"]
          primera_respuesta_en: string | null
          prioridad: Database["public"]["Enums"]["prioridad"]
          recordado_en: string | null
          resumen_ia: string | null
          tipo: Database["public"]["Enums"]["tipo_ticket"]
          titulo: string
          web_id: string | null
        }
        Insert: {
          actualizado_en?: string
          categoria?: Database["public"]["Enums"]["categoria"]
          cliente_id: string
          conversacion_id?: string | null
          creado_en?: string
          descripcion: string
          estado?: Database["public"]["Enums"]["estado_ticket"]
          estado_desde?: string
          id?: string
          numero?: never
          origen: Database["public"]["Enums"]["origen_ticket"]
          primera_respuesta_en?: string | null
          prioridad?: Database["public"]["Enums"]["prioridad"]
          recordado_en?: string | null
          resumen_ia?: string | null
          tipo?: Database["public"]["Enums"]["tipo_ticket"]
          titulo: string
          web_id?: string | null
        }
        Update: {
          actualizado_en?: string
          categoria?: Database["public"]["Enums"]["categoria"]
          cliente_id?: string
          conversacion_id?: string | null
          creado_en?: string
          descripcion?: string
          estado?: Database["public"]["Enums"]["estado_ticket"]
          estado_desde?: string
          id?: string
          numero?: never
          origen?: Database["public"]["Enums"]["origen_ticket"]
          primera_respuesta_en?: string | null
          prioridad?: Database["public"]["Enums"]["prioridad"]
          recordado_en?: string | null
          resumen_ia?: string | null
          tipo?: Database["public"]["Enums"]["tipo_ticket"]
          titulo?: string
          web_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_conversacion_del_cliente"
            columns: ["conversacion_id", "cliente_id"]
            isOneToOne: false
            referencedRelation: "conversaciones"
            referencedColumns: ["id", "cliente_id"]
          },
          {
            foreignKeyName: "tickets_web_del_cliente"
            columns: ["web_id", "cliente_id"]
            isOneToOne: false
            referencedRelation: "webs"
            referencedColumns: ["id", "cliente_id"]
          },
        ]
      }
      webs: {
        Row: {
          cliente_id: string
          creado_en: string
          dominio: string
          id: string
          nombre: string
        }
        Insert: {
          cliente_id: string
          creado_en?: string
          dominio: string
          id?: string
          nombre: string
        }
        Update: {
          cliente_id?: string
          creado_en?: string
          dominio?: string
          id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "webs_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      abrir_solicitud: {
        Args: {
          p_categoria?: Database["public"]["Enums"]["categoria"]
          p_descripcion: string
          p_titulo: string
          p_web_id?: string
        }
        Returns: {
          actualizado_en: string
          categoria: Database["public"]["Enums"]["categoria"]
          cliente_id: string
          conversacion_id: string | null
          creado_en: string
          descripcion: string
          estado: Database["public"]["Enums"]["estado_ticket"]
          estado_desde: string
          id: string
          numero: number
          origen: Database["public"]["Enums"]["origen_ticket"]
          primera_respuesta_en: string | null
          prioridad: Database["public"]["Enums"]["prioridad"]
          recordado_en: string | null
          resumen_ia: string | null
          tipo: Database["public"]["Enums"]["tipo_ticket"]
          titulo: string
          web_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tickets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      marcar_resuelta_ia: {
        Args: { p_conversacion: string }
        Returns: boolean
      }
    }
    Enums: {
      autor: "cliente" | "ia" | "admin" | "sistema"
      categoria:
        | "web_caida"
        | "error_funcional"
        | "cambio_contenido"
        | "nuevo_componente"
        | "correo"
        | "dominio_hosting"
        | "facturacion"
        | "otro"
      estado_conversacion: "activa" | "resuelta_ia" | "escalada"
      estado_ticket:
        | "abierto"
        | "en_curso"
        | "esperando_cliente"
        | "resuelto"
        | "cerrado"
      origen_ticket: "ia" | "cliente"
      prioridad: "baja" | "media" | "alta" | "urgente"
      rol: "cliente" | "admin"
      tipo_ticket: "incidencia" | "peticion"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      autor: ["cliente", "ia", "admin", "sistema"],
      categoria: [
        "web_caida",
        "error_funcional",
        "cambio_contenido",
        "nuevo_componente",
        "correo",
        "dominio_hosting",
        "facturacion",
        "otro",
      ],
      estado_conversacion: ["activa", "resuelta_ia", "escalada"],
      estado_ticket: [
        "abierto",
        "en_curso",
        "esperando_cliente",
        "resuelto",
        "cerrado",
      ],
      origen_ticket: ["ia", "cliente"],
      prioridad: ["baja", "media", "alta", "urgente"],
      rol: ["cliente", "admin"],
      tipo_ticket: ["incidencia", "peticion"],
    },
  },
} as const
