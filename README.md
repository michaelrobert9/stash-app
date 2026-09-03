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

The app has **two sides**, switched with the **Child / Parent** menu at the
top, and a **hamburger menu** (top-left) to move between sections —
**Chores** and the **Shop**.

- **Child** — the child's points, the tally, today's chores, and the shop to
  spend points in.
- **Parent** — verifying finished chores, and stocking & pricing the shop.

Everything the child does lives on the Child page; everything the parent
manages lives on the Parent page.

**Children & colours.** There are three children (Emma, Noah, Ava), switched
with the row of names under the menu. Each child picks their own colour, and
their chores are shown in that colour — so on the parent's queue you can tell
whose chore is whose at a glance.

**The shop.** The parent adds rewards and sets what each costs (e.g. sweets
10 pts, a movie 15, a sleepover 20). The child browses a kiosk-style grid and
redeems anything they can afford; rewards they can't afford yet stay visible
with how many more points they need.

In the demo, the loop runs across both pages:

1. On the **Child** page, tap **Do** on a task. Every chore has its own game:
   - **Wash the dishes** — drag each plate into the sink, scrub it clean by
     going round in circles (a guide shows the pattern), then drag it into
     the dishwasher.
   - **Make your bed** — drag the duvet and pillows onto the bed.
   - **Feed the dog** — scoop food into the food bowl, fill the water bowl.
   - **Take out the recycling** — sort each item into the recycling or
     rubbish bin, then take the bag to the door.
   - **Tidy your room** — put clothes in the wash basket, toys in the toy
     box, and books on the shelf.
2. Once you've played the game, a gentle **timer** starts and you go and do
   the real chore. Tap **I've done it** when you're finished — the task
   becomes _waiting on a parent_.
3. Switch to the **Parent** page (the menu bar shows a badge when chores are
   waiting). Tap **✓** to verify — the points are added and the tally counter
   draws the new strokes — or **↩** to send the task back.

The timer counts down from a suggested time but never fails you or takes
points — when it reaches zero it just says "finish up and tap Done".

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
