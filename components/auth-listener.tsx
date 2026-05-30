'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/use-auth-store'
import { useChatStore } from '@/store/use-chat-store'

export default function AuthListener() {
  const supabase = createClient()
  const router = useRouter()
  const logout = useAuthStore((s) => s.logout)
  const setUser = useAuthStore((s) => s.setUser)
  const fetchChats = useChatStore((s) => s.fetchChats)

  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (data && !error) {
        setUser({
          id: data.id,
          name: data.name || 'Anonymous',
          username: data.username || 'user',
          avatar: data.avatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${data.id}`,
          status: data.status || 'online',
          profession: data.profession,
          bio: data.bio,
          pronouns: data.pronouns,
          location: data.location,
          links: data.links,
        })
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        fetchProfile(session.user.id)
        fetchChats()
        router.refresh()
      }
      if (event === 'SIGNED_OUT') {
        logout()
        router.refresh()
        router.push('/')
      }
    })

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id)
        fetchChats()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  return null
}
