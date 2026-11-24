# Design notes — how UI/UX Pro Max was used
Skill source: github.com/nextlevelbuilder/ui-ux-pro-max-skill (cloned; its Python search engine run locally).
- `--design-system` query for a luxury beachfront hospitality brand → returned Liquid Glass + blue palette: **rejected** (does not fit the brand; kept your palette).
- `gsap` domain → pin ≤2 sections, scrub 0.5–1.5, different speed per layer, reduced-motion fallback: **applied** (single sticky stage, scrub 0.8, 3+ depth layers).
- `style` domain ("parallax-storytelling") checklist → mobile alternative, skip option, reduced-motion fallback, body copy never parallaxed: **applied**.
- `ux` domain → contrast 4.5:1 (title-safe scrims), prefers-reduced-motion, font-display swap, 44px targets, visible focus: **applied**.
- `typography` → Cormorant Garamond heading pairing confirmed; Jost for UI/body.
