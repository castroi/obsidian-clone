/**
 * Platform detection utilities
 */

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
}

export function isPWA(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
}

export function supportsNativeFS(): boolean {
  if (typeof window === 'undefined') return false
  return 'showDirectoryPicker' in window
}

export function supportsOPFS(): boolean {
  if (typeof navigator === 'undefined') return false
  return 'storage' in navigator && 'getDirectory' in navigator.storage
}

export function getPreferredAdapter(): 'native' | 'opfs' {
  if (supportsNativeFS() && !isIOS()) return 'native'
  if (supportsOPFS()) return 'opfs'
  return 'opfs' // fallback
}
