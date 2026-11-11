/**
 * Decide how an ambient WaterCanvas should render.
 *
 * @param {{ reduced: boolean, saveData: boolean, webgl2: boolean, cores: number, inView: boolean, tabVisible: boolean }} env
 * @param {number} activeCanvasCount number of other canvases already animating
 * @returns {'animate' | 'paused' | 'static'}
 */
export function shouldRenderWaterCanvas(env, activeCanvasCount) {
  if (env.reduced || env.saveData || !env.webgl2 || env.cores <= 2) {
    return 'static'
  }
  if (activeCanvasCount >= 1) {
    return 'static'
  }
  if (!env.inView || !env.tabVisible) {
    return 'paused'
  }
  return 'animate'
}

export default shouldRenderWaterCanvas
