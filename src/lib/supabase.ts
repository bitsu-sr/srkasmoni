import { createClient } from '@supabase/supabase-js'
import { SUPABASE_CONFIG } from '../config/supabase-config'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || SUPABASE_CONFIG.URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_CONFIG.ANON_KEY

// Check if we have valid Supabase credentials
const hasValidCredentials = supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your_supabase_project_url_here' && 
  supabaseAnonKey !== 'your_supabase_anon_key_here' &&
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey.length > 20

if (!hasValidCredentials) {
  console.warn('⚠️ Supabase not configured. Please update src/config/supabase-config.ts with your credentials.')
  console.warn('⚠️ The app will work with mock data until Supabase is configured.')
}

// Create a dummy client if credentials are invalid to prevent crashes
let supabase: any

if (hasValidCredentials) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    // Create a dummy client to prevent crashes
    supabase = {
      from: () => ({
        select: () => Promise.resolve({ data: [], error: null }),
        insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        update: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        delete: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
      })
    }
  }
} else {
  // Create a dummy client when credentials are missing
  supabase = {
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      update: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      delete: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
    })
  }
}

export { supabase }

// Database types
export interface Database {
  public: {
    Tables: {
      members: {
        Row: {
          id: number
          first_name: string
          last_name: string
          birth_date: string
          birthplace: string
          address: string
          city: string
          phone: string
          email: string
          national_id: string
          nationality: string
          occupation: string
          bank_name: string
          account_number: string
          date_of_registration: string
          groups: string[]
          total_paid: number
          total_received: number
          status: 'active' | 'pending' | 'overdue' | 'inactive'
          last_payment: string
          next_payment: string
          join_date: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          first_name: string
          last_name: string
          birth_date: string
          birthplace: string
          address: string
          city: string
          phone: string
          email: string
          national_id: string
          nationality: string
          occupation: string
          bank_name: string
          account_number: string
          date_of_registration?: string
          groups?: string[]
          total_paid?: number
          total_received?: number
          status?: 'active' | 'pending' | 'overdue' | 'inactive'
          last_payment?: string
          next_payment?: string
          join_date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          first_name?: string
          last_name?: string
          birth_date?: string
          birthplace?: string
          address?: string
          city?: string
          phone?: string
          email?: string
          national_id?: string
          nationality?: string
          occupation?: string
          bank_name?: string
          account_number?: string
          date_of_registration?: string
          groups?: string[]
          total_paid?: number
          total_received?: number
          status?: 'active' | 'pending' | 'overdue' | 'inactive'
          last_payment?: string
          next_payment?: string
          join_date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      groups: {
        Row: {
          id: number
          name: string
          description: string | null
          monthly_amount: number
          max_members: number
          duration: number
          start_date: string
          end_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          monthly_amount: number
          max_members: number
          duration: number
          start_date: string
          end_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          monthly_amount?: number
          max_members?: number
          duration?: number
          start_date?: string
          end_date?: string
          created_at?: string
          updated_at?: string
        }
      }
             group_members: {
         Row: {
           id: number
           group_id: number
           member_id: number
           assigned_month_date: string
           created_at: string
         }
         Insert: {
           id?: number
           group_id: number
           member_id: number
           assigned_month_date: string
           created_at?: string
         }
         Update: {
           id?: number
           group_id?: number
           member_id?: number
           assigned_month_date?: string
           created_at?: string
         }
       }
    }
  }
}
