
import { createClient } from "@supabase/supabase-js";

// Vite vyžaduje prefix VITE_ pre systémové premenné
// Ak nebudú nastavené vo Verceli, použije sa tvoj súčasný fallback
// Fix: Property 'env' does not exist on type 'ImportMeta'. Using type assertion to bypass TS check for Vite environment variables.
const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL || "https://fuuxskyamoeuusnlsgvl.supabase.co"; 
// Fix: Property 'env' does not exist on type 'ImportMeta'. Using type assertion to bypass TS check for Vite environment variables.
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1dXhza3lhbW9ldXVzbmxzZ3ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2ODEzOTIsImV4cCI6MjA4MTI1NzM5Mn0.wbl2AFNJ48QA7NuWSyOC_WPIKTWXV6d9eTGnHBnIs4c";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type UserProfile = {
  id: string;
  email: string;
  role: 'admin' | 'employee';
  full_name: string;
  organization_id: string;
  hourly_rate?: number;
  phone?: string;
  is_active?: boolean;
};
