/* ==========================================================================
   THE COAST BY RAD — cinematic 3D scroll journey (v2)
   Real Three.js scene: perspective camera flying down -Z through 18 photographs placed at
   different depths, arch "portal gates" between chapters (the first one plays the homepage hero
   video itself), depth-of-field blur, atmospheric fog, foreground bokeh and 3D dust,
   choreographed with GSAP + ScrollTrigger. Starts only after the original homepage hero.

   Modes
     immersive : full WebGL journey (sticky stage, ~1500vh scroll runway on desktop)
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
  var heroVideo = document.getElementById('heroVideo');
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
    // browsers block WebGL textures (and fonts) from file:// pages -> use the static layout when double-clicked
    if (location.protocol === 'file:') return false;
    if (reduceMq.matches) return false;
    if (!window.THREE || !window.gsap || !window.ScrollTrigger) return false;
    if (!(window.CSS && CSS.supports && CSS.supports('overflow-x', 'clip'))) return false;
    return hasWebGL();
  }

  /* ------------------------------------------------------------------ */
  /*  Story data                                                         */
  /*  The camera travels along -z; s = distance travelled.               */
  /*  Chapters begin at a portal gate: you fly through it into the next  */
  /*  scene, and the sky/sea palette changes as you cross.               */
  /* ------------------------------------------------------------------ */
  var END = 304;
  var GATES = [12, 50, 110, 166, 230, 268];        // gate 0 = the hero-video portal
  var CHAPTERS = [
    { s0: 0,   s1: 50  },   // 01 Arrival
    { s0: 50,  s1: 110 },   // 02 The Property
    { s0: 110, s1: 166 },   // 03 The Stay      (hero card: Stay)
    { s0: 166, s1: 230 },   // 04 The Café      (hero card: Café)
    { s0: 230, s1: 268 },   // 05 The Events    (hero card: Events)
    { s0: 268, s1: END }    // 06 The Coast
  ];
  // [top, bottom] sky/sea colours per chapter — each chapter has its own atmosphere
  var PALETTE = [
    ['#0a2733', '#2a6670'],   // arrival: first light over teal water
    ['#0b3a4a', '#2f8a8c'],   // property: clear daylight, turquoise
    ['#14303a', '#4d7f80'],   // stay: calm sea-teal (hero card accent: sea)
    ['#2a1d18', '#b8714a'],   // café: warm golden coral (hero card accent: coral)
    ['#0c2438', '#24506a'],   // events: early-evening blue
    ['#1a1030', '#c4693f']    // coast: sunset
  ];
  var GLOW   = ['#f0d9a8', '#8fd0cb', '#9fcfc9', '#f2b27e', '#e6c997', '#ff9a5a'];
  // accent colour per chapter. Stay / Café / Events reuse the hero cards' bottom-border colours
  var ACCENT = ['#e6c997', '#8fc3c0', '#8fc3c0', '#e29a7b', '#e6c997', '#f2b27e'];
  // when each chapter's copy arrives / leaves (in s)
  var TEXT_IN = [[6, 12], [51, 56], [111, 116], [167, 172], [231, 236], [269, 274]];
  var TEXT_OUT = [[34, 42], [96, 103], [152, 159], [214, 221], [254, 261], null];

  // key, s (depth), off (lateral offset from path), y, width, turn(deg), roll(deg), shape(0 rect / 1 arch), hero(1)
  var SHOTS = [
    // 01 ARRIVAL
    ['sign-sea',        30,  0.6,  0.1, 7.6,  0,  0, 0, 1],
    ['sea-terrace',     39, -3.8, -0.4, 5.8, 20,  1.0, 0, 0],
    ['terrace-gold',    45,  4.6,  0.8, 5.6, 22, -1.0, 0, 0],
    // 02 THE PROPERTY
    ['house-pool',      70,  0.5,  0.0, 7.8,  0,  0, 0, 1],
    ['pool-lounge',     80,  4.6,  0.4, 4.4, 22, -1.5, 1, 0],
    ['pool-sunset',     92, -3.4,  0.2, 4.4, 20,  1.2, 1, 0],
    // 03 THE STAY
    ['room-blue',      128,  0.5,  0.0, 7.6,  0,  0, 0, 1],
    ['room-suite',     139,  4.6,  0.5, 6.2, 22, -1.0, 0, 0],
    ['room-bed',       150, -3.8, -0.2, 6.0, 20,  1.0, 0, 0],
    // 04 THE CAFÉ
    ['cafe-glass',     184,  0.5,  0.1, 7.8,  0,  0, 0, 1],
    ['coffee-camera',  194,  4.6, -0.3, 6.0, 22, -1.2, 0, 0],
    ['drink-red',      205, -3.7,  0.4, 3.9, 20,  1.5, 1, 0],
    ['pasta-sea',      217,  4.0,  0.3, 4.2, 18, -1.0, 1, 0],
    // 05 THE EVENTS
    ['hall-chandelier',248,  0.6,  0.0, 5.6,  0,  0, 1, 1],
    ['hall-wide',      260,  4.4,  0.3, 7.0, 22, -1.0, 0, 0],
    // 06 THE COAST
    ['night-terrace',  282,  0.5,  0.0, 7.4,  0,  0, 0, 1],
    ['gate-dusk',      291, -3.8, -0.3, 5.8, 20,  1.0, 0, 0],
    ['sign-dusk',      312,  0.6,  0.6, 8.6,  0,  0, 0, 1]
  ];
  var HERO_S = [30, 70, 128, 184, 248, 282];

  /* camera path (world: x right, y up, camera moves toward -z) */
  function pathX(s) { return 1.5 * Math.sin(s * 0.052) + 0.8 * Math.sin(s * 0.021 + 1.0); }
  function pathY(s) { return 0.35 * Math.sin(s * 0.037 + 0.5); }

  /* pacing: p (0..1 scroll) <-> s (distance). The camera decelerates into every photograph
     (strongly for each chapter's hero) so each picture can be appreciated, then glides on. */
  var WELLS = [[3, 0.55]];
  SHOTS.forEach(function (d) { WELLS.push([d[1] - 9.5, d[8] ? 0.80 : 0.50]); });
  WELLS.push([END - 1, 0.7]);
  var TAB_N = 2000, S_TAB = [], P_TAB = [];
  (function buildPacing() {
    var acc = 0, prev = 0, i, s, v, k;
    for (i = 0; i <= TAB_N; i++) {
      s = END * i / TAB_N;
      v = 1;
      for (k = 0; k < WELLS.length; k++) v -= WELLS[k][1] * Math.exp(-Math.pow((s - WELLS[k][0]) / 6.0, 2));
      v = Math.max(.16, v);
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
    'uniform sampler2D uMap; uniform float uHasMap, uAspect, uVis, uFade, uShape, uSeed, uOpacity, uZoom, uBrightness, uBlur;',
    'uniform vec2 uShift; uniform vec3 uFogColor, uGrade; uniform float uFogNear, uFogFar;',
    'varying vec2 vUv; varying float vViewZ;',
    NOISE,
    'float sdBox(vec2 p, vec2 b){ vec2 d=abs(p)-b; return length(max(d,0.))+min(max(d.x,d.y),0.); }',
    /* depth of field: photographs far from the focal plane are softened with a 9-tap disc blur */
    'vec3 blurSample(vec2 uv){',
    '  if(uBlur<.03) return texture2D(uMap,uv).rgb;',
    '  float r=uBlur*.022; vec3 s=vec3(0.);',
    '  for(int i=0;i<9;i++){ float a=float(i)*2.39996323; float rr=sqrt((float(i)+.5)/9.)*r;',
    '    s+=texture2D(uMap, uv+vec2(cos(a)/uAspect, sin(a))*rr, uBlur*2.2).rgb; }',
    '  return s/9.;',
    '}',
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
    '  vec3 col = uHasMap>.5 ? blurSample(tuv) : uFogColor;',
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
    'uniform vec3 uTop, uBottom, uGlowColor; uniform float uTime, uGlowAmt, uFlash; uniform vec2 uRes, uCenter; varying vec2 vUv;',
    'float h(vec2 p){ return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715)))); }',
    'void main(){',
    '  vec3 c = mix(uBottom,uTop,smoothstep(0.,1.,vUv.y));',
    '  float hz = exp(-pow((vUv.y-.42)/.17,2.));',                       // soft horizon band
    '  c += uGlowColor*hz*.15;',
    '  float g = pow(max(0.,1.-length((vUv-vec2(uCenter.x,.52))*vec2(1.2,1.6))),2.);',
    '  c += uGlowColor*g*(uGlowAmt+uFlash*.35);',
    '  vec2 q = vUv-vec2(uCenter.x+.16,1.18); float ang = atan(q.x,-q.y);',   // faint light shafts
    '  float rays = pow(max(0.,sin(ang*9.+1.3+uTime*.03)*.5+.5),5.)*smoothstep(1.5,.2,length(q));',
    '  c += uGlowColor*rays*.05;',
    '  c += (h(vUv*uRes+fract(uTime)*91.)-.5)*.014;',                  // fine film grain
    '  gl_FragColor=vec4(c,1.);',
    '#include <colorspace_fragment>',
    '}'
  ].join('\n');

  /* portal gate: an arch you fly through. Interior shows the NEXT scene's atmosphere (or, for the
     first gate, the homepage hero video itself) and fades as the camera crosses the threshold. */
  var GATE_FS = [
    'uniform sampler2D uVid; uniform float uHasVid, uAspect, uFill, uGlow, uAlpha, uTime, uVidAspect;',
    'uniform vec3 uColA, uColB, uAccent;',
    'varying vec2 vUv; varying float vViewZ;',
    NOISE,
    'float sdBox(vec2 p, vec2 b){ vec2 d=abs(p)-b; return length(max(d,0.))+min(max(d.x,d.y),0.); }',
    'void main(){',
    '  vec2 p = (vUv-.5)*vec2(uAspect,1.);',
    '  float rad=uAspect*.5, yc=.5-rad;',
    '  float d1=sdBox(p-vec2(0.,(yc-.5)*.5), vec2(rad,(yc+.5)*.5)); float d2=length(p-vec2(0.,yc))-rad;',
    '  float d=min(d1,d2);',
    '  float inside = 1.-smoothstep(-.004,.004,d);',
    '  float ring = exp(-pow(d/.014,2.));',
    '  float halo = exp(-pow(max(d,0.)/.07,1.4))*(1.-inside);',
    '  float n = fbm(vUv*3.2+vec2(uTime*.04,-uTime*.03));',
    '  vec3 gradc = mix(uColB,uColA,vUv.y) + uAccent*(.10+.22*n)*pow(max(0.,1.-length(p*vec2(1.,.8))*1.6),2.);',
    /* cover-fit the portrait hero video inside the arch (same centre crop as the full-screen hero) */
    '  float ar = uAspect; vec2 vsz = ar>uVidAspect ? vec2(1.,uVidAspect/ar) : vec2(ar/uVidAspect,1.);',
    '  vec2 vuv = .5+(vUv-.5)*vsz;',
    '  vec3 vid = texture2D(uVid,vuv).rgb*vec3(.9,.92,.9);',
    '  vec3 interior = uHasVid>.5 ? vid : gradc;',
    '  interior *= 1.-.35*smoothstep(.3,.75,length(p));',
    '  float aI = inside*uFill;',
    '  float aR = clamp(ring*1.1+halo*.5,0.,1.)*uGlow;',
    '  vec3 rgb = (interior*aI + uAccent*aR)/max(aI+aR,1e-3);',
    '  float a = clamp(aI + aR*(1.-aI),0.,1.)*uAlpha;',
    '  gl_FragColor = vec4(rgb,a);',
    '#include <colorspace_fragment>',
    '}'
  ].join('\n');

  /* foreground bokeh: large soft discs of light drifting close to the lens */
  var BOKEH_VS = [
    'attribute float aSeed; uniform float uTime, uScale, uCamZ, uSpan; varying float vA;',
    'void main(){',
    '  vec3 pos=position;',
    '  pos.x += sin(uTime*.09+aSeed*30.)*.9; pos.y += sin(uTime*.13+aSeed*19.)*.6;',
    '  pos.z = uCamZ - mod(uCamZ-position.z, uSpan);',
    '  vec4 mv = modelViewMatrix*vec4(pos,1.); float dz=-mv.z;',
    '  gl_PointSize = (14.+aSeed*46.)*uScale/max(dz,.1);',
    '  vA = smoothstep(1.4,3.4,dz)*(1.-smoothstep(7.,uSpan,dz))*(.35+.65*fract(aSeed*53.));',
    '  gl_Position = projectionMatrix*mv; }'
  ].join('\n');
  var BOKEH_FS = [
    'uniform vec3 uColor; varying float vA;',
    'void main(){ float d=length(gl_PointCoord-.5);',
    '  float a=smoothstep(.5,.455,d)*(.30+.70*smoothstep(.2,.46,d))*vA*.16;',
    '  gl_FragColor=vec4(uColor*a,a);',
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
  var bgMat, dust, dustMat, bokeh, bokehMat, shots = [], glows = [], gates = [], vidTex = null, shift = { x: 0, y: 0 };
  var tl = null, handoff = null, rafId = 0, running = false, visible = false;
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
    root.style.setProperty('--journey-height', mobile ? '1150vh' : (window.innerWidth < 1100 ? '1300vh' : '1500vh'));
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
        uGlowColor: { value: col(GLOW[0]) }, uGlowAmt: { value: .12 }, uFlash: { value: 0 }, uTime: { value: 0 }, uRes: { value: new THREE_.Vector2(1, 1) }, uCenter: { value: new THREE_.Vector2(.5, .5) } }
    });
    var bg = new THREE_.Mesh(bgGeo, bgMat); bg.frustumCulled = false; bg.renderOrder = -100; scene.add(bg);

    /* photographs */
    SHOTS.forEach(function (d, i) { buildShot(d, i); });
    /* soft light blooms behind the hero photographs */
    HERO_S.forEach(function (s, i) { buildGlow(i, s); });
    GATES.forEach(function (gs, i) { buildGate(i, gs); });
    buildDust();
    buildBokeh();

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
      uBlur: { value: 0 }, uShift: { value: new THREE_.Vector2() }, uFogColor: fogUniform, uGrade: { value: new THREE_.Vector3(1.03, 1.0, .965) },
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

  function buildGate(i, gs) {
    var first = i === 0;
    var h = first ? 25 : 17, w = h * (first ? .86 : .88);
    if (first && heroVideo) {
      vidTex = new THREE_.VideoTexture(heroVideo);
      vidTex.colorSpace = THREE_.SRGBColorSpace;
      vidTex.minFilter = THREE_.LinearFilter; vidTex.generateMipmaps = false;
    }
    var next = PALETTE[Math.min(i, PALETTE.length - 1)];
    var uni = {
      uVid: { value: vidTex }, uHasVid: { value: 0 }, uAspect: { value: w / h }, uVidAspect: { value: 720 / 1280 },
      uFill: { value: first ? 1 : .6 }, uGlow: { value: 1 }, uAlpha: { value: 0 }, uTime: { value: 0 },
      uColA: { value: col(next[0]).multiplyScalar(1.5) }, uColB: { value: col(next[1]).multiplyScalar(1.15) },
      uAccent: { value: col(ACCENT[Math.min(i, ACCENT.length - 1)]) }
    };
    var mat = new THREE_.ShaderMaterial({ vertexShader: PHOTO_VS, fragmentShader: GATE_FS, uniforms: uni, transparent: true, depthWrite: false });
    var mesh = new THREE_.Mesh(new THREE_.PlaneGeometry(1, 1), mat);
    mesh.scale.set(w, h, 1); scene.add(mesh);
    gates.push({ s: gs, mesh: mesh, u: uni, first: first });
  }

  function buildBokeh() {
    var N = quality.mobile ? 14 : 30, span = 16, pos = new Float32Array(N * 3), seed = new Float32Array(N);
    for (var i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - .5) * 15;
      pos[i * 3 + 1] = (Math.random() - .5) * 8;
      pos[i * 3 + 2] = -Math.random() * 420;
      seed[i] = Math.random();
    }
    var g = new THREE_.BufferGeometry();
    g.setAttribute('position', new THREE_.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE_.BufferAttribute(seed, 1));
    bokehMat = new THREE_.ShaderMaterial({
      vertexShader: BOKEH_VS, fragmentShader: BOKEH_FS, transparent: true, depthWrite: false, depthTest: false, blending: THREE_.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uScale: { value: 150 }, uCamZ: { value: 0 }, uSpan: { value: span }, uColor: { value: col('#f1dfb8') } }
    });
    bokeh = new THREE_.Points(g, bokehMat); bokeh.frustumCulled = false; bokeh.renderOrder = 60; scene.add(bokeh);
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
      if (sh.key === SHOTS[0][0]) markReady();
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
    /* the 3D world's vanishing point sits right of centre (or above centre on portrait screens),
       leaving a dedicated, photo-free space for each chapter's text */
    if (aspect >= 1.05) { shift.x = Math.round(w * (aspect > 1.5 ? .12 : .17)); shift.y = 0; }
    else { shift.x = 0; shift.y = Math.round(h * .19); }
    camera.setViewOffset(w, h, -shift.x, shift.y, w, h);
    camera.updateProjectionMatrix();
    bgMat.uniforms.uCenter.value.set(.5 + shift.x / w, .5 - shift.y / h);
    quality.lay = Math.max(.42, Math.min(1.12, aspect / 1.6));
    quality.ws = Math.max(.78, Math.min(1.05, .42 + .58 * quality.lay));
    if (aspect >= 1.05) quality.ws *= (aspect > 1.5 ? .93 : .82);   // leave room for the text column (squarer screens need more)
    else quality.ws *= (w >= 700 ? 1 : .86);  // portrait phones: keep photo edges inside the screen
    bgMat.uniforms.uRes.value.set(w * quality.dpr, h * quality.dpr);
    dustMat.uniforms.uScale.value = 105 * quality.dpr * (h / 900);
    bokehMat.uniforms.uScale.value = 110 * quality.dpr * (h / 900);
    shots.forEach(function (sh) {
      var k = quality.ws * ((aspect < 1.05 && sh.u.uShape.value) ? .9 : 1);   // tall arches shrink a little more on portrait screens
      sh.mesh.scale.set(sh.w * k, sh.h * k, 1);
      sh.shadow.scale.set(sh.w * k * 1.55, sh.h * k * 1.55, 1);
      sh.shadow.position.set(sh.w * k * .02, -sh.h * k * .05, -.3);
    });
  }

  function onPointer(e) {
    if (coarseMq.matches) return;
    mouse.x = (e.clientX / window.innerWidth - .5) * 2;
    mouse.y = (e.clientY / window.innerHeight - .5) * 2;
  }

  /* ---------- per-frame update ---------- */
  var colA, colB;
  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  function chapterAt(s, pad) {
    var i = 0;
    for (var k = 1; k < GATES.length; k++) if (s >= GATES[k] - (pad || 0)) i = k;
    return i;
  }
  function paletteAt(s) {
    // the atmosphere changes exactly as the camera crosses each portal gate
    var i = chapterAt(s), a = i, b = i, t = 0;
    var gThis = i > 0 ? GATES[i] : null, gNext = i < GATES.length - 1 ? GATES[i + 1] : null;
    if (gThis !== null && s < gThis + 5) { a = i - 1; b = i; t = .5 + (s - gThis) / 10; }
    else if (gNext !== null && s > gNext - 5) { a = i; b = i + 1; t = (s - (gNext - 5)) / 10; }
    return { a: a, b: b, t: smooth(0, 1, t) };
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
    var idx = chapterAt(s, 3);
    if (idx !== curChapter) {
      curChapter = idx; root.style.setProperty('--accent', ACCENT[idx]); root.setAttribute('data-active-chapter', idx);
      railEls.forEach(function (el, n) { el.classList.toggle('is-active', n === idx); });
      if (bokehMat) bokehMat.uniforms.uColor.value.set(GLOW[idx]);
    }
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
      var px = pathX(sh.s) + sh.off * lay, py = pathY(sh.s) + sh.y + (sh.off < -2.2 ? .6 : 0);
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
      // depth of field: sharp at the focal distance (~10 units ahead), soft when very near or far
      sh.u.uBlur.value = Math.max(smooth(7.5, 2.4, dz), smooth(22, 42, dz) * .85) * (quality.mobile ? .6 : 1);
      sh.u.uOpacity.value = op;
      // inner parallax from the viewing angle + slow drift
      var ang = (px - cx) / Math.max(dz, 3);
      sh.u.uShift.value.set(Math.max(-1, Math.min(1, -ang * 1.4)) * .028 + Math.sin(time * .2 + sh.phase) * .004, (cy - py) / Math.max(dz, 3) * .02);
      sh.u.uZoom.value = 1.07 + (1 - vis) * .05;
      sh.shU.uAlpha.value = .5 * vis * (1 - fade) * op;
    }
    /* lens blooms behind each chapter's hero photograph */
    for (var j = 0; j < glows.length; j++) {
      var gl = glows[j], d2 = gl.s - s;
      var a = Math.max(0, Math.min(1, 1 - Math.abs(d2 - 10) / 26)) * .42;
      gl.mesh.visible = a > .01;
      gl.mesh.position.set(pathX(gl.s), pathY(gl.s) + .6, -(gl.s + 2));
      gl.u.uAlpha.value = a;
    }
    /* portal gates + the flash of light as each one is crossed */
    var flash = 0;
    for (var gi = 0; gi < gates.length; gi++) {
      var G = gates[gi], gd = G.s - s;
      flash = Math.max(flash, Math.exp(-Math.pow(gd / 2.8, 2)));
      var showG = gd > .25 && gd < 62;
      G.mesh.visible = showG;
      if (!showG) continue;
      G.mesh.position.set(pathX(G.s), pathY(G.s), -G.s);
      G.u.uAlpha.value = 1 - smooth(34, 62, gd);
      G.u.uFill.value = (G.first ? 1 : .62) * smooth(.9, 6, gd);
      G.u.uGlow.value = smooth(.3, 2.6, gd);
      G.u.uTime.value = time;
      if (G.first) G.u.uHasVid.value = (heroVideo && heroVideo.readyState >= 2) ? 1 : 0;
    }
    bgMat.uniforms.uFlash.value = flash;
    bokehMat.uniforms.uTime.value = time; bokehMat.uniforms.uCamZ.value = cz;

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
      var last = i === CHAPTERS.length - 1;
      var inA = sToP(TEXT_IN[i][0]), inB = sToP(TEXT_IN[i][1]);
      var parts = [].slice.call(el.querySelectorAll('.card-echo, .chapter-no, h2 > span, h2:not(.finale-title), .chapter-lead, .text-link, .finale-actions'));
      var dIn = Math.max(.004, inB - inA);
      gsap.set(el, { autoAlpha: 0 });
      tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: dIn * .6, ease: 'power1.out' }, inA);
      tl.fromTo(parts, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: dIn, stagger: dIn * .14, ease: 'power2.out' }, inA);
      if (!last) {
        var outA = sToP(TEXT_OUT[i][0]), outB = sToP(TEXT_OUT[i][1]);
        tl.to(el, { autoAlpha: 0, y: -22, duration: Math.max(.004, outB - outA), ease: 'power1.in' }, outA);
        tl.set(parts, { y: 0, opacity: 1 }, outB);
      }
    });

    /* hand-off: as the original hero scrolls away it dissolves into the journey's first colours
       and its video drifts slowly towards the camera. Layout is untouched at scroll 0. */
    var hero = document.querySelector('.home');
    if (hero) {
      var dis = hero.querySelector('.home-dissolve');
      if (!dis) { dis = document.createElement('i'); dis.className = 'home-dissolve'; dis.setAttribute('aria-hidden', 'true'); hero.insertBefore(dis, hero.firstChild); }
      handoff = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom 22%', scrub: true } });
      handoff.fromTo(dis, { opacity: 0 }, { opacity: .94 }, 0);
      var hv = hero.querySelector('.home-video');
      if (hv) handoff.fromTo(hv, { scale: 1 }, { scale: 1.14 }, 0);
    }

    /* chapter rail: jump to any chapter */
    railEls.forEach(function (li, n) {
      var btn = li.querySelector('button'); if (!btn || btn._bound) return; btn._bound = true;
      btn.addEventListener('click', function () {
        var top = root.getBoundingClientRect().top + window.scrollY, run = root.offsetHeight - window.innerHeight;
        var target = n === 0 ? TEXT_IN[0][1] + 6 : TEXT_IN[n][1] + 6;
        window.scrollTo({ top: top + sToP(target) * run, behavior: 'smooth' });
      });
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
    if (handoff) { if (handoff.scrollTrigger) handoff.scrollTrigger.kill(); handoff.kill(); handoff = null; }
    if (window.gsap) window.gsap.set('.home-dissolve, .home-video', { clearProps: 'all' });
    if (vidTex) { vidTex.dispose(); vidTex = null; }
    if (window.gsap) window.gsap.set(root.querySelectorAll('.chapter, .chapter *'), { clearProps: 'all' });
    shots.forEach(function (sh) { if (sh.tex) sh.tex.dispose(); sh.group.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); });
    shots = []; glows = []; gates = []; bokeh = null; bokehMat = null;
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

  window.__coastJourney = { state: state, pToS: pToS, sToP: sToP, END: END, GATES: GATES, TEXT_IN: TEXT_IN, HERO_S: HERO_S,
    yForS: function (sv) { var top = root.getBoundingClientRect().top + window.scrollY; return top + sToP(sv) * (root.offsetHeight - window.innerHeight); }, get mode() { return root.dataset.mode; }, get shots() { return shots; } };
  boot();
})();
