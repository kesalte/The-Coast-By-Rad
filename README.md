# The Coast by RAD — Final

Original homepage hero (unchanged) → cinematic Three.js + GSAP ScrollTrigger journey (6 chapters, 18 photographs, portal gates, depth of field) → original footer.
All other pages, forms, search and routing are the original code.

## Run locally (VS Code)
1. Open this folder in VS Code → install the **Live Server** extension.
2. Right-click `index.html` → **Open with Live Server**. (Or run `python -m http.server 8000` here and open http://localhost:8000.)
   Three.js, GSAP and fonts are self-hosted (no CDN, no install step), but the full 3D experience needs a web server
   (Live Server / `python -m http.server`). **Double-clicking `index.html` (file://) shows the simplified static layout**:
   browsers block WebGL textures and web fonts from file:// pages.

## Publish (only when you approve)
**GitHub Pages:** push this folder's contents to a repo → Settings → Pages → Deploy from branch `main` / root.
**Netlify:** drag-and-drop this folder at app.netlify.com/drop (no build step).

## Test switches
`?journey=static` forces the fallback layout · reduced-motion and no-WebGL fall back automatically.

## Structure
- `index.html`, `css/style.css`, `js/script.js` — original site (script.js and style.css byte-identical to the upload)
- `css/journey.css`, `js/journey.js`, `js/journey-manifest.js` — the 3D journey
- `js/vendor/` — three.js r158, GSAP 3.12.5, ScrollTrigger (self-hosted)
- `fonts/`, `css/fonts.css` — self-hosted fonts (Bodoni Moda, DM Sans for the original; Cormorant Garamond, Jost for the journey)
- `images/journey/` — 18 photos × 2 sizes (WebP)
- `images/hero-video.mp4` — original hero video re-encoded (16.4 MB → 7.7 MB, same resolution, audio track removed; the hero video is muted)
- `screenshots/` — captured from the real running site (original hero, all six chapters, tablet, mobile, hand-off sequence, fallbacks)
- `scroll-recording.mp4` — 26 s frame-by-frame capture of the real page scrolling hero → footer (960×540). It was captured in a software-rendered browser, so each frame is a real rendered state, assembled at 10 fps; it is not a live 60 fps screen capture.
