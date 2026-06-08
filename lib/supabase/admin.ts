import { createClient } from '@supabase/supabase-js'

/**
 *  Server-only admin client backed by the project's secret key. Bypasses
 *  Row Level Security and unlocks the Admin API (auth.admin.*). Used by
 *  signup() to create accounts with `email_confirm: true` so no
 *  verification email is sent and the user is immediately usable.
 *
 *  NEVER import this from a Client Component — the secret key would leak
 *  into the browser bundle. Only call from files with `'use server'` or
 *  from route handlers under /app/api.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!url || !secret) {
    throw new Error(
      'Missing Supabase admin env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local.'
    )
  }
  return createClient(url, secret, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
