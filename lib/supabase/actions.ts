'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: any) {
  const supabase = await createClient()

  const data = {
    email: formData.email,
    password: formData.password,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function signup(formData: any) {
  const supabase = await createClient()

  // Where Supabase should point the confirmation-email link. Without this
  // the link uses whatever Site URL is configured in the Supabase
  // dashboard — which defaults to http://localhost:3000 and breaks every
  // production deployment that forgets to update it. We set
  // NEXT_PUBLIC_SITE_URL in production (Render env vars) so the link
  // routes back to the live origin's /auth/callback, which exchanges
  // the code for a session and lands the user on the home page signed
  // in.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    'http://localhost:3000'
  const emailRedirectTo = `${siteUrl.replace(/\/$/, '')}/auth/callback`

  const data = {
    email: formData.email,
    password: formData.password,
    options: {
      emailRedirectTo,
      data: {
        name: formData.name,
        // We'll handle username in a separate onboarding step as per the app flow
      },
    },
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function resetPassword(email: string) {
  const supabase = await createClient()
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    'http://localhost:3000'
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl.replace(/\/$/, '')}/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function updatePassword(password: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function searchUsers(query: string) {
  const supabase = await createClient()
  const { data: { user: me } } = await supabase.auth.getUser()
  
  let builder = supabase
    .from('profiles')
    .select('*')
    .or(`name.ilike.%${query}%,username.ilike.%${query}%`)
    .limit(10)

  if (me) {
    builder = builder.neq('id', me.id)
  }

  const { data, error } = await builder

  if (error) {
    return { error: error.message, data: [] }
  }

  return { data }
}

export async function updateUsername(username: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('profiles')
    .update({ username })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function updateProfile(data: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function uploadFile(formData: FormData) {
  const supabase = await createClient()
  const bucket = formData.get('bucket') as string
  const path = formData.get('path') as string
  const file = formData.get('file') as File
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: true
    })

  if (error) {
    return { error: error.message }
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path)

  return { publicUrl }
}
