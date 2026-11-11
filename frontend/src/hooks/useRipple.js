import { useEffect, useRef } from 'react'
import { useMotionPreference } from './useMotionPreference'

export const RIPPLE_MS = 450
export const FLASH_MS = 120
const EASE_TIDE = 'cubic-bezier(0.22, 1, 0.36, 1)'

function spawnRipple(host, event) {
  const rect = host.getBoundingClientRect()
  const x = (event.clientX ?? rect.left + rect.width / 2) - rect.left
  const y = (event.clientY ?? rect.top + rect.height / 2) - rect.top
  // Radius reaching the farthest corner so the ripple always covers the button.
  const radius = Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y)) || 1

  const el = document.createElement('span')
  el.setAttribute('aria-hidden', 'true')
  el.setAttribute('data-ripple', '')
  Object.assign(el.style, {
    position: 'absolute',
    left: `${x - radius}px`,
    top: `${y - radius}px`,
    width: `${radius * 2}px`,
    height: `${radius * 2}px`,
    borderRadius: '50%',
    background: 'currentColor',
    opacity: '0',
    pointerEvents: 'none',
    transform: 'scale(0)',
  })
  host.appendChild(el)

  let done = false
  const cleanup = () => {
    if (done) return
    done = true
    clearTimeout(timer)
    el.remove()
  }
  // Fallback removal guarantees no element is left behind even without the Web Animations API.
  const timer = setTimeout(cleanup, RIPPLE_MS + 30)

  if (typeof el.animate === 'function') {
    const anim = el.animate(
      [
        { transform: 'scale(0)', opacity: 0.35 },
        { transform: 'scale(1)', opacity: 0 },
      ],
      { duration: RIPPLE_MS, easing: EASE_TIDE, fill: 'forwards' },
    )
    anim.onfinish = cleanup
    anim.oncancel = cleanup
  }
  return cleanup
}

function flash(host) {
  if (typeof host.animate === 'function') {
    host.animate([{ opacity: 1 }, { opacity: 0.6 }, { opacity: 1 }], { duration: FLASH_MS })
    return () => {}
  }
  host.setAttribute('data-flash', '')
  const timer = setTimeout(() => host.removeAttribute('data-flash'), FLASH_MS)
  return () => {
    clearTimeout(timer)
    host.removeAttribute('data-flash')
  }
}

/**
 * Press feedback for a button. Normal motion: 450ms radial ripple from the pointer origin
 * (transform + opacity, element removed afterwards). Reduced motion: 120ms opacity flash, no movement.
 * The host element needs `position: relative; overflow: hidden`.
 * @param {{ current: HTMLElement | null }} ref
 */
export function useRipple(ref) {
  const { reduced } = useMotionPreference()
  const reducedRef = useRef(reduced)
  reducedRef.current = reduced

  useEffect(() => {
    const host = ref?.current
    if (!host) return undefined
    const cleanups = new Set()

    const onPointerDown = (event) => {
      if (host.disabled || event.button > 0) return
      const cleanup = reducedRef.current ? flash(host) : spawnRipple(host, event)
      cleanups.add(cleanup)
    }

    host.addEventListener('pointerdown', onPointerDown)
    return () => {
      host.removeEventListener('pointerdown', onPointerDown)
      cleanups.forEach((fn) => fn())
      cleanups.clear()
      host.querySelectorAll(':scope > [data-ripple]').forEach((n) => n.remove())
    }
  }, [ref])
}

export default useRipple
