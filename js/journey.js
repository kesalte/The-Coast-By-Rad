/* ==========================================================================
   THE COAST BY RAD — cinematic 3D scroll journey
   Real Three.js scene (perspective camera, 3D photo planes at different depths,
   per-pixel atmospheric fog, soft shadows, 3D dust) choreographed with
   GSAP + ScrollTrigger. Starts only after the original homepage hero.

   Modes
     immersive : full WebGL journey (sticky stage, ~1000vh scroll runway)
     static    : reduced-motion, no WebGL, blocked libraries or old browsers
                 -> calm stacked editorial layout with the same photos & copy
   URL switches for testing:  ?journey=static   ?journey=immersive
   ========================================================================== */
(function () {
  'use strict';

  var root = document.getElementById('journey');
  if (!root) return;

  var stage = document.getElementById('journeyStage');
  var canvas = document.getElementById('journeyCanvas');
  var IMG = window.COAST_IMAGES || {};
  var query = new URLSearchParams(location.search).get('journey');
  var reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var narrowMq = window.matchMedia('(max-width: 800px)');
  var coarseMq = window.matchMedia('(pointer: coarse)');

  /* ------------------------------------------------------------------ */
  /*  Capability checks                                                  */
  /* ------------------------------------------------------------------ */
  function hasWebGL() {
    try {
      var c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) { return false; }
  }
  function canRun() {
    if (query === 'static') return false;
    if (reduceMq.matches) return false;
    if (!window.THREE || !window.gsap || !window.ScrollTrigger) return false;
    if (!(window.CSS && CSS.supports && CSS.supports('overflow-x', 'clip'))) return false;
    return hasWebGL();
  }

  /* ------------------------------------------------------------------ */
  /*  Story data                                                         */
  /* ------------------------------------------------------------------ */
  // camera travels along z (s = distance travelled). Chapter ranges in s:
  var END = 223;
  var CHAPTERS = [
    { s0: 0,   s1: 44  },  // Arrival
    { s0: 44,  s1: 92  },  // The Property
    { s0: 92,  s1: 132 },  // The Stay
    { s0: 132, s1: 178 },  // The Café
    { s0: 178, s1: 209 },  // The Events
    { s0: 209, s1: END }   // The Coast
  ];
  // [top, bottom] background colours per chapter (brand navy/teal, warmed for stay & café)
  var PALETTE = [
    ['#08202a', '#1a4a54'],
    ['#0c2d38', '#2c6a6e'],
    ['#14282f', '#8a5a44'],
    ['#1f1a17', '#a8683f'],
    ['#0a2130', '#1f4858'],
    ['#06151c', '#123744']
  ];
  var GLOW = ['#e6c997', '#7fc1bd', '#e0a47c', '#f0c27a', '#7fb4d6', '#e6c997', '#e6c997'];
  // when each chapter's copy arrives (in s) — timed to the camera reaching its hero photograph
  var TEXT_IN = [[1, 5], [41, 46], [87, 92], [127, 132], [173, 178], [211, 216]];
  var DWELL = [7, 44, 90, 130, 176, 206, 217];   // camera slows here so each hero image can be appreciated

  // key, s (depth), off (lateral offset from camera path), y, width, turn(deg), roll(deg), shape
  var SHOTS = [
    // ARRIVAL
    ['sign-sea',       17,  0.0,  0.1, 7.8,  0,  0,   0],
    ['sea-terrace',    24, -6.4, -0.3, 7.2, 24,  1.2, 0],
    ['terrace-gold',   29,  6.2,  0.7, 7.6, 24, -1.0, 0],
    ['gate-dusk',      38, -2.1,  0.2, 6.0,  8,  0,   0],
    // THE PROPERTY
    ['house-pool',     54,  0.4,  0.0, 7.8,  0,  0,   0],
    ['pool-flamingo',  60,  5.3,  0.4, 4.6, 22, -1.5, 1],
    ['pool-lounge',    65, -5.2, -0.2, 4.6, 22,  1.5, 1],
    ['pool-sunset',    74,  2.4,  0.2, 5.0,  6,  0,   0],
    ['terrace-diners', 82, -4.8,  0.3, 7.0, 20,  1.0, 0],
    // THE STAY
    ['room-blue',     100,  0.0,  0.0, 7.6,  0,  0,   0],
    ['room-bed',      106,  5.6,  0.5, 6.2, 22, -1.2, 0],
    ['room-suite',    112, -5.6, -0.2, 6.6, 22,  1.2, 0],
    ['room-beach',    119,  3.6, -0.3, 3.6, 12, -1.0, 0],
    ['room-standard', 123, -3.8,  0.4, 3.6, 12,  1.0, 0],
    // THE CAFÉ
    ['cafe-glass',    140,  0.0,  0.1, 7.8,  0,  0,   0],
    ['coffee-camera', 146, -5.6, -0.4, 6.2, 22,  1.2, 0],
    ['drink-red',     150,  5.0,  0.5, 3.9, 20, -1.6, 1],
    ['pasta-sea',     156, -4.6,  0.3, 4.2, 20,  1.2, 1],
    ['shakes-table',  160,  5.6, -0.2, 6.4, 22, -1.0, 0],
    ['pizza-board',   166, -1.8,  0.0, 4.4,  8,  0,   0],
    ['shake-sunset',  171,  4.2,  0.4, 3.9, 16, -1.0, 1],
    // THE EVENTS
    ['hall-chandelier', 186, 0.0, 0.0, 5.8,  0,  0,   1],
    ['hall-wide',     192, -6.0, -0.2, 7.4, 24,  1.0, 0],
    ['hall-tables',   196,  6.0,  0.5, 7.4, 24, -1.0, 0],
    ['hall-doors',    203,  0.5,  0.0, 6.4,  0,  0,   0],
    // THE COAST
    ['night-terrace', 214, -1.0,  0.0, 7.6,  0,  0,   0],
    ['sign-dusk',     230,  0.0,  1.5, 12.0, 0,  0,   0],
    ['sea-terrace',   226, -8.2, -0.6, 6.4, 24,  1.0, 0],
    ['sign-sea',      225,  8.2,  0.8, 6.0, 24, -1.0, 0]
  ];

  /* camera path (world: x right, y up, camera moves toward -z) */
  function pathX(s) { return 1.5 * Math.sin(s * 0.052) + 0.8 * Math.sin(s * 0.021 + 1.0); }
  function pathY(s) { return 0.35 * Math.sin(s * 0.037 + 0.5); }

  /* pacing: p (0..1 scroll) <-> s (distance), slow near DWELL points */
  var TAB_N = 1400, S_TAB = [], P_TAB = [];
  (function buildPacing() {
    var acc = 0, prev = 0, i, s, v, k;
    for (i = 0; i <= TAB_N; i++) {
      s = END * i / TAB_N;
      v = 1;
      for (k = 0; k < DWELL.length; k++) v -= 0.72 * Math.exp(-Math.pow((s - DWELL[k]) / 6.5, 2));
      if (i > 0) acc += (s - prev) / v;
      prev = s; S_TAB.push(s); P_TAB.push(acc);
    }
    for (i = 0; i <= TAB_N; i++) P_TAB[i] /= acc;
  })();
  function lookup(xs, ys, x) {
    var lo = 0, hi = xs.length - 1, mid;
    if (x <= xs[0]) return ys[0];
    if (x >= xs[hi]) return ys[hi];
    while (hi - lo > 1) { mid = (lo + hi) >> 1; if (xs[mid] <= x) lo = mid; else hi = mid; }
    var t = (x - xs[lo]) / (xs[hi] - xs[lo]);
    return ys[lo] + (ys[hi] - ys[lo]) * t;
  }
  function pToS(p) { return lookup(P_TAB, S_TAB, p); }
  function sToP(s) { return lookup(S_TAB, P_TAB, s); }

  /* ------------------------------------------------------------------ */
  /*  Shaders                                                            */
  /* ------------------------------------------------------------------ */
  var NOISE = [
    'float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }',
    'float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);',
    '  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }',
    'float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<3;i++){ s+=a*noise(p); p*=2.03; a*=.5; } return s/.875; }'
  ].join('\n');

  var PHOTO_VS = [
    'varying vec2 vUv; varying float vViewZ;',
    'void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position,1.0); vViewZ = -mv.z; gl_Position = projectionMatrix*mv; }'
  ].join('\n');

  var PHOTO_FS = [
    'uniform sampler2D uMap; uniform float uHasMap, uAspect, uVis, uFade, uShape, uSeed, uOpacity, uZoom, uBrightness;',
    'uniform vec2 uShift; uniform vec3 uFogColor, uGrade; uniform float uFogNear, uFogFar;',
    'varying vec2 vUv; varying float vViewZ;',
    NOISE,
    'float sdBox(vec2 p, vec2 b){ vec2 d=abs(p)-b; return length(max(d,0.))+min(max(d.x,d.y),0.); }',
    'void main(){',
    '  vec2 p = (vUv-.5)*vec2(uAspect,1.);',
    '  float n = fbm(vUv*3.+uSeed);',
    /* silhouette: rounded rectangle, or an arch for tall photos, with a very slight organic wobble */
    '  float d;',
    '  if(uShape<.5){ float r=.012; d = sdBox(p, vec2(uAspect*.5-r,.5-r)) - r; }',
    '  else { float rad=uAspect*.5, yc=.5-rad; float d1=sdBox(p-vec2(0.,(yc-.5)*.5), vec2(rad,(yc+.5)*.5)); float d2=length(p-vec2(0.,yc))-rad; d=min(d1,d2); }',
    '  d += (n-.5)*.010;',
    '  float shape = 1.-smoothstep(-.003,.003,d);',
    /* entrance: a rising "tide line" reveals the photo, with a faint gold shimmer on the edge */
    '  float f = vUv.y*.55 + n*.45;',
    '  float x = uVis*1.25-.1;',
    '  float rv = smoothstep(f-.05,f+.07,x);',
    '  float band = smoothstep(f-.05,f,x)*(1.-smoothstep(f,f+.07,x));',
    /* exit: a portal opens in the centre of the photo as the camera flies through */
    '  float g = length(p)*1.1 + (n-.5)*.5;',
    '  float ex = smoothstep(uFade*1.7-.37, uFade*1.7-.23, g);',
    /* inner parallax: the photo content shifts slightly against the plane */
    '  vec2 tuv = (vUv-.5)/uZoom + .5 + uShift;',
    '  vec3 col = uHasMap>.5 ? texture2D(uMap,tuv).rgb : uFogColor;',
    '  col *= uGrade*uBrightness;',
    '  col *= 1.-.3*smoothstep(.25,.85,length(vUv-.5));',
    /* atmospheric perspective: distance pushes the photo into the fog */
    '  float fogA = smoothstep(uFogNear,uFogFar,vViewZ);',
    '  float lum = dot(col,vec3(.299,.587,.114));',
    '  col = mix(col, vec3(lum), fogA*.35);',
    '  col = mix(col, uFogColor, fogA*.84);',
    '  col += vec3(1.,.82,.52)*band*.32;',
    '  gl_FragColor = vec4(col, shape*rv*ex*uOpacity);',
    '  #include <colorspace_fragment>',
    '}'
  ].join('\n');

  var SHADOW_VS = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }';
  var SHADOW_FS = [
    'uniform float uAlpha; varying vec2 vUv;',
    'void main(){ vec2 p=(vUv-.5)*2.; vec2 q=max(abs(p)-vec2(.66),0.); float a=1.-smoothstep(0.,.34,length(q)); a*=a;',
    '  gl_FragColor=vec4(.01,.04,.06,a*uAlpha); }'
  ].join('\n');

  var GLOW_FS = [
    'uniform float uAlpha; uniform vec3 uColor; varying vec2 vUv;',
    'void main(){ vec2 p=(vUv-.5)*2.; float a=pow(max(0.,1.-length(p)),2.2)*uAlpha;',
    '  gl_FragColor=vec4(uColor*a,a);',
    '#include <colorspace_fragment>',
    '}'
  ].join('\n');

  var BG_VS = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,.9999,1.); }';
  var BG_FS = [
    'uniform vec3 uTop, uBottom, uGlowColor; uniform float uTime, uGlowAmt; uniform vec2 uRes; varying vec2 vUv;',
    'float h(vec2 p){ return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715)))); }',
    'void main(){',
    '  vec3 c = mix(uBottom,uTop,smoothstep(0.,1.,vUv.y));',
    '  float g = pow(max(0.,1.-length((vUv-vec2(.5,.52))*vec2(1.2,1.6))),2.);',
    '  c += uGlowColor*g*uGlowAmt;',
    '  c += (h(vUv*uRes+fract(uTime)*91.)-.5)*.014;',   // fine film grain
    '  gl_FragColor=vec4(c,1.);',
    '#include <colorspace_fragment>',
    '}'
  ].join('\n');

  var DUST_VS = [
    'attribute float aSeed; uniform float uTime, uScale, uCamZ, uSpan; varying float vA;',
    'void main(){',
    '  vec3 pos=position;',
    '  pos.x += sin(uTime*.12+aSeed*40.)*.7; pos.y += sin(uTime*.17+aSeed*27.)*.5 - uTime*.02*aSeed;',
    '  pos.z = uCamZ - mod(uCamZ-position.z, uSpan);',
    '  vec4 mv = modelViewMatrix*vec4(pos,1.); float dz=-mv.z;',
    '  gl_PointSize = (.8+aSeed*2.2)*uScale/max(dz,.1);',
    '  vA = smoothstep(.8,3.,dz)*(1.-smoothstep(26.,uSpan,dz))*(.3+.7*fract(aSeed*91.));',
    '  gl_Position = projectionMatrix*mv; }'
  ].join('\n');
  var DUST_FS = [
    'uniform vec3 uColor; varying float vA;',
    'void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d)*vA*.6; gl_FragColor=vec4(uColor*a,a);',
    '#include <colorspace_fragment>',
    '}'
  ].join('\n');

  /* ------------------------------------------------------------------ */
  /*  Engine                                                             */
  /* ------------------------------------------------------------------ */
  var THREE_, renderer, scene, camera, clock;
  var bgMat, dust, dustMat, shots = [], glows = [];
  var tl = null, rafId = 0, running = false, visible = false;
  var state = { p: 0 };
  var fogUniform, mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  var enabled = false, quality = { dpr: 1, lay: 1, ws: 1, mobile: false };
  var loader, cfg = { loadAhead: 92, keep: 125, tex: 'lg' };
  var frameTimes = [], lastT = 0, adaptDone = false, chapterEls = [], railEls = [];
  var progressEl = document.getElementById('journeyProgress');
  var loadingEl = document.getElementById('journeyLoading');
  var curChapter = -1;

  function col(hex) { return new THREE_.Color(hex); }

  function setupQuality() {
    var mobile = narrowMq.matches || coarseMq.matches;
    quality.mobile = mobile;
    cfg.tex = (mobile || window.innerWidth < 1100) ? 'sm' : 'lg';
    quality.dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
    root.style.setProperty('--journey-height', mobile ? '880vh' : '1000vh');
  }

  function init() {
    THREE_ = window.THREE;
    clock = new THREE_.Clock();
    renderer = new THREE_.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE_.SRGBColorSpace;
    renderer.setClearColor(0x06151c, 1);
    scene = new THREE_.Scene();
    camera = new THREE_.PerspectiveCamera(46, 16 / 9, 0.1, 140);
    loader = new THREE_.TextureLoader();
    fogUniform = { value: col('#102f3a') };

    /* background: gradient + glow + film grain on a full-screen triangle */
    var bgGeo = new THREE_.PlaneGeometry(2, 2);
    bgMat = new THREE_.ShaderMaterial({
      vertexShader: BG_VS, fragmentShader: BG_FS, depthTest: false, depthWrite: false,
      uniforms: { uTop: { value: col(PALETTE[0][0]) }, uBottom: { value: col(PALETTE[0][1]) },
        uGlowColor: { value: col(GLOW[0]) }, uGlowAmt: { value: .12 }, uTime: { value: 0 }, uRes: { value: new THREE_.Vector2(1, 1) } }
    });
    var bg = new THREE_.Mesh(bgGeo, bgMat); bg.frustumCulled = false; bg.renderOrder = -100; scene.add(bg);

    /* photographs */
    SHOTS.forEach(function (d, i) { buildShot(d, i); });
    /* soft light blooms behind the hero photographs */
    DWELL.slice(0, 6).forEach(function (s, i) { buildGlow(i, s + 10); });
    buildDust();

    window.addEventListener('pointermove', onPointer, { passive: true });
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); fallback(); });
    resize();
  }

  function buildShot(d, i) {
    var key = d[0], ar = IMG[key] || 1.5, w = d[4], h = w / ar;
    var group = new THREE_.Group();
    var uniforms = {
      uMap: { value: null }, uHasMap: { value: 0 }, uAspect: { value: ar }, uVis: { value: 0 }, uFade: { value: 0 },
      uShape: { value: d[7] }, uSeed: { value: i * 7.13 }, uOpacity: { value: 1 }, uZoom: { value: 1.07 }, uBrightness: { value: 1 },
      uShift: { value: new THREE_.Vector2() }, uFogColor: fogUniform, uGrade: { value: new THREE_.Vector3(1.03, 1.0, .965) },
      uFogNear: { value: 11 }, uFogFar: { value: 52 }
    };
    var mat = new THREE_.ShaderMaterial({ vertexShader: PHOTO_VS, fragmentShader: PHOTO_FS, uniforms: uniforms, transparent: true, depthWrite: false });
    var mesh = new THREE_.Mesh(new THREE_.PlaneGeometry(1, 1), mat);
    mesh.scale.set(w, h, 1);

    var shUni = { uAlpha: { value: 0 } };
    var shMat = new THREE_.ShaderMaterial({ vertexShader: SHADOW_VS, fragmentShader: SHADOW_FS, uniforms: shUni, transparent: true, depthWrite: false });
    var shadow = new THREE_.Mesh(new THREE_.PlaneGeometry(1, 1), shMat);
    shadow.scale.set(w * 1.55, h * 1.55, 1); shadow.position.set(w * .02, -h * .05, -.3);

    group.add(shadow); group.add(mesh); scene.add(group);
    shots.push({
      key: key, s: d[1], off: d[2], y: d[3], w: w, h: h, turn: d[5], roll: d[6], group: group, mesh: mesh, shadow: shadow,
      u: uniforms, shU: shUni, status: 'idle', tex: null, born: 0, phase: i * 1.7
    });
  }

  function buildGlow(i, s) {
    var uni = { uAlpha: { value: 0 }, uColor: { value: col(GLOW[i]) } };
    var mat = new THREE_.ShaderMaterial({
      vertexShader: SHADOW_VS, fragmentShader: GLOW_FS, uniforms: uni, transparent: true, depthWrite: false, blending: THREE_.AdditiveBlending
    });
    var m = new THREE_.Mesh(new THREE_.PlaneGeometry(1, 1), mat);
    m.scale.set(30, 20, 1); scene.add(m);
    glows.push({ mesh: m, u: uni, s: s });
  }

  function buildDust() {
    var N = quality.mobile ? 380 : 800, span = 64, pos = new Float32Array(N * 3), seed = new Float32Array(N);
    for (var i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - .5) * 30;
      pos[i * 3 + 1] = (Math.random() - .5) * 15;
      pos[i * 3 + 2] = -Math.random() * 400;
      seed[i] = Math.random();
    }
    var g = new THREE_.BufferGeometry();
    g.setAttribute('position', new THREE_.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE_.BufferAttribute(seed, 1));
    dustMat = new THREE_.ShaderMaterial({
      vertexShader: DUST_VS, fragmentShader: DUST_FS, transparent: true, depthWrite: false, depthTest: false, blending: THREE_.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uScale: { value: 150 }, uCamZ: { value: 0 }, uSpan: { value: span }, uColor: { value: col('#f1dfb8') } }
    });
    dust = new THREE_.Points(g, dustMat); dust.frustumCulled = false; dust.renderOrder = 50; scene.add(dust);
  }

  /* ---------- texture streaming: only textures near the camera stay on the GPU ---------- */
  function loadShot(sh) {
    sh.status = 'loading';
    var url = 'images/journey/' + sh.key + '-' + cfg.tex + '.webp';
    loader.load(url, function (t) {
      if (!enabled) { t.dispose(); return; }
      t.colorSpace = THREE_.SRGBColorSpace;
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      renderer.initTexture(t);
      sh.tex = t; sh.u.uMap.value = t; sh.u.uHasMap.value = 1; sh.status = 'ready'; sh.born = performance.now();
      if (sh.key === 'sign-sea' && sh.s === 17) markReady();
    }, undefined, function () { sh.status = 'idle'; sh.failed = (sh.failed || 0) + 1; });
  }
  function streamTextures(camS) {
    var wanted = [];
    shots.forEach(function (sh) {
      var dist = Math.abs(sh.s - camS);
      if (sh.status === 'idle' && dist < cfg.loadAhead && (sh.failed || 0) < 3) wanted.push([dist, sh]);
      else if (sh.status === 'ready' && dist > cfg.keep) {
        sh.tex.dispose(); sh.tex = null; sh.u.uMap.value = null; sh.u.uHasMap.value = 0; sh.status = 'idle'; sh.u.uVis.value = 0;
      }
    });
    // nearest photographs first, so a long scroll-jump shows something immediately
    wanted.sort(function (a, b) { return a[0] - b[0]; }).forEach(function (w) { loadShot(w[1]); });
  }
  var readyMarked = false;
  function markReady() { if (readyMarked) return; readyMarked = true; root.setAttribute('data-ready', 'true'); }

  /* ---------- layout ---------- */
  function resize() {
    if (!renderer) return;
    var w = stage.clientWidth || window.innerWidth, h = stage.clientHeight || window.innerHeight;
    if (!w || !h) return;
    var aspect = w / h;
    renderer.setPixelRatio(quality.dpr);
    renderer.setSize(w, h, false);
    camera.aspect = aspect;
    camera.fov = aspect < 0.9 ? 62 : (aspect < 1.3 ? 54 : 46);
    camera.updateProjectionMatrix();
    quality.lay = Math.max(.42, Math.min(1.12, aspect / 1.6));
    quality.ws = Math.max(.78, Math.min(1.05, .42 + .58 * quality.lay));
    bgMat.uniforms.uRes.value.set(w * quality.dpr, h * quality.dpr);
    dustMat.uniforms.uScale.value = 105 * quality.dpr * (h / 900);
    shots.forEach(function (sh) {
      sh.mesh.scale.set(sh.w * quality.ws, sh.h * quality.ws, 1);
      sh.shadow.scale.set(sh.w * quality.ws * 1.55, sh.h * quality.ws * 1.55, 1);
      sh.shadow.position.set(sh.w * quality.ws * .02, -sh.h * quality.ws * .05, -.3);
    });
  }

  function onPointer(e) {
    if (coarseMq.matches) return;
    mouse.x = (e.clientX / window.innerWidth - .5) * 2;
    mouse.y = (e.clientY / window.innerHeight - .5) * 2;
  }

  /* ---------- per-frame update ---------- */
  var tmpCol = null, colA, colB;
  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  function paletteAt(s) {
    // blend between neighbouring chapters across a 14-unit window at each boundary
    var i = 0;
    for (var k = 0; k < CHAPTERS.length; k++) if (s >= CHAPTERS[k].s0) i = k;
    var a = i, b = i, t = 0;
    if (i > 0 && s < CHAPTERS[i].s0 + 7) { a = i - 1; b = i; t = .5 + (s - CHAPTERS[i].s0) / 14; }
    else if (i < CHAPTERS.length - 1 && s > CHAPTERS[i + 1].s0 - 7) { a = i; b = i + 1; t = (s - (CHAPTERS[i + 1].s0 - 7)) / 14; }
    return { a: a, b: b, t: Math.max(0, Math.min(1, t)) };
  }

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    if (!visible) return;
    var dt = Math.min(.05, clock.getDelta()), time = clock.elapsedTime;

    /* adaptive quality: cheaper if the device cannot hold ~30fps */
    if (!adaptDone && !window.__COAST_NOADAPT) {
      if (lastT) frameTimes.push(now - lastT);
      if (frameTimes.length > 90) {
        var avg = frameTimes.reduce(function (a, b) { return a + b; }, 0) / frameTimes.length;
        frameTimes = [];
        if (avg > 36) {
          if (quality.dpr > 1) { quality.dpr = 1; resize(); }
          else { dust.geometry.setDrawRange(0, 220); adaptDone = true; }
        } else adaptDone = true;
      }
    }
    lastT = now;

    var s = pToS(state.p);
    var idx = 0;
    for (var k = 0; k < CHAPTERS.length; k++) if (s >= CHAPTERS[k].s0 + (k ? -3 : 0)) idx = k;
    if (idx !== curChapter) { curChapter = idx; railEls.forEach(function (el, n) { el.classList.toggle('is-active', n === idx); }); }
    mouse.sx += (mouse.x - mouse.sx) * Math.min(1, dt * 2.4);
    mouse.sy += (mouse.y - mouse.sy) * Math.min(1, dt * 2.4);

    /* ---- camera ---- */
    var cx = pathX(s) + mouse.sx * .5 + Math.sin(time * .33) * .06;
    var cy = pathY(s) - mouse.sy * .28 + Math.sin(time * .41) * .04;
    var cz = -s;
    camera.position.set(cx, cy, cz);
    var tx = pathX(s + 9) - mouse.sx * .25, ty = pathY(s + 9) * .8 + .1 + mouse.sy * -.1;
    camera.lookAt(tx, ty, -(s + 9));
    camera.rotateZ(Math.sin(s * .03) * .022 + mouse.sx * -.012);

    /* ---- chapter palette & light ---- */
    var pal = paletteAt(s);
    colA = colA || new THREE_.Color(); colB = colB || new THREE_.Color();
    bgMat.uniforms.uTop.value.set(PALETTE[pal.a][0]).lerp(colB.set(PALETTE[pal.b][0]), pal.t);
    bgMat.uniforms.uBottom.value.set(PALETTE[pal.a][1]).lerp(colB.set(PALETTE[pal.b][1]), pal.t);
    bgMat.uniforms.uGlowColor.value.set(GLOW[pal.a]).lerp(colB.set(GLOW[pal.b]), pal.t);
    bgMat.uniforms.uGlowAmt.value = .1 + .06 * Math.sin(time * .3);
    bgMat.uniforms.uTime.value = time;
    fogUniform.value.copy(bgMat.uniforms.uTop.value).lerp(bgMat.uniforms.uBottom.value, .55);
    dustMat.uniforms.uTime.value = time; dustMat.uniforms.uCamZ.value = cz;

    /* ---- photographs ---- */
    var lay = quality.lay;
    for (var i = 0; i < shots.length; i++) {
      var sh = shots[i], g = sh.group;
      var hero = Math.abs(sh.off) < 2.2 && sh.key !== 'sign-dusk';
      var px = pathX(sh.s) + sh.off * lay + (hero ? 1.5 * lay : 0), py = pathY(sh.s) + sh.y + (sh.off < -2.2 ? .9 : 0);
      var dz = sh.s - s;                         // distance in front of the camera
      var vis = 0, fade = 0, op = 1;
      if (sh.status === 'ready') {
        vis = 1 - smooth(15, 27, dz);           // tide-line entrance from the distance
        // fade in smoothly once loaded
        op = Math.min(1, (performance.now() - sh.born) / 900);
        var near = Math.abs(sh.off) < 2.2 ? 1 : .55;     // centred photos dissolve into a portal as the camera passes through
        fade = 1 - smooth(1.0, 4.2 * near + .4, dz);
        if (dz < 0.6) op = 0;
      }
      var active = op > .002 && vis > .002 && fade < .998 && dz > .5 && dz < 60;
      g.visible = active;
      if (!active) continue;
      var sign = sh.off === 0 ? (sh.key === 'sign-dusk' ? 0 : (sh.roll >= 0 ? 1 : -1)) : (sh.off < 0 ? -1 : 1);
      g.position.set(px, py + Math.sin(time * .5 + sh.phase) * .05, -sh.s);
      g.rotation.set(0, THREE_.MathUtils.degToRad(-sign * sh.turn), THREE_.MathUtils.degToRad(sh.roll));
      sh.u.uVis.value = vis;
      sh.u.uFade.value = fade;
      sh.u.uOpacity.value = op;
      // inner parallax from the viewing angle + slow drift
      var ang = (px - cx) / Math.max(dz, 3);
      sh.u.uShift.value.set(Math.max(-1, Math.min(1, -ang * 1.4)) * .028 + Math.sin(time * .2 + sh.phase) * .004, (cy - py) / Math.max(dz, 3) * .02);
      sh.u.uZoom.value = 1.07 + (1 - vis) * .05 + (1 - smooth(0, 14, dz)) * .0;
      sh.shU.uAlpha.value = .5 * vis * (1 - fade) * op;
    }
    /* lens blooms */
    for (var j = 0; j < glows.length; j++) {
      var gl = glows[j], d2 = gl.s - s;
      var a = smooth(-4, 14, d2) * (1 - smooth(14, 40, d2)) * .5 + smooth(40, 14, d2) * 0;
      a = Math.max(0, Math.min(1, 1 - Math.abs(d2 - 10) / 26)) * .42;
      gl.mesh.visible = a > .01;
      gl.mesh.position.set(pathX(gl.s) , pathY(gl.s) + .6, -(gl.s + 2));
      gl.u.uAlpha.value = a;
    }

    if (Math.floor(time * 4) !== Math.floor((time - dt) * 4)) streamTextures(s);
    renderer.render(scene, camera);
  }

  /* ---------- scroll choreography (GSAP + ScrollTrigger) ---------- */
  function buildTimeline() {
    var gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);
    chapterEls = [].slice.call(root.querySelectorAll('.chapter'));
    railEls = [].slice.call(root.querySelectorAll('.journey-rail li'));

    tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: root, start: 'top top', end: 'bottom bottom', scrub: .8, invalidateOnRefresh: true,
        onUpdate: function (self) {
          if (progressEl) progressEl.style.transform = 'scaleX(' + self.progress.toFixed(4) + ')';
        }
      }
    });
    tl.to(state, { p: 1, duration: 1 }, 0);

    chapterEls.forEach(function (el, i) {
      var c = CHAPTERS[i], last = i === CHAPTERS.length - 1;
      var inA = sToP(TEXT_IN[i][0]), inB = sToP(TEXT_IN[i][1]);
      var outA = sToP(c.s1 - 10), outB = sToP(c.s1 - 4.5);
      var parts = [].slice.call(el.querySelectorAll('.chapter-no, h2 > span, h2:not(.finale-title), .chapter-lead, .text-link, .finale-actions'));
      var dIn = Math.max(.004, inB - inA);
      gsap.set(el, { autoAlpha: 0 });
      tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: dIn * .6, ease: 'power1.out' }, inA);
      tl.fromTo(parts, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: dIn, stagger: dIn * .16, ease: 'power2.out' }, inA);
      if (!last) {
        tl.to(el, { autoAlpha: 0, y: -22, duration: Math.max(.004, outB - outA), ease: 'power1.in' }, outA);
        tl.set(parts, { y: 0, opacity: 1 }, outB);
      }
    });
  }

  /* ---------- lifecycle ---------- */
  function homeVisible() { return root.offsetParent !== null; }

  var io = null, ro = null;
  function enable() {
    if (enabled) return;
    enabled = true;
    root.setAttribute('data-mode', 'immersive');
    root.setAttribute('data-ready', 'false');
    setupQuality();
    try {
      init();
      buildTimeline();
    } catch (err) {
      console.warn('[journey] WebGL setup failed, using static layout.', err);
      fallback(); return;
    }
    io = new IntersectionObserver(function (en) { visible = en[0].isIntersecting && homeVisible(); }, { rootMargin: '10% 0px' });
    io.observe(stage);
    ro = new ResizeObserver(function () { resize(); window.ScrollTrigger && window.ScrollTrigger.refresh(); });
    ro.observe(stage);
    streamTextures(0);
    setTimeout(markReady, 4500);
    running = true; lastT = 0; clock.getDelta();
    rafId = requestAnimationFrame(frame);
    window.addEventListener('resize', onResize);
    window.ScrollTrigger.refresh();
  }

  var resizeT = 0;
  function onResize() {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () {
      var wasMobile = quality.mobile; setupQuality();
      if (wasMobile !== quality.mobile) { fallbackToReinit(); return; }
      resize(); window.ScrollTrigger.refresh();
    }, 150);
  }
  function fallbackToReinit() { disable(); setTimeout(enable, 60); }

  function disable() {
    enabled = false; running = false; visible = false;
    cancelAnimationFrame(rafId);
    if (io) { io.disconnect(); io = null; }
    if (ro) { ro.disconnect(); ro = null; }
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pointermove', onPointer);
    if (tl) { if (tl.scrollTrigger) tl.scrollTrigger.kill(); tl.kill(); tl = null; }
    if (window.gsap) window.gsap.set(root.querySelectorAll('.chapter, .chapter *'), { clearProps: 'all' });
    shots.forEach(function (sh) { if (sh.tex) sh.tex.dispose(); sh.group.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); });
    shots = []; glows = [];
    if (renderer) { renderer.dispose(); renderer = null; }
    readyMarked = false; curChapter = -1;
  }

  function fallback() {
    disable();
    root.setAttribute('data-mode', 'static');
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  /* ---------- start ---------- */
  document.getElementById('journeySkip').addEventListener('click', function () {
    var end = root.getBoundingClientRect().bottom + window.scrollY - window.innerHeight;
    window.scrollTo({ top: end, behavior: 'smooth' });
  });

  function boot() {
    if (query === 'immersive' || canRun()) { if (canRun()) enable(); else root.setAttribute('data-mode', 'static'); }
    else root.setAttribute('data-mode', 'static');
  }
  var onMotionChange = function () { if (reduceMq.matches) fallback(); else boot(); };
  if (reduceMq.addEventListener) reduceMq.addEventListener('change', onMotionChange);

  // the original SPA router hides the home view when other pages are open
  new MutationObserver(function () {
    if (!enabled) return;
    var vis = homeVisible();
    if (!vis) visible = false;
    else window.ScrollTrigger.refresh();
  }).observe(document.getElementById('home'), { attributes: true, attributeFilter: ['hidden'] });

  window.__coastJourney = { state: state, pToS: pToS, sToP: sToP, END: END, get mode() { return root.dataset.mode; }, get shots() { return shots; } };
  boot();
})();
