// Platform-aware shortcut labels — "⌘K" reads as noise on a Windows laptop.
export const IS_MAC: boolean =
  typeof navigator !== 'undefined' &&
  /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent || '')

export const PALETTE_KEY = IS_MAC ? '⌘K' : 'ctrl K'
