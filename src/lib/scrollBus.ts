// Tiny global store bridging Lenis scroll + pointer state to the 3D scene
// without triggering React re-renders every frame.

let progress = 0 // 0..1 across the full document
let pointerX = 0 // -1..1
let pointerY = 0 // -1..1

export function setScrollProgress(v: number) {
  progress = Math.min(1, Math.max(0, v))
}
export function getScrollProgress() {
  return progress
}

export function setPointer(x: number, y: number) {
  pointerX = x
  pointerY = y
}
export function getPointer() {
  return { x: pointerX, y: pointerY }
}
