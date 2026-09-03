# Stash — design guidelines

Implementation spec for the Stash app. The brand book covers the reasoning and the logo rules. This
covers the tokens and component behaviour a developer needs. If the two disagree, the brand book wins
on anything visual and this file wins on anything numeric.

Version 1.0

---

## 1. What the product is

Children earn points for household tasks. Tasks are assigned by age so a child is never given work
they cannot do. A parent verifies completed work before points are awarded. Points accumulate, and
the child spends them in a shop the parent stocks and prices themselves.

Two audiences use the same app on different devices. Every design decision has to answer which of the
two it is for.

---

## 2. Design tokens

### Colour

| Token | Hex | Use |
|---|---|---|
| `ink` | `#16151A` | Primary text, logo uprights, dark surfaces |
| `slate` | `#6B6A75` | Secondary text, helper copy |
| `mist` | `#E8E6E1` | Dividers, disabled fills, card borders |
| `paper` | `#FBF9F4` | App background |
| `surface` | `#FFFFFF` | Cards and sheets sitting on paper |
| `strike` | `#6A4DF4` | The strike. Points. Primary buttons. |
| `strike-deep` | `#4A32C4` | Pressed and active states |
| `strike-tint` | `#EDE9FE` | Point badges, selected rows, subtle fills |
| `verified` | `#17A673` | Task approved |
| `pending` | `#F0A02A` | Done, waiting on a parent |
| `declined` | `#E0523C` | Sent back to the child |

Status colours are for task state only. They never appear in the logo, in navigation, or as a brand
surface.

### Dark mode

| Token | Hex |
|---|---|
| `ink` | `#FBF9F4` |
| `paper` | `#111015` |
| `surface` | `#1C1B22` |
| `mist` | `#2E2C36` |
| `slate` | `#9A98A6` |
| `strike` | `#8A72FF` |

Violet lifts in dark mode so it holds contrast against a dark surface. Status colours stay as they are.

### Contrast

Ink on paper is 15.9:1. Paper on strike violet is 5.1:1, which passes AA for body and large text but
not for anything under 14px. Small text goes on ink or paper, never on violet.

### Spacing

4pt base. Use `4, 8, 12, 16, 24, 32, 48, 64`. Screen gutter is 20 on phones, 32 on tablets.

### Radius

| Token | Value | Use |
|---|---|---|
| `sm` | 8 | Chips, badges, small controls |
| `md` | 14 | Cards, list rows, inputs |
| `lg` | 22 | Sheets, modals, the shop tiles |
| `pill` | 999 | Buttons, point counters |

### Elevation

One shadow only: `0 2px 12px rgba(22,21,26,0.07)`. Cards get it. Nothing else does. No layered
shadows, no glow.

---

## 3. Typography

Poppins throughout. Weights 300, 400, 500, 700. Available on Google Fonts.

| Style | Size | Weight | Line height | Use |
|---|---|---|---|---|
| Display | 34 | 700 | 1.15 | Point balances |
| Title | 22 | 700 | 1.2 | Screen headings |
| Heading | 16 | 500 | 1.3 | Card titles, sections |
| Body | 15 | 400 | 1.45 | Task names, descriptions |
| Label | 12 | 500 | 1.3 | Buttons, tabs, field labels |
| Caption | 11 | 400 | 1.4 | Timestamps, helper text |

Rules:

- Never set body below 15. Half the users are children.
- Point totals are always 700. The number is the loudest thing on the screen.
- Sentence case everywhere, including buttons.
- Never all caps.

---

## 4. The tally as a UI element

The logo is the reward mechanic, so the mark appears inside the product as a live component.

**Component:** `TallyCounter(points)`

Render `points` as bundles of five. Each bundle is four uprights plus a strike. A partial bundle shows
only its completed uprights. Above 25 points, collapse to a numeral with a single bundle glyph beside
it, otherwise the row overflows.

**Animation**

| Event | Behaviour |
|---|---|
| Upright draws on | 180ms, ease-out |
| Strike draws on | 260ms, ease-out, slight overshoot allowed |
| Bundle completes | One pulse, scale 1.0 to 1.06 to 1.0 |
| Points spent | Bundles fade out one at a time, 120ms apart |

Never loop. Never bounce. Never add sparkle or confetti. The bundle completing is the only moment in
the app allowed to feel like an event.

**Pending state:** the next upright shows at 20% opacity. Nothing else hints at what is coming.

**Assets:** use `logo/ui/stash-count-1.svg` through `stash-count-5.svg`. Do not use the logo files for
this.

---

## 5. Screens

### Child home

Point balance in Display, ink, top of screen. Tally beneath it. Then today's tasks as a single
vertical list, each row showing task name, point value, and one action. Nothing else above the fold.

A child should be able to mark a task done in one tap from opening the app.

### Parent home

The verification queue first, not a dashboard. Show what needs a decision and the child it belongs to.
A parent should be able to clear five tasks in under fifteen seconds, and should be able to approve
straight from the notification.

Below the queue: children, tasks, shop, settings. In that order.

### Task assignment by age

Runs in the background. The child never sees a task outside their age band, and never sees that a task
was withheld. The parent sees the recommended minimum age when creating a task and can override it,
but the override is theirs to make, not a nag.

### Shop

Rewards are photographs the parent uploads, priced in points, in a two-column grid. An item the child
cannot yet afford stays visible and legible, showing the gap in points. Do not grey it out, do not
lock it behind a padlock icon, do not show a countdown or a limited-time badge.

### Redemption

Spending subtracts bundles. It never drains a progress bar or empties a vessel. The child took
something from their own stash, which is what a stash is for.

---

## 6. Components

**Buttons.** Pill. Primary is strike violet with paper text, 48 high, full width on phones. Secondary
is a 1.5px ink border on transparent. Destructive is declined red, text only, never filled.

**Cards.** Surface white on paper, radius `md`, 16 padding, one shadow. Cards never nest.

**List rows.** 64 minimum height. Tap target never below 44.

**Point badge.** Pill, `strike-tint` background, `strike` text, 500 weight. Always shows a number and
the word `pts` at Caption size.

**Status pill.** Caption, 500, coloured text on a 12% tint of the same colour.

**Empty states.** One line of Body in slate, and the action. No illustration, no mascot, no joke.

---

## 7. Voice

The tone shifts between audiences. The personality does not.

**To a child.** Plain and short, never babyish. "Dishes done. 3 points." Not "Woohoo, amazing job
superstar!" A ten year old can smell condescension and a fifteen year old will delete the app over it.

**To a parent.** Calm and factual. "3 tasks waiting on you." Not "Don't forget to verify your
children's chores!" Parents open this between other jobs. Say what needs a decision and get out of
the way.

**Never:**

- Use points as a threat. Points are earned, not taken away.
- Add streaks, leagues, or loss mechanics. This is a household, not a casino.
- Compare siblings.

---

## 8. Accessibility

- Minimum tap target 44 x 44.
- Support Dynamic Type to at least 200%. The task list must reflow, not truncate.
- Never use colour alone for task state. Pair every status colour with a word.
- The tally counter needs an `aria-label` giving the plain number, since the strokes mean nothing to
  a screen reader.
- Respect `prefers-reduced-motion`. With it on, points appear without the draw-on animation.

---

## 9. Assets

```
logo/svg/         master logos, wordmark outlined
logo/app-icon/    app icons and favicon
logo/ui/          counting states for in-app use
logo/png/         exports at required sizes
```

SVG is the master in every case. The wordmark is outlined, so nothing depends on Poppins being
installed. PNGs are generated from the SVGs, so regenerate rather than editing a PNG.

---

## 10. Open items

- Trademark clearance against Stash Financial (US investing app) has not been done. Check the classes
  covering software and financial services before spending on the name.
- `stash.co.za` and `stash.com` have not been checked.
- The App Store name will likely need a qualifier if Stash alone is taken.
