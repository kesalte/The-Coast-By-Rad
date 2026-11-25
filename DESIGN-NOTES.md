# Design notes

## About UI/UX Pro Max (please read)
The brief for this round asked for the UI/UX Pro Max skill
(github.com/nextlevelbuilder/ui-ux-pro-max-skill) to be installed and used. **That was not possible in this
session**: the working environment had no network access (github.com, npm and PyPI were all unreachable), so the
skill could not be installed, verified or run. An earlier version of this file said the skill had been cloned and
queried in a previous session; that could not be re-verified here and is not claimed any more.

What was done instead: the same published principles the earlier notes listed were applied by hand
(pinned stage with scrubbed motion, a different speed per depth layer, reduced-motion and no-WebGL fallbacks,
a skip option, 4.5:1 text contrast over scrims, 44px targets, visible focus, body copy never parallaxed).
If you want the skill's own search/recommendation output, install it on your machine and re-run it against this
project; nothing here depends on it.

## Journey design decisions (v2)
- **Dedicated text column.** The 3D camera uses a perspective view-offset, so the vanishing point sits right of
  centre (above centre on portrait screens). Photographs live in that space; chapter copy has its own clear column.
- **Portal gates.** Five arch gates between chapters; the atmosphere (sky/sea palette, glow, accent colour) changes
  as the camera crosses each one. Gate 0 plays the homepage hero video itself, which is the hero -> journey hand-off.
- **Hero cards -> chapters.** The Café / Stay / Events chapters reuse the hero cards' bottom-border colours as their
  accent, show the same card photo as a small badge, and link to the same pages. The hero itself is untouched.
- **Depth of field.** Photographs very near or very far from the focal distance soften (9-tap blur, mobile reduced).
- **Pacing.** ~1500vh desktop (1300 tablet, 1150 phone). The camera decelerates into every photograph (strongest for
  each chapter's hero), then glides on. 18 photographs, none repeated.
- **Copy correction.** The previous Stay copy said every stay includes breakfast. The site's own FAQ says rates are
  room-only or with breakfast, so the wording was corrected (chapter and Stay page).
