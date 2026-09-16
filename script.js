/* ============================================================
   Stash — app logic

   Stash is a chore-and-reward app. A child does tasks and earns
   "stash cash", which they can later spend in the shop (on real
   rewards or treats a parent stocks).

   The flow for one task:
     1. The child taps "I've done it"  →  the task is "pending".
     2. The parent sees it in their queue and chooses how much
        stash cash to award (less for a half-hearted job), or
        sends it back.

   Stash cash is shown as a running balance, drawn as a tally of
   fives (four uprights and a strike) — the brand's mark.

   Everything is saved in the browser, so it stays put when you
   come back.
   ============================================================ */

const STATE_KEY = "stash-state-v4";
const THEME_KEY = "stash-theme";

/* ---- Children ----
   Each child picks their own colour. Their chores and point badges
   show in that colour, so on the parent's queue you can tell whose
   chore is whose at a glance. */
const CHILD_COLORS = [
  { name: "Purple", value: "#6A4DF4" },
  { name: "Blue", value: "#2F80ED" },
  { name: "Green", value: "#27AE60" },
  { name: "Orange", value: "#F2994A" },
  { name: "Pink", value: "#E0559E" },
  { name: "Teal", value: "#17A6A6" },
];

const DEFAULT_CHILDREN = [
  { id: "c1", name: "Jasmine", age: 14, color: "#6A4DF4" },
  { id: "c2", name: "Maddison", age: 11, color: "#2F80ED" },
  { id: "c3", name: "Zac", age: 9, color: "#27AE60" },
];

// Which children each chore is assigned to (by chore-template id).
// So every child has their own set of chores.
const CHORE_ASSIGNMENTS = {
  1: ["c2"], // Wash the dishes  -> Maddison only
  2: ["c3"], // Make your bed    -> Zac
  3: ["c3"], // Feed the dog     -> Zac
  4: ["c1"], // Take out recycling -> Jasmine only
  5: ["c1", "c2"], // Tidy your room -> Jasmine & Maddison (their own rooms)
  6: ["c1"], // Sort the laundry -> Jasmine
  7: ["c2"], // Set the table    -> Maddison
  8: ["c3"], // Pack your school bag -> Zac
};

/* ---- The shop ----
   Rewards the parent stocks and prices. The child spends points here. */
// `childIds` empty = available to every child; otherwise only those
// children see it, so rewards can suit each child's age and interests.
const DEFAULT_REWARDS = [
  // For everyone
  { id: "r1", name: "Packet of sweets", emoji: "🍬", cost: 10, childIds: [] },
  { id: "r2", name: "Ice cream", emoji: "🍦", cost: 12, childIds: [] },
  { id: "r3", name: "Choose a movie", emoji: "🎬", cost: 15, childIds: [] },
  { id: "r4", name: "Extra screen time", emoji: "📱", cost: 25, childIds: [] },
  { id: "r5", name: "Pick dinner", emoji: "🍕", cost: 18, childIds: [] },
  { id: "r6", name: "Sleepover with a friend", emoji: "🛌", cost: 20, childIds: [] },
  // Zac (9)
  { id: "r7", name: "Cricket coaching session", emoji: "🏏", cost: 30, childIds: ["c3"] },
  { id: "r8", name: "New Lego set", emoji: "🧱", cost: 35, childIds: ["c3"] },
  // Maddison (11, loves hockey)
  { id: "r9", name: "Hockey coaching session", emoji: "🏑", cost: 30, childIds: ["c2"] },
  { id: "r10", name: "New book", emoji: "📚", cost: 15, childIds: ["c2"] },
  // Jasmine (14)
  { id: "r11", name: "Clothes shopping trip", emoji: "🛍️", cost: 45, childIds: ["c1"] },
  { id: "r12", name: "Airtime & data", emoji: "📶", cost: 20, childIds: ["c1"] },
  { id: "r13", name: "Movie night with friends", emoji: "🍿", cost: 40, childIds: ["c1"] },
];

/* ---- Chore templates ----
   The chores every child starts with. Each child gets their own copy
   with its own id, so their progress is tracked separately.
     points   — how many points it's worth
     minutes  — a suggested time, used for the countdown timer
     game     — which mini-game teaches it
     steps    — how to do the chore (fallback guide)               */
const CHORE_TEMPLATES = [
  {
    id: 1,
    name: "Wash the dishes",
    awards: [5, 10, 15],
    minutes: 5,
    state: "todo",
    game: "dishes", // this chore has an interactive simulation
    steps: [
      "Scrape any leftover food into the bin.",
      "Rinse each plate under warm water.",
      "Put a drop of dishwashing liquid on the sponge.",
      "Scrub both sides until they're clean.",
      "Rinse the soap off.",
      "Stack everything on the rack to dry.",
    ],
  },
  {
    id: 2,
    name: "Make your bed",
    awards: [2, 4, 6],
    minutes: 2,
    state: "todo",
    game: "bed",
    steps: [
      "Pull the bottom sheet flat and tuck in the sides.",
      "Straighten the duvet up to the top.",
      "Fluff the pillows and put them back.",
      "Smooth out any last wrinkles.",
    ],
  },
  {
    id: 3,
    name: "Feed the dog",
    awards: [3],
    minutes: 2,
    state: "todo",
    game: "dog",
    steps: [
      "Fetch the dog's food bowl.",
      "Scoop in one cup of food.",
      "Empty and refill the water bowl.",
      "Put both bowls down and let the dog eat.",
    ],
  },
  {
    id: 4,
    name: "Take out the recycling",
    awards: [3],
    minutes: 3,
    state: "todo",
    game: "recycling",
    steps: [
      "Check it's the recycling bin, not the rubbish.",
      "Tie the bag closed.",
      "Carry it out to the outside bin.",
      "Put a fresh bag in the empty bin.",
    ],
  },
  {
    id: 5,
    name: "Tidy your room",
    awards: [10, 20, 30],
    minutes: 6,
    state: "todo",
    game: "room",
    steps: [
      "Put dirty clothes in the wash basket.",
      "Pack your toys and books away.",
      "Clear everything off the floor.",
      "Straighten your desk.",
      "Open the curtains.",
    ],
  },
  {
    id: 6,
    name: "Sort the laundry",
    awards: [5, 10, 15],
    minutes: 4,
    game: "laundry",
    steps: [
      "Make two piles: whites and colours.",
      "Put every white item in the whites pile.",
      "Put everything else in the colours pile.",
      "Check nothing coloured is in with the whites.",
    ],
  },
  {
    id: 7,
    name: "Set the table",
    awards: [3, 6, 9],
    minutes: 3,
    game: "table",
    steps: [
      "Put a plate in the middle.",
      "Fork on the left, knife on the right.",
      "Spoon next to the knife.",
      "Add a cup and a napkin.",
    ],
  },
  {
    id: 8,
    name: "Pack your school bag",
    awards: [4],
    minutes: 3,
    game: "bag",
    steps: [
      "Put your books and notebook in.",
      "Add your pencil case.",
      "Pack your lunch and water bottle.",
      "Zip it up.",
    ],
  },
];

// Build the real task list: every child gets their own copy of every chore.
function buildDefaultTasks() {
  const tasks = [];
  CHORE_TEMPLATES.forEach((tpl) => {
    const childIds = CHORE_ASSIGNMENTS[tpl.id] || DEFAULT_CHILDREN.map((c) => c.id);
    const awards = tpl.awards;
    childIds.forEach((cid) => {
      tasks.push({
        id: `${cid}-${tpl.id}`,
        childId: cid,
        name: tpl.name,
        awards, // the point options a parent can award
        points: Math.max(...awards), // the most it's worth (for badges/hints)
        minutes: tpl.minutes,
        game: tpl.game,
        steps: tpl.steps,
        state: "todo",
      });
    });
  });
  return tasks;
}

/* Shared */
const toastEl = document.getElementById("toast");
const resetBtn = document.getElementById("reset");
const themeToggle = document.getElementById("theme-toggle");
const footerNote = document.getElementById("footer-note");

/* Navigation: one hamburger drawer holds everything */
const menuToggle = document.getElementById("menu-toggle");
const menuEl = document.getElementById("menu");
const menuClose = document.getElementById("menu-close");
const drawerBackdrop = document.getElementById("drawer-backdrop");
const drawerItems = Array.from(document.querySelectorAll(".drawer__item"));
const drawerParentBadge = document.getElementById("drawer-parent-badge");
const menuDot = document.getElementById("menu-dot");

/* Panels (page × section) */
const panels = {
  "child-chores": document.getElementById("panel-child-chores"),
  "child-shop": document.getElementById("panel-child-shop"),
  "parent-chores": document.getElementById("panel-parent-chores"),
  "parent-shop": document.getElementById("panel-parent-shop"),
};

/* Child · Chores */
const childSwitcherEl = document.getElementById("child-switcher");
const heroLabelEl = document.getElementById("hero-label");
const balanceEl = document.getElementById("balance");
const tallyEl = document.getElementById("tally");
const heroHintEl = document.getElementById("hero-hint");
const colorSwatchesEl = document.getElementById("color-swatches");
const listEl = document.getElementById("task-list");
const emptyEl = document.getElementById("tasks-empty");

/* Child · Shop */
const shopNoteEl = document.getElementById("shop-note");
const shopGridEl = document.getElementById("shop-grid");

/* Parent · Chores */
const parentSummaryEl = document.getElementById("parent-summary");
const queueListEl = document.getElementById("queue-list");
const queueEmptyEl = document.getElementById("queue-empty");

/* Parent · Shop */
const rewardForm = document.getElementById("reward-form");
const rewardEmojiEl = document.getElementById("reward-emoji");
const rewardNameEl = document.getElementById("reward-name");
const rewardCostEl = document.getElementById("reward-cost");
const rewardForEl = document.getElementById("reward-for");
const rewardListEl = document.getElementById("reward-list");
const redemptionsEl = document.getElementById("redemptions");

const SVG_NS = "http://www.w3.org/2000/svg";
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

/* ---------- App state ------------------------------------ */

let children = DEFAULT_CHILDREN.map((c) => ({ ...c }));
let tasks = buildDefaultTasks();
let rewards = DEFAULT_REWARDS.map((r) => ({ ...r }));
let redemptions = []; // { childId, name, cost } — what's been redeemed
let activeChildId = children[0].id; // which child the Child page is showing
let shownPoints = 0; // how much stash cash the tally is currently showing

/* ---------- Saving & loading ------------------------------
   Everything lives in one saved object. Task/chore/reward
   definitions come from the code; only the changeable bits
   (states, colours, redemptions, the current view) are saved. */

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STATE_KEY));
    if (!saved) return;

    if (Array.isArray(saved.children)) {
      children = DEFAULT_CHILDREN.map((c) => {
        const m = saved.children.find((s) => s.id === c.id);
        return { ...c, color: m && m.color ? m.color : c.color };
      });
    }
    if (saved.taskStates) {
      tasks.forEach((t) => {
        if (saved.taskStates[t.id]) t.state = saved.taskStates[t.id];
      });
    }
    if (saved.awards) {
      tasks.forEach((t) => {
        if (typeof saved.awards[t.id] === "number") t.award = saved.awards[t.id];
      });
    }
    if (Array.isArray(saved.rewards)) rewards = saved.rewards;
    if (Array.isArray(saved.redemptions)) redemptions = saved.redemptions;
    if (saved.activeChildId && children.some((c) => c.id === saved.activeChildId)) {
      activeChildId = saved.activeChildId;
    }
    if (saved.page === "child" || saved.page === "parent") currentPage = saved.page;
    if (saved.section === "chores" || saved.section === "shop") {
      currentSection = saved.section;
    }
  } catch (e) {
    /* start fresh on any problem */
  }
}

function saveState() {
  try {
    const taskStates = {};
    const awards = {};
    tasks.forEach((t) => {
      if (t.state !== "todo") taskStates[t.id] = t.state;
      if (typeof t.award === "number") awards[t.id] = t.award;
    });
    localStorage.setItem(
      STATE_KEY,
      JSON.stringify({
        children: children.map((c) => ({ id: c.id, color: c.color })),
        taskStates,
        awards,
        rewards,
        redemptions,
        activeChildId,
        page: currentPage,
        section: currentSection,
      })
    );
  } catch (e) {
    /* storage might be unavailable — the demo still works */
  }
}

/* ---------- Children & points ---------------------------- */

function getChild(id) {
  return children.find((c) => c.id === id);
}

// Is a reward available to this child? (No childIds = everyone.)
function rewardIsFor(reward, childId) {
  return !reward.childIds || reward.childIds.length === 0 || reward.childIds.includes(childId);
}

function activeChild() {
  return getChild(activeChildId) || children[0];
}

function tasksFor(childId) {
  return tasks.filter((t) => t.childId === childId);
}

// How many points a verified task actually awarded. The parent
// chooses this when they verify (a badly-done chore can earn less),
// defaulting to the chore's full value.
function awardedPoints(task) {
  return typeof task.award === "number" ? task.award : task.points;
}

// Points earned (verified) by a child, minus what they've spent.
function childPoints(childId) {
  const earned = tasksFor(childId)
    .filter((t) => t.state === "verified")
    .reduce((sum, t) => sum + awardedPoints(t), 0);
  const spent = redemptions
    .filter((r) => r.childId === childId)
    .reduce((sum, r) => sum + r.cost, 0);
  return earned - spent;
}

function pendingPointsFor(childId) {
  return tasksFor(childId)
    .filter((t) => t.state === "pending")
    .reduce((sum, t) => sum + t.points, 0);
}

/* ---------- The tally counter ----------------------------
   Renders `points` as bundles of five. A full bundle is four
   uprights plus a strike; a partial bundle shows only its
   completed uprights. Above 25 points we collapse to a numeral
   beside a single bundle.

   `fromPoints` is what the tally showed before, so we can
   animate only the strokes that are newly earned.            */
function renderTally(points, fromPoints, pending) {
  tallyEl.innerHTML = "";
  tallyEl.setAttribute("aria-label", `${points} stash cash`);

  if (points > 25) {
    const numeral = document.createElement("span");
    numeral.className = "tally__numeral";
    numeral.textContent = points;
    tallyEl.append(numeral, makeBundle(5, 0, points, false));
    return;
  }

  const bundles = Math.ceil(points / 5);
  for (let b = 0; b < bundles; b++) {
    const strokesInBundle = Math.min(5, points - b * 5);
    const justCompleted = strokesInBundle === 5 && b * 5 + 5 > fromPoints;
    tallyEl.append(makeBundle(strokesInBundle, b * 5, fromPoints, justCompleted));
  }

  // Show the next upright faintly when a task is waiting on a parent.
  if (pending > 0 && points <= 25) {
    const nextInBundle = points % 5;
    if (nextInBundle === 0) {
      tallyEl.append(makeGhostBundle(0));
    } else if (nextInBundle < 4) {
      const last = tallyEl.querySelector(".tally__bundle:last-of-type");
      if (last) last.append(makeUpright(nextInBundle, true));
    }
  }
}

function makeBundle(strokes, base, fromPoints, justCompleted) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 80 56");
  svg.setAttribute("class", "tally__bundle" + (justCompleted ? " is-complete" : ""));

  const uprights = Math.min(strokes, 4);
  for (let i = 0; i < uprights; i++) {
    const isNew = base + i + 1 > fromPoints;
    svg.append(makeUpright(i, false, isNew));
  }
  if (strokes === 5) {
    svg.append(makeStrike(base + 5 > fromPoints));
  }
  return svg;
}

function makeGhostBundle(index) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 80 56");
  svg.setAttribute("class", "tally__bundle");
  svg.append(makeUpright(index, true));
  return svg;
}

function makeUpright(i, ghost, isNew) {
  const rect = document.createElementNS(SVG_NS, "rect");
  rect.setAttribute("x", 12 + i * 16);
  rect.setAttribute("y", 6);
  rect.setAttribute("width", 8);
  rect.setAttribute("height", 44);
  rect.setAttribute("rx", 4);
  let cls = "tally-upright";
  if (ghost) cls += " tally-upright--ghost";
  if (isNew && !prefersReducedMotion) cls += " is-drawing";
  rect.setAttribute("class", cls);
  return rect;
}

function makeStrike(isNew) {
  const line = document.createElementNS(SVG_NS, "line");
  line.setAttribute("x1", 11);
  line.setAttribute("y1", 45);
  line.setAttribute("x2", 69);
  line.setAttribute("y2", 11);
  line.setAttribute("stroke-width", 7.5);
  line.setAttribute("stroke-linecap", "round");
  line.setAttribute(
    "class",
    "tally-strike" + (isNew && !prefersReducedMotion ? " is-drawing" : "")
  );
  return line;
}

/* ---------- Task rows (shared by both pages) --------------
   Every row is tinted with the owning child's colour via the
   `--accent` custom property (a coloured stripe down the left). */
function taskRow(task, actionEls, opts) {
  opts = opts || {};
  const child = getChild(task.childId);
  const li = document.createElement("li");
  li.className = "task" + (opts.verified ? " task--verified" : "");
  if (child) li.style.setProperty("--accent", child.color);

  const main = document.createElement("div");
  main.className = "task__main";

  const name = document.createElement("p");
  name.className = "task__name";
  name.textContent = task.name;

  const meta = document.createElement("div");
  meta.className = "task__meta";
  // On the parent's mixed queue, show whose chore it is.
  if (opts.showChild && child) {
    const chip = document.createElement("span");
    chip.className = "child-chip";
    chip.style.background = child.color;
    chip.textContent = child.name;
    meta.append(chip);
  }
  const badge = document.createElement("span");
  badge.className = "badge";
  badge.innerHTML = `${pointsLabel(task)}<span class="badge__unit">SC</span>`;
  meta.append(badge);

  main.append(name, meta);

  const actions = document.createElement("div");
  actions.className = "task__actions";
  actions.append(...actionEls);

  li.append(main, actions);
  return li;
}

// A chore worth a single amount shows "3"; one with a range shows "5–15".
function pointsLabel(task) {
  const opts = task.awards || [task.points];
  const lo = Math.min(...opts);
  const hi = Math.max(...opts);
  return lo === hi ? `${hi}` : `${lo}–${hi}`;
}

/* ---------- Child · Chores ------------------------------- */

function renderChildChores() {
  const child = activeChild();
  const points = childPoints(child.id);

  heroLabelEl.textContent = `${child.name}'s stash`;
  balanceEl.textContent = points;
  renderTally(points, shownPoints, pendingPointsFor(child.id));
  shownPoints = points;
  updateHint(child.id);

  // Colour swatches for the child to pick their colour.
  colorSwatchesEl.innerHTML = "";
  CHILD_COLORS.forEach((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "swatch" + (c.value === child.color ? " is-selected" : "");
    b.style.background = c.value;
    b.setAttribute("aria-label", c.name);
    b.addEventListener("click", () => setChildColor(child.id, c.value));
    colorSwatchesEl.append(b);
  });

  // This child's chores.
  listEl.innerHTML = "";
  const mine = tasksFor(child.id);
  mine.forEach((task) => {
    listEl.append(taskRow(task, actionsFor(task), { verified: task.state === "verified" }));
  });
  emptyEl.hidden = !mine.every((t) => t.state === "verified");
}

// The child rows: Do a chore, or show its status. Verifying is a
// parent action, so it lives on the Parent page instead.
function actionsFor(task) {
  if (task.state === "todo" || task.state === "declined") {
    const parts = [];
    if (task.state === "declined") parts.push(statusPill("Sent back", "declined"));
    parts.push(button("I've done it", "btn btn--primary", () => markDone(task.id)));
    return parts;
  }
  if (task.state === "pending") {
    return [statusPill("Waiting on a parent", "pending")];
  }
  return [statusPill("Verified", "verified")];
}

/* ---------- Parent · Chores (verification queue) --------- */

function renderParentChores() {
  // A calm per-child summary of where points stand.
  parentSummaryEl.innerHTML = "";
  children.forEach((child) => {
    const card = document.createElement("div");
    card.className = "child-total";
    card.style.setProperty("--accent", child.color);
    const dot = `<span class="child-total__dot" style="background:${child.color}"></span>`;
    const age = child.age ? ` · ${child.age}` : "";
    card.innerHTML = `${dot}<span class="child-total__name">${child.name}<span class="child-total__age">${age}</span></span><span class="child-total__pts">${childPoints(
      child.id
    )} SC</span>`;
    parentSummaryEl.append(card);
  });

  const waiting = tasks.filter((t) => t.state === "pending");
  queueListEl.innerHTML = "";
  waiting.forEach((task) => queueListEl.append(verifyRow(task)));
  queueEmptyEl.hidden = waiting.length > 0;

  // Badge in the drawer + a dot on the hamburger so a parent knows
  // there's something waiting without opening the menu.
  drawerParentBadge.textContent = waiting.length;
  drawerParentBadge.hidden = waiting.length === 0;
  menuDot.hidden = waiting.length === 0;
}

// One row in the verification queue: the chore, whose it is, and a
// set of point choices so the parent picks how many points to award
// (a badly-done chore can earn fewer than its full value).
function verifyRow(task) {
  const child = getChild(task.childId);
  const li = document.createElement("li");
  li.className = "task queue-row";
  if (child) li.style.setProperty("--accent", child.color);

  const main = document.createElement("div");
  main.className = "task__main";
  const name = document.createElement("p");
  name.className = "task__name";
  name.textContent = task.name;
  const meta = document.createElement("div");
  meta.className = "task__meta";
  if (child) {
    const chip = document.createElement("span");
    chip.className = "child-chip";
    chip.style.background = child.color;
    chip.textContent = child.name;
    meta.append(chip);
  }
  main.append(name, meta);

  const controls = document.createElement("div");
  controls.className = "verify-controls";
  const options = task.awards || [task.points];
  const label = document.createElement("span");
  label.className = "verify-controls__label";
  label.textContent = options.length > 1 ? "Award stash cash" : "Award";
  controls.append(label);

  // One chip per award option the chore allows. The best is highlighted.
  const best = Math.max(...options);
  options.forEach((n) => {
    const chip = button(String(n), "award-chip", () => verifyTask(task.id, n));
    if (n === best) chip.classList.add("is-full");
    chip.setAttribute("aria-label", `Award ${n} stash cash`);
    controls.append(chip);
  });
  controls.append(
    iconButton("↩", "pbtn pbtn--decline", "Send back", () =>
      setState(task.id, "declined")
    )
  );

  li.append(main, controls);
  return li;
}

/* ---------- Child · Shop (the kiosk) --------------------- */

function renderChildShop() {
  const child = activeChild();
  const points = childPoints(child.id);
  shopNoteEl.textContent = `${child.name}, you have ${points} stash cash to spend.`;

  // Only the rewards available to this child (theirs + everyone's).
  const available = rewards.filter((r) => rewardIsFor(r, child.id));

  shopGridEl.innerHTML = "";
  if (available.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "The shop is empty. A parent can add rewards.";
    shopGridEl.append(empty);
    return;
  }

  available.forEach((reward) => {
    const affordable = points >= reward.cost;
    const card = document.createElement("div");
    card.className = "shop-card" + (affordable ? "" : " shop-card--short");

    const emoji = document.createElement("div");
    emoji.className = "shop-card__emoji";
    emoji.textContent = reward.emoji;

    const name = document.createElement("p");
    name.className = "shop-card__name";
    name.textContent = reward.name;

    const cost = document.createElement("p");
    cost.className = "shop-card__cost";
    cost.textContent = `${reward.cost} SC`;

    card.append(emoji, name, cost);

    if (affordable) {
      const b = button("Redeem", "btn btn--primary shop-card__btn", () =>
        redeem(child.id, reward.id)
      );
      b.style.background = child.color;
      b.style.borderColor = child.color;
      card.append(b);
    } else {
      const need = document.createElement("p");
      need.className = "shop-card__need";
      need.textContent = `${reward.cost - points} more to go`;
      card.append(need);
    }
    shopGridEl.append(card);
  });
}

/* ---------- Parent · Shop (stock & price) ---------------- */

function renderParentShop() {
  // Keep the "for" picker in step with the children.
  populateRewardForSelect();

  rewardListEl.innerHTML = "";
  rewards.forEach((reward) => {
    const li = document.createElement("li");
    li.className = "reward";

    // Who it's for: "All", or the child's name in their colour.
    let forChip;
    if (!reward.childIds || reward.childIds.length === 0) {
      forChip = `<span class="reward__for">All</span>`;
    } else {
      const c = getChild(reward.childIds[0]);
      forChip = c
        ? `<span class="reward__for" style="background:${c.color};color:#fff">${c.name}</span>`
        : "";
    }

    li.innerHTML = `
      <span class="reward__emoji">${reward.emoji}</span>
      <span class="reward__name">${reward.name}</span>
      ${forChip}
      <span class="badge">${reward.cost}<span class="badge__unit">SC</span></span>`;
    const del = iconButton("×", "pbtn pbtn--decline reward__del", "Remove reward", () =>
      deleteReward(reward.id)
    );
    li.append(del);
    rewardListEl.append(li);
  });

  // A short log of what's been redeemed, so the parent knows what to give.
  redemptionsEl.innerHTML = "";
  if (redemptions.length) {
    const h = document.createElement("h3");
    h.className = "redemptions__title";
    h.textContent = "Recently redeemed";
    redemptionsEl.append(h);
    redemptions
      .slice(-5)
      .reverse()
      .forEach((r) => {
        const child = getChild(r.childId);
        const row = document.createElement("p");
        row.className = "redemptions__row";
        const who = child ? child.name : "A child";
        row.textContent = `${who} redeemed ${r.name} (${r.cost} SC)`;
        redemptionsEl.append(row);
      });
  }
}

// Fill the "who's it for" dropdown: Everyone, then each child.
function populateRewardForSelect() {
  const current = rewardForEl.value;
  rewardForEl.innerHTML = '<option value="all">Everyone</option>';
  children.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    rewardForEl.append(opt);
  });
  if (current && [...rewardForEl.options].some((o) => o.value === current)) {
    rewardForEl.value = current;
  }
}

/* ---------- Child switcher ------------------------------- */

function renderChildSwitcher() {
  childSwitcherEl.innerHTML = "";
  children.forEach((child) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "child-tab" + (child.id === activeChildId ? " is-active" : "");
    b.style.setProperty("--accent", child.color);
    b.innerHTML = `<span class="child-tab__dot" style="background:${child.color}"></span>${child.name}`;
    b.addEventListener("click", () => setActiveChild(child.id));
    childSwitcherEl.append(b);
  });
}

/* ---------- Small element helpers ------------------------ */

function button(label, className, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = className;
  b.textContent = label;
  b.addEventListener("click", onClick);
  return b;
}

function iconButton(label, className, ariaLabel, onClick) {
  const b = button(label, className, onClick);
  b.setAttribute("aria-label", ariaLabel);
  return b;
}

function statusPill(text, kind) {
  const span = document.createElement("span");
  span.className = "status status--" + kind;
  span.textContent = text;
  return span;
}

/* ---------- Marking a chore done ------------------------- */

// The child says they've finished a chore; it then waits for a
// parent to verify and award the stash cash.
function markDone(id) {
  setState(id, "pending");
}

/* ---------- Actions -------------------------------------- */

function setState(id, state) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  task.state = state;
  if (state !== "verified") delete task.award; // reset any chosen award
  saveState();
  update();
}

// The parent verifies a chore and chooses how many points to award
// (up to the chore's value) — a badly-done chore can earn less.
function verifyTask(id, points) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  const award = typeof points === "number" ? points : task.points;
  task.award = award;
  task.state = "verified";
  saveState();
  update();
  showToast(`+${award} stash cash`);
}

function setActiveChild(id) {
  activeChildId = id;
  shownPoints = childPoints(id); // no draw-on animation just for switching
  saveState();
  renderChildSwitcher();
  update();
}

function setChildColor(id, color) {
  const child = getChild(id);
  if (!child) return;
  child.color = color;
  saveState();
  renderChildSwitcher();
  update();
}

function redeem(childId, rewardId) {
  const reward = rewards.find((r) => r.id === rewardId);
  if (!reward) return;
  if (childPoints(childId) < reward.cost) return; // can't afford
  redemptions.push({ childId, name: reward.name, cost: reward.cost });
  saveState();
  update();
  showToast(`Redeemed ${reward.name}!`);
}

function addReward(name, cost, emoji, forValue) {
  rewards.push({
    id: "r" + Date.now(),
    name,
    cost,
    emoji: emoji || "🎁",
    childIds: forValue && forValue !== "all" ? [forValue] : [],
  });
  saveState();
  update();
}

function deleteReward(id) {
  rewards = rewards.filter((r) => r.id !== id);
  saveState();
  update();
}

function resetDemo() {
  children = DEFAULT_CHILDREN.map((c) => ({ ...c }));
  tasks = buildDefaultTasks();
  rewards = DEFAULT_REWARDS.map((r) => ({ ...r }));
  redemptions = [];
  activeChildId = children[0].id;
  shownPoints = 0;
  saveState();
  renderChildSwitcher();
  update();
}

/* ---------- The hint under the balance ------------------- */

function updateHint(childId) {
  const mine = tasksFor(childId);
  const pending = mine.filter((t) => t.state === "pending").length;
  const todo = mine.filter(
    (t) => t.state === "todo" || t.state === "declined"
  ).length;

  if (pending > 0) {
    heroHintEl.textContent =
      pending === 1 ? "1 task waiting to be checked." : `${pending} tasks waiting to be checked.`;
  } else if (todo > 0) {
    heroHintEl.textContent = todo === 1 ? "1 task to do." : `${todo} tasks to do.`;
  } else {
    heroHintEl.textContent = "All caught up.";
  }
}

/* ---------- Toast ---------------------------------------- */

let toastTimer;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  requestAnimationFrame(() => toastEl.classList.add("is-visible"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("is-visible");
    setTimeout(() => (toastEl.hidden = true), 250);
  }, 1800);
}

/* ---------- Navigation: page (who) × section (what) ------ */

let currentPage = "child"; // child | parent
let currentSection = "chores"; // chores | shop

// Each menu leaf is a full destination: a person + a view.
function navigate(page, section) {
  currentPage = page;
  currentSection = section;
  saveState();
  showView();
}

function toggleMenu() {
  menuEl.hidden ? openMenu() : closeMenu();
}
function openMenu() {
  menuEl.hidden = false;
  menuToggle.setAttribute("aria-expanded", "true");
}
function closeMenu() {
  menuEl.hidden = true;
  menuToggle.setAttribute("aria-expanded", "false");
}

// Show the one panel matching the current page + section, and keep
// the drawer highlights and footer in step.
function showView() {
  const key = `${currentPage}-${currentSection}`;
  Object.entries(panels).forEach(([k, el]) => (el.hidden = k !== key));

  // The child switcher only makes sense on the child pages.
  childSwitcherEl.hidden = currentPage !== "child";

  drawerItems.forEach((item) => {
    const active =
      item.dataset.page === currentPage && item.dataset.section === currentSection;
    item.classList.toggle("is-active", active);
  });

  updateFooterNote();
}

function updateFooterNote() {
  let note;
  if (currentSection === "shop") {
    note =
      currentPage === "child"
        ? "Spend your stash cash on a reward you can afford."
        : "Add rewards and set what each costs. The child spends stash cash on them.";
  } else {
    note =
      currentPage === "child"
        ? "Tap <strong>I've done it</strong> when you finish a chore. A parent verifies it and awards the stash cash."
        : "Choose how many <strong>stash cash to award</strong> for a finished chore, or <strong>↩</strong> to send it back.";
  }
  footerNote.innerHTML = note;
}

/* ---------- Re-draw everything --------------------------- */

function update() {
  renderChildChores();
  renderChildShop();
  renderParentChores();
  renderParentShop();
}

/* ---------- Theme toggle --------------------------------- */

function applyStoredTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) document.documentElement.setAttribute("data-theme", saved);
  } catch (e) {
    /* ignore */
  }
}

function currentlyDark() {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr) return attr === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/* ---------- Wiring --------------------------------------- */

themeToggle.addEventListener("click", () => {
  const next = currentlyDark() ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (e) {
    /* ignore */
  }
});

resetBtn.addEventListener("click", resetDemo);

// The hamburger drawer holds all navigation.
menuToggle.addEventListener("click", toggleMenu);
menuClose.addEventListener("click", closeMenu);
drawerBackdrop.addEventListener("click", closeMenu);
drawerItems.forEach((item) => {
  item.addEventListener("click", () => {
    navigate(item.dataset.page, item.dataset.section);
    closeMenu(); // close cleanly after choosing
  });
});

// Parent adds a reward to the shop.
rewardForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = rewardNameEl.value.trim();
  const cost = parseInt(rewardCostEl.value, 10);
  const emoji = rewardEmojiEl.value.trim();
  if (!name || !cost || cost < 1) return;
  addReward(name, cost, emoji, rewardForEl.value);
  rewardNameEl.value = "";
  rewardCostEl.value = "";
  rewardEmojiEl.value = "🎁";
  rewardNameEl.focus();
});

// Close the drawer with Escape.
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !menuEl.hidden) closeMenu();
});

/* ---------- Start ---------------------------------------- */

applyStoredTheme();
loadState();
renderChildSwitcher();
showView();
update();
