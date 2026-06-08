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

  const { data: created, error: createError } = await admin.auth.admin.createUser({
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

  // Defensive profile bootstrap — guarantees a profiles row exists for
  // the brand-new auth user regardless of whether a handle_new_user
  // trigger is wired up on the database. Without this, every page that
  // reads `profiles.*` for the current user (chat list, /username,
  // /profile, the AI assistant's context) returns nothing until the
  // user manually fills the profile out. Upsert on `id` so re-running
  // signup with the same email is harmless.
  if (created?.user) {
    const dicebear = `https://api.dicebear.com/9.x/notionists/svg?seed=${created.user.id}`
    await admin.from('profiles').upsert(
      {
        id: created.user.id,
        name: formData.name || formData.email?.split('@')[0] || 'User',
        username: (formData.email?.split('@')[0] || 'user')
          .toLowerCase()
          .replace(/[^a-z0-9._]/g, ''),
        avatar: dicebear,
        status: 'online',
      },
      { onConflict: 'id', ignoreDuplicates: false }
    )
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
  // Route through /auth/callback so the recovery `?code=...` is
  // exchanged for a real (recovery-grade) Supabase session BEFORE the
  // user lands on the new-password form. Without this round-trip the
  // /reset-password page would mount with no auth context, and
  // `updateUser({ password })` would fail with "Auth session missing".
  // The `?next=` hint tells the callback handler to bounce the user to
  // the reset form once the code exchange succeeds.
  const base = siteUrl.replace(/\/$/, '')
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${base}/auth/callback?next=${encodeURIComponent('/reset-password')}`,
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
