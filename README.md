# The Coast by RAD — Final

Original homepage hero (unchanged) → cinematic Three.js + GSAP ScrollTrigger photo journey → original footer.
All other pages, forms, search and routing are the original code.

## Run locally (VS Code)
1. Open this folder in VS Code → install the **Live Server** extension.
2. Right-click `index.html` → **Open with Live Server**. (Or run `python -m http.server 8000` here and open http://localhost:8000.)
   Opening `index.html` by double-click also works — Three.js, GSAP and fonts are all self-hosted, no CDN needed.

## Publish (only when you approve)
**GitHub Pages:** push this folder's contents to a repo → Settings → Pages → Deploy from branch `main` / root.
**Netlify:** drag-and-drop this folder at app.netlify.com/drop (no build step).

## Test switches
`?journey=static` forces the fallback layout · reduced-motion and no-WebGL fall back automatically.

## Structure
- `index.html`, `css/style.css`, `js/script.js` — original site (script.js untouched)
- `css/journey.css`, `js/journey.js`, `js/journey-manifest.js` — the 3D journey
- `js/vendor/` — three.js r158, GSAP 3.12.5, ScrollTrigger (self-hosted)
- `fonts/`, `css/fonts.css` — self-hosted fonts (Bodoni Moda, DM Sans for the original; Cormorant Garamond, Jost for the journey)
- `images/journey/` — 28 photos × 2 sizes (WebP)
- `screenshots/` — captured from the real running site
