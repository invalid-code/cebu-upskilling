import { useEffect, useState } from 'react'

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'

function getMediaQueryList() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  return window.matchMedia(REDUCED_QUERY)
}

function readReduced() {
  return Boolean(getMediaQueryList()?.matches)
}

function readSaveData() {
  if (typeof navigator === 'undefined') return false
  return navigator.connection?.saveData === true
}

// Probe WebGL2 support once; the result cannot change during a session.
let webglProbe
function probeWebGL2() {
  if (webglProbe !== undefined) return webglProbe
  try {
    if (typeof document === 'undefined') return false
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    webglProbe = Boolean(gl)
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    webglProbe = false
  }
  return webglProbe
}

/** Test helper: forget the cached WebGL2 probe result. */
export function resetWebGLProbe() {
  webglProbe = undefined
}

/**
 * Motion and capability flags for the water kit.
 * @returns {{ reduced: boolean, canUseWebGL: boolean, saveData: boolean, allowAmbient: boolean }}
 */
export function useMotionPreference() {
  const [reduced, setReduced] = useState(readReduced)
  const [saveData, setSaveData] = useState(readSaveData)
  const [canUseWebGL] = useState(probeWebGL2)

  useEffect(() => {
    const mql = getMediaQueryList()
    const connection = typeof navigator === 'undefined' ? undefined : navigator.connection

    const onMotionChange = (event) => setReduced(Boolean(event?.matches ?? mql?.matches))
    const onConnectionChange = () => setSaveData(readSaveData())

    // Re-sync in case the value changed between first render and effect.
    setReduced(readReduced())
    setSaveData(readSaveData())

    if (mql) {
      if (mql.addEventListener) mql.addEventListener('change', onMotionChange)
      else mql.addListener?.(onMotionChange)
    }
    connection?.addEventListener?.('change', onConnectionChange)

    return () => {
      if (mql) {
        if (mql.removeEventListener) mql.removeEventListener('change', onMotionChange)
        else mql.removeListener?.(onMotionChange)
      }
      connection?.removeEventListener?.('change', onConnectionChange)
    }
  }, [])

  return {
    reduced,
    canUseWebGL,
    saveData,
    allowAmbient: !reduced && !saveData && canUseWebGL,
  }
}

export default useMotionPreference
