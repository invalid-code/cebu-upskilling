import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetWebGLProbe, useMotionPreference } from './useMotionPreference'

// Requirement 25.1

function installMatchMedia(initial) {
  const listeners = new Set()
  const mql = {
    matches: initial,
    addEventListener: vi.fn((_type, fn) => listeners.add(fn)),
    removeEventListener: vi.fn((_type, fn) => listeners.delete(fn)),
  }
  window.matchMedia = vi.fn(() => mql)
  return {
    mql,
    listeners,
    emit(matches) {
      mql.matches = matches
      listeners.forEach((fn) => fn({ matches }))
    },
  }
}

function installConnection(saveData) {
  const listeners = new Set()
  const connection = {
    saveData,
    addEventListener: vi.fn((_type, fn) => listeners.add(fn)),
    removeEventListener: vi.fn((_type, fn) => listeners.delete(fn)),
  }
  Object.defineProperty(navigator, 'connection', { value: connection, configurable: true })
  return {
    connection,
    listeners,
    emit(value) {
      connection.saveData = value
      listeners.forEach((fn) => fn())
    },
  }
}

function mockWebGL2(supported) {
  return vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation((type) =>
      type === 'webgl2' && supported ? { getExtension: () => null } : null,
    )
}

const originalMatchMedia = window.matchMedia

describe('useMotionPreference', () => {
  beforeEach(() => {
    resetWebGLProbe()
    installMatchMedia(false)
    installConnection(false)
    mockWebGL2(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.matchMedia = originalMatchMedia
    delete navigator.connection
    resetWebGLProbe()
  })

  it('defaults: motion allowed, no save-data, WebGL2 available, ambient allowed', () => {
    const { result } = renderHook(() => useMotionPreference())
    expect(result.current).toEqual({
      reduced: false,
      canUseWebGL: true,
      saveData: false,
      allowAmbient: true,
    })
  })

  it('reduced is true when prefers-reduced-motion matches, and disables ambient', () => {
    installMatchMedia(true)
    const { result } = renderHook(() => useMotionPreference())
    expect(result.current.reduced).toBe(true)
    expect(result.current.allowAmbient).toBe(false)
  })

  it('reduced defaults to false when matchMedia is unavailable', () => {
    window.matchMedia = undefined
    const { result } = renderHook(() => useMotionPreference())
    expect(result.current.reduced).toBe(false)
    expect(result.current.allowAmbient).toBe(true)
  })

  it('updates live when the media query changes and unsubscribes on unmount', () => {
    const mm = installMatchMedia(false)
    const { result, unmount } = renderHook(() => useMotionPreference())
    expect(result.current.reduced).toBe(false)

    act(() => mm.emit(true))
    expect(result.current.reduced).toBe(true)
    expect(result.current.allowAmbient).toBe(false)

    act(() => mm.emit(false))
    expect(result.current.reduced).toBe(false)
    expect(result.current.allowAmbient).toBe(true)

    unmount()
    expect(mm.mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    expect(mm.listeners.size).toBe(0)
  })

  it('saveData is true when the connection requests it, and disables ambient', () => {
    installConnection(true)
    const { result } = renderHook(() => useMotionPreference())
    expect(result.current.saveData).toBe(true)
    expect(result.current.allowAmbient).toBe(false)
  })

  it('saveData defaults to false when navigator.connection is missing', () => {
    delete navigator.connection
    const { result } = renderHook(() => useMotionPreference())
    expect(result.current.saveData).toBe(false)
    expect(result.current.allowAmbient).toBe(true)
  })

  it('updates live when the connection saveData changes', () => {
    const conn = installConnection(false)
    const { result, unmount } = renderHook(() => useMotionPreference())

    act(() => conn.emit(true))
    expect(result.current.saveData).toBe(true)
    expect(result.current.allowAmbient).toBe(false)

    unmount()
    expect(conn.listeners.size).toBe(0)
  })

  it('canUseWebGL is false when WebGL2 context is unavailable, and disables ambient', () => {
    vi.restoreAllMocks()
    resetWebGLProbe()
    mockWebGL2(false)
    const { result } = renderHook(() => useMotionPreference())
    expect(result.current.canUseWebGL).toBe(false)
    expect(result.current.allowAmbient).toBe(false)
  })

  it('canUseWebGL is false when the probe throws', () => {
    vi.restoreAllMocks()
    resetWebGLProbe()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      throw new Error('no gl')
    })
    const { result } = renderHook(() => useMotionPreference())
    expect(result.current.canUseWebGL).toBe(false)
  })

  it('caches the WebGL2 probe until resetWebGLProbe is called', () => {
    const spy = HTMLCanvasElement.prototype.getContext
    renderHook(() => useMotionPreference())
    renderHook(() => useMotionPreference())
    expect(spy).toHaveBeenCalledTimes(1)

    resetWebGLProbe()
    renderHook(() => useMotionPreference())
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('allowAmbient is true only when all three conditions hold', () => {
    installMatchMedia(true)
    installConnection(true)
    const { result } = renderHook(() => useMotionPreference())
    expect(result.current.reduced).toBe(true)
    expect(result.current.saveData).toBe(true)
    expect(result.current.allowAmbient).toBe(false)
  })
})
