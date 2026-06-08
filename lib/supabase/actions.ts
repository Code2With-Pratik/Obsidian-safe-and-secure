'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
  // Create the user via the Admin API with `email_confirm: true` so the
  // account is pre-confirmed and Supabase never sends a verification
  // email. We then immediately call signInWithPassword on the regular
  // (cookie-bound) client to establish a session — same outcome as a
  // normal signup with email confirmations disabled in the dashboard,
  // but independent of that toggle.
  const admin = createAdminClient()

  const { error: createError } = await admin.auth.admin.createUser({
    email: formData.email,
    password: formData.password,
    email_confirm: true,
    user_metadata: {
      name: formData.name,
      // Username is claimed in a separate onboarding step (/username).
    },
  })

  if (createError) {
    return { error: createError.message }
  }

  // Drop the new user straight into a session so the register page can
  // route them on to /username with auth cookies already set.
  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  })

  if (signInError) {
    return { error: signInError.message }
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
