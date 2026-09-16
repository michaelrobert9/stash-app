# Stash

A chore-and-rewards app for families, built on a simple idea: **what gets
rewarded gets repeated**. Children do tasks and earn **stash cash**, a parent
verifies the work, and the stash cash builds up until the child spends it in a
shop the parent stocks — on real rewards or treats that don't cost money (a
movie night, extra screen time, and so on).

Built with plain **HTML, CSS and JavaScript** — no build tools needed.

## Try it

Open `index.html` in a web browser (double-click it, or drag it into a
browser window). No installation required.

All navigation lives in one **hamburger menu** (top-left). It slides in over a
dimmed backdrop and closes cleanly when you pick something or tap away. It's
grouped by person — **Children** (Chores / Shop) and **Parents** (Chores /
Shop) — so each menu item is a complete destination.

Everything the child does lives on the Child page; everything the parent
manages lives on the Parent page.

**Children & colours.** There are three children — Jasmine (14), Maddison (11)
and Zac (9) — switched with the row of names under the menu. Each has their
**own set of chores** (e.g. Maddison does the dishes, Jasmine the recycling,
Zac feeds the dog) and picks their own colour, so on the parent's queue you
can tell whose chore is whose at a glance.

**The shop.** The parent adds rewards, sets what each costs in stash cash, and
chooses **who each reward is for** — everyone, or one child. So the shop suits
each child's age and interests: Zac has cricket coaching and Lego, Maddison
hockey coaching and books, Jasmine teen things like a shopping trip and
airtime. The child browses a kiosk-style grid of the rewards available to them
and redeems anything they can afford; the rest stay visible with how much more
stash cash they need.

The loop runs across both pages:

1. On the **Child** page, tap **I've done it** on a finished chore — it becomes
   _waiting on a parent_.
2. On the **Parent** page (the menu shows a badge when chores are waiting),
   verify it by **choosing how much stash cash to award**. Effort chores offer
   a range (e.g. dishes 5 / 10 / 15, tidy your room 10 / 20 / 30) so a job done
   badly earns less and a great job earns more; chores you can't really do
   badly (feed the dog, recycling) are a fixed amount. Or tap **↩** to send the
   task back.

Progress is saved in the browser, with a **Reset demo** button at the bottom
and a light/dark theme toggle in the top corner.

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

- **Accounts & login** — a parent signs in with email + password; each child
  gets a username + password (created by the parent) and sees only their own
  chores and shop.
- **Cash-out** rewards — convert stash cash to real money for real purchases,
  alongside the no-cost treats.
