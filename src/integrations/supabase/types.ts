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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Relationships: []
      }
      bank_transactions: {
        Row: {
          account_name: string | null
          amount: number
          created_at: string
          description: string | null
          id: string
          imported_at: string
          imported_batch_id: string | null
          match_status: Database["public"]["Enums"]["bank_match_status"]
          matched_to_id: string | null
          matched_to_type: string | null
          txn_date: string
          txn_type: Database["public"]["Enums"]["bank_txn_type"]
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          imported_at?: string
          imported_batch_id?: string | null
          match_status?: Database["public"]["Enums"]["bank_match_status"]
          matched_to_id?: string | null
          matched_to_type?: string | null
          txn_date: string
          txn_type: Database["public"]["Enums"]["bank_txn_type"]
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          imported_at?: string
          imported_batch_id?: string | null
          match_status?: Database["public"]["Enums"]["bank_match_status"]
          matched_to_id?: string | null
          matched_to_type?: string | null
          txn_date?: string
          txn_type?: Database["public"]["Enums"]["bank_txn_type"]
          updated_at?: string
        }
        Relationships: []
      }
      bill_line_items: {
        Row: {
          bill_id: string
          description: string | null
          id: string
          line_total: number
          product_service_id: string | null
          quantity: number
          sort_order: number
          unit_cost: number
        }
        Insert: {
          bill_id: string
          description?: string | null
          id?: string
          line_total?: number
          product_service_id?: string | null
          quantity?: number
          sort_order?: number
          unit_cost?: number
        }
        Update: {
          bill_id?: string
          description?: string | null
          id?: string
          line_total?: number
          product_service_id?: string | null
          quantity?: number
          sort_order?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "bill_line_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          bill_date: string
          bill_number: string
          created_at: string
          date_paid: string | null
          due_date: string | null
          id: string
          linked_po_id: string | null
          notes: string | null
          payment_method: string | null
          payment_notes: string | null
          reconciled_at: string | null
          status: Database["public"]["Enums"]["bill_status"]
          total: number
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          bill_date?: string
          bill_number: string
          created_at?: string
          date_paid?: string | null
          due_date?: string | null
          id?: string
          linked_po_id?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          reconciled_at?: string | null
          status?: Database["public"]["Enums"]["bill_status"]
          total?: number
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          bill_date?: string
          bill_number?: string
          created_at?: string
          date_paid?: string | null
          due_date?: string | null
          id?: string
          linked_po_id?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          reconciled_at?: string | null
          status?: Database["public"]["Enums"]["bill_status"]
          total?: number
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bills_linked_po_id_fkey"
            columns: ["linked_po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          ap_contact_email: string | null
          ap_contact_name: string | null
          ap_contact_phone: string | null
          billing_city: string | null
          billing_state: string | null
          billing_street: string | null
          billing_zip: string | null
          company_name: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          external_id: string | null
          id: string
          notes: string | null
          payment_terms: string | null
          shipping_city: string | null
          shipping_state: string | null
          shipping_street: string | null
          shipping_zip: string | null
          updated_at: string
        }
        Insert: {
          ap_contact_email?: string | null
          ap_contact_name?: string | null
          ap_contact_phone?: string | null
          billing_city?: string | null
          billing_state?: string | null
          billing_street?: string | null
          billing_zip?: string | null
          company_name: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          notes?: string | null
          payment_terms?: string | null
          shipping_city?: string | null
          shipping_state?: string | null
          shipping_street?: string | null
          shipping_zip?: string | null
          updated_at?: string
        }
        Update: {
          ap_contact_email?: string | null
          ap_contact_name?: string | null
          ap_contact_phone?: string | null
          billing_city?: string | null
          billing_state?: string | null
          billing_street?: string | null
          billing_zip?: string | null
          company_name?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          notes?: string | null
          payment_terms?: string | null
          shipping_city?: string | null
          shipping_state?: string | null
          shipping_street?: string | null
          shipping_zip?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      csv_column_mappings: {
        Row: {
          created_at: string
          id: string
          mapping: Json
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          mapping: Json
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          mapping?: Json
          name?: string
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          expense_date: string
          id: string
          notes: string | null
          payment_method: string | null
          receipt_url: string | null
          reconciled_at: string | null
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          amount?: number
          category_id: string
          created_at?: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          reconciled_at?: string | null
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          reconciled_at?: string | null
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          description: string | null
          id: string
          invoice_id: string
          line_total: number
          product_service_id: string | null
          quantity: number
          sort_order: number
          unit_price: number
        }
        Insert: {
          description?: string | null
          id?: string
          invoice_id: string
          line_total?: number
          product_service_id?: string | null
          quantity?: number
          sort_order?: number
          unit_price?: number
        }
        Update: {
          description?: string | null
          id?: string
          invoice_id?: string
          line_total?: number
          product_service_id?: string | null
          quantity?: number
          sort_order?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string | null
          client_po_number: string | null
          created_at: string
          date_paid: string | null
          date_sent: string | null
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          memo: string | null
          notes: string | null
          payment_method: string | null
          payment_notes: string | null
          payment_terms: string | null
          reconciled_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_amount: number
          total: number
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          client_po_number?: string | null
          created_at?: string
          date_paid?: string | null
          date_sent?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          memo?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_terms?: string | null
          reconciled_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          client_po_number?: string | null
          created_at?: string
          date_paid?: string | null
          date_sent?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          memo?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_terms?: string | null
          reconciled_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      po_line_items: {
        Row: {
          description: string | null
          id: string
          line_total: number
          po_id: string
          product_service_id: string | null
          quantity: number
          sort_order: number
          unit_cost: number
        }
        Insert: {
          description?: string | null
          id?: string
          line_total?: number
          po_id: string
          product_service_id?: string | null
          quantity?: number
          sort_order?: number
          unit_cost?: number
        }
        Update: {
          description?: string | null
          id?: string
          line_total?: number
          po_id?: string
          product_service_id?: string | null
          quantity?: number
          sort_order?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "po_line_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products_services: {
        Row: {
          active: boolean
          created_at: string
          default_cost: number | null
          default_description: string | null
          default_price: number | null
          id: string
          name: string
          sort_order: number
          type: Database["public"]["Enums"]["product_service_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          default_cost?: number | null
          default_description?: string | null
          default_price?: number | null
          id?: string
          name: string
          sort_order?: number
          type?: Database["public"]["Enums"]["product_service_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          default_cost?: number | null
          default_description?: string | null
          default_price?: number | null
          id?: string
          name?: string
          sort_order?: number
          type?: Database["public"]["Enums"]["product_service_type"]
          updated_at?: string
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          created_at: string
          date_sent: string | null
          expected_delivery_date: string | null
          id: string
          internal_po_number: string | null
          issue_date: string
          memo: string | null
          notes: string | null
          po_number: string
          ship_to_city: string | null
          ship_to_name: string | null
          ship_to_state: string | null
          ship_to_street: string | null
          ship_to_zip: string | null
          status: Database["public"]["Enums"]["po_status"]
          subtotal: number
          total: number
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          date_sent?: string | null
          expected_delivery_date?: string | null
          id?: string
          internal_po_number?: string | null
          issue_date?: string
          memo?: string | null
          notes?: string | null
          po_number: string
          ship_to_city?: string | null
          ship_to_name?: string | null
          ship_to_state?: string | null
          ship_to_street?: string | null
          ship_to_zip?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          date_sent?: string | null
          expected_delivery_date?: string | null
          id?: string
          internal_po_number?: string | null
          issue_date?: string
          memo?: string | null
          notes?: string | null
          po_number?: string
          ship_to_city?: string | null
          ship_to_name?: string | null
          ship_to_state?: string | null
          ship_to_street?: string | null
          ship_to_zip?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_matches: {
        Row: {
          bank_reference: string | null
          bank_txn_id: string
          created_at: string
          id: string
          record_id: string
          record_type: string
        }
        Insert: {
          bank_reference?: string | null
          bank_txn_id: string
          created_at?: string
          id?: string
          record_id: string
          record_type: string
        }
        Update: {
          bank_reference?: string | null
          bank_txn_id?: string
          created_at?: string
          id?: string
          record_id?: string
          record_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_matches_bank_txn_id_fkey"
            columns: ["bank_txn_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          command_center_api_key: string | null
          company_address: string | null
          company_email: string | null
          company_logo_url: string | null
          company_name: string | null
          company_phone: string | null
          created_at: string
          default_payment_terms: string | null
          default_tax_rate: number | null
          email_webhook_url: string | null
          id: string
          next_internal_po_number: number | null
          next_invoice_number: number | null
          next_po_number: number | null
          theme: string | null
          updated_at: string
        }
        Insert: {
          command_center_api_key?: string | null
          company_address?: string | null
          company_email?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string
          default_payment_terms?: string | null
          default_tax_rate?: number | null
          email_webhook_url?: string | null
          id?: string
          next_internal_po_number?: number | null
          next_invoice_number?: number | null
          next_po_number?: number | null
          theme?: string | null
          updated_at?: string
        }
        Update: {
          command_center_api_key?: string | null
          company_address?: string | null
          company_email?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string
          default_payment_terms?: string | null
          default_tax_rate?: number | null
          email_webhook_url?: string | null
          id?: string
          next_internal_po_number?: number | null
          next_invoice_number?: number | null
          next_po_number?: number | null
          theme?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          city: string | null
          company_name: string
          contact_name: string | null
          created_at: string
          email: string | null
          external_id: string | null
          id: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          state: string | null
          street: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          city?: string | null
          company_name: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          external_id?: string | null
          id?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          city?: string | null
          company_name?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          external_id?: string | null
          id?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_next_internal_po_number: { Args: never; Returns: string }
      get_next_invoice_number: { Args: never; Returns: string }
      get_next_po_number: { Args: never; Returns: string }
    }
    Enums: {
      bank_match_status: "unmatched" | "matched" | "ignored"
      bank_txn_type: "credit" | "debit"
      bill_status: "unpaid" | "paid"
      invoice_status: "draft" | "sent" | "paid"
      po_status: "draft" | "sent" | "completed" | "cancelled"
      product_service_type: "product" | "service"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      bank_match_status: ["unmatched", "matched", "ignored"],
      bank_txn_type: ["credit", "debit"],
      bill_status: ["unpaid", "paid"],
      invoice_status: ["draft", "sent", "paid"],
      po_status: ["draft", "sent", "completed", "cancelled"],
      product_service_type: ["product", "service"],
    },
  },
} as const
