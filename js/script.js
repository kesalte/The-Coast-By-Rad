const src = n => `images/${n}.jpg`;

/* ---------- Simple page switching (uses the #hash in the address) ---------- */
/* ---------- Dish photos (tap a dish to see it). Add more: "Dish name": "file-name-without-.jpg" ---------- */
const DISH = {
  "Surfside Nuggets": "food-nuggets", "Saltwater Strings": "food-strings", "Pierside Fish & Chips": "food-fishchips",
  "Gull's Wing Plate": "food-wings", "Tidal Crunch Calamari": "food-calamari",
  "Fisherman's Crust": "food-pizza-crust", "Sunset Spice Pepperoni": "food-pizza-pepperoni",
  "The Coast House Tuyo Special": "food-pizza-tuyo", "Sailor's Crunch": "food-pizza-sailor",
  "Islander's Choice": "food-pizza-islander", "Crust & Cheese": "food-pizza-cheese", "Pizza Sandbar": "food-pizza-sandbar",
  "Fisherman's Wharf": "food-pasta-wharf", "Anchor's Rest": "food-pasta-anchor", "Crimson Coast Classic": "food-pasta-crimson"
};
function dishPic(n) {
  return `<div class="ph">${DISH[n] ? `<img src="${src(DISH[n])}" alt="${n}" loading="lazy">` : '<div class="soon">Photo coming soon</div>'}</div>`;
}

const views = [...document.querySelectorAll('.view')];
const siteIntro = document.getElementById('siteIntro');
const heroVideo = document.getElementById('heroVideo');
let homeGalleryContext = null;
let aboutGalleryContext = null;
const siteHeader = document.querySelector('.site-header');
const primaryNav = document.getElementById('primaryNav');
const menuToggle = document.getElementById('menuToggle');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let lastObservedHash = location.hash;
const transitionOverlay = document.getElementById('oceanTransition');
const transitionCanvas = document.getElementById('oceanTransitionCanvas');
let oceanCompositor;
let transitionToken = 0;
let transitionFrame = 0;
let pendingPageUpdate = null;
const transitionDuration = 1600;
const routeSwapAt = 800;

function syncHeroVideo(viewId) {
  if (!heroVideo) return;
  if (viewId !== 'home' || reducedMotion.matches) {
    heroVideo.pause();
    return;
  }

  const playback = heroVideo.play();
  if (playback && typeof playback.catch === 'function') {
    playback.catch(error => console.warn('The homepage video could not start.', error));
  }
}

function setMobileNavOpen(open) {
  primaryNav.classList.toggle('is-open', open);
  menuToggle.classList.toggle('is-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  if (open) siteHeader.classList.remove('is-hidden');
}
menuToggle.addEventListener('click', () => {
  setMobileNavOpen(menuToggle.getAttribute('aria-expanded') !== 'true');
});
primaryNav.addEventListener('click', e => {
  if (e.target.closest('a')) setMobileNavOpen(false);
});
document.addEventListener('click', e => {
  if (menuToggle.getAttribute('aria-expanded') === 'true' && !siteHeader.contains(e.target)) setMobileNavOpen(false);
});
let lastHeaderScrollY = window.scrollY;
function updateHeaderOnScroll() {
  const currentScrollY = window.scrollY;
  const isScrollingDown = currentScrollY > lastHeaderScrollY;
  const menuOpen = menuToggle.getAttribute('aria-expanded') === 'true';

  siteHeader.classList.toggle('is-scrolled', currentScrollY > 24 || document.body.classList.contains('inner'));
  if (currentScrollY <= 24 || isScrollingDown === false || menuOpen) {
    siteHeader.classList.remove('is-hidden');
  } else if (isScrollingDown && currentScrollY - lastHeaderScrollY > 5 && currentScrollY > 96) {
    siteHeader.classList.add('is-hidden');
  }

  lastHeaderScrollY = Math.max(currentScrollY, 0);
}
updateHeaderOnScroll();

const scrollUpButton = document.querySelector('.scroll-up');
const scrollDownButton = document.querySelector('.scroll-down');

function updateScrollButtons() {
  const atTop = window.scrollY <= 24;
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 24;
  scrollUpButton.classList.toggle('is-hidden', atTop);
  scrollDownButton.classList.toggle('is-hidden', atBottom);
}

scrollUpButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
scrollDownButton.addEventListener('click', () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }));
updateScrollButtons();

function activeViewId() {
  const active = views.find(view => !view.hidden);
  return active ? active.id : null;
}

function revertPageGalleryContexts() {
  if (homeGalleryContext) {
    homeGalleryContext.revert();
    homeGalleryContext = null;
  }
  if (aboutGalleryContext) {
    aboutGalleryContext.revert();
    aboutGalleryContext = null;
  }
}

function route() {
  const id = (location.hash || '#home').slice(1);
  const current = views.find(v => v.id === id) || views[0];
  revertPageGalleryContexts();
  views.forEach(v => {
    v.hidden = v !== current;
  });
  document.body.classList.toggle('inner', current.id !== 'home');
  if (current.id !== 'home' && siteIntro) {
    siteIntro.hidden = true;
    document.body.classList.remove('is-loading');
  }
  primaryNav.querySelectorAll('a[href^="#"]').forEach(link => {
    if (link.getAttribute('href') === `#${current.id}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  setMobileNavOpen(false);
  syncHeroVideo(current.id);
  window.scrollTo({ top: 0, behavior: 'instant' });
  siteHeader.classList.remove('is-hidden');
  siteHeader.classList.toggle('is-scrolled', current.id !== 'home');
  lastHeaderScrollY = 0;
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    syncPageAnimations(current.id);
    refreshInitialLayout();
  });
}

function compileTransitionShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Could not allocate an ocean transition shader.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'Unknown shader compilation error.';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createOceanCompositor() {
  const gl = transitionCanvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false });
  if (!gl) throw new Error('WebGL is not available in this browser.');

  const vertexSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = (a_position + 1.0) * 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;
  const fragmentSource = `
    precision mediump float;
    uniform vec2 u_resolution;
    uniform float u_progress;
    uniform float u_time;
    varying vec2 v_uv;

    float hash21(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    float noise2(vec2 p) {
      vec2 cell = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash21(cell);
      float b = hash21(cell + vec2(1.0, 0.0));
      float c = hash21(cell + vec2(0.0, 1.0));
      float d = hash21(cell + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      mat2 turn = mat2(1.62, -1.18, 1.18, 1.62);
      for (int octave = 0; octave < 3; octave++) {
        value += amplitude * noise2(p);
        p = turn * p + vec2(13.7, 9.2);
        amplitude *= 0.5;
      }
      return value;
    }

    float edgeRoughness(float y) {
      return 0.026 * sin(y * 7.1 + 0.3)
        + 0.016 * sin(y * 17.3 + 1.8)
        + 0.008 * sin(y * 37.7 + 3.1)
        + 0.006 * (noise2(vec2(y * 29.0, 4.7)) - 0.5);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution;
      float time = u_time;

      float leadingBase = -0.20 + 3.40 * u_progress;
      float trailingBase = leadingBase - 1.62;
      float leadingEdge = leadingBase + edgeRoughness(uv.y);
      float trailingEdge = trailingBase + edgeRoughness(uv.y + 11.7) * 0.82;
      float edgeAA = max(0.0015, 1.5 / u_resolution.x);
      float coverage = smoothstep(-edgeAA, edgeAA, leadingEdge - uv.x)
        * smoothstep(-edgeAA, edgeAA, uv.x - trailingEdge);

      vec2 broadCoord = vec2(uv.x * 3.2 - time * 0.19, uv.y * 8.5 + time * 0.035);
      float broad = fbm(broadCoord);
      vec2 flowCoord = vec2(
        uv.x * 6.4 - time * 0.34 + (broad - 0.5) * 0.72,
        uv.y * 21.0 + (broad - 0.5) * 2.2
      );
      float detail = fbm(flowCoord);
      float fine = fbm(flowCoord * 2.35 + vec2(-time * 0.12, time * 0.08));

      float longPhase = uv.x * 16.0 + uv.y * 2.8 - time * 7.2 + (broad - 0.5) * 2.0;
      float shortPhase = uv.x * 31.0 - uv.y * 7.0 - time * 12.0 + (detail - 0.5) * 2.5;
      vec3 normal = normalize(vec3(
        -0.42 * cos(longPhase) - 0.22 * cos(shortPhase),
        -0.12 * cos(longPhase) + 0.07 * cos(shortPhase),
        1.0
      ));
      vec3 lightDirection = normalize(vec3(-0.38, 0.48, 0.79));
      vec3 viewDirection = vec3(0.0, 0.0, 1.0);
      float diffuse = max(dot(normal, lightDirection), 0.0);
      float specular = pow(max(dot(reflect(-lightDirection, normal), viewDirection), 0.0), 24.0);

      float colorMix = smoothstep(0.14, 0.82, detail * 0.58 + fine * 0.34 + broad * 0.18);
      vec3 water = mix(vec3(0.01, 0.12, 0.23), vec3(0.018, 0.52, 0.57), colorMix);
      water *= 0.78 + diffuse * 0.34 + detail * 0.24;
      float ridgedReflection = pow(max(1.0 - abs(detail * 2.0 - 1.0), 0.0), 5.0);
      float shimmer = pow(max(sin(longPhase * 0.86 + detail * 2.6), 0.0), 18.0);
      water += vec3(0.24, 0.62, 0.6) * (specular * 0.74 + ridgedReflection * 0.16 + shimmer * 0.12);
      water += vec3(0.035, 0.15, 0.16) * pow(max(1.0 - fine, 0.0), 3.0);
      float signedFront = leadingEdge - uv.x;
      float curlRim = exp(-pow((signedFront - 0.03 - 0.009 * sin(uv.y * 9.0)) / 0.024, 2.0));
      float curlTrough = exp(-pow((signedFront - 0.095) / 0.045, 2.0));
      water *= 1.0 - curlTrough * 0.22;
      water += vec3(0.34, 0.7, 0.68) * curlRim * 0.26;

      float frontDistance = abs(leadingEdge - uv.x);
      float rearDistance = abs(uv.x - trailingEdge);
      float frontCrest = 1.0 - smoothstep(0.003, 0.072, frontDistance);
      float rearFoam = 1.0 - smoothstep(0.003, 0.05, rearDistance);
      vec2 foamCoord = vec2(
        uv.x * 38.0 - time * 1.55 + (broad - 0.5) * 2.4,
        uv.y * 72.0 + (detail - 0.5) * 3.2
      );
      float foamField = fbm(foamCoord);
      float foamFilaments = smoothstep(0.34, 0.67, foamField) * frontCrest;
      float splashNoise = noise2(uv * vec2(102.0, 87.0) + vec2(-time * 4.2, time * 0.18));
      float splashes = smoothstep(0.76, 0.94, splashNoise) * frontCrest * 0.28;

      vec2 bubbleGrid = uv * vec2(36.0, 58.0) - vec2(time * 2.6, 0.0);
      vec2 bubbleCell = floor(bubbleGrid);
      vec2 bubbleOffset = fract(bubbleGrid) - 0.5;
      float bubbleSeed = hash21(bubbleCell);
      vec2 bubbleCenter = vec2(
        hash21(bubbleCell + vec2(17.2, 3.8)),
        hash21(bubbleCell + vec2(8.1, 23.7))
      ) - 0.5;
      float bubbleRadius = 0.13 + bubbleSeed * 0.05;
      float bubbleRing = 1.0 - smoothstep(0.025, 0.055, abs(length(bubbleOffset - bubbleCenter * 0.42) - bubbleRadius));
      float bubbleZone = max(frontCrest, rearFoam * 0.72);
      float bubbles = bubbleRing * step(0.958, bubbleSeed) * bubbleZone * 0.24;
      float trailingFoam = rearFoam * smoothstep(0.28, 0.6, foamField) * 0.82;
      float surfaceFoam = smoothstep(0.64, 0.86, foamField) * coverage * 0.1;

      float foam = clamp(foamFilaments * 0.9 + splashes + bubbles
        + trailingFoam + surfaceFoam, 0.0, 0.96);
      water = mix(water, vec3(0.88, 0.96, 0.92), foam);
      gl_FragColor = vec4(water, coverage);
    }
  `;

  const vertexShader = compileTransitionShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileTransitionShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error('Could not allocate the ocean transition compositor.');
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || 'Could not link the ocean transition compositor.');
  }

  const position = gl.getAttribLocation(program, 'a_position');
  const resolutionUniform = gl.getUniformLocation(program, 'u_resolution');
  const progressUniform = gl.getUniformLocation(program, 'u_progress');
  const timeUniform = gl.getUniformLocation(program, 'u_time');
  const buffer = gl.createBuffer();
  if (position < 0 || !resolutionUniform || !progressUniform || !timeUniform || !buffer) {
    throw new Error('Could not initialize the ocean transition compositor.');
  }

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.clearColor(0, 0, 0, 0);

  return { gl, program, resolutionUniform, progressUniform, timeUniform };
}

function cancelPageTransition() {
  transitionToken++;
  if (transitionFrame) cancelAnimationFrame(transitionFrame);
  transitionFrame = 0;
  pendingPageUpdate = null;
  transitionOverlay.hidden = true;
}

function finishPageTransition(token) {
  if (token !== transitionToken) return;
  const updatePage = pendingPageUpdate;
  pendingPageUpdate = null;
  transitionToken++;
  if (transitionFrame) cancelAnimationFrame(transitionFrame);
  transitionFrame = 0;
  transitionOverlay.hidden = true;
  if (updatePage) updatePage();
}

function drawOceanTransitionFrame(elapsed) {
  const { gl, program, resolutionUniform, progressUniform, timeUniform } = oceanCompositor;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1, 1920 / window.innerWidth, 1080 / window.innerHeight);
  const width = Math.max(1, Math.round(transitionCanvas.clientWidth * pixelRatio));
  const height = Math.max(1, Math.round(transitionCanvas.clientHeight * pixelRatio));
  if (transitionCanvas.width !== width || transitionCanvas.height !== height) {
    transitionCanvas.width = width;
    transitionCanvas.height = height;
  }

  gl.viewport(0, 0, width, height);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);
  gl.uniform2f(resolutionUniform, width, height);
  gl.uniform1f(progressUniform, Math.min(elapsed / transitionDuration, 1));
  gl.uniform1f(timeUniform, elapsed / 1000);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function animateOceanTransition(token, startTime, pageUpdated, timestamp) {
  if (token !== transitionToken) return;
  if (startTime === null) startTime = timestamp;
  const elapsed = timestamp - startTime;
  try {
    drawOceanTransitionFrame(elapsed);
  } catch (error) {
    console.warn('Ocean video transition rendering failed; continuing with normal navigation.', error);
    finishPageTransition(token);
    return;
  }

  if (!pageUpdated && elapsed >= routeSwapAt) {
    pageUpdated = true;
    const updatePage = pendingPageUpdate;
    pendingPageUpdate = null;
    if (updatePage) updatePage();
  }
  if (elapsed >= transitionDuration) {
    finishPageTransition(token);
    return;
  }
  transitionFrame = requestAnimationFrame(nextTimestamp =>
    animateOceanTransition(token, startTime, pageUpdated, nextTimestamp));
}

function startPageTransition(updatePage) {
  if (reducedMotion.matches || !oceanCompositor) {
    updatePage();
    return;
  }

  cancelPageTransition();
  const token = transitionToken;
  pendingPageUpdate = updatePage;
  transitionOverlay.hidden = false;
  transitionFrame = requestAnimationFrame(timestamp =>
    animateOceanTransition(token, null, false, timestamp));
}

function navigateToView(id, afterRoute) {
  const hash = `#${id}`;
  if (!views.some(view => view.id === id)) return;

  if (activeViewId() === id) {
    if (location.hash !== hash) {
      history.pushState(null, '', hash);
      lastObservedHash = location.hash;
    }
    if (afterRoute) afterRoute();
    return;
  }

  history.pushState(null, '', hash);
  lastObservedHash = location.hash;
  startPageTransition(() => {
    route();
    if (afterRoute) afterRoute();
  });
}

function handleLocationChange() {
  const hash = location.hash;
  if (hash === lastObservedHash) return;
  lastObservedHash = hash;
  startPageTransition(() => route());
}

addEventListener('hashchange', handleLocationChange);
addEventListener('popstate', handleLocationChange);
document.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest('a[href^="#"]');
  if (!link || link.target === '_blank' || link.hasAttribute('download')
    || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const id = link.hash.slice(1);
  if (!views.some(view => view.id === id)) return;
  event.preventDefault();

  if (activeViewId() === id) {
    if (location.hash !== `#${id}`) {
      history.pushState(null, '', `#${id}`);
      lastObservedHash = location.hash;
    }
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    return;
  }
  navigateToView(id);
});
try {
  oceanCompositor = createOceanCompositor();
} catch (error) {
  console.warn('Procedural ocean transition is disabled; page navigation will continue without an overlay.', error);
}
route();

if (siteIntro) {
  if (document.body.classList.contains('inner') || reducedMotion.matches) {
    siteIntro.hidden = true;
    document.body.classList.remove('is-loading');
  } else {
    document.body.classList.add('is-loading');
    siteIntro.addEventListener('animationend', event => {
      if (event.target === siteIntro && event.animationName === 'intro-exit') {
        siteIntro.hidden = true;
        document.body.classList.remove('is-loading');
        if (window.ScrollTrigger) requestAnimationFrame(() => window.ScrollTrigger.refresh());
        refreshInitialLayout();
      }
    });
    setTimeout(() => {
      if (siteIntro.hidden) return;
      siteIntro.hidden = true;
      document.body.classList.remove('is-loading');
      refreshInitialLayout();
    }, 4600);
  }
}
heroVideo.addEventListener('error', () => {
  console.error('The homepage video failed to load; using the poster image instead.');
});
addEventListener('load', refreshInitialLayout);
addEventListener('pageshow', refreshInitialLayout);
addEventListener('resize', () => refreshInitialLayout(), { passive: true });
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(refreshInitialLayout);
}
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) {
    if (siteIntro) siteIntro.hidden = true;
    document.body.classList.remove('is-loading');
    const updatePage = pendingPageUpdate;
    cancelPageTransition();
    document.querySelectorAll('.water-ripple').forEach(ripple => {
      const target = ripple.parentElement;
      ripple.remove();
      if (target && !target.querySelector('.water-ripple')) target.classList.remove('ripple-surface');
    });
    if (updatePage) updatePage();
  }
  syncHeroVideo(activeViewId());
});

/* ---------- Menu data: [name, price, note]. A price can be a number or [hot, iced] ---------- */
const MENU = {
  "Breakfast": [
    { t: "All-day breakfast", sub: "Each plate comes with rice, eggs and a side.", i: [
      ["Shorebound Franks", 325, "Angus beef franks"],
      ["Castaway's Catch", 325, "Boneless bangus marinated in vinegar and garlic"],
      ["Boardwalk Spam", 325, "Seared spam slices"],
      ["Ferryman's Favorite", 325, "Corned beef sautéed with onions"],
      ["Outrigger's Choice", 325, "Beef tapa with garlic and vinegar"],
      ["Sunrise Links", 325, "Longganisa"]
    ]}
  ],
  "Bites": [
    { t: "Waffles", i: [
      ["The Berry Coast", 180], ["Golden Sands Caramel", 175], ["Midnight Cocoa", 175],
      ["Nutty Shore", 175], ["Honeyed Island Banana", 175]
    ]},
    { t: "Sandwiches", i: [
      ["Sunrise Egg", 150], ["Coastal Chicken Melt", 180], ["Pier Tuna Pimiento", 175],
      ["The RAD Clubhouse", 195], ["Golden Horizon French Toast", 175]
    ]},
    { t: "Appetizers", i: [
      ["Surfside Nuggets", 275], ["Saltwater Strings", 160], ["Pierside Fish & Chips", 275],
      ["Gull's Wing Plate", 375], ["Tidal Crunch Calamari", 300]
    ]},
    { t: "Take-out", sub: "Take-out orders include a ₱20 \"Coast-to-Go\" packaging fee.", i: [] }
  ],
  "Pizza & Pasta": [
    { t: "Pizza", sub: "10-inch.", i: [
      ["Fisherman's Crust", 475], ["Sunset Spice Pepperoni", 475], ["The Coast House Tuyo Special", 475],
      ["Sailor's Crunch", 450], ["Islander's Choice", 450], ["Crust & Cheese", 450],
      ["Pizza Sandbar", 375, "Three 5-inch pizzas: Sailor's Crunch, Islander's Choice, Crust & Cheese"]
    ]},
    { t: "Pasta", i: [
      ["Fisherman's Wharf", 325, "Spanish sardines in extra virgin coconut oil, herbs and coastal spices"],
      ["Anchor's Rest", 275, "Salted egg cream sauce with bacon and garden herbs"],
      ["Crimson Coast Classic", 275, "Beef meatballs in tomato sauce"]
    ]}
  ],
  "Coast-to-Share": [
    { t: "Sharing platters", sub: "Not valid with other discounts, including Senior Citizen, PWD and diplomatic.", i: [
      ["Coast-to-Share 1", 999, "Good for 2. Pasta platter, Saltwater Strings, Pizza Sandbar, iced tea pitcher"],
      ["Coast-to-Share 2", 1499, "Good for 3 to 4. Pasta platter, Surfside Nuggets, 10-inch pizza, iced tea pitcher"],
      ["Coast-to-Share 3", 1999, "Good for 4 to 6. Pasta platter, Surfside Nuggets, 10-inch pizza, Gull's Wing Plate, iced tea pitcher"]
    ]}
  ],
  "Coffee & Tea": [
    { t: "Espresso drinks", sub: "Hot / iced.", i: [
      ["Caramel Macchiato", [170, 180]], ["Americano", [150, 160]], ["Latte", [170, 180]],
      ["Cappuccino", [170, 180]], ["Spanish Latte", [170, 180]]
    ]},
    { t: "Coffee frappe", i: [
      ["Black Sand Mocha", 180], ["Espresso Oreo", 180], ["Midnight Espresso", 180],
      ["French Vanilla", 180], ["Coco Crest", 180], ["Dark Tide Jelly", 180]
    ]},
    { t: "Non-coffee frappe", i: [
      ["Banana Strawberry", 180], ["Cookies & Currents", 180], ["Cocoa Caramel Milk", 180],
      ["Seafoam Matcha", 180], ["Strawberry Matcha", 180]
    ]},
    { t: "Tea (Twinings)", i: [
      ["Earl Grey", 120], ["English Breakfast", 120], ["Green Tea & Mint", 120], ["Green Tea & Lemon", 120],
      ["Four Red Fruits", 120], ["Strawberry & Mango", 120], ["Lemon & Ginger", 120]
    ]}
  ],
  "Bar": [
    { t: "Beer", i: [
      ["Heineken", 180], ["Hoagarden", 250], ["Corona", 195],
      ["Pale Pilsen", 120], ["Red Horse", 120], ["San Miguel Light", 120], ["San Mig Apple", 120]
    ]},
    { t: "Coast-to-Cheer", sub: "A bucket is 5 canned beers: Pale Pilsen, Red Horse, San Mig Light or San Mig Apple.", i: [
      ["Coast-to-Cheer 1", 500, "Bucket of beer"],
      ["Coast-to-Cheer 2", 650, "Bucket + Saltwater Strings"],
      ["Coast-to-Cheer 3", 750, "Bucket + Surfside or Pierside"],
      ["Coast-to-Cheer 4", 850, "Bucket + Gull's Wing Plate"],
      ["Coast-to-Cheer 5", 850, "Bucket + Pizza Sandbar"],
      ["Coast-to-Cheer 6", 950, "Bucket + 10-inch pizza of your choice"]
    ]},
    { t: "Cocktails", i: [
      ["Coastline Fizz", 175, "Gin and lemon-lime soda"], ["Lighthouse Tonic", 175, "Gin and tonic"],
      ["Shoreline Shaker", 195, "Classic margarita"], ["Tidal Mint", 225, "Classic mojito"],
      ["The RAD Signature", 250, "Tropical mojito"], ["High Tide Fizz", 175, "Vodka and lemon-lime soda"],
      ["Reef Sunset", 195, "Vodka, orange juice and grenadine"], ["Madras Drift", 195, "Vodka, cranberry and orange juice"],
      ["Honeycomb Harbor", 225, "Vodka, lemon and honey"]
    ]},
    { t: "Wine", sub: "750 ml bottles.", i: [
      ["Cabernet Sauvignon", 800, "Australia, Wolf Blass Eaglehawk"], ["Sauvignon Blanc", 850, "Australia, Hearts & Wines"],
      ["Moscato", 900, "Australia, Hardy's"], ["Chardonnay", 975, "South Africa, Table Mountain"],
      ["Merlot", 1500, "Chile, Santa Carolina"], ["Pink Moscato", 1500, "Chile, Santa Carolina"]
    ]}
  ]
};

const peso = n => '₱' + n.toLocaleString('en-PH');
const price = p => Array.isArray(p) ? `${peso(p[0])} / ${peso(p[1])}` : peso(p);
const FEATURED = [
  { name: "Caramel Macchiato", image: "featured-caramel-macchiato.jpg" },
  { name: "Pierside Fish & Chips", image: "featured-fish-chips.webp" },
  { name: "The Coast House Tuyo Special", image: "food-pizza-tuyo.jpg" }
];
document.getElementById('featuredItems').innerHTML = FEATURED.map(item => `
  <article class="featured-card">
    <figure class="ph featured-photo"><img src="images/${item.image}" alt="${item.name}" loading="lazy"></figure>
    <h4>${item.name}</h4>
  </article>`).join('');

/* ---------- Menu tabs ---------- */
const tabs = document.getElementById('tabs');
const body = document.getElementById('menuBody');

function showTab(name) {
  [...tabs.children].forEach(b => b.setAttribute('aria-selected', b.textContent === name));
  body.innerHTML = MENU[name].map(g => `
    <div class="group">
      <h3>${g.t}</h3>
      ${g.sub ? `<p class="sub">${g.sub}</p>` : ''}
      <ul>${g.i.map(([n, p, note]) => `
        <li data-n="${n}"><div class="row" tabindex="0" role="button"><span><b>${n}</b>${note ? `<small>${note}</small>` : ''}</span><em>${price(p)}</em></div><div class="pic" hidden>${dishPic(n)}</div></li>`).join('')}
      </ul>
    </div>`).join('');
}
Object.keys(MENU).forEach(name => {
  const b = document.createElement('button');
  b.textContent = name;
  b.setAttribute('role', 'tab');
  b.onclick = () => showTab(name);
  tabs.appendChild(b);
});
showTab('Breakfast');

/* ---------- Rooms ---------- */
const ROOMS = [
  { n: "Deluxe Room", p: 2500, maxGuests: 2, g: "2 guests", img: "room-standard", gal: ["room-standard", "tile-beds", "gallery-10", "gallery-09"], f: ["1 double bed", "Ensuite bathroom", "Wi-Fi and air conditioning", "Breakfast for 2"] },
  { n: "Family Room", p: 5000, maxGuests: 4, g: "4 guests", img: "room-family", gal: ["room-family", "gallery-13", "gallery-14", "gallery-11", "gallery-15", "gallery-16"], f: ["1 queen bed and 2 single beds", "Ensuite bathroom", "Wi-Fi and air conditioning", "Breakfast for 4"] },
  { n: "Master Suite", p: 7500, maxGuests: 6, g: "6 guests", img: "room-suite", gal: ["room-suite", "gallery-19", "gallery-18", "gallery-12", "gallery-17"], f: ["2 bedrooms, shared bathroom", "Living area, gym and private bar", "Wi-Fi and air conditioning", "Breakfast for 6"] }
];
document.getElementById('rooms').innerHTML = ROOMS.map((r, i) => `
  <article class="room" data-i="${i}">
    <div class="ph"><img src="${src(r.img)}" alt="${r.n}" loading="lazy"></div>
    <div class="body">
      <h3>${r.n}</h3>
      <p class="room-capacity">Up to ${r.g}</p>
      <ul>${r.f.map(x => `<li>${x}</li>`).join('')}</ul>
      <button class="room-photos" type="button">View photos &rarr;</button>
      <div class="room-offer">
        <p><span>From</span><strong>${peso(r.p)}</strong><span>per night</span></p>
        <button class="btn room-inquire" type="button">Inquire Now</button>
      </div>
      <p class="room-estimate" hidden></p>
    </div>
  </article>`).join('');

const stayCheckIn = document.getElementById('stayCheckIn');
const stayCheckOut = document.getElementById('stayCheckOut');
const stayGuests = document.getElementById('stayGuests');
const roomSearch = document.getElementById('roomSearch');
const roomList = document.getElementById('rooms');
const reservationModal = document.getElementById('reservationModal');
const reservationForm = document.getElementById('roomReservation');
const reservationCheckIn = document.getElementById('reservationCheckIn');
const reservationCheckOut = document.getElementById('reservationCheckOut');
const reservationGuests = document.getElementById('reservationGuests');
const reservationEstimate = document.getElementById('reservationEstimate');
const roomNoResults = document.getElementById('roomNoResults');
let inquiryRoom;
let inquiryTrigger;

function localDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function addDays(date, count) {
  if (!date) return '';
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + count);
  return localDate(next);
}
function countNights(checkIn, checkOut) {
  const [iy, im, id] = checkIn.split('-').map(Number);
  const [oy, om, od] = checkOut.split('-').map(Number);
  return Math.round((Date.UTC(oy, om - 1, od) - Date.UTC(iy, im - 1, id)) / 86400000);
}
function displayDate(date) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}
function updateRoomEstimate(room, checkIn, checkOut, target) {
  const nights = countNights(checkIn, checkOut);
  target.textContent = `${peso(room.p)} × ${nights} night${nights === 1 ? '' : 's'} = ${peso(room.p * nights)} estimated room total`;
  target.hidden = false;
}

const today = localDate(new Date());
stayCheckIn.min = today;
stayCheckIn.value = today;
stayCheckOut.min = addDays(today, 1);
stayCheckOut.value = addDays(today, 1);
stayCheckIn.addEventListener('change', () => {
  stayCheckOut.setCustomValidity('');
  if (!stayCheckIn.value) {
    stayCheckOut.min = addDays(today, 1);
    return;
  }
  stayCheckOut.min = addDays(stayCheckIn.value, 1);
  if (stayCheckOut.value <= stayCheckIn.value) stayCheckOut.value = stayCheckOut.min;
});
stayCheckOut.addEventListener('change', () => stayCheckOut.setCustomValidity(''));

roomSearch.addEventListener('submit', e => {
  e.preventDefault();
  if (!roomSearch.reportValidity()) return;
  const nights = countNights(stayCheckIn.value, stayCheckOut.value);
  if (nights < 1) {
    stayCheckOut.setCustomValidity('Check-out must be after check-in.');
    stayCheckOut.reportValidity();
    return;
  }
  stayCheckOut.setCustomValidity('');
  const guests = Number(stayGuests.value);
  document.getElementById('staySummary').textContent =
    `${nights} night${nights === 1 ? '' : 's'} · ${displayDate(stayCheckIn.value)} to ${displayDate(stayCheckOut.value)} · ${guests} guest${guests === 1 ? '' : 's'}`;
  document.getElementById('staySummary').hidden = false;
  let matches = 0;
  roomList.querySelectorAll('.room').forEach(card => {
    const room = ROOMS[Number(card.dataset.i)];
    card.hidden = room.maxGuests < guests;
    if (!card.hidden) {
      matches++;
      updateRoomEstimate(room, stayCheckIn.value, stayCheckOut.value, card.querySelector('.room-estimate'));
    }
  });
  roomNoResults.hidden = matches > 0;
});

function updateInquiryEstimate() {
  if (!inquiryRoom || !reservationCheckIn.value || !reservationCheckOut.value) return;
  const nights = countNights(reservationCheckIn.value, reservationCheckOut.value);
  reservationEstimate.textContent = nights > 0
    ? `${peso(inquiryRoom.p)} × ${nights} night${nights === 1 ? '' : 's'} = ${peso(inquiryRoom.p * nights)} estimated room total`
    : 'Choose a check-out date after check-in to see an estimate.';
}
function openReservationInquiry(room, trigger) {
  inquiryRoom = room;
  inquiryTrigger = trigger;
  reservationForm.reset();
  reservationCheckOut.setCustomValidity('');
  document.getElementById('reservationTitle').textContent = room.n;
  document.getElementById('reservationRate').textContent = `${peso(room.p)} per night · up to ${room.g} · breakfast included`;
  reservationCheckIn.value = stayCheckIn.value;
  reservationCheckIn.min = stayCheckIn.min;
  reservationCheckOut.value = stayCheckOut.value;
  reservationCheckOut.min = addDays(reservationCheckIn.value, 1);
  reservationGuests.replaceChildren(...Array.from({ length: room.maxGuests }, (_, i) => {
    const option = document.createElement('option');
    option.value = String(i + 1);
    option.textContent = `${i + 1} guest${i === 0 ? '' : 's'}`;
    return option;
  }));
  reservationGuests.value = String(Math.min(Number(stayGuests.value), room.maxGuests));
  document.getElementById('roomInquirySent').hidden = true;
  reservationModal.hidden = false;
  updateInquiryEstimate();
  reservationCheckIn.focus();
}
reservationCheckIn.addEventListener('change', () => {
  reservationCheckOut.setCustomValidity('');
  if (!reservationCheckIn.value) {
    reservationCheckOut.min = '';
    updateInquiryEstimate();
    return;
  }
  reservationCheckOut.min = addDays(reservationCheckIn.value, 1);
  if (reservationCheckOut.value <= reservationCheckIn.value) reservationCheckOut.value = reservationCheckOut.min;
  updateInquiryEstimate();
});
reservationCheckOut.addEventListener('change', () => {
  reservationCheckOut.setCustomValidity('');
  updateInquiryEstimate();
});
document.getElementById('closeReservation').addEventListener('click', () => {
  reservationModal.hidden = true;
  if (inquiryTrigger) inquiryTrigger.focus();
});
reservationModal.addEventListener('click', e => {
  if (e.target === reservationModal) {
    reservationModal.hidden = true;
    if (inquiryTrigger) inquiryTrigger.focus();
  }
});
reservationForm.addEventListener('submit', e => {
  e.preventDefault();
  if (!reservationForm.reportValidity()) return;
  const d = Object.fromEntries(new FormData(reservationForm));
  const nights = countNights(d.checkIn, d.checkOut);
  if (nights < 1) {
    reservationCheckOut.setCustomValidity('Check-out must be after check-in.');
    reservationCheckOut.reportValidity();
    return;
  }
  reservationCheckOut.setCustomValidity('');
  const total = inquiryRoom.p * nights;
  const text = `Reservation Inquiry\n\nRoom: ${inquiryRoom.n}\nCheck-in: ${displayDate(d.checkIn)}\nCheck-out: ${displayDate(d.checkOut)}\nNights: ${nights}\nGuests: ${d.guests}\nEstimated arrival: ${d.arrival}\nEstimated room total: ${peso(total)}\n\nName: ${d.firstName} ${d.lastName}\nEmail: ${d.email}\nMobile: ${d.mobile}\nSpecial requests: ${d.requests || '-'}`;
  location.href = `mailto:business@radventures.ph?subject=${encodeURIComponent('Reservation Inquiry - ' + inquiryRoom.n)}&body=${encodeURIComponent(text)}`;
  document.getElementById('roomInquirySent').hidden = false;
});
function buildGallery(el, names, alt) {
  names.forEach((name, i) => {
    const figure = document.createElement('figure');
    figure.className = 'gallery-item';
    figure.setAttribute('role', 'listitem');
    const img = document.createElement('img');
    img.src = src(name);
    img.alt = `${alt} ${i + 1}`;
    img.loading = i < 4 ? 'eager' : 'lazy';
    img.decoding = 'async';
    const caption = document.createElement('figcaption');
    caption.textContent = `${String(i + 1).padStart(2, '0')} / ${String(names.length).padStart(2, '0')}`;
    figure.append(img, caption);
    el.append(figure);
  });
}
buildGallery(document.getElementById('gallery'), Array.from({ length: 20 }, (_, i) => 'gallery-' + String(i + 1).padStart(2, '0')), 'The Coast by RAD photo');

function createPinnedGalleryScrollAnimations(gsap, section, viewport, track, progress, animateImages) {
  if (!section || !viewport || !track) return null;

  const cards = [...track.querySelectorAll('.gallery-item, .experience-card')];
  if (!cards.length) return null;
  const travelDistance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
  viewport.classList.add('is-pinned');

  return gsap.context(() => {
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        pin: section,
        start: 'top top',
        end: () => `+=${travelDistance()}`,
        scrub: .75,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: self => {
          if (progress) progress.style.transform = `scaleX(${self.progress})`;
        }
      }
    });

    timeline.to(track, { x: () => -travelDistance(), duration: 1, ease: 'none' }, 0);
    cards.forEach((card, index) => {
      const start = index / cards.length * .82;
      const finalRotation = ((index % 3) - 1) * 1.25;
      const image = card.querySelector('img');

      timeline.fromTo(card, {
        clipPath: 'inset(12% 10% round 14px)',
        y: index % 2 === 0 ? 34 : -28,
        rotation: finalRotation + (index % 2 === 0 ? -1.8 : 1.8),
        scale: .93
      }, {
        clipPath: 'inset(0% 0% round 4px)',
        y: index % 2 === 0 ? 8 : -8,
        rotation: finalRotation,
        scale: 1,
        duration: .16,
        ease: 'power2.out'
      }, start);

      if (animateImages && image) {
        timeline.fromTo(image, { scale: 1.14 }, {
          scale: 1,
          duration: .22,
          ease: 'none'
        }, start);
      }
    });
  }, section);
}

function createHomeScrollAnimations(gsap) {
  return createPinnedGalleryScrollAnimations(
    gsap,
    document.getElementById('coastExperiences'),
    document.getElementById('homeGalleryViewport'),
    document.getElementById('homeGalleryTrack'),
    document.getElementById('homeGalleryProgress'),
    false
  );
}

function createAboutGalleryScrollAnimations(gsap) {
  return createPinnedGalleryScrollAnimations(
    gsap,
    document.getElementById('aboutGallery'),
    document.getElementById('galleryViewport'),
    document.getElementById('gallery'),
    document.getElementById('galleryProgress'),
    true
  );
}

function syncPageAnimations(viewId) {
  if (viewId !== activeViewId()) return;

  revertPageGalleryContexts();

  const homeGalleryViewport = document.getElementById('homeGalleryViewport');
  if (homeGalleryViewport) homeGalleryViewport.classList.remove('is-pinned');
  const homeGalleryProgress = document.getElementById('homeGalleryProgress');
  if (homeGalleryProgress) homeGalleryProgress.style.transform = 'scaleX(0)';
  const galleryViewport = document.getElementById('galleryViewport');
  if (galleryViewport) galleryViewport.classList.remove('is-pinned');
  const galleryProgress = document.getElementById('galleryProgress');
  if (galleryProgress) galleryProgress.style.transform = 'scaleX(0)';

  if (reducedMotion.matches || !window.gsap || !window.ScrollTrigger) return;

  window.gsap.registerPlugin(window.ScrollTrigger);
  if (viewId === 'home') homeGalleryContext = createHomeScrollAnimations(window.gsap);
  if (viewId === 'about') aboutGalleryContext = createAboutGalleryScrollAnimations(window.gsap);
  requestAnimationFrame(() => window.ScrollTrigger.refresh());
}

let layoutRefreshFrame = 0;
function refreshInitialLayout() {
  if (layoutRefreshFrame) cancelAnimationFrame(layoutRefreshFrame);
  layoutRefreshFrame = requestAnimationFrame(() => {
    layoutRefreshFrame = 0;
    syncPageAnimations(activeViewId());
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  });
}

/* ---------- Event reservation: opens the visitor's email app with the details filled in ---------- */
document.getElementById('reserve').addEventListener('submit', e => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  const text = `Event reservation inquiry\n\nName: ${d.name}\nContact: ${d.contact}\nEvent: ${d.type}\nDate: ${d.date}\nGuests: ${d.guests}\nNotes: ${d.notes || '-'}`;
  location.href = `mailto:business@radventures.ph?subject=${encodeURIComponent('Event reservation inquiry: ' + d.type)}&body=${encodeURIComponent(text)}`;
  document.getElementById('sent').hidden = false;
});

const tableReservation = document.getElementById('tableReservation');
const tableDate = document.getElementById('tableDate');
const tableTime = document.getElementById('tableTime');

tableDate.min = today;
tableDate.addEventListener('change', () => tableDate.setCustomValidity(''));
tableTime.addEventListener('change', () => tableTime.setCustomValidity(''));

tableReservation.addEventListener('submit', e => {
  e.preventDefault();
  if (!tableReservation.reportValidity()) return;

  const d = Object.fromEntries(new FormData(e.target));
  tableDate.setCustomValidity('');
  tableTime.setCustomValidity('');

  if (d.date < today) {
    tableDate.setCustomValidity('Choose today or a future date.');
    tableDate.reportValidity();
    return;
  }

  if (d.date === today) {
    const now = new Date();
    const selectedTime = d.time.split(':').map(Number);
    const selectedMinutes = selectedTime[0] * 60 + selectedTime[1];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    if (selectedMinutes <= currentMinutes) {
      tableTime.setCustomValidity('Choose a future time.');
      tableTime.reportValidity();
      return;
    }
  }

  tableDate.setCustomValidity('');
  tableTime.setCustomValidity('');
  const text = `Table reservation inquiry\n\nName: ${d.name}\nContact: ${d.contact}\nPreferred date: ${displayDate(d.date)}\nPreferred time: ${d.time}\nGuests: ${d.guests}\nNotes: ${d.notes || '-'}`;
  location.href = `mailto:business@radventures.ph?subject=${encodeURIComponent('Table reservation inquiry')}&body=${encodeURIComponent(text)}`;
  document.getElementById('tableSent').hidden = false;
});

/* ---------- Photo mosaics (data-photos="name,name,...") ---------- */
document.querySelectorAll('.mosaic').forEach(m => {
  m.innerHTML = m.dataset.photos.split(',').map(n =>
    `<figure class="ph"><img src="${src(n)}" alt="The Coast by RAD" loading="lazy"></figure>`).join('');
});

/* ---------- Photo banner at the top of every inner page ---------- */
const BANNER = { menu: 'tile-menu', beds: 'tile-beds', events: 'tile-events', faq: 'gallery-05', about: 'gallery-01', contact: 'hero' };
document.querySelectorAll('.page').forEach(p => {
  const b = document.createElement('div');
  b.className = `banner ph${p.id === 'faq' ? ' faq-banner' : ''}`;
  const overlay = 'linear-gradient(180deg,rgba(13,38,51,.18),rgba(13,38,51,.72))';
  b.style.backgroundImage = `${overlay},url(${src(BANNER[p.id])})`;
  const bk = document.createElement('a');
  bk.className = 'back'; bk.href = '#home'; bk.setAttribute('aria-label', 'Back to home'); bk.innerHTML = '&larr;';
  b.append(bk, p.querySelector('h2'));
  const lead = p.querySelector('.lead');
  if (lead) b.append(lead);
  const w = document.createElement('div');
  w.className = 'wrap';
  w.append(...p.childNodes);
  p.append(b, w);
});

/* ---------- Click a photo to enlarge it ---------- */
const lb = document.createElement('div');
lb.className = 'lb'; lb.hidden = true;
document.body.append(lb);
lb.onclick = () => lb.hidden = true;
addEventListener('keydown', e => { if (e.key === 'Escape') lb.hidden = true; });
document.addEventListener('click', e => {
  if (!(e.target instanceof Element)) return;
  const i = e.target.closest('.mosaic img, .gallery img, .rgal img');
  if (i) { lb.innerHTML = `<img src="${i.src}" alt="${i.alt}">`; lb.hidden = false; }
});

/* ---------- Tap a dish to show or hide its photo ---------- */
function togglePic(li) {
  const p = li.querySelector('.pic'), wasHidden = p.hidden;
  document.querySelectorAll('.pic').forEach(x => x.hidden = true);
  p.hidden = !wasHidden;
}
body.addEventListener('click', e => { const r = e.target.closest('.row'); if (r) togglePic(r.parentElement); });
body.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList.contains('row')) e.target.click(); });

/* ---------- Rooms: tap a room to see only its photos ---------- */
const rm = document.createElement('div');
rm.className = 'modal'; rm.hidden = true;
document.body.append(rm);
function openRoom(i) {
  const r = ROOMS[i];
  rm.innerHTML = `<div class="panel" role="dialog" aria-modal="true" aria-label="${r.n} photos"><button class="x" aria-label="Close">&times;</button>
    <h3>${r.n}</h3><p class="price">${peso(r.p)} per night, up to ${r.g}</p>
    <ul>${r.f.map(x => `<li>${x}</li>`).join('')}</ul>
    <div class="rgal">${r.gal.map(n => `<figure class="ph"><img src="${src(n)}" alt="${r.n}" loading="lazy"></figure>`).join('')}</div></div>`;
  rm.hidden = false;
}
rm.onclick = e => { if (e.target === rm || e.target.classList.contains('x')) rm.hidden = true; };
roomList.addEventListener('click', e => {
  const card = e.target.closest('.room');
  if (!card) return;
  const index = Number(card.dataset.i);
  if (e.target.closest('.room-photos')) openRoom(index);
  if (e.target.closest('.room-inquire')) openReservationInquiry(ROOMS[index], e.target.closest('.room-inquire'));
});

/* ---------- Search: menu items, rooms, FAQs and pages ---------- */
function goDish(tab, n) {
  navigateToView('menu', () => {
    showTab(tab);
    const li = [...body.querySelectorAll('li')].find(x => x.dataset.n === n);
    if (!li) return;
    li.querySelector('.pic').hidden = false;
    li.scrollIntoView({ block: 'center' });
    li.classList.add('hit');
    setTimeout(() => li.classList.remove('hit'), 1800);
  });
}
const FAQS = [...document.querySelectorAll('#faq details')];
const INDEX = [
  ...Object.entries(MENU).flatMap(([tab, gs]) => gs.flatMap(g => g.i.map(([n, p, note]) =>
    ({ t: n, s: 'Menu: ' + tab, k: `${note || ''} ${g.t}`, go: () => goDish(tab, n) })))),
  ...ROOMS.map((r, i) => ({ t: r.n, s: 'Stay', k: r.f.join(' '), go: () => navigateToView('beds', () => openRoom(i)) })),
  ...FAQS.map(d => ({ t: d.querySelector('summary').textContent, s: 'FAQs & Policies', k: d.textContent,
    go: () => navigateToView('faq', () => { FAQS.forEach(x => x.open = x === d); d.scrollIntoView({ block: 'center' }); }) })),
  { t: 'Events and reservations', s: 'Page', k: 'event party birthday wedding book reserve', go: () => navigateToView('events') },
  { t: 'Contact us', s: 'Page', k: 'phone email address facebook instagram social', go: () => navigateToView('contact') },
  { t: 'About us', s: 'Page', k: 'story gallery photos', go: () => navigateToView('about') }
];
const sOv = document.getElementById('search'), q = document.getElementById('q'), res = document.getElementById('res');
const closeSearch = () => sOv.hidden = true;
document.getElementById('searchBtn').onclick = () => { setMobileNavOpen(false); sOv.hidden = false; q.value = ''; res.innerHTML = ''; q.focus(); };
document.getElementById('sx').onclick = closeSearch;
sOv.onclick = e => { if (e.target === sOv) closeSearch(); };
q.oninput = () => {
  const words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = words.length ? INDEX.filter(x => words.every(w => (x.t + ' ' + x.k).toLowerCase().includes(w))).slice(0, 8) : [];
  res.innerHTML = hits.length
    ? hits.map(x => `<li><button data-i="${INDEX.indexOf(x)}"><b>${x.t}</b><small>${x.s}</small></button></li>`).join('')
    : (words.length ? '<li class="none">No results</li>' : '');
};
res.onclick = e => { const b = e.target.closest('button'); if (b) { closeSearch(); INDEX[+b.dataset.i].go(); } };
q.onkeydown = e => { if (e.key === 'Enter') { const b = res.querySelector('button'); if (b) b.click(); } };
addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (menuToggle.getAttribute('aria-expanded') === 'true') {
      setMobileNavOpen(false);
      menuToggle.focus();
    }
    rm.hidden = true;
    if (!reservationModal.hidden) {
      reservationModal.hidden = true;
      if (inquiryTrigger) inquiryTrigger.focus();
    }
    closeSearch();
  }
});

const revealGroups = [
  ['.banner h2,.page>.wrap>.lead,.page>.wrap>h3,.gallery-heading', 'text'],
  ['.featured-card,.room,.contact-grid>div,.discover-card', 'card'],
  ['.mosaic figure', 'image'],
  ['#faq .wrap>details,.table-inquiry', 'panel']
];

const revealObserver = 'IntersectionObserver' in window && !reducedMotion.matches
  ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: .12, rootMargin: '0px 0px -5% 0px' })
  : null;

revealGroups.forEach(([selector, style]) => {
  document.querySelectorAll(selector).forEach((element, index) => {
    element.classList.add('ocean-reveal', `ocean-reveal--${style}`);
    element.style.setProperty('--reveal-delay', `${Math.min(index, 4) * 65}ms`);
    if (revealObserver) revealObserver.observe(element);
    else element.classList.add('is-revealed');
  });
});

const parallaxImages = [...document.querySelectorAll('[data-parallax]')];
let parallaxFrame = 0;
function updateParallax() {
  parallaxFrame = 0;
  const viewportCenter = window.innerHeight / 2;
  parallaxImages.forEach(image => {
    if (reducedMotion.matches) {
      image.style.setProperty('--parallax-y', '0px');
      return;
    }
    const bounds = image.getBoundingClientRect();
    if (bounds.bottom < 0 || bounds.top > window.innerHeight) return;
    const distance = (bounds.top + bounds.height / 2 - viewportCenter) / Math.max(viewportCenter, 1);
    const offset = Math.max(-12, Math.min(12, -distance * 9));
    image.style.setProperty('--parallax-y', `${offset.toFixed(2)}px`);
  });
}
function scheduleParallaxUpdate() {
  if (parallaxFrame || reducedMotion.matches) return;
  parallaxFrame = requestAnimationFrame(updateParallax);
}
if (parallaxImages.length) {
  updateParallax();
  reducedMotion.addEventListener('change', scheduleParallaxUpdate);
}
function handlePageScroll() {
  updateHeaderOnScroll();
  updateScrollButtons();
  if (parallaxImages.length) scheduleParallaxUpdate();
}
function handlePageResize() {
  updateScrollButtons();
  if (parallaxImages.length) scheduleParallaxUpdate();
}
addEventListener('scroll', handlePageScroll, { passive: true });
addEventListener('resize', handlePageResize);
reducedMotion.addEventListener('change', () => syncPageAnimations(activeViewId()));

document.addEventListener('click', event => {
  if (reducedMotion.matches || !(event.target instanceof Element)) return;
  const target = event.target.closest('.btn,.nav-book,.site-nav>a:not(.nav-book),.search-toggle,.menu-toggle,.tile,.experience-card,.discover-card,.gallery-item,.mosaic figure,footer .social a');
  if (!target) return;

  const bounds = target.getBoundingClientRect();
  const diameter = Math.max(72, Math.min(220, Math.max(bounds.width, bounds.height) * 1.4));
  const x = event.detail === 0 ? bounds.width / 2 : event.clientX - bounds.left;
  const y = event.detail === 0 ? bounds.height / 2 : event.clientY - bounds.top;
  const ripple = document.createElement('span');
  target.classList.add('ripple-surface');
  ripple.className = 'water-ripple';
  ripple.style.setProperty('--ripple-size', `${diameter}px`);
  ripple.style.left = `${x - diameter / 2}px`;
  ripple.style.top = `${y - diameter / 2}px`;
  target.append(ripple);
  ripple.addEventListener('animationend', () => {
    ripple.remove();
    if (!target.querySelector('.water-ripple')) target.classList.remove('ripple-surface');
  }, { once: true });
});
