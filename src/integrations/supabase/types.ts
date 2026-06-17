export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          plan: string
          owner_id: string
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          plan?: string
          owner_id: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          plan?: string
          owner_id?: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          organization_id: string | null
          full_name: string | null
          avatar_url: string | null
          role: string
          email: string | null
          phone: string | null
          title: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          organization_id?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: string
          email?: string | null
          phone?: string | null
          title?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: string
          email?: string | null
          phone?: string | null
          title?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          organization_id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          company: string | null
          notes: string | null
          contact_person: string | null
          tax_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          company?: string | null
          notes?: string | null
          contact_person?: string | null
          tax_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          company?: string | null
          notes?: string | null
          contact_person?: string | null
          tax_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          organization_id: string
          client_id: string | null
          name: string
          description: string | null
          status: string
          budget: number | null
          budget_currency: string
          start_date: string | null
          end_date: string | null
          address: string | null
          area_sqm: number | null
          project_type: string | null
          permit_number: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          client_id?: string | null
          name: string
          description?: string | null
          status?: string
          budget?: number | null
          budget_currency?: string
          start_date?: string | null
          end_date?: string | null
          address?: string | null
          area_sqm?: number | null
          project_type?: string | null
          permit_number?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          client_id?: string | null
          name?: string
          description?: string | null
          status?: string
          budget?: number | null
          budget_currency?: string
          start_date?: string | null
          end_date?: string | null
          address?: string | null
          area_sqm?: number | null
          project_type?: string | null
          permit_number?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          organization_id: string
          project_id: string | null
          title: string
          description: string | null
          status: string
          priority: string
          assigned_to: string | null
          created_by: string | null
          due_date: string | null
          completed_at: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          project_id?: string | null
          title: string
          description?: string | null
          status?: string
          priority?: string
          assigned_to?: string | null
          created_by?: string | null
          due_date?: string | null
          completed_at?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          project_id?: string | null
          title?: string
          description?: string | null
          status?: string
          priority?: string
          assigned_to?: string | null
          created_by?: string | null
          due_date?: string | null
          completed_at?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          id: string
          organization_id: string
          client_id: string | null
          project_id: string | null
          invoice_number: string
          status: string
          issue_date: string
          due_date: string | null
          paid_at: string | null
          subtotal: number
          tax_rate: number
          tax_amount: number
          total: number
          currency: string
          notes: string | null
          terms: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          client_id?: string | null
          project_id?: string | null
          invoice_number: string
          status?: string
          issue_date?: string
          due_date?: string | null
          paid_at?: string | null
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          total?: number
          currency?: string
          notes?: string | null
          terms?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          client_id?: string | null
          project_id?: string | null
          invoice_number?: string
          status?: string
          issue_date?: string
          due_date?: string | null
          paid_at?: string | null
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          total?: number
          currency?: string
          notes?: string | null
          terms?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          description: string
          quantity: number
          unit_price: number
          total: number
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          description: string
          quantity?: number
          unit_price?: number
          total?: number
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          description?: string
          quantity?: number
          unit_price?: number
          total?: number
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          organization_id: string
          project_id: string | null
          client_id: string | null
          name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          category: string | null
          tags: string[]
          uploaded_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          project_id?: string | null
          client_id?: string | null
          name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          category?: string | null
          tags?: string[]
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          project_id?: string | null
          client_id?: string | null
          name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          category?: string | null
          tags?: string[]
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          type: string
          title: string
          body: string | null
          data: Json
          read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          type: string
          title: string
          body?: string | null
          data?: Json
          read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          type?: string
          title?: string
          body?: string | null
          data?: Json
          read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          id: string
          organization_id: string
          project_id: string | null
          task_id: string | null
          author_id: string
          content: string
          edited_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          project_id?: string | null
          task_id?: string | null
          author_id: string
          content: string
          edited_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          project_id?: string | null
          task_id?: string | null
          author_id?: string
          content?: string
          edited_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          id: string
          organization_id: string
          client_id: string | null
          project_id: string | null
          title: string
          description: string | null
          status: string
          total: number
          currency: string
          valid_until: string | null
          sent_at: string | null
          viewed_at: string | null
          responded_at: string | null
          content: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          client_id?: string | null
          project_id?: string | null
          title: string
          description?: string | null
          status?: string
          total?: number
          currency?: string
          valid_until?: string | null
          sent_at?: string | null
          viewed_at?: string | null
          responded_at?: string | null
          content?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          client_id?: string | null
          project_id?: string | null
          title?: string
          description?: string | null
          status?: string
          total?: number
          currency?: string
          valid_until?: string | null
          sent_at?: string | null
          viewed_at?: string | null
          responded_at?: string | null
          content?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience aliases
export type Organization = Database['public']['Tables']['organizations']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type Invoice = Database['public']['Tables']['invoices']['Row']
export type InvoiceItem = Database['public']['Tables']['invoice_items']['Row']
export type Document = Database['public']['Tables']['documents']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type Proposal = Database['public']['Tables']['proposals']['Row']

// Deliverables system types
export type ArchitectureTool =
  | 'revit' | 'autocad' | 'archicad' | 'sketchup' | 'rhino' | 'vectorworks'
  | 'chief_architect' | 'lumion' | 'enscape' | 'vray' | 'corona' | 'twinmotion'
  | 'unreal_engine' | 'd5_render' | '3ds_max' | 'photoshop' | 'illustrator'
  | 'indesign' | 'blender' | 'autodesk_forma' | 'navisworks' | 'excel' | 'project' | 'other'

export type DeliverableCategory =
  | 'concept' | 'schematic' | 'design_dev' | 'construction_docs'
  | 'rendering' | 'animation' | 'specifications' | 'bom'
  | 'schedules' | 'reports' | 'site_photos' | 'other'

export type DeliverableStatus = 'pending' | 'in_progress' | 'review' | 'approved' | 'archived'
export type DeliverableApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface Deliverable {
  id: string
  organization_id: string
  project_id: string
  name: string
  description: string | null
  category: DeliverableCategory
  required_tools: ArchitectureTool[]
  due_date: string | null
  assigned_to: string | null
  status: DeliverableStatus
  approval_status: DeliverableApprovalStatus
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface DeliverableFile {
  id: string
  deliverable_id: string
  organization_id: string
  project_id: string
  file_name: string
  file_path: string
  file_size: number | null
  file_type: string | null
  tool_used: ArchitectureTool
  version_number: number
  description: string | null
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

export interface DeliverableComment {
  id: string
  deliverable_id: string
  organization_id: string
  author_id: string
  content: string
  status: 'comment' | 'review' | 'revision_request' | null
  edited_at: string | null
  created_at: string
}

export type DeliverableInsert = Omit<Deliverable, 'id' | 'created_at' | 'updated_at'>
export type DeliverableFileInsert = Omit<DeliverableFile, 'id' | 'created_at' | 'updated_at'>
export type DeliverableCommentInsert = Omit<DeliverableComment, 'id' | 'created_at'>
