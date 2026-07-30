'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
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
  // Create the user via the Admin API with `email_confirm: true` if admin client is configured.
  // Otherwise, fall back to standard `supabase.auth.signUp()`.
  const admin = createAdminClient()

  if (admin) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: formData.email,
      password: formData.password,
      email_confirm: true,
      user_metadata: {
        name: formData.name,
      },
    })

    if (createError) {
      return { error: createError.message }
    }

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

    const supabase = await createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    })

    if (signInError) {
      return { error: signInError.message }
    }
  } else {
    // Fallback: Standard client signup when SUPABASE_SECRET_KEY is not configured in .env.local
    const supabase = await createClient()
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          name: formData.name,
        },
      },
    })

    if (signUpError) {
      return { error: signUpError.message }
    }

    if (!signUpData.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (signInError) {
        if (signInError.message?.toLowerCase().includes('email not confirmed')) {
          return {
            requiresConfirmation: true,
            message:
              'Account created! Please check your email inbox to confirm your account before logging in.',
          }
        }
        return { error: signInError.message }
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const dicebear = `https://api.dicebear.com/9.x/notionists/svg?seed=${user.id}`
      await supabase.from('profiles').upsert(
        {
          id: user.id,
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
  const reqHeaders = await headers()
  const host = reqHeaders.get('host')
  const proto = reqHeaders.get('x-forwarded-proto') || 'http'
  const currentOrigin = host ? `${proto}://${host}` : null

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    currentOrigin ||
    'http://localhost:3000'

  const base = siteUrl.replace(/\/$/, '')
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${base}/auth/callback?next=${encodeURIComponent('/reset-password')}`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function verifyRecoveryOtp(email: string, token: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'recovery',
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
