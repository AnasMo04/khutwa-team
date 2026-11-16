---
name: mobile-320-a11y
description: Checks Khutwa pages at 320px for overflow, 48px targets, one lime button, focus traps, and honeypot placement. Use before and after editing style.css, js/views.js, js/components.js, js/admin.js, or js/router.js, and when verifying Arabic or English mobile layout.
---

# Mobile 320 accessibility

Read this before and after each page edit. A change is done only when the 320px gate passes. Then check 360, 390, 768, and 1440 in Arabic (`dir=rtl`) and English (`dir=ltr`).

## 320px gate

- `document.documentElement.scrollWidth` equals the viewport width. No horizontal scroll.
- Horizontal padding is 12px at 320. Nothing touches the screen edge.
- Touch targets are at least 48px tall up to 860px: `.btn`, nav links, `.burger`, admin row actions, dialog buttons.
- One filled lime button (`.btn.p`, `#c8ff2e`, text `#0b0b0b`) per screen region. Secondary buttons are outline. Danger `.btn.d` is last in the row.
- Disabled buttons use opacity 0.6 and do not accept clicks.
- `:focus-visible` keeps a 3px outline. Do not remove it.
- `#dlg` and `#cd` trap Tab. Escape closes the menu only when no dialog is open. Confirm focuses `#c2`, not the confirm button.
- Honeypot `.hp` uses `aria-hidden="true"` and is clipped, not `left:-9999px`.
- Dialog height uses `--vvh` from `visualViewport` so the keyboard does not cover Save and Close.
- Toast `#ts` stays above the safe area and does not cover the submit button.
- `prefers-reduced-motion` stops marquee, track, shapes, and skeleton animation.
- `pointer: coarse` does not lift cards on hover.

## Layout tokens

- Spacing: 8 inside small buttons, 12 between bar items, 16 card padding on phones, 24 on wider screens, 48 between sections on phones, 72 on desktop.
- Content max width 1100.
- Hero image position `64% 40%` under 860px and `62% 45%` above. Two CTAs only.
- Event card description clips at about 6 lines. Full text is on the event page. Register form sits below the content.
- Join form max width 640, centered on desktop, full width at 320.
- Shop size and quantity stack under 360. Book button is full width. Sold out is italic text, not a dead button.
- Admin sidebar is a horizontal scroller at or under 860, links 48px tall.

## Check before saving

- [ ] No overflow at 320
- [ ] Primary control is lime with black text
- [ ] Focus ring and dialog trap still work
- [ ] Honeypot is not positioned off the left edge
- [ ] Arabic and English both reflow without a horizontal jump
