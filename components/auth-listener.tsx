'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/use-auth-store'
import { useChatStore } from '@/store/use-chat-store'
import { useStoriesStore } from '@/store/use-stories-store'
import { useCallStore } from '@/store/use-call-store'
import { useNotificationsStore } from '@/store/use-notifications-store'
import { useSettingsStore } from '@/store/use-settings-store'

/** Build a per-browser-per-user fingerprint so the login notification
 *  only fires the first time a given device sees this account. Hashing
 *  the UA + screen + timezone keeps the key stable across refreshes but
 *  changes between phones / browsers / new machines. */
function deviceFingerprint(): string {
  if (typeof window === 'undefined') return 'srv'
  const parts = [
    navigator.userAgent,
    `${screen.width}x${screen.height}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'unknown',
  ].join('|')
  let h = 0
  for (let i = 0; i < parts.length; i++) {
    h = ((h << 5) - h + parts.charCodeAt(i)) | 0
  }
  return `dev_${(h >>> 0).toString(36)}`
}

/** Fire the per-device login alert exactly once per (userId, fingerprint)
 *  combination, gated on the security.loginAlerts preference. Shared by
 *  the SIGNED_IN branch and the initial getSession() branch so cold-tab
 *  visits on a new device also see the chip.
 *
 *  Safe to call from either path — short-circuits when the user opted
 *  out or when the device has already seen this user's session. */
function maybeFireLoginAlert(userId: string) {
  try {
    if (typeof window === 'undefined') return
    if (!useSettingsStore.getState().security.loginAlerts) return
    const key = `notif:lastLoginDevice:${userId}`
    const fp = deviceFingerprint()
    if (localStorage.getItem(key) === fp) return
    localStorage.setItem(key, fp)
    useNotificationsStore.getState().add({
      kind: 'system',
      title: 'New sign-in on this device',
      body: deviceLabel(),
      targetHref: '/settings?section=security',
    })
  } catch {
    /* private mode or quota blocked — harmless */
  }
}

/** Short, human-readable device label for the body of the login notif.
 *  Picks the most-recognizable token from the UA (Chrome / Firefox /
 *  Safari / Edge) and the platform hint. */
function deviceLabel(): string {
  if (typeof navigator === 'undefined') return 'this device'
  const ua = navigator.userAgent
  const browser =
    /Edg\//.test(ua) ? 'Edge' :
    /Chrome\//.test(ua) ? 'Chrome' :
    /Firefox\//.test(ua) ? 'Firefox' :
    /Safari\//.test(ua) ? 'Safari' :
    'Browser'
  const platform =
    /Windows/.test(ua) ? 'Windows' :
    /Macintosh|Mac OS/.test(ua) ? 'macOS' :
    /Android/.test(ua) ? 'Android' :
    /iPhone|iPad/.test(ua) ? 'iOS' :
    /Linux/.test(ua) ? 'Linux' :
    ''
  return platform ? `${browser} · ${platform}` : browser
}

async function upsertDeviceSession(accessToken?: string) {
  if (!accessToken) return

  try {
    await fetch('/api/device-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upsert', accessToken }),
    })
  } catch {
    // Ignore client-side session bookkeeping failures; the settings page
    // can still render once the user opens the Devices tab.
  }
}

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
  const initCallRealtime = useCallStore((s) => s.initializeRealtime)
  const disconnectCallRealtime = useCallStore((s) => s.disconnectRealtime)

  useEffect(() => {
    const fetchProfile = async (userId: string, createdAt?: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (data && !error) {
        setUser({
          id: data.id,
          createdAt,
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
        // Pre-seed useAuthStore.user with what we KNOW synchronously
        // from the session. Downstream stores (chat / stories / calls /
        // notifications / whiteboards) read `useAuthStore.getState().user`
        // and early-return on null — without this seed they would run
        // before fetchProfile's async setUser({...}) lands and silently
        // no-op the whole realtime subscription pipeline. The profile
        // fetch below then enriches with name/avatar/etc.
        const existing = useAuthStore.getState().user
        if (!existing || existing.id !== session.user.id) {
          setUser({
            id: session.user.id,
            createdAt: session.user.created_at,
            name: session.user.email?.split('@')[0] || 'You',
            username: session.user.email?.split('@')[0] || 'you',
            avatar: `https://api.dicebear.com/9.x/notionists/svg?seed=${session.user.id}`,
            status: 'online',
          })
        }
        fetchProfile(session.user.id, session.user.created_at)
        fetchChats()
        fetchBlocked()
        initializeRealtime()
        fetchStories()
        initStoryRealtime()
        initCallRealtime()
        // Notifications realtime — open the call_sessions +
        // community_members channels (chat messages + whiteboard members
        // are tapped inside their own stores' subscriptions).
        useNotificationsStore.getState().initRealtime(session.user.id)
        // Per-device login alert — gated on security.loginAlerts pref.
        maybeFireLoginAlert(session.user.id)
        router.refresh()
      }
      if (event === 'SIGNED_OUT') {
        // Tear down realtime channels and wipe local chat state so we don't
        // leak presence/message subscriptions across user sessions.
        disconnectRealtime()
        disconnectStoryRealtime()
        disconnectCallRealtime()
        useNotificationsStore.getState().teardown()
        clearAll()
        logout()
        router.refresh()
        router.push('/')
      }
    })

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Same synchronous pre-seed as the SIGNED_IN branch so chat /
        // stories / calls / notifications subscriptions don't race
        // against fetchProfile.
        const existing = useAuthStore.getState().user
        if (!existing || existing.id !== session.user.id) {
          setUser({
            id: session.user.id,
            name: session.user.email?.split('@')[0] || 'You',
            username: session.user.email?.split('@')[0] || 'you',
            avatar: `https://api.dicebear.com/9.x/notionists/svg?seed=${session.user.id}`,
            status: 'online',
          })
        }
        fetchProfile(session.user.id)
        void upsertDeviceSession(session.access_token)
        fetchChats()
        fetchBlocked()
        initializeRealtime()
        fetchStories()
        initStoryRealtime()
        initCallRealtime()
        // Open the notification realtime channels for a returning user
        // who's already signed in (no SIGNED_IN event fires on initial
        // page load when the cookie is already valid).
        useNotificationsStore.getState().initRealtime(session.user.id)
        // Cold-tab login alert: fingerprint-gated chip fires here too,
        // not just on the explicit SIGNED_IN auth event. Without this,
        // a returning user on a new device with a still-valid cookie
        // would never see "New sign-in on this device".
        maybeFireLoginAlert(session.user.id)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router, fetchChats, fetchBlocked, initializeRealtime, disconnectRealtime, clearAll, setUser, logout, fetchStories, initStoryRealtime, disconnectStoryRealtime, initCallRealtime, disconnectCallRealtime])

  return null
}
