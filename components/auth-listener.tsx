'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/use-auth-store'
import { useChatStore } from '@/store/use-chat-store'
import { useStoriesStore } from '@/store/use-stories-store'

export default function AuthListener() {
  const supabase = createClient()
  const router = useRouter()
  const logout = useAuthStore((s) => s.logout)
  const setUser = useAuthStore((s) => s.setUser)
  const fetchChats = useChatStore((s) => s.fetchChats)
  const fetchBlocked = useChatStore((s) => s.fetchBlocked)
  const initializeRealtime = useChatStore((s) => s.initializeRealtime)
  const disconnectRealtime = useChatStore((s) => s.disconnectRealtime)
  const clearAll = useChatStore((s) => s.clearAll)
  const fetchStories = useStoriesStore((s) => s.fetchStories)
  const initStoryRealtime = useStoriesStore((s) => s.initializeRealtime)
  const disconnectStoryRealtime = useStoriesStore((s) => s.disconnectRealtime)

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
          banner: data.banner,
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
        fetchBlocked()
        initializeRealtime()
        fetchStories()
        initStoryRealtime()
        router.refresh()
      }
      if (event === 'SIGNED_OUT') {
        // Tear down realtime channels and wipe local chat state so we don't
        // leak presence/message subscriptions across user sessions.
        disconnectRealtime()
        disconnectStoryRealtime()
        clearAll()
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
        fetchBlocked()
        initializeRealtime()
        fetchStories()
        initStoryRealtime()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router, fetchChats, fetchBlocked, initializeRealtime, disconnectRealtime, clearAll, setUser, logout, fetchStories, initStoryRealtime, disconnectStoryRealtime])

  return null
}
