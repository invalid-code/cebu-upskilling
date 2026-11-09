// Hand-written GLSL water renderer (WebGL2, no 3D library).
// This module is only ever loaded through a dynamic import from WaterCanvas.jsx so that it
// lands in its own chunk, requested after first paint.

const MAX_RIPPLES = 4
const RIPPLE_LIFETIME = 2.4 // seconds
const FRAME_INTERVAL = 1000 / 30 - 2 // ms; the -2 tolerates rAF timestamp jitter at 60Hz

const VERTEX_SRC = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`

const FRAGMENT_SRC = `#version 300 es
precision mediump float;
in vec2 v_uv;
out vec4 outColor;

uniform float u_time;
uniform float u_intensity;
uniform vec2 u_res;
uniform vec3 u_ripples[${MAX_RIPPLES}]; // xy = position (0..1), z = age in seconds (<0 = unused)

const vec3 DEEP = vec3(0.016, 0.231, 0.286);
const vec3 MID  = vec3(0.059, 0.463, 0.525);
const vec3 LIGHT = vec3(0.620, 0.894, 0.878);

float wave(vec2 p, vec2 dir, float freq, float speed) {
  return sin(dot(p, dir) * freq + u_time * speed);
}

void main() {
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = vec2(v_uv.x * aspect, v_uv.y);

  float h = 0.0;
  h += wave(p, normalize(vec2(1.0, 0.6)), 6.0, 0.55) * 0.5;
  h += wave(p, normalize(vec2(-0.7, 1.0)), 9.0, 0.38) * 0.3;
  h += wave(p, normalize(vec2(0.3, -1.0)), 14.0, 0.7) * 0.2;
  h *= 0.35 + 0.65 * u_intensity;

  // Soft pointer ripples: a gaussian ring that expands and fades.
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    vec3 r = u_ripples[i];
    if (r.z >= 0.0) {
      vec2 c = vec2(r.x * aspect, r.y);
      float d = distance(p, c);
      float radius = r.z * 0.35;
      float ring = exp(-pow((d - radius) * 14.0, 2.0));
      float fade = 1.0 - clamp(r.z / ${RIPPLE_LIFETIME.toFixed(1)}, 0.0, 1.0);
      h += ring * fade * fade * 0.6 * sin((d - radius) * 40.0);
    }
  }

  float shade = clamp(0.5 + h * 0.5, 0.0, 1.0);
  vec3 col = mix(DEEP, MID, shade);
  float crest = smoothstep(0.62, 1.0, shade);
  col = mix(col, LIGHT, crest * (0.25 + 0.5 * u_intensity));
  col = mix(col, DEEP, (1.0 - v_uv.y) * 0.25);
  outColor = vec4(col, 1.0);
}`

function compile(gl, type, source) {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('shader creation failed')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`shader compile failed: ${log}`)
  }
  return shader
}

/**
 * Create a renderer bound to `canvas`. Throws if a WebGL2 context or program cannot be created.
 * No frame is drawn until `start()` is called; `stop()` cancels the loop so paused canvases render nothing.
 */
export function createWaterRenderer(canvas, { intensity = 0.5 } = {}) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'low-power' })
  if (!gl) throw new Error('webgl2 unavailable')

  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SRC)
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC)
  const program = gl.createProgram()
  if (!program) throw new Error('program creation failed')
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`program link failed: ${gl.getProgramInfoLog(program)}`)
  }
  gl.useProgram(program)

  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(program, 'a_pos')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  const uTime = gl.getUniformLocation(program, 'u_time')
  const uIntensity = gl.getUniformLocation(program, 'u_intensity')
  const uRes = gl.getUniformLocation(program, 'u_res')
  const uRipples = gl.getUniformLocation(program, 'u_ripples')

  let level = intensity
  let rafId = 0
  let running = false
  let origin = 0 // performance.now() at start; elapsed time excludes paused periods
  let lastDraw = 0
  let elapsed = 0
  const ripples = Array.from({ length: MAX_RIPPLES }, () => ({ x: 0, y: 0, born: -1 }))
  let nextRipple = 0
  const rippleData = new Float32Array(MAX_RIPPLES * 3)

  function draw() {
    const t = elapsed
    for (let i = 0; i < MAX_RIPPLES; i += 1) {
      const r = ripples[i]
      const age = r.born < 0 ? -1 : t - r.born
      const alive = age >= 0 && age < RIPPLE_LIFETIME
      if (!alive) r.born = -1
      rippleData[i * 3] = r.x
      rippleData[i * 3 + 1] = r.y
      rippleData[i * 3 + 2] = alive ? age : -1
    }
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.uniform1f(uTime, t)
    gl.uniform1f(uIntensity, level)
    gl.uniform2f(uRes, canvas.width, canvas.height)
    gl.uniform3fv(uRipples, rippleData)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  function frame(now) {
    if (!running) return
    rafId = requestAnimationFrame(frame)
    // Cap at ~30fps: slow ambient motion does not need more, and skipped frames leave the main thread free.
    if (now - lastDraw < FRAME_INTERVAL) return
    lastDraw = now
    elapsed += (now - origin) / 1000
    origin = now
    draw()
  }

  return {
    start() {
      if (running) return
      running = true
      origin = performance.now()
      lastDraw = 0
      rafId = requestAnimationFrame(frame)
    },
    stop() {
      running = false
      if (rafId) cancelAnimationFrame(rafId)
      rafId = 0
    },
    isRunning: () => running,
    setIntensity(value) {
      level = Math.min(1, Math.max(0, Number(value) || 0))
    },
    resize(width, height) {
      const w = Math.max(1, Math.floor(width))
      const h = Math.max(1, Math.floor(height))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
    },
    /** Add a soft ripple at normalised coordinates (0..1, origin bottom-left). Takes effect next frame. */
    addRipple(x, y) {
      const r = ripples[nextRipple]
      nextRipple = (nextRipple + 1) % MAX_RIPPLES
      r.x = x
      r.y = y
      r.born = elapsed
    },
    destroy() {
      this.stop()
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    },
  }
}

export default createWaterRenderer
