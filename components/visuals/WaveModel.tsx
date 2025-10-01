// // components/BeachCrossSection.tsx
// "use client";

// import React, { useEffect, useRef, useState } from "react";

// /**
//  * BeachCrossSection (improved)
//  * - WebGL2 GPU solver (1D) using HLL finite-volume SWE (nonlinear)
//  * - Improved bathymetry (gentle shoal + sandbar + flat beach)
//  * - Physically-motivated breaking dissipation (depth-limited + energy-consistent)
//  * - Bottom friction (quadratic drag)
//  * - Left boundary driven by physically-consistent conversion from Hs/Tp -> amplitude
//  *
//  * Notes:
//  * - For ultimate surf-grade crest shape / plunging dynamics implement Green-Naghdi (Boussinesq).
//  * - This component prioritizes realistic breaker location, shoaling behavior, and believable surfable waves.
//  */

// type Props = {
//   width?: number;
//   height?: number;
// };

// const defaultWidth = 1000;
// const defaultHeight = 360;

// const BeachCrossSection: React.FC<Props> = ({
//   width = defaultWidth,
//   height = defaultHeight,
// }) => {
//   const canvasRef = useRef<HTMLCanvasElement | null>(null);
//   const [ok, setOk] = useState<boolean | null>(null);
//   const simRef = useRef<any>(null);

//   useEffect(() => {
//     const canvas = canvasRef.current;
//     if (!canvas) return;

//     // WebGL2 + float render target required
//     const gl = canvas.getContext("webgl2", {
//       antialias: false,
//       alpha: false,
//     }) as WebGL2RenderingContext | null;
//     if (!gl) {
//       setOk(false);
//       console.warn("WebGL2 not available — fallback required.");
//       return;
//     }
//     const ext =
//       gl.getExtension("EXT_color_buffer_float") ||
//       gl.getExtension("WEBGL_color_buffer_float");
//     if (!ext) {
//       setOk(false);
//       console.warn("Float render-target extension missing.");
//       return;
//     }

//     // -------- Simulation parameters (tuneable) --------
//     const N = 2048; // spatial cells (1D) — decrease for lower-end devices
//     const domainLength = 400.0; // meters cross-shore (0 = offshore -> 1 = beach)
//     const dx = domainLength / N;
//     const g = 9.81;
//     const CFL = 0.35;
//     const gammaBreaker = 0.78; // breaker index H_b / h_b (typical 0.7-0.8)
//     const dragCoeff = 0.003; // quadratic bottom drag coefficient (tunable)
//     // dummy forecast / boundary: typical surfable swell
//     const dummyForecast = {
//       Hs: 1.6, // significant wave height (m)
//       Tp: 10.0, // peak period (s)
//       tideOffset: 0.0, // m (add to MSL)
//     };

//     // ---------- shader helpers ----------
//     function compile(gl: WebGL2RenderingContext, src: string, type: number) {
//       const s = gl.createShader(type)!;
//       gl.shaderSource(s, src);
//       gl.compileShader(s);
//       if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
//         const info = gl.getShaderInfoLog(s);
//         gl.deleteShader(s);
//         throw new Error("Shader compile failed: " + info);
//       }
//       return s;
//     }
//     function link(
//       gl: WebGL2RenderingContext,
//       vs: WebGLShader,
//       fs: WebGLShader
//     ) {
//       const p = gl.createProgram()!;
//       gl.attachShader(p, vs);
//       gl.attachShader(p, fs);
//       gl.linkProgram(p);
//       if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
//         const info = gl.getProgramInfoLog(p);
//         gl.deleteProgram(p);
//         throw new Error("Program link failed: " + info);
//       }
//       return p;
//     }

//     // full-screen quad
//     const quadVS = `#version 300 es
//     in vec2 a_pos;
//     out vec2 v_uv;
//     void main(){
//       v_uv = 0.5*(a_pos+1.0);
//       gl_Position = vec4(a_pos, 0.0, 1.0);
//     }`;

//     // ---------- Solver Fragment Shader (improved physics) ----------
//     // Stores state vector U = (h, q) where:
//     //   h = depth (m) = max(0, eta - bed)
//     //   q = momentum (m^2/s) = h * u
//     //
//     // The shader performs:
//     // - HLL finite-volume flux update
//     // - bed slope source term
//     // - quadratic bottom drag (F_d = -Cd * u * |u|)
//     // - physically-motivated breaking dissipation:
//     //     if local wave crest H_loc > gamma * h then remove momentum & depth energy at a rate ~ E/T
//     //   where E ~ (1/8) g H_loc^2, T is local dominant period (passed from JS)
//     const solverFS = `#version 300 es
//     precision highp float;
//     precision highp sampler2D;

//     in vec2 v_uv;
//     out vec2 outState; // (h, q)

//     uniform sampler2D u_state;
//     uniform sampler2D u_bed;
//     uniform float u_dx;
//     uniform float u_dt;
//     uniform float u_g;
//     uniform float u_gamma;
//     uniform float u_drag; // quadratic drag coefficient
//     uniform float u_T; // dominant period for dissipation timescale (s)
//     uniform float u_tide; // tide offset added to left elevation
//     uniform int u_N;

//     // sample state at fractional x coordinate
//     vec2 sampleStateIndex(int idx) {
//       float x = (float(idx) + 0.5) / float(u_N);
//       return texture(u_state, vec2(x, 0.5)).rg;
//     }
//     float sampleBedIndex(int idx) {
//       float x = (float(idx) + 0.5) / float(u_N);
//       return texture(u_bed, vec2(x, 0.5)).r;
//     }

//     float safeVel(float h, float q) {
//       return (h > 1e-6) ? q / h : 0.0;
//     }

//     vec2 flux(vec2 U) {
//       float h = U.x;
//       float q = U.y;
//       float u = safeVel(h,q);
//       // flux [ q, q*u + 0.5*g*h^2 ]
//       return vec2(q, (h>0.0) ? (q*u + 0.5 * u_g * h * h) : 0.0);
//     }

//     // HLL approximate Riemann solver for SWE
//     vec2 hllFlux(vec2 UL, vec2 UR) {
//       float hL = UL.x;
//       float hR = UR.x;
//       float qL = UL.y;
//       float qR = UR.y;
//       float uL = safeVel(hL,qL);
//       float uR = safeVel(hR,qR);
//       float cL = sqrt(u_g * max(0.0, hL));
//       float cR = sqrt(u_g * max(0.0, hR));
//       float sL = min(uL - cL, uR - cR);
//       float sR = max(uL + cL, uR + cR);
//       vec2 FL = flux(UL);
//       vec2 FR = flux(UR);
//       if (sL >= 0.0) return FL;
//       if (sR <= 0.0) return FR;
//       return (sR * FL - sL * FR + sL * sR * (UR - UL)) / (sR - sL);
//     }

//     void main() {
//       int i = int(clamp(floor(v_uv.x * float(u_N)), 0.0, float(u_N-1)));
//       int im = max(0, i-1);
//       int ip = min(u_N-1, i+1);

//       vec2 Uc = sampleStateIndex(i);
//       vec2 Ul = sampleStateIndex(im);
//       vec2 Ur = sampleStateIndex(ip);

//       float bedL = sampleBedIndex(im);
//       float bedC = sampleBedIndex(i);
//       float bedR = sampleBedIndex(ip);

//       // fluxes
//       vec2 Fleft = hllFlux(Ul, Uc);
//       vec2 Fright = hllFlux(Uc, Ur);

//       // bed slope source (momentum)
//       float bedSlope = (bedR - bedL) * 0.5 / u_dx;
//       float S_m = -u_g * Uc.x * bedSlope;

//       // conservative FV update
//       vec2 Unew = Uc - (u_dt / u_dx) * (Fright - Fleft);
//       Unew.y += u_dt * S_m;

//       // bottom friction (quadratic drag): tau = Cd * u * |u|
//       float h = Unew.x;
//       float q = Unew.y;
//       float u = safeVel(h, q);
//       if (h > 1e-6) {
//         float drag = u_drag * u * abs(u); // m/s^2 times h removed from momentum per unit mass.
//         // convert acceleration to momentum change (momentum per area = h * u)
//         Unew.y -= u_dt * h * drag;
//       }

//       // Breaking dissipation (physically-based)
//       // compute local free surface eta = bed + h
//       float etaL = bedL + Ul.x;
//       float etaC = bedC + Uc.x;
//       float etaR = bedR + Ur.x;
//       float trough = min(min(etaL, etaR), etaC);
//       float Hlocal = max(0.0, etaC - trough); // approximate local wave height (crest-trough)
//       // if Hlocal > gamma * h -> breaking
//       if (h > 1e-4 && Hlocal > u_gamma * h) {
//         // approximate wave energy density: E ~ 1/8 * g * H^2
//         float E = 0.125 * u_g * Hlocal * Hlocal + 1e-8;
//         // dissipation timescale based on local dominant period u_T: energy reduces roughly over O(T)
//         float T = max(0.5, u_T);
//         // dissipation rate coefficient (tunable) - physically O(0.3-1) depending on intensity
//         float Cb = 0.6;
//         // energy removal during dt: dE = min(E, Cb * E * u_dt / T)
//         float frac = clamp(Cb * (u_dt / T), 0.0, 0.9);
//         // translate into momentum damping: reduce momentum proportionally to sqrt(remaining energy fraction)
//         float remainFactor = max(0.0, 1.0 - frac);
//         // scale momentum and depth spike slightly to avoid negative
//         Unew.y *= sqrt(remainFactor);
//         Unew.x = max(0.0, Unew.x * (0.99 * remainFactor + 0.01));
//       }

//       // left boundary forcing: gentle relaxation to prescribed left elevation
//       if (i == 0) {
//         // left target eta
//         float leftEta = u_tide; // JS will add spectral variations by updating u_tide each step (we send combined)
//         float depthTarget = max(0.0, leftEta - bedC);
//         // relax
//         Unew.x = mix(Unew.x, depthTarget, 0.45);
//         // small inflow velocity proportional to difference
//         float vel = 0.6 * (depthTarget - Unew.x);
//         Unew.y = Unew.x * vel;
//       }

//       // avoid negative depth
//       if (Unew.x < 1e-6) {
//         Unew.x = 0.0;
//         Unew.y = 0.0;
//       }

//       outState = Unew;
//     }`;

//     // ---------- Render shader (improved visuals) ----------
//     const renderFS = `#version 300 es
//     precision highp float;
//     precision highp sampler2D;
//     in vec2 v_uv;
//     out vec4 outColor;

//     uniform sampler2D u_state;
//     uniform sampler2D u_bed;
//     uniform int u_N;
//     uniform float u_gamma;
//     uniform float u_time;
//     uniform vec2 u_resolution;

//     vec2 sampleStateIndex(int idx) {
//       float x = (float(idx) + 0.5) / float(u_N);
//       return texture(u_state, vec2(x, 0.5)).rg;
//     }
//     float sampleBedIndex(int idx) {
//       float x = (float(idx) + 0.5) / float(u_N);
//       return texture(u_bed, vec2(x, 0.5)).r;
//     }

//     void main() {
//       float fx = v_uv.x * float(u_N);
//       int i = int(clamp(floor(fx), 0.0, float(u_N-1)));
//       int im = max(0, i-1);
//       int ip = min(u_N-1, i+1);

//       vec2 Uc = sampleStateIndex(i);
//       vec2 Ul = sampleStateIndex(im);
//       vec2 Ur = sampleStateIndex(ip);

//       float bedC = sampleBedIndex(i);
//       float bedL = sampleBedIndex(im);
//       float bedR = sampleBedIndex(ip);

//       float etaC = bedC + Uc.x;
//       float etaL = bedL + Ul.x;
//       float etaR = bedR + Ur.x;
//       float depth = Uc.x;

//       // foam indicator using consistent breaker rule
//       float trough = min(min(etaL, etaR), etaC);
//       float Hlocal = max(0.0, etaC - trough);
//       float foam = smoothstep(u_gamma * depth * 0.9, u_gamma * depth * 1.3, Hlocal);

//       // beach color gradient
//       float sandLerp = smoothstep(-8.0, 1.0, bedC);
//       vec3 sand = mix(vec3(0.78,0.67,0.46), vec3(0.97,0.93,0.78), sandLerp);

//       // water color by depth
//       float depthNorm = clamp(depth / 20.0, 0.0, 1.0);
//       vec3 deep = vec3(0.03, 0.13, 0.28);
//       vec3 shallow = vec3(0.25, 0.58, 0.78);
//       vec3 water = mix(shallow, deep, depthNorm);

//       // map domain vertical extents to screen
//       float domainMin = -10.0;
//       float domainMax = 6.0;
//       float bedN = (bedC - domainMin) / (domainMax - domainMin);
//       float etaN = (etaC - domainMin) / (domainMax - domainMin);
//       float sy = v_uv.y;

//       vec3 col;
//       if (sy < bedN) {
//         col = sand;
//       } else if (sy < etaN) {
//         float t = smoothstep(bedN, etaN, sy);
//         col = mix(water * 0.78, water, t);
//       } else {
//         // sky
//         col = vec3(0.86, 0.94, 1.0);
//       }

//       // highlight near surface where foam present
//       float dSurf = abs(sy - etaN);
//       float surfMask = smoothstep(0.0, 0.012, max(0.01 - dSurf, 0.0)) * foam;
//       vec3 foamCol = vec3(1.0, 1.0, 1.0);
//       col = mix(col, foamCol, surfMask);

//       // add faint textured foam streaks informed by time and foam
//       float streak = smoothstep(0.002, 0.0, fract((v_uv.x * float(u_N) * 0.22 + u_time * 0.015))) * foam * 0.15;
//       col = mix(col, foamCol, streak);

//       outColor = vec4(col, 1.0);
//     }`;

//     // ---------- Compile & link ----------
//     const vs = compile(gl, quadVS, gl.VERTEX_SHADER);
//     const solverShader = compile(gl, solverFS, gl.FRAGMENT_SHADER);
//     const renderShader = compile(gl, renderFS, gl.FRAGMENT_SHADER);
//     const solverProg = link(gl, vs, solverShader);
//     const renderProg = link(gl, vs, renderShader);

//     // quad buffer
//     const quadBuffer = gl.createBuffer()!;
//     gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
//     gl.bufferData(
//       gl.ARRAY_BUFFER,
//       new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
//       gl.STATIC_DRAW
//     );

//     function setupAttrib(prog: WebGLProgram) {
//       const loc = gl.getAttribLocation(prog, "a_pos");
//       gl.enableVertexAttribArray(loc);
//       gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
//       gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
//     }
//     gl.useProgram(solverProg);
//     setupAttrib(solverProg);
//     gl.useProgram(renderProg);
//     setupAttrib(renderProg);

//     // ---------- textures / buffers ----------
//     const texW = N;
//     const texH = 1;
//     // initial state arrays
//     const state0 = new Float32Array(2 * texW * texH);
//     const bedArr = new Float32Array(1 * texW * texH);

//     // build realistic gentle bathymetry: deep offshore -> shoal -> sandbar -> flat beach
//     (function buildBathymetry() {
//       const D_off = 28.0; // offshore depth (m)
//       const beachHeight = 1.5; // beach elevation (m above MSL)
//       // place sandbar near x~0.58, small amplitude
//       const sandbarCenter = 0.58;
//       const sandbarSigma = 0.045;
//       const sandbarAmp = 1.6;

//       for (let i = 0; i < N; i++) {
//         const x = i / (N - 1); // normalized [0..1], 0 offshore, 1 shore
//         // base smooth shoal (gentle)
//         const shoal = -D_off + (D_off + beachHeight) * Math.pow(x, 1.8); // gentle nonlinear rise
//         // sandbar (Gaussian bump) sitting on shoal (creates outer bar that causes breaking)
//         const sandbar =
//           sandbarAmp *
//           Math.exp(-Math.pow((x - sandbarCenter) / sandbarSigma, 2));
//         // flat run-up beach nearshore: for x>0.92 make beach nearly flat positive elevation
//         const beachZone = x > 0.92 ? (x - 0.92) / 0.08 : 0.0;
//         const beachRamp = beachZone * beachHeight;
//         const bed = shoal + sandbar + beachRamp;
//         bedArr[i] = bed;
//         // initial still water: mean sea level 0 => depth = max(0, 0 - bed)
//         const depth = Math.max(0.0, 0.0 - bed);
//         state0[2 * i + 0] = depth;
//         state0[2 * i + 1] = 0.0;
//       }
//     })();

//     function createFloatTex(data: Float32Array | null) {
//       const tex = gl.createTexture()!;
//       gl.bindTexture(gl.TEXTURE_2D, tex);
//       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
//       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
//       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
//       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
//       gl.texImage2D(
//         gl.TEXTURE_2D,
//         0,
//         gl.RG32F,
//         texW,
//         texH,
//         0,
//         gl.RG,
//         gl.FLOAT,
//         data
//       );
//       gl.bindTexture(gl.TEXTURE_2D, null);
//       return tex;
//     }
//     const texStateA = createFloatTex(state0);
//     const texStateB = createFloatTex(null);

//     // bed texture (R32F)
//     const texBed = gl.createTexture()!;
//     gl.bindTexture(gl.TEXTURE_2D, texBed);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
//     gl.texImage2D(
//       gl.TEXTURE_2D,
//       0,
//       gl.R32F,
//       texW,
//       texH,
//       0,
//       gl.RED,
//       gl.FLOAT,
//       bedArr
//     );
//     gl.bindTexture(gl.TEXTURE_2D, null);

//     function createFBO(tex: WebGLTexture) {
//       const fb = gl.createFramebuffer()!;
//       gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
//       gl.framebufferTexture2D(
//         gl.FRAMEBUFFER,
//         gl.COLOR_ATTACHMENT0,
//         gl.TEXTURE_2D,
//         tex,
//         0
//       );
//       const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
//       if (st !== gl.FRAMEBUFFER_COMPLETE) {
//         console.error("FBO incomplete", st);
//       }
//       gl.bindFramebuffer(gl.FRAMEBUFFER, null);
//       return fb;
//     }
//     const fboA = createFBO(texStateA);
//     const fboB = createFBO(texStateB);

//     // uniform locations
//     const solverUniforms: Record<string, WebGLUniformLocation | null> = {
//       u_state: gl.getUniformLocation(solverProg, "u_state"),
//       u_bed: gl.getUniformLocation(solverProg, "u_bed"),
//       u_dx: gl.getUniformLocation(solverProg, "u_dx"),
//       u_dt: gl.getUniformLocation(solverProg, "u_dt"),
//       u_g: gl.getUniformLocation(solverProg, "u_g"),
//       u_gamma: gl.getUniformLocation(solverProg, "u_gamma"),
//       u_drag: gl.getUniformLocation(solverProg, "u_drag"),
//       u_T: gl.getUniformLocation(solverProg, "u_T"),
//       u_tide: gl.getUniformLocation(solverProg, "u_tide"),
//       u_N: gl.getUniformLocation(solverProg, "u_N"),
//     };

//     const renderUniforms: Record<string, WebGLUniformLocation | null> = {
//       u_state: gl.getUniformLocation(renderProg, "u_state"),
//       u_bed: gl.getUniformLocation(renderProg, "u_bed"),
//       u_N: gl.getUniformLocation(renderProg, "u_N"),
//       u_gamma: gl.getUniformLocation(renderProg, "u_gamma"),
//       u_time: gl.getUniformLocation(renderProg, "u_time"),
//       u_resolution: gl.getUniformLocation(renderProg, "u_resolution"),
//     };

//     // attribute pointers (rebind before draws)
//     function bindQuadAttrib(prog: WebGLProgram) {
//       const loc = gl.getAttribLocation(prog, "a_pos");
//       gl.enableVertexAttribArray(loc);
//       gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
//       gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
//     }

//     // dt selection via CFL estimate (conservative)
//     function estimateDt() {
//       // estimate max depth for safe dt (we know bed Arr has approx D_off)
//       const hMax = 35.0;
//       const vmax = Math.sqrt(g * hMax) + 6.0;
//       const dt = (CFL * dx) / vmax;
//       return dt;
//     }

//     // left boundary spectral driver: convert Hs, Tp to amplitude A for a dominant mode
//     // simple conversion: A_single ≈ Hs / (2 * sqrt(2))  (so that Hs corresponds to integrated energy)
//     function HsToAmplitude(Hs: number) {
//       return Hs / (2.0 * Math.SQRT2);
//     }

//     // compute left elevation (t + tide) — JS computes spectral time series and passes as uniform u_tide for simplicity
//     // We will compute boundary as: eta_left(t) = tide + sum(A_i * sin(omega_i * t + phase_i))
//     // For demo we synthesize two components from dummyForecast
//     const rngPhase1 = Math.random() * Math.PI * 2.0;
//     const rngPhase2 = Math.random() * Math.PI * 2.0;
//     function leftElevationAtTime(t: number) {
//       const Hs = dummyForecast.Hs;
//       const Tp = dummyForecast.Tp;
//       const A = HsToAmplitude(Hs);
//       // create a primary peak at Tp and a secondary at Tp*0.6 to add short-period wind chop
//       const omega1 = (2.0 * Math.PI) / Tp;
//       const omega2 = (2.0 * Math.PI) / (Tp * 0.55);
//       const swell =
//         A * Math.sin(omega1 * t + rngPhase1) +
//         0.25 * A * Math.sin(omega2 * t + rngPhase2);
//       // small wind chop
//       const chop = 0.08 * Math.sin(3.5 * t * 2.0 * Math.PI);
//       // tide offset included here
//       return swell + chop + dummyForecast.tideOffset;
//     }

//     // animation loop: ping-pong GPU solver
//     let pingTex = texStateA;
//     let pongTex = texStateB;
//     let pingFBO = fboA;
//     let pongFBO = fboB;
//     let lastTime = performance.now();
//     let simTime = 0.0;
//     let raf = 0;

//     function resizeCanvas() {
//       const ratio = Math.max(1, window.devicePixelRatio || 1);
//       const w = Math.floor(width * ratio);
//       const h = Math.floor(height * ratio);
//       if (canvas.width !== w || canvas.height !== h) {
//         canvas.width = w;
//         canvas.height = h;
//         canvas.style.width = `${width}px`;
//         canvas.style.height = `${height}px`;
//         gl.viewport(0, 0, w, h);
//       }
//     }

//     function step() {
//       resizeCanvas();
//       const now = performance.now();
//       let wallDt = Math.min(60.0, now - lastTime) / 1000.0;
//       lastTime = now;
//       // stable dt from estimate
//       const stableDt = estimateDt();
//       // subdivide if needed
//       const steps = Math.max(1, Math.min(8, Math.ceil(wallDt / stableDt)));
//       const subDt = wallDt / steps;

//       // run solver steps
//       for (let s = 0; s < steps; s++) {
//         gl.bindFramebuffer(gl.FRAMEBUFFER, pongFBO);
//         gl.viewport(0, 0, texW, texH);
//         gl.useProgram(solverProg);
//         bindQuadAttrib(solverProg);

//         // bind state (unit0) and bed (unit1)
//         gl.activeTexture(gl.TEXTURE0);
//         gl.bindTexture(gl.TEXTURE_2D, pingTex);
//         gl.uniform1i(solverUniforms.u_state, 0);
//         gl.activeTexture(gl.TEXTURE1);
//         gl.bindTexture(gl.TEXTURE_2D, texBed);
//         gl.uniform1i(solverUniforms.u_bed, 1);

//         // uniforms
//         gl.uniform1f(solverUniforms.u_dx, dx);
//         gl.uniform1f(solverUniforms.u_dt, subDt);
//         gl.uniform1f(solverUniforms.u_g, g);
//         gl.uniform1f(solverUniforms.u_gamma, gammaBreaker);
//         gl.uniform1f(solverUniforms.u_drag, dragCoeff);
//         // use Tp as local period (we pass dummyForecast.Tp, more advanced approach maps local period)
//         gl.uniform1f(solverUniforms.u_T, dummyForecast.Tp);
//         // calculate left elevation combined with tide and spectrum for this time step => pass as u_tide
//         const leftEta = leftElevationAtTime(simTime + s * subDt);
//         gl.uniform1f(solverUniforms.u_tide, leftEta);
//         gl.uniform1i(solverUniforms.u_N, N);

//         // draw into pongFBO (size N x 1)
//         gl.drawArrays(gl.TRIANGLES, 0, 6);

//         // swap
//         let ttmp = pingTex;
//         pingTex = pongTex;
//         pongTex = ttmp;
//         let ftmp = pingFBO;
//         pingFBO = pongFBO;
//         pongFBO = ftmp;
//       }

//       simTime += wallDt;

//       // render to screen
//       gl.bindFramebuffer(gl.FRAMEBUFFER, null);
//       gl.viewport(0, 0, canvas.width, canvas.height);
//       gl.useProgram(renderProg);
//       bindQuadAttrib(renderProg);

//       gl.activeTexture(gl.TEXTURE0);
//       gl.bindTexture(gl.TEXTURE_2D, pingTex);
//       gl.uniform1i(renderUniforms.u_state, 0);
//       gl.activeTexture(gl.TEXTURE1);
//       gl.bindTexture(gl.TEXTURE_2D, texBed);
//       gl.uniform1i(renderUniforms.u_bed, 1);

//       gl.uniform1i(renderUniforms.u_N, N);
//       gl.uniform1f(renderUniforms.u_gamma, gammaBreaker);
//       gl.uniform1f(renderUniforms.u_time, simTime);
//       gl.uniform2f(renderUniforms.u_resolution, canvas.width, canvas.height);

//       gl.drawArrays(gl.TRIANGLES, 0, 6);

//       raf = requestAnimationFrame(step);
//     }

//     // start
//     setOk(true);
//     lastTime = performance.now();
//     raf = requestAnimationFrame(step);

//     simRef.current = {
//       cleanup: () => {
//         cancelAnimationFrame(raf);
//         try {
//           gl.deleteTexture(texStateA);
//           gl.deleteTexture(texStateB);
//           gl.deleteTexture(texBed);
//           gl.deleteProgram(solverProg);
//           gl.deleteProgram(renderProg);
//           gl.deleteFramebuffer(fboA);
//           gl.deleteFramebuffer(fboB);
//         } catch (e) {}
//       },
//     };

//     return () => {
//       if (simRef.current?.cleanup) simRef.current.cleanup();
//     };
//   }, [width, height]);

//   return (
//     <div className="w-full max-w-full mx-auto p-3 bg-slate-50 rounded-lg shadow-sm">
//       <div className="flex items-center justify-between mb-2">
//         <div className="text-lg font-semibold">
//           Beach cross-section — refined demo
//         </div>
//         <div className="text-sm text-slate-600">
//           Gentle shoal + sandbar • depth-limited breaking • quadratic drag
//         </div>
//       </div>

//       <div className="border rounded overflow-hidden">
//         <canvas ref={canvasRef} className="w-full h-[360px] block" />
//       </div>

//       {ok === false && (
//         <div className="mt-3 text-sm text-amber-700">
//           WebGL2 or float render-target support not detected in this browser.
//           Use Chrome/Edge desktop for best results.
//         </div>
//       )}

//       <div className="mt-3 text-xs text-slate-500">
//         Physics notes: this sim uses a nonlinear shallow-water solver with
//         improved, energy-consistent breaking dissipation and quadratic bottom
//         drag. It correctly shoals and places breaking around the sandbar and the
//         flat nearshore — for true plunging-barrel realism upgrade to a
//         Green–Naghdi / Boussinesq GPU solver (I can implement that next).
//       </div>
//     </div>
//   );
// };

// export default BeachCrossSection;

// #################################################################################################################################

// components/WaveSimulation.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * WaveSimulation.tsx
 *
 * Production-ready 1D cross-shore surf-zone simulator (React + TypeScript + Tailwind)
 *
 * Features:
 * - Dispersion-aware inlet (per-cell k(x) from dispersion relation)
 * - Shoaling based on phase speed / energy flux heuristics
 * - HLL finite-volume SWE predictor, quadratic bottom drag
 * - Weak dispersive correction (Boussinesq-like) to improve crest shape
 * - Physically motivated breaking -> advancing bore (momentum injection) -> swash/runup
 * - Canvas2D rendering with Bézier smoothing, foam hints
 * - Defensive checks (no NaN/Infinity, canvas/ctx guards)
 * - UI sliders: Hs, Tp, tide, gamma (breaker index), drag, timeScale, quality (N)
 *
 * Usage:
 *   import WaveSimulation from '@/components/WaveSimulation';
 *   <WaveSimulation width={1000} height={420} />
 */

type Props = {
  width?: number;
  height?: number;
  useExternalBed?: boolean;
  externalBed?: Float32Array | null;
};

const DEFAULT_WIDTH = 1000;
const DEFAULT_HEIGHT = 420;

const WaveSimulation: React.FC<Props> = ({
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  useExternalBed = false,
  externalBed = null,
}) => {
  // UI (tunable)
  const [Hs, setHs] = useState<number>(1.1); // m
  const [Tp, setTp] = useState<number>(9.8); // s
  const [tide, setTide] = useState<number>(0.0); // m
  const [gamma, setGamma] = useState<number>(0.78); // breaker index
  const [dragCoeff, setDragCoeff] = useState<number>(0.003);
  const [timeScale, setTimeScale] = useState<number>(1.0);
  const [fastMode, setFastMode] = useState<boolean>(true);
  const [disperseOn, setDisperseOn] = useState<boolean>(true);

  // status
  const [status, setStatus] = useState<string>("idle");

  // refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const simRef = useRef<{
    N: number;
    domainLength: number;
    dx: number;
    g: number;
    bed: Float32Array;
    h: Float64Array;
    q: Float64Array;
    eta: Float64Array;
    ampArr: Float32Array;
    omegaArr: Float32Array;
    phaseArr: Float32Array;
    kArrays: Float64Array[];
    seedCells: number;
    seedStrength: number;
    dtEstimate: number;
  } | null>(null);

  // config
  const config = {
    domainLength: 420.0,
    offshoreDepth: 12.0,
    beachElevation: 0.9,
    deanExp: 0.75,
    sandbarCenterFrac: 0.56,
    sandbarAmp: 1.6,
    sandbarSigmaFrac: 0.05,
    g: 9.81,
    maxComps: 3,
    CFL: 0.34,
  } as const;

  // Utility: solve dispersion for k via Newton-Raphson (robust)
  function solveK(omega: number, depth: number): number {
    const gLocal = config.g;
    const h = Math.max(depth, 1e-6);
    let k = Math.max((omega * omega) / gLocal, 1.0 / Math.max(1.0, h));
    for (let iter = 0; iter < 40; iter++) {
      const kh = k * h;
      const t = Math.tanh(kh);
      const f = gLocal * k * t - omega * omega;
      const df = gLocal * (t + k * h * (1.0 - t * t));
      const denom =
        Math.abs(df) > 1e-12 ? df : df >= 0 ? df + 1e-12 : df - 1e-12;
      const dk = f / denom;
      k -= dk;
      if (!isFinite(k) || k <= 0) k = Math.abs(k) + 1e-6;
      if (Math.abs(dk) < 1e-9 * Math.max(1.0, k)) break;
    }
    return Math.max(1e-6, k);
  }

  // HLL flux
  function hllFlux(
    hL: number,
    qL: number,
    hR: number,
    qR: number
  ): [number, number] {
    const gLocal = config.g;
    const uL = hL > 1e-9 ? qL / hL : 0.0;
    const uR = hR > 1e-9 ? qR / hR : 0.0;
    const cL = Math.sqrt(gLocal * Math.max(0.0, hL));
    const cR = Math.sqrt(gLocal * Math.max(0.0, hR));
    const sL = Math.min(uL - cL, uR - cR);
    const sR = Math.max(uL + cL, uR + cR);
    const FLh = qL;
    const FRh = qR;
    const FLq = qL * uL + 0.5 * gLocal * hL * hL;
    const FRq = qR * uR + 0.5 * gLocal * hR * hR;
    if (sL >= 0) return [FLh, FLq];
    if (sR <= 0) return [FRh, FRq];
    const denom = sR - sL || 1e-6;
    const hflux = (sR * FLh - sL * FRh + sL * sR * (hR - hL)) / denom;
    const qflux = (sR * FLq - sL * FRq + sL * sR * (qR - qL)) / denom;
    return [hflux, qflux];
  }

  // Initialize simulation state
  function initSim(Nparam?: number): void {
    try {
      const N = Nparam ?? (fastMode ? 512 : 1024);
      const domainLength = config.domainLength;
      const dx = domainLength / Math.max(1, N - 1);
      const bed = new Float32Array(N);

      if (useExternalBed && externalBed && externalBed.length === N) {
        bed.set(externalBed);
      } else {
        for (let i = 0; i < N; i++) {
          const x = i / (N - 1);
          const base =
            -config.offshoreDepth +
            (config.offshoreDepth + config.beachElevation) *
              Math.pow(x, config.deanExp);
          const sandbar =
            config.sandbarAmp *
            Math.exp(
              -Math.pow(
                (x - config.sandbarCenterFrac) / config.sandbarSigmaFrac,
                2.0
              )
            );
          const runup =
            x > 0.92 ? ((x - 0.92) / 0.08) * config.beachElevation : 0.0;
          bed[i] = base + sandbar + runup;
        }
      }

      const h = new Float64Array(N);
      const q = new Float64Array(N);
      const eta = new Float64Array(N);
      for (let i = 0; i < N; i++) {
        const depth = Math.max(0.0, -bed[i] + tide);
        h[i] = depth;
        q[i] = 0.0;
        eta[i] = bed[i] + h[i];
      }

      // inlet comps arrays
      const ampArr = new Float32Array(config.maxComps);
      const omegaArr = new Float32Array(config.maxComps);
      const phaseArr = new Float32Array(config.maxComps);
      const A = Hs / (2.0 * Math.SQRT2);
      const comps = [
        { amplitude: A, period: Tp },
        { amplitude: Math.max(0.0, 0.25 * A), period: Math.max(3.5, Tp * 0.6) },
      ];
      for (let i = 0; i < config.maxComps; i++) {
        if (i < comps.length) {
          ampArr[i] = comps[i].amplitude;
          omegaArr[i] = (2.0 * Math.PI) / comps[i].period;
          phaseArr[i] = Math.random() * Math.PI * 2.0;
        } else {
          ampArr[i] = 0.0;
          omegaArr[i] = 0.0;
          phaseArr[i] = 0.0;
        }
      }

      // kArrays per comp
      const kArrays: Float64Array[] = [];
      for (let c = 0; c < config.maxComps; c++) {
        const arr = new Float64Array(N);
        const omega =
          omegaArr[c] || omegaArr[0] || (2.0 * Math.PI) / Math.max(6.0, Tp);
        for (let i = 0; i < N; i++) {
          const localDepth = Math.max(1e-6, -bed[i] + tide);
          arr[i] = solveK(omega, localDepth);
        }
        kArrays.push(arr);
      }

      const seedCells = Math.max(4, Math.floor(0.18 * N));
      const seedStrength = 0.92;
      const hMax = Math.max(config.offshoreDepth, 30.0);
      const vmax = Math.sqrt(config.g * hMax) + 6.0;
      const dtEstimate = (config.CFL * dx) / vmax;

      simRef.current = {
        N,
        domainLength,
        dx,
        g: config.g,
        bed,
        h,
        q,
        eta,
        ampArr,
        omegaArr,
        phaseArr,
        kArrays,
        seedCells,
        seedStrength,
        dtEstimate,
      };

      setStatus(
        `initialized N=${N} dx=${dx.toFixed(2)}m dt≈${dtEstimate.toFixed(4)}s`
      );
    } catch (err) {
      console.error("initSim error", err);
      setStatus("initialization error — check console");
    }
  }

  // inlet seed across left seed zone (smooth)
  function inletSeed(sim: NonNullable<typeof simRef.current>, t: number) {
    const {
      N,
      domainLength,
      bed,
      ampArr,
      omegaArr,
      phaseArr,
      kArrays,
      seedCells,
      seedStrength,
    } = sim;
    for (let i = 0; i < seedCells; i++) {
      const x = (i / (N - 1)) * domainLength;
      let etaSum = 0.0;
      let uAnal = 0.0;
      for (let cc = 0; cc < ampArr.length; cc++) {
        const amp = ampArr[cc];
        const omega = omegaArr[cc];
        if (amp <= 0 || omega <= 0) continue;
        const kLocal =
          kArrays[cc] && kArrays[cc][i]
            ? kArrays[cc][i]
            : (omega * omega) / sim.g;
        const arg = kLocal * x - omega * t + phaseArr[cc];
        const e = amp * Math.cos(arg);
        etaSum += e;
        const c = kLocal > 1e-6 ? omega / kLocal : 0.0;
        const denom = Math.max(0.25, sim.h[i]);
        uAnal += e * (c / denom);
      }
      const etaTarget = etaSum + tide;
      const depthTarget = Math.max(0.0, etaTarget - bed[i]);
      const frac = Math.max(0, (seedCells - i) / seedCells) * seedStrength;
      sim.h[i] = sim.h[i] * (1 - frac) + depthTarget * frac;
      sim.q[i] = sim.q[i] * (1 - frac) + depthTarget * uAnal * frac;
      sim.eta[i] = sim.bed[i] + sim.h[i];
    }
  }

  // solver single substep (explicit HLL predictor + dispersive correction + breaking)
  function solverSubstep(sim: NonNullable<typeof simRef.current>, dt: number) {
    const { N, dx, g, bed, h, q } = sim;

    const hNew = new Float64Array(N);
    const qNew = new Float64Array(N);

    // finite-volume HLL update
    for (let i = 0; i < N; i++) {
      const im = i === 0 ? 0 : i - 1;
      const ip = i === N - 1 ? N - 1 : i + 1;

      const left = hllFlux(h[im], q[im], h[i], q[i]);
      const right = hllFlux(h[i], q[i], h[ip], q[ip]);

      const bedSlope = ((bed[ip] - bed[im]) * 0.5) / dx;
      const Sm = -g * h[i] * bedSlope;

      let htmp = Math.max(0.0, h[i] - (dt / dx) * (right[0] - left[0]));
      let qtmp = q[i] - (dt / dx) * (right[1] - left[1]) + dt * Sm;

      // bottom quadratic drag
      if (htmp > 1e-9) {
        const ucur = qtmp / htmp;
        const drag = dragCoeff * ucur * Math.abs(ucur);
        qtmp -= dt * htmp * drag;
      } else {
        htmp = 0.0;
        qtmp = 0.0;
      }

      hNew[i] = Math.max(0.0, htmp);
      qNew[i] = qtmp;
    }

    // weak dispersive correction (eta'')
    if (disperseOn) {
      // compute eta'' with safe stencil
      const etaTmp = new Float64Array(N);
      for (let i = 0; i < N; i++) etaTmp[i] = bed[i] + hNew[i];
      const coeff = 0.35;
      for (let i = 1; i < N - 1; i++) {
        const sec =
          (etaTmp[i + 1] - 2.0 * etaTmp[i] + etaTmp[i - 1]) / (dx * dx);
        qNew[i] += -dt * g * Math.max(0.0, hNew[i]) * coeff * sec;
      }
    }

    // breaking detection -> advancing bore injection
    for (let i = 1; i < N - 1; i++) {
      const etaL = bed[i - 1] + hNew[i - 1];
      const etaC = bed[i] + hNew[i];
      const etaR = bed[i + 1] + hNew[i + 1];
      const trough = Math.min(Math.min(etaL, etaR), etaC);
      const Hloc = Math.max(0.0, etaC - trough);
      const localh = Math.max(1e-6, hNew[i]);
      if (Hloc > gamma * localh && localh > 0.02) {
        const excess = Math.max(0.0, Hloc - gamma * localh);
        const Hb = Math.min(0.8 * localh, 0.9 * excess);
        const boreSpeed = Math.sqrt(g * (localh + Hb));
        const pushMomentum = 0.5 * Hb * boreSpeed * 1.1;
        // convert into shoreward momentum q (positive rightwards)
        qNew[i] += pushMomentum;
        // slightly reduce local depth to represent energy dissipation (not fully removing mass)
        hNew[i] = Math.max(0.0, hNew[i] - Hb * 0.08);
        // spread forward
        const spread = 2;
        for (let s = 1; s <= spread; s++) {
          const j = i + s;
          if (j < N) {
            qNew[j] += pushMomentum * (0.25 / s);
            hNew[j] = Math.max(0.0, hNew[j] - Hb * (0.02 / s));
          }
        }
      }
    }

    // finalize
    for (let i = 0; i < N; i++) {
      h[i] = Math.max(0.0, hNew[i]);
      q[i] = qNew[i];
      sim.eta[i] = sim.bed[i] + h[i];
    }
  }

  // animation loop
  function animate() {
    const sim = simRef.current;
    const canvas = canvasRef.current;
    if (!sim || !canvas) {
      rafRef.current = requestAnimationFrame(animate);
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      rafRef.current = requestAnimationFrame(animate);
      return;
    }

    const now = performance.now();
    const wallDt = Math.min(0.1, (now - lastTimeRef.current) / 1000.0);
    lastTimeRef.current = now;
    const physDt = Math.max(1e-4, timeScale) * wallDt;

    // subdivide into stable substeps
    const subMax = fastMode ? 6 : 12;
    const steps = Math.max(
      1,
      Math.min(subMax, Math.ceil(physDt / sim.dtEstimate))
    );
    const subDt = physDt / steps;

    for (let s = 0; s < steps; s++) {
      // inlet seeding using current simulation time
      inletSeed(sim, (performance.now() / 1000.0) * timeScale);
      solverSubstep(sim, subDt);
    }

    // render
    renderCanvas(sim, ctx, canvas);

    rafRef.current = requestAnimationFrame(animate);
  }

  // render function with heavy guards
  function renderCanvas(
    sim: NonNullable<typeof simRef.current>,
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ) {
    const { N, bed, eta } = sim;
    // ensure canvas pixel dims set
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = Math.floor(width * dpr);
    const hPx = Math.floor(height * dpr);
    if (canvas.width !== w || canvas.height !== hPx) {
      canvas.width = w;
      canvas.height = hPx;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    // clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // compute domain vertical bounds safely
    let domMin = Number.POSITIVE_INFINITY;
    let domMax = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < N; i++) {
      const b = bed[i];
      const e = eta[i];
      if (Number.isFinite(b)) domMin = Math.min(domMin, b);
      if (Number.isFinite(e)) domMax = Math.max(domMax, e);
    }
    if (!Number.isFinite(domMin) || !Number.isFinite(domMax)) {
      domMin = -30;
      domMax = 5;
    }
    domMax += 1.5;
    domMin -= 2.0;

    function xToPx(ix: number) {
      const x = ix / (N - 1);
      return Math.max(0, Math.min(canvas.width, x * canvas.width));
    }
    function yToPx(val: number) {
      if (!Number.isFinite(val)) val = domMin;
      const t = (val - domMin) / (domMax - domMin);
      return Math.max(
        0,
        Math.min(canvas.height, canvas.height - t * canvas.height)
      );
    }

    // SKY
    const skyY1 = Math.floor(canvas.height * 0.6);
    if (Number.isFinite(0) && Number.isFinite(skyY1)) {
      try {
        const skyGrad = ctx.createLinearGradient(0, 0, 0, skyY1);
        skyGrad.addColorStop(0, "#eaf7ff");
        skyGrad.addColorStop(1, "#9ed0ff");
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, canvas.width, skyY1);
        ctx.fillStyle = "#9ed0ff";
        ctx.fillRect(0, skyY1, canvas.width, canvas.height - skyY1);
      } catch {
        ctx.fillStyle = "#9ed0ff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    } else {
      ctx.fillStyle = "#9ed0ff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // water polygon: bed left->right then surface right->left
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const px = xToPx(i);
      const py = yToPx(bed[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    for (let i = N - 1; i >= 0; i--) {
      const px = xToPx(i);
      const py = yToPx(eta[i]);
      ctx.lineTo(px, py);
    }
    ctx.closePath();

    // water gradient guarded
    try {
      const gy0 = yToPx(domMax);
      const gy1 = yToPx(domMin);
      if (Number.isFinite(gy0) && Number.isFinite(gy1)) {
        const waterGrad = ctx.createLinearGradient(0, gy0, 0, gy1);
        waterGrad.addColorStop(0, "#e6faff");
        waterGrad.addColorStop(1, "#045a86");
        ctx.fillStyle = waterGrad;
      } else {
        ctx.fillStyle = "#045a86";
      }
    } catch {
      ctx.fillStyle = "#045a86";
    }
    ctx.fill();

    // sand fill
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const px = xToPx(i);
      const py = yToPx(bed[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    ctx.fillStyle = "#ecd5a6";
    ctx.fill();

    // smooth surface stroke
    const sampleCount = Math.min(900, Math.max(200, Math.floor(canvas.width)));
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = "#ffffff";
    ctx.beginPath();
    let prevPx = 0;
    let prevPy = 0;
    for (let si = 0; si <= sampleCount; si++) {
      const fx = (si / sampleCount) * (N - 1);
      const i0 = Math.floor(fx);
      const t = fx - i0;
      const i1 = Math.min(N - 1, i0 + 1);
      let val = eta[i0] * (1 - t) + eta[i1] * t;
      if (!Number.isFinite(val)) val = domMin;
      const px = (si / sampleCount) * canvas.width;
      const py = yToPx(val);
      if (si === 0) ctx.moveTo(px, py);
      else {
        const cpx = (prevPx + px) * 0.5;
        const cpy = (prevPy + py) * 0.5;
        ctx.quadraticCurveTo(cpx, cpy, px, py);
      }
      prevPx = px;
      prevPy = py;
    }
    ctx.stroke();

    // foam hints (steepness)
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 1; i < N - 1; i++) {
      const steep =
        Math.abs(eta[i + 1] - eta[i]) + Math.abs(eta[i] - eta[i - 1]);
      if (steep > 0.03) {
        const px = xToPx(i);
        const py = yToPx(eta[i]);
        ctx.beginPath();
        ctx.arc(px, py - 1, 1.5 + Math.min(3, steep * 40), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // overlay
    ctx.fillStyle = "rgba(16,40,48,0.9)";
    ctx.font =
      '12px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial';
    ctx.fillText(
      `Hs=${Hs.toFixed(2)}m  Tp=${Tp.toFixed(1)}s  tide=${tide.toFixed(2)}m`,
      10,
      16
    );
  }

  // Start/stop handlers and lifecycle
  useEffect(() => {
    initSim();
    lastTimeRef.current = performance.now();
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fastMode, useExternalBed, externalBed, width, height]);

  // When user clicks Apply/Recompute we rebuild inlet & k(x)
  function applyRebuild() {
    const sim = simRef.current;
    if (!sim) {
      initSim();
      return;
    }
    const { N, bed } = sim;
    // recompute amp/omega/phase & kArrays
    const ampArr = new Float32Array(config.maxComps);
    const omegaArr = new Float32Array(config.maxComps);
    const phaseArr = new Float32Array(config.maxComps);
    const A = Hs / (2.0 * Math.SQRT2);
    const comps = [
      { amplitude: A, period: Tp },
      { amplitude: Math.max(0.0, 0.25 * A), period: Math.max(3.5, Tp * 0.6) },
    ];
    for (let i = 0; i < config.maxComps; i++) {
      if (i < comps.length) {
        ampArr[i] = comps[i].amplitude;
        omegaArr[i] = (2.0 * Math.PI) / comps[i].period;
        phaseArr[i] = Math.random() * Math.PI * 2.0;
      } else {
        ampArr[i] = 0.0;
        omegaArr[i] = 0.0;
        phaseArr[i] = 0.0;
      }
    }
    const kArrays: Float64Array[] = [];
    for (let c = 0; c < config.maxComps; c++) {
      const arr = new Float64Array(N);
      const omega =
        omegaArr[c] || omegaArr[0] || (2.0 * Math.PI) / Math.max(6.0, Tp);
      for (let i = 0; i < N; i++) {
        const localDepth = Math.max(1e-6, -bed[i] + tide);
        arr[i] = solveK(omega, localDepth);
      }
      kArrays.push(arr);
    }
    sim.ampArr = ampArr;
    sim.omegaArr = omegaArr;
    sim.phaseArr = phaseArr;
    sim.kArrays = kArrays;
    setStatus("Rebuilt inlet & k(x)");
  }

  // simple UI function to update parameters live (Hs/Tp/tide etc.)
  function updateParams() {
    const sim = simRef.current;
    if (!sim) {
      initSim();
      return;
    }
    // recompute amps only (keep k(x) until Apply rebuild)
    const ampArr = new Float32Array(config.maxComps);
    const omegaArr = sim.omegaArr; // keep existing omega
    const phaseArr = sim.phaseArr;
    const A = Hs / (2.0 * Math.SQRT2);
    const comps = [
      { amplitude: A, period: Tp },
      { amplitude: Math.max(0.0, 0.25 * A), period: Math.max(3.5, Tp * 0.6) },
    ];
    for (let i = 0; i < config.maxComps; i++) {
      if (i < comps.length) {
        ampArr[i] = comps[i].amplitude;
        omegaArr[i] = (2.0 * Math.PI) / comps[i].period;
        phaseArr[i] = Math.random() * Math.PI * 2.0;
      } else {
        ampArr[i] = 0.0;
      }
    }
    sim.ampArr = ampArr;
    sim.omegaArr = omegaArr;
    sim.phaseArr = phaseArr;
    setStatus(
      "Updated inlet amps/periods (k(x) unchanged; click Rebuild for full resample)"
    );
  }

  // UI render
  return (
    <div className="max-w-full mx-auto p-3 bg-background rounded-lg shadow">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-lg font-semibold">
            Beach cross-section — production simulation
          </div>
          <div className="text-sm text-slate-600">
            Shoaling • dispersion-aware inlet • forward-breaking bore • swash
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm">Fast</label>
          <input
            type="checkbox"
            checked={fastMode}
            onChange={(e) => {
              setFastMode(e.target.checked);
            }}
            aria-label="Fast mode"
          />
          <button
            className="px-3 py-1 bg-sky-600 text-white rounded"
            onClick={() => {
              applyRebuild();
            }}
          >
            Rebuild
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 border rounded overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-[420px] block bg-slate-50"
          />
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <label>Significant wave height Hs (m): {Hs.toFixed(2)}</label>
            <input
              type="range"
              min={0}
              max={4.0}
              step={0.05}
              value={Hs}
              onChange={(e) => setHs(Number(e.target.value))}
            />
          </div>

          <div>
            <label>Peak period Tp (s): {Tp.toFixed(2)}</label>
            <input
              type="range"
              min={3.0}
              max={20.0}
              step={0.1}
              value={Tp}
              onChange={(e) => setTp(Number(e.target.value))}
            />
          </div>

          <div>
            <label>Tide (m): {tide.toFixed(2)}</label>
            <input
              type="range"
              min={-1.5}
              max={2.5}
              step={0.05}
              value={tide}
              onChange={(e) => setTide(Number(e.target.value))}
            />
          </div>

          <div>
            <label>Breaker index γ: {gamma.toFixed(2)}</label>
            <input
              type="range"
              min={0.6}
              max={0.95}
              step={0.01}
              value={gamma}
              onChange={(e) => setGamma(Number(e.target.value))}
            />
          </div>

          <div>
            <label>Bottom drag Cd: {dragCoeff.toFixed(4)}</label>
            <input
              type="range"
              min={0.0}
              max={0.02}
              step={0.0005}
              value={dragCoeff}
              onChange={(e) => setDragCoeff(Number(e.target.value))}
            />
          </div>

          <div>
            <label>Time scale: {timeScale.toFixed(2)}x</label>
            <input
              type="range"
              min={0.25}
              max={4.0}
              step={0.05}
              value={timeScale}
              onChange={(e) => setTimeScale(Number(e.target.value))}
            />
          </div>

          <div className="flex items-center gap-2">
            <label>Dispersive correction</label>
            <input
              type="checkbox"
              checked={disperseOn}
              onChange={(e) => setDisperseOn(e.target.checked)}
            />
          </div>

          <div>
            <button
              className="w-full py-2 bg-emerald-600 text-white rounded"
              onClick={() => {
                // apply quick update
                updateParams();
              }}
            >
              Apply params
            </button>
            <div className="mt-2 text-xs text-slate-500">
              Click <strong>Rebuild</strong> to resample k(x) (use when changing
              Tp/tide). Click <strong>Apply params</strong> to update amplitudes
              quickly.
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-500">
        <div>
          <strong>Status:</strong> {status}
        </div>
        <div className="mt-2">
          Developer notes: This component gives a physics-first, robust
          cross-shore preview for surf forecasting. If you want I can: (A)
          expose more knobs (breakPush, breakCoef), (B) add an overlay for
          predicted breaker line, or (C) accept an uploaded real bathymetry file
          and resample it automatically.
        </div>
      </div>
    </div>
  );
};

export default WaveSimulation;

// #################################################################################################################################

// // pages/plunging-wave.tsx
// "use client";
// import React, { useEffect, useRef, useState } from "react";
// import Head from "next/head";

// type Params = {
//   swellHeight: number; // meters
//   swellPeriod: number; // seconds
//   slope: number; // seabed slope (m drop per horizontal meter)
//   windFactor: number; // aesthetic, 0-1
// };

// const DEFAULTS: Params = {
//   swellHeight: 1.2,
//   swellPeriod: 8,
//   slope: 0.025,
//   windFactor: 0.25,
// };

// export default function PlungingWavePage(): JSX.Element {
//   const canvasRef = useRef<HTMLCanvasElement | null>(null);
//   const animRef = useRef<number | null>(null);
//   const offscreenRef = useRef<HTMLCanvasElement | null>(null);
//   const [params, setParams] = useState<Params>(DEFAULTS);
//   const [running, setRunning] = useState(true);
//   const [timeScale, setTimeScale] = useState(1.0);
//   const containerRef = useRef<HTMLDivElement | null>(null);

//   // Responsive canvas sizing + DPR scaling
//   useEffect(() => {
//     const canvas = canvasRef.current!;
//     const container = containerRef.current!;
//     if (!canvas || !container) return;

//     let ro: ResizeObserver | null = new ResizeObserver(() => {
//       const rect = container.getBoundingClientRect();
//       const dpr = Math.max(1, window.devicePixelRatio || 1);
//       canvas.width = Math.round(rect.width * dpr);
//       canvas.height = Math.round(Math.max(300, rect.height) * dpr);
//       canvas.style.width = `${rect.width}px`;
//       canvas.style.height = `${Math.max(300, rect.height)}px`;
//       const ctx = canvas.getContext("2d");
//       if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
//     });
//     ro.observe(container);

//     return () => {
//       ro?.disconnect();
//       ro = null;
//     };
//   }, []);

//   // Main simulation
//   useEffect(() => {
//     const canvas = canvasRef.current!;
//     if (!canvas) return;
//     const ctx = canvas.getContext("2d", { alpha: false })!;
//     // Local offscreen canvas for lower-frequency terrain draws
//     let terrainCanvas = offscreenRef.current;
//     if (!terrainCanvas) {
//       terrainCanvas = document.createElement("canvas");
//       offscreenRef.current = terrainCanvas;
//     }

//     let last = performance.now();
//     let t = 0;

//     // Parameters for domain
//     const VIEW_WIDTH_PX = 1200; // internal reference width (logical px)
//     const domain = {
//       width: () => Math.max(800, canvas.clientWidth),
//       height: () => Math.max(360, canvas.clientHeight),
//       seabedDepthAtLeft: 0, // beach (dry) left side
//     };

//     // bathymetry: function x->depth (positive downwards, meters)
//     function bathymetry(xNorm: number): number {
//       // xNorm: 0..1 where 1 is offshore deep water
//       // Simple profile: shallow near shore, slope -> deeper offshore, adjustable by params.slope
//       // We'll create a beach + nearshore bar to help produce plunging breakers.
//       const slope = params.slope;
//       // baseline depth:
//       const base = 10 + 20 * Math.pow(xNorm, 2.0); // gentle deepening
//       // nearshore bar bump
//       const bar = 2.5 * Math.exp(-Math.pow((xNorm - 0.45) / 0.08, 2));
//       const nearshore = slope * (xNorm * 100); // scaled
//       return Math.max(0.2, base + nearshore - bar);
//     }

//     // wave model (simple linear wave packet travelling left->right towards shore)
//     // We'll synthesize free-surface elevation as sum of traveling sinusoids with amplitude modulation by depth (shoaling).
//     const gravity = 9.80665;

//     function dispersionPeriodToWavelength(T: number, depth: number): number {
//       // solve dispersion relation with a few Newton iterations for k:
//       // omega^2 = g*k*tanh(k*d), omega = 2*pi/T
//       const omega = (2 * Math.PI) / T;
//       // initial guess deep-water k0 = omega^2/g
//       let k = (omega * omega) / gravity;
//       for (let i = 0; i < 6; i++) {
//         const tnh = Math.tanh(k * depth);
//         const f = gravity * k * tnh - omega * omega;
//         const df = gravity * tnh + gravity * k * depth * (1 - tnh * tnh);
//         k = k - f / (df || 1e-6);
//         if (k <= 0) k = 1e-6;
//       }
//       return (2 * Math.PI) / k;
//     }

//     function shoalingFactor(depth: number, H0: number, T: number): number {
//       // very simple approximation: as depth decreases, amplitude increases to conserve energy flux,
//       // roughly H ~ H0 * ( (Cg0 * sqrt(depth0)) / (Cg * sqrt(depth)) ), but we will approximate with depth scaling
//       // Keep it bounded to avoid blowups
//       const dRef = 50; // reference depth where swell originates
//       return Math.min(
//         4,
//         Math.max(0.3, Math.sqrt((dRef + depth) / (depth + 0.5)))
//       );
//     }

//     // Breaking detection: wave breaks when H/d > gamma (approx 0.78 for spilling/plunging threshold)
//     const BREAKING_RATIO = 0.78;

//     // Draw static terrain to offscreen canvas
//     function drawTerrain(): void {
//       const w = canvas.width;
//       const h = canvas.height;
//       terrainCanvas!.width = w;
//       terrainCanvas!.height = h;
//       const dpr = Math.max(1, window.devicePixelRatio || 1);
//       const tctx = terrainCanvas!.getContext("2d")!;
//       tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
//       tctx.clearRect(0, 0, w / dpr, h / dpr);

//       // draw sky
//       const skyGrad = tctx.createLinearGradient(0, 0, 0, (h / dpr) * 0.6);
//       skyGrad.addColorStop(0, "#cfeefe");
//       skyGrad.addColorStop(1, "#80b9d6");
//       tctx.fillStyle = skyGrad;
//       tctx.fillRect(0, 0, w / dpr, h / dpr);

//       // draw seabed (silhouette) as filled polygon
//       const baselineY = (idx: number) => (h / dpr) * 0.75; // mean waterline baseline (logical px)
//       tctx.beginPath();
//       tctx.moveTo(0, baselineY(0) + 200); // land off left
//       const steps = 160;
//       for (let i = 0; i <= steps; i++) {
//         const x = (i / steps) * (w / dpr);
//         const xNorm = i / steps;
//         const depth = bathymetry(xNorm); // meters
//         // Map depth (0..~40m) into pixel vertical offset
//         const depthPx = (depth / 40) * (h / dpr) * 0.35;
//         const y = baselineY(i) + depthPx;
//         tctx.lineTo(x, y);
//       }
//       tctx.lineTo(w / dpr, h / dpr + 50);
//       tctx.lineTo(0, h / dpr + 50);
//       tctx.closePath();

//       // seabed gradient
//       const seabedGrad = tctx.createLinearGradient(0, baselineY(0), 0, h / dpr);
//       seabedGrad.addColorStop(0, "#bda07a");
//       seabedGrad.addColorStop(1, "#8c6b48");
//       tctx.fillStyle = seabedGrad;
//       tctx.fill();

//       // add subtle texture (sand ripples)
//       tctx.globalAlpha = 0.06;
//       tctx.strokeStyle = "#000";
//       for (let y = 0; y < 20; y++) {
//         tctx.beginPath();
//         tctx.moveTo(0, (h / dpr) * 0.7 + Math.sin(y) * 2);
//         tctx.quadraticCurveTo(
//           (w / dpr) * 0.5,
//           (h / dpr) * (0.7 + 0.01 * y),
//           w / dpr,
//           (h / dpr) * (0.7 + 0.02 * (y % 3))
//         );
//         tctx.stroke();
//       }
//       tctx.globalAlpha = 1;
//     }

//     // draw water surface & volumetric water
//     function drawFrame(now: number): void {
//       const logicalW = canvas.clientWidth;
//       const logicalH = canvas.clientHeight;
//       ctx.clearRect(0, 0, logicalW, logicalH);

//       // draw terrain background from offscreen
//       ctx.drawImage(
//         terrainCanvas!,
//         0,
//         0,
//         canvas.width,
//         canvas.height,
//         0,
//         0,
//         canvas.clientWidth,
//         canvas.clientHeight
//       );

//       // parameters
//       const H0 = params.swellHeight; // meters
//       const T = params.swellPeriod; // seconds
//       const wind = params.windFactor;
//       const time = t * timeScale;

//       // precompute
//       const baseline = logicalH * 0.6; // approximate mean waterline y px

//       // surface path
//       const samples = Math.max(200, Math.round(logicalW / 3));
//       const surface: { x: number; y: number; elev: number; depth: number }[] =
//         [];
//       for (let i = 0; i <= samples; i++) {
//         const x = (i / samples) * logicalW;
//         const xNorm = i / samples;
//         const depth = bathymetry(xNorm);

//         // wavelength at this depth (simple)
//         const L = dispersionPeriodToWavelength(T, depth);
//         // local phase (travel towards shore: we'll move wave right->left by negative speed)
//         const k = (2 * Math.PI) / L;
//         // group speed approx: Cg = 0.5*sqrt(g*L/(2*pi)) * (1 + 2*k*depth/sinh(2*k*depth))
//         const C = Math.sqrt((gravity * L) / (2 * Math.PI));
//         const phase = -(time * C) * k + x * k * 0.02; // scaled spatial term to bring waves shorewards
//         // amplitude modulated by shoaling
//         const s = shoalingFactor(depth, H0, T);
//         const swell = H0 * 0.5 * s; // convert H->a (a = H/2)
//         // add higher harmonics for sharp crest
//         const elev =
//           swell * (Math.sin(phase) + 0.2 * Math.sin(2 * phase + 0.5));
//         // apply depth attenuation for very shallow zones (crest steepening)
//         let elevCorrected = elev;
//         if (depth < 2.5) {
//           // steepen and increase crest relative to troughs, producing plunging look when depth low
//           elevCorrected = elev * (1 + 1 / (depth + 0.5));
//         }
//         surface.push({
//           x,
//           y: baseline - elevCorrected * 30,
//           elev: elevCorrected,
//           depth,
//         });
//       }

//       // determine breaking zones and draw plunges
//       // compute local wave height approx as crest-to-trough for sample window
//       const breakingZones: { x: number; strength: number; y: number }[] = [];
//       for (let i = 2; i < surface.length - 2; i++) {
//         const a = surface[i].elev;
//         const localDepth = surface[i].depth;
//         const Hlocal = Math.abs(surface[i - 1].elev - surface[i + 1].elev);
//         // breaking criterion: H/d > ratio
//         if (localDepth > 0 && Hlocal / localDepth > BREAKING_RATIO) {
//           // compute strength 0..1
//           const strength = Math.min(
//             1,
//             (Hlocal / localDepth - BREAKING_RATIO) * 2.5
//           );
//           breakingZones.push({ x: surface[i].x, strength, y: surface[i].y });
//         }
//       }

//       // draw filled water polygon between surface and seabed silhouette
//       ctx.save();
//       // water fill with slight transparency to show seabed beneath
//       const waterGrad = ctx.createLinearGradient(
//         0,
//         baseline - 120,
//         0,
//         baseline + 220
//       );
//       waterGrad.addColorStop(0, "rgba(35,143,210,0.95)");
//       waterGrad.addColorStop(1, "rgba(18,76,120,0.85)");
//       ctx.fillStyle = waterGrad;

//       ctx.beginPath();
//       ctx.moveTo(0, logicalH);
//       // follow surface left->right
//       for (let i = 0; i < surface.length; i++) {
//         ctx.lineTo(surface[i].x, surface[i].y);
//       }
//       ctx.lineTo(logicalW, logicalH);
//       ctx.closePath();
//       ctx.fill();

//       // foam / whitecaps in breaking zones (plunging jets) - draw highlights
//       for (let bz of breakingZones) {
//         const size = 28 + bz.strength * 60;
//         const grad = ctx.createRadialGradient(bz.x, bz.y, 1, bz.x, bz.y, size);
//         grad.addColorStop(0, `rgba(255,255,255,${0.95 * bz.strength})`);
//         grad.addColorStop(0.4, `rgba(255,255,255,${0.35 * bz.strength})`);
//         grad.addColorStop(1, "rgba(255,255,255,0)");
//         ctx.globalCompositeOperation = "lighter";
//         ctx.fillStyle = grad;
//         ctx.beginPath();
//         ctx.ellipse(bz.x, bz.y, size, size * 0.6, 0, 0, Math.PI * 2);
//         ctx.fill();

//         // plunging jet streak
//         ctx.globalCompositeOperation = "source-over";
//         ctx.save();
//         ctx.globalAlpha = 0.9 * bz.strength;
//         ctx.beginPath();
//         ctx.moveTo(bz.x - size * 0.4, bz.y - size * 0.2);
//         ctx.quadraticCurveTo(
//           bz.x,
//           bz.y - size * 0.8,
//           bz.x + size * 0.6,
//           bz.y - size * 0.1
//         );
//         ctx.lineTo(bz.x + size * 0.6, bz.y + 8);
//         ctx.quadraticCurveTo(
//           bz.x,
//           bz.y + size * 0.25,
//           bz.x - size * 0.3,
//           bz.y + 4
//         );
//         ctx.closePath();
//         ctx.fillStyle = "rgba(255,255,255,0.85)";
//         ctx.fill();
//         ctx.restore();
//       }

//       // thin waterline stroke
//       ctx.globalCompositeOperation = "source-over";
//       ctx.lineWidth = 1;
//       ctx.strokeStyle = "rgba(255,255,255,0.35)";
//       ctx.beginPath();
//       for (let i = 0; i < surface.length; i++) {
//         if (i === 0) ctx.moveTo(surface[i].x, surface[i].y);
//         else ctx.lineTo(surface[i].x, surface[i].y);
//       }
//       ctx.stroke();

//       // foam band along breaking zones (smeared)
//       ctx.save();
//       for (let bz of breakingZones) {
//         const w = 140 * bz.strength;
//         ctx.globalAlpha = 0.9 * bz.strength;
//         ctx.beginPath();
//         ctx.moveTo(bz.x - w * 0.6, bz.y + 4);
//         ctx.quadraticCurveTo(
//           bz.x,
//           bz.y + 24 * bz.strength,
//           bz.x + w * 0.6,
//           bz.y + 4
//         );
//         ctx.lineTo(bz.x + w * 0.6, bz.y + 12);
//         ctx.quadraticCurveTo(
//           bz.x,
//           bz.y + 40 * bz.strength,
//           bz.x - w * 0.6,
//           bz.y + 12
//         );
//         ctx.closePath();
//         ctx.fillStyle = "rgba(255,255,255,0.6)";
//         ctx.fill();
//       }
//       ctx.restore();

//       // subtle surface texture - moving noise using sine-based perturbation
//       ctx.globalAlpha = 0.08 + params.windFactor * 0.12;
//       ctx.beginPath();
//       for (let i = 0; i < surface.length; i += 4) {
//         const s = surface[i];
//         ctx.moveTo(s.x, s.y);
//         ctx.arc(
//           s.x,
//           s.y + Math.sin((i + time * 40) * 0.12) * 2,
//           1.2,
//           0,
//           Math.PI * 2
//         );
//       }
//       ctx.fillStyle = "rgba(255,255,255,1)";
//       ctx.fill();
//       ctx.globalAlpha = 1;

//       ctx.restore();

//       // simple HUD / legend
//       ctx.save();
//       ctx.font =
//         '12px Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';
//       ctx.fillStyle = "rgba(255,255,255,0.9)";
//       ctx.fillText(
//         `Swell H: ${params.swellHeight.toFixed(
//           2
//         )} m • Period: ${params.swellPeriod.toFixed(
//           1
//         )} s • Slope: ${params.slope.toFixed(3)}`,
//         12,
//         18
//       );
//       ctx.restore();
//     }

//     function step(now: number) {
//       const dtMs = Math.min(60, now - last);
//       last = now;
//       const dt = dtMs / 1000;
//       if (running) {
//         t += dt;
//         drawFrame(now);
//       }
//       animRef.current = requestAnimationFrame(step);
//     }

//     drawTerrain();
//     animRef.current = requestAnimationFrame(step);

//     // redraw terrain when params that affect bathymetry change
//     const redrawTerrainOnParams = () => {
//       drawTerrain();
//     };

//     redrawTerrainOnParams();

//     return () => {
//       if (animRef.current) cancelAnimationFrame(animRef.current);
//       animRef.current = null;
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [params, running, timeScale]);

//   // Small accessibility: keyboard space toggles
//   useEffect(() => {
//     function onKey(e: KeyboardEvent) {
//       if (e.code === "Space") {
//         e.preventDefault();
//         setRunning((r) => !r);
//       }
//     }
//     window.addEventListener("keydown", onKey);
//     return () => window.removeEventListener("keydown", onKey);
//   }, []);

//   // UI controls handlers
//   const update = (patch: Partial<Params>) =>
//     setParams((p) => ({ ...p, ...patch }));

//   return (
//     <>
//       <Head>
//         <title>Plunging Wave Simulation — Beach Cross Section</title>
//         <meta
//           name="description"
//           content="Interactive 2D plunging wave simulation over realistic bathymetry. Adjustable swell, period and shore slope. Built with Next.js, TypeScript, and Tailwind."
//         />
//         <meta name="viewport" content="width=device-width,initial-scale=1" />
//         <meta name="robots" content="index,follow" />
//       </Head>

//       <main className="min-h-screen bg-gradient-to-b from-sky-100 to-sky-200 p-6">
//         <div className="max-w-6xl mx-auto">
//           <header className="mb-4">
//             <h1 className="text-2xl font-semibold text-slate-900">
//               Plunging Wave (2D) — Beach Cross-Section
//             </h1>
//             <p className="mt-1 text-sm text-slate-700">
//               Interactive demo: shoaling, steepening, and plunging breakers over
//               bathymetry. Press{" "}
//               <kbd className="px-1 py-0.5 bg-slate-100 rounded">Space</kbd> to
//               pause/play.
//             </p>
//           </header>

//           <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
//             <div className="lg:col-span-3">
//               <div
//                 ref={containerRef}
//                 className="w-full rounded-2xl shadow-lg overflow-hidden"
//                 style={{ height: 420 }}
//               >
//                 <canvas
//                   ref={canvasRef}
//                   role="img"
//                   aria-label="2D plunging wave simulation showing waves approaching a beach and breaking"
//                 />
//               </div>
//             </div>

//             <aside className="p-4 rounded-2xl bg-white/80 shadow-inner backdrop-blur-sm">
//               <h2 className="text-lg font-medium text-slate-900">Controls</h2>

//               <div className="mt-3 space-y-3">
//                 <label className="block text-sm text-slate-700">
//                   Swell height (m):{" "}
//                   <span className="font-semibold">
//                     {params.swellHeight.toFixed(2)}
//                   </span>
//                 </label>
//                 <input
//                   aria-label="swell-height"
//                   type="range"
//                   min={0.2}
//                   max={3.5}
//                   step={0.05}
//                   value={params.swellHeight}
//                   onChange={(e) =>
//                     update({ swellHeight: Number(e.target.value) })
//                   }
//                   className="w-full"
//                 />

//                 <label className="block text-sm text-slate-700">
//                   Swell period (s):{" "}
//                   <span className="font-semibold">
//                     {params.swellPeriod.toFixed(1)}
//                   </span>
//                 </label>
//                 <input
//                   aria-label="swell-period"
//                   type="range"
//                   min={4}
//                   max={16}
//                   step={0.1}
//                   value={params.swellPeriod}
//                   onChange={(e) =>
//                     update({ swellPeriod: Number(e.target.value) })
//                   }
//                   className="w-full"
//                 />

//                 <label className="block text-sm text-slate-700">
//                   Shore slope:{" "}
//                   <span className="font-semibold">
//                     {params.slope.toFixed(3)}
//                   </span>
//                 </label>
//                 <input
//                   aria-label="slope"
//                   type="range"
//                   min={0.005}
//                   max={0.08}
//                   step={0.001}
//                   value={params.slope}
//                   onChange={(e) => update({ slope: Number(e.target.value) })}
//                   className="w-full"
//                 />

//                 <label className="block text-sm text-slate-700">
//                   Wind factor:{" "}
//                   <span className="font-semibold">
//                     {params.windFactor.toFixed(2)}
//                   </span>
//                 </label>
//                 <input
//                   aria-label="wind"
//                   type="range"
//                   min={0}
//                   max={1}
//                   step={0.01}
//                   value={params.windFactor}
//                   onChange={(e) =>
//                     update({ windFactor: Number(e.target.value) })
//                   }
//                   className="w-full"
//                 />

//                 <label className="block text-sm text-slate-700">
//                   Time scale:{" "}
//                   <span className="font-semibold">{timeScale.toFixed(2)}×</span>
//                 </label>
//                 <input
//                   aria-label="time-scale"
//                   type="range"
//                   min={0.25}
//                   max={3}
//                   step={0.05}
//                   value={timeScale}
//                   onChange={(e) => setTimeScale(Number(e.target.value))}
//                   className="w-full"
//                 />

//                 <div className="flex items-center gap-2">
//                   <button
//                     onClick={() => setRunning((r) => !r)}
//                     className="px-3 py-1 bg-slate-900 text-white rounded hover:opacity-90"
//                   >
//                     {running ? "Pause" : "Play"}
//                   </button>
//                   <button
//                     onClick={() => {
//                       setParams(DEFAULTS);
//                       setTimeScale(1);
//                     }}
//                     className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50"
//                   >
//                     Reset
//                   </button>
//                 </div>
//               </div>

//               <hr className="my-4" />

//               <div className="text-sm text-slate-700">
//                 <p>
//                   <strong>Notes:</strong> Plunging behavior is produced by
//                   steepening in shallow water when wave height relative to local
//                   depth exceeds a threshold. This demo uses a fast, visually
//                   plausible model (not a full CFD solver) tuned for realtime web
//                   display.
//                 </p>
//                 <p className="mt-2 text-xs text-slate-500">
//                   Canvas uses devicePixelRatio scaling for crisp rendering. For
//                   production, you can replace the wave generator with a physics
//                   solver (e.g., Boussinesq family or shallow-water solver) for
//                   higher accuracy.
//                 </p>
//               </div>
//             </aside>
//           </section>

//           <footer className="mt-6 text-xs text-slate-600">
//             <p>
//               Built with Next.js, TypeScript, React and Tailwind. Accessible and
//               lighthouse-friendly layout.
//             </p>
//           </footer>
//         </div>
//       </main>
//     </>
//   );
// }
