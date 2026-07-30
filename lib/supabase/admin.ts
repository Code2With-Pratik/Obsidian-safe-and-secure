import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  console.log("URL exists:", !!process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log("Secret exists:", !!process.env.SUPABASE_SECRET_KEY)

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SECRET_KEY

  if (!url || !secret) {
    console.error("Missing env vars", {
      url,
      secretExists: !!secret,
    })
    return null
  }

  return createClient(url, secret, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}