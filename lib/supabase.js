import { createClient } from "@supabase/supabase-js";

// این مقادیر را از Supabase Dashboard > Project Settings > API بردارید
// و در فایل .env.local (نمونه در .env.local.example) قرار دهید.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;
