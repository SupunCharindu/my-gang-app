import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // මේ ලයින් දෙක අලුතෙන් දාන්න
  console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log("Supabase Key:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return createBrowserClient(supabaseUrl, supabaseKey)
}