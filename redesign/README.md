# VerdeLand redesign study

September 18, 2026. Independent prototype for visual review; original pages unchanged.

Serve the parent prototype directory and open `/redesign/`, or open `index.html` directly.

- Homepage: four completed portfolio homes, town filtering, builder story, property inquiry demo.
- Detail page: selects each home's own photos using the `home` query parameter.
- Gallery: progressive loading, full-size dialog, previous/next and keyboard arrow controls.
- Inquiry: native required-field validation and local confirmation only; no transmission or storage.
- No installation, build step, analytics, external fonts, or external libraries.

Browser checks completed with the Codex in-app browser:
- Homepage and property detail: no horizontal overflow at 390px and 1440px; one h1 each.
- Mobile menu, location filter, property navigation, gallery next/close/load-more, and inquiry demo exercised.
- No browser console errors during those flows.
- Tested text contrast: 5.47:1 muted text/inactive filters; 13.24:1 active filter; 6.53:1 light text on olive; 8.64:1 footer note.
- Homepage heading hierarchy has no skipped levels. Visible homepage links/buttons meet 44px height after logo target adjustment.

This is a design review, not a production launch or a full accessibility certification.
