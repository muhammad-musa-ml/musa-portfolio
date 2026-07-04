// Cursor preference — picked in the ⌘K palette, remembered across visits.
//   reticle (default) · dot · system

export type CursorMode = 'reticle' | 'dot' | 'system'

const KEY = 'musa-cursor'

function read(): CursorMode {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'dot' || v === 'system' || v === 'reticle') return v
  } catch {
    /* private mode etc. */
  }
  return 'reticle'
}

let mode: CursorMode = read()
const subs = new Set<(m: CursorMode) => void>()

export function getCursorMode(): CursorMode {
  return mode
}

export function setCursorMode(m: CursorMode) {
  mode = m
  try {
    localStorage.setItem(KEY, m)
  } catch {
    /* ignore */
  }
  subs.forEach((f) => f(m))
}

export function onCursorMode(f: (m: CursorMode) => void): () => void {
  subs.add(f)
  return () => {
    subs.delete(f)
  }
}
