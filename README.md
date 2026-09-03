# Stash

A chore-and-rewards app for families. Children earn **points** for doing
household tasks, a **parent verifies** the work, and points build up until
the child spends them in a shop the parent stocks. The signature of the
brand is the **tally mark** — four uprights and a strike — which doubles as a
live counter that draws itself as points are earned.

This repo currently holds the **child home screen** built as a working demo,
plus the full Stash brand kit.

Built with plain **HTML, CSS and JavaScript** — no build tools needed.

## Try it

Open `index.html` in a web browser (double-click it, or drag it into a
browser window). No installation required.

In the demo, the whole loop happens on one screen:

1. Tap **Done** on a task — as the child. It becomes _waiting on a parent_.
2. Tap **✓** to verify — as the parent. The points are added and the tally
   counter draws the new strokes. (Or tap **↩** to send the task back.)

Your progress is saved in the browser, and there's a **Reset demo** button at
the bottom. There's also a light/dark theme toggle in the top corner.

## The files

| File / folder | What it does |
| --- | --- |
| `index.html` | The structure of the screen (logo, balance, tally, task list). |
| `styles.css` | All the styling. The brand colours, sizes and spacing live as variables at the top. |
| `script.js` | The logic: tasks, the earn→verify→points loop, and the tally counter. |
| `logo/` | The brand logo kit (SVG masters, PNG exports, app icons, and the in-app counting glyphs). |
| `stash-brand-book.pdf` | The brand book — the reasoning and the logo rules. |
| `stash-design-guidelines.md` | The design spec — exact colours, type and component behaviour. |

Each code file is commented to explain what the parts do — a good place to
read and tinker.

## The design system (from the brand)

These are pulled straight from the Stash design guidelines and set up as CSS
variables in `styles.css`, so a change in one place updates the whole app.

- **Colours** — ink `#16151A`, paper `#FBF9F4`, and the strike violet
  `#6A4DF4` for points and primary actions. Status colours (verified green,
  pending amber, declined red) are used for task state only.
- **Type** — Poppins throughout (loaded from Google Fonts). Point totals are
  always bold, because the number is the loudest thing on the screen.
- **Dark mode** — supported automatically (follows the device) and via the
  toggle. The violet lifts so it stays readable on a dark background.
- **The tally counter** — points render as bundles of five, using the same
  geometry as the logo. Above 25 it collapses to a number beside one bundle.
- **Accessibility** — the tally has a plain-number label for screen readers,
  every status colour is paired with a word, tap targets are at least 44px,
  and animations are switched off for anyone who prefers reduced motion.

## Putting it online with Vercel

This project is connected to GitHub. Every push to GitHub is published
automatically by Vercel to a live web address.

First-time setup (once):

1. Go to [vercel.com](https://vercel.com) and sign up with **GitHub**.
2. Click **Add New… → Project**.
3. Find **`stash-app`** and click **Import**.
4. Leave the settings as they are and click **Deploy**.

## Ideas to build next

The design guidelines describe the rest of the product, if you want to keep
going:

- A **parent home** screen — a verification queue instead of a dashboard.
- A **shop** where rewards are photos priced in points, in a two-column grid.
- **Spending** points — redeeming subtracts bundles from the tally.
