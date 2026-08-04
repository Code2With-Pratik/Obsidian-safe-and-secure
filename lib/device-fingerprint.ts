export function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'server'

  const parts = [
    navigator.userAgent,
    `${window.screen.width}x${window.screen.height}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'unknown',
  ].join('|')

  let hash = 0
  for (let i = 0; i < parts.length; i++) {
    hash = ((hash << 5) - hash + parts.charCodeAt(i)) | 0
  }

  return `dev_${(hash >>> 0).toString(36)}`
}

export function getDeviceBrowserLabel(): string {
  if (typeof navigator === 'undefined') return 'Browser'
  const ua = navigator.userAgent

  if (/Edg\//.test(ua)) return 'Edge'
  if (/Chrome\//.test(ua)) return 'Chrome'
  if (/Firefox\//.test(ua)) return 'Firefox'
  if (/Safari\//.test(ua)) return 'Safari'
  return 'Browser'
}

export function getDevicePlatformLabel(): string {
  if (typeof navigator === 'undefined') return 'Unknown platform'
  const ua = navigator.userAgent

  if (/Windows/.test(ua)) return 'Windows'
  if (/Macintosh|Mac OS/.test(ua)) return 'macOS'
  if (/Android/.test(ua)) return 'Android'
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Unknown platform'
}

export function getDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Unknown device'
  const ua = navigator.userAgent

  if (/iPad/.test(ua)) return 'iPad'
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/Android/.test(ua)) return 'Android device'
  if (/Macintosh|Mac OS/.test(ua)) return 'MacBook'
  if (/Windows/.test(ua)) return 'Windows PC'
  if (/Linux/.test(ua)) return 'Linux device'
  return 'Unknown device'
}
