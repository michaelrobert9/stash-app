/* ============================================================
   Stash — app logic

   Stash is a chore-and-reward app. A child earns points by
   doing tasks, a parent verifies the work, and only then are
   the points added to the child's stash.

   The flow for one task:
     1. Child taps "Do".
     2. A short step-by-step guide shows how to do the chore.
     3. When they've read the steps, a gentle timer starts and
        they go and do the real chore.
     4. They tap "I've done it"  →  the task is "pending".
     5. The parent taps ✓ to verify (points awarded, the tally
        counter draws the new strokes) or ↩ to send it back.

   The tally counter is the heart of the brand: points are
   shown as bundles of five — four uprights and a strike —
   exactly like a hand-drawn tally mark.

   Everything is saved in the browser, so it stays put when you
   come back.
   ============================================================ */

const STATE_KEY = "stash-state-v3";
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
  { id: "c1", name: "Emma", color: "#6A4DF4" },
  { id: "c2", name: "Noah", color: "#2F80ED" },
  { id: "c3", name: "Ava", color: "#27AE60" },
];

/* ---- The shop ----
   Rewards the parent stocks and prices. The child spends points here. */
const DEFAULT_REWARDS = [
  { id: "r1", name: "Packet of sweets", emoji: "🍬", cost: 10 },
  { id: "r2", name: "Choose a movie", emoji: "🎬", cost: 15 },
  { id: "r3", name: "Ice cream", emoji: "🍦", cost: 12 },
  { id: "r4", name: "Extra screen time", emoji: "📱", cost: 8 },
  { id: "r5", name: "Sleepover with a friend", emoji: "🛌", cost: 20 },
  { id: "r6", name: "Pick dinner", emoji: "🍕", cost: 18 },
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
    points: 3,
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
    points: 1,
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
    points: 2,
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
    points: 2,
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
    points: 4,
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
];

// Build the real task list: every child gets their own copy of every chore.
function buildDefaultTasks() {
  const tasks = [];
  DEFAULT_CHILDREN.forEach((child) => {
    CHORE_TEMPLATES.forEach((tpl) => {
      tasks.push({
        id: `${child.id}-${tpl.id}`,
        childId: child.id,
        name: tpl.name,
        points: tpl.points,
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

/* Navigation: hamburger menu (sections) + Child/Parent tabs */
const menuToggle = document.getElementById("menu-toggle");
const menuEl = document.getElementById("menu");
const menuItems = Array.from(document.querySelectorAll(".menu__item"));
const tabs = Array.from(document.querySelectorAll(".tab"));
const tabParentBadge = document.getElementById("tab-parent-badge");

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
const rewardListEl = document.getElementById("reward-list");
const redemptionsEl = document.getElementById("redemptions");

/* Overlay elements */
const overlayEl = document.getElementById("overlay");
const sheetCloseBtn = document.getElementById("sheet-close");
const phaseGame = document.getElementById("phase-game");
const phaseLearn = document.getElementById("phase-learn");
const phaseDo = document.getElementById("phase-do");
const gameTitle = document.getElementById("game-title");
const gameInstruction = document.getElementById("game-instruction");
const gameStage = document.getElementById("game-stage");
const gameProgress = document.getElementById("game-progress");
const sheetTitle = document.getElementById("sheet-title");
const stepCounter = document.getElementById("step-counter");
const stepText = document.getElementById("step-text");
const stepDots = document.getElementById("step-dots");
const stepNextBtn = document.getElementById("step-next");
const stepBackBtn = document.getElementById("step-back");
const doTitle = document.getElementById("do-title");
const timerEl = document.getElementById("timer");
const timerFill = document.getElementById("timer-fill");
const timerHint = document.getElementById("timer-hint");
const doDoneBtn = document.getElementById("do-done");

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
let shownPoints = 0; // how many points the tally is currently showing

/* Overlay working state */
let activeTaskId = null;
let stepIndex = 0;
let timerId = null;
let activeGame = null;

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
    tasks.forEach((t) => {
      if (t.state !== "todo") taskStates[t.id] = t.state;
    });
    localStorage.setItem(
      STATE_KEY,
      JSON.stringify({
        children: children.map((c) => ({ id: c.id, color: c.color })),
        taskStates,
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

function activeChild() {
  return getChild(activeChildId) || children[0];
}

function tasksFor(childId) {
  return tasks.filter((t) => t.childId === childId);
}

// Points earned (verified) by a child, minus what they've spent.
function childPoints(childId) {
  const earned = tasksFor(childId)
    .filter((t) => t.state === "verified")
    .reduce((sum, t) => sum + t.points, 0);
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
  tallyEl.setAttribute("aria-label", `${points} points`);

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
  badge.innerHTML = `${task.points}<span class="badge__unit">pts</span>`;
  meta.append(badge);

  main.append(name, meta);

  const actions = document.createElement("div");
  actions.className = "task__actions";
  actions.append(...actionEls);

  li.append(main, actions);
  return li;
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
    parts.push(button("Do", "btn btn--primary", () => openOverlay(task.id)));
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
    card.innerHTML = `${dot}<span class="child-total__name">${child.name}</span><span class="child-total__pts">${childPoints(
      child.id
    )} pts</span>`;
    parentSummaryEl.append(card);
  });

  const waiting = tasks.filter((t) => t.state === "pending");
  queueListEl.innerHTML = "";
  waiting.forEach((task) => {
    const actions = [
      iconButton("✓", "pbtn pbtn--verify", "Verify task", () => verifyTask(task.id)),
      iconButton("↩", "pbtn pbtn--decline", "Send back", () =>
        setState(task.id, "declined")
      ),
    ];
    queueListEl.append(taskRow(task, actions, { showChild: true }));
  });
  queueEmptyEl.hidden = waiting.length > 0;

  tabParentBadge.textContent = waiting.length;
  tabParentBadge.hidden = waiting.length === 0;
}

/* ---------- Child · Shop (the kiosk) --------------------- */

function renderChildShop() {
  const child = activeChild();
  const points = childPoints(child.id);
  shopNoteEl.textContent = `${child.name}, you have ${points} ${
    points === 1 ? "point" : "points"
  } to spend.`;

  shopGridEl.innerHTML = "";
  if (rewards.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "The shop is empty. A parent can add rewards.";
    shopGridEl.append(empty);
    return;
  }

  rewards.forEach((reward) => {
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
    cost.textContent = `${reward.cost} pts`;

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
  rewardListEl.innerHTML = "";
  rewards.forEach((reward) => {
    const li = document.createElement("li");
    li.className = "reward";
    li.innerHTML = `
      <span class="reward__emoji">${reward.emoji}</span>
      <span class="reward__name">${reward.name}</span>
      <span class="badge">${reward.cost}<span class="badge__unit">pts</span></span>`;
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
        row.textContent = `${who} redeemed ${r.name} (${r.cost} pts)`;
        redemptionsEl.append(row);
      });
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

/* ---------- The "Do" overlay ----------------------------- */

function openOverlay(id) {
  activeTaskId = id;
  stepIndex = 0;
  overlayEl.hidden = false;
  document.body.style.overflow = "hidden"; // stop the page behind scrolling

  const task = activeTask();
  if (task.game) {
    showGamePhase();
  } else {
    showLearnPhase();
    stepNextBtn.focus();
  }
}

function showPhase(which) {
  phaseGame.hidden = which !== "game";
  phaseLearn.hidden = which !== "learn";
  phaseDo.hidden = which !== "do";
}

function closeOverlay() {
  stopTimer();
  if (activeGame) activeGame.teardown();
  overlayEl.hidden = true;
  document.body.style.overflow = "";
  activeTaskId = null;
}

/* --- Phase 0: the simulation game --- */

function showGamePhase() {
  showPhase("game");
  const task = activeTask();
  gameTitle.textContent = task.name;
  // When the game is finished, move on to the timer.
  const done = () => startDoPhase();
  if (task.game === "dishes") {
    activeGame = new DishGame(task, done);
  } else {
    activeGame = new ChoreGame(task, GAME_CONFIGS[task.game], done);
  }
  activeGame.start();
}

function activeTask() {
  return tasks.find((t) => t.id === activeTaskId);
}

/* --- Phase 1: learn the steps --- */

function showLearnPhase() {
  showPhase("learn");
  const task = activeTask();
  sheetTitle.textContent = task.name;
  renderStep();
}

function renderStep() {
  const task = activeTask();
  const total = task.steps.length;

  stepCounter.textContent = `Step ${stepIndex + 1} of ${total}`;
  stepText.textContent = task.steps[stepIndex];

  // Progress dots
  stepDots.innerHTML = "";
  for (let i = 0; i < total; i++) {
    const dot = document.createElement("span");
    dot.className =
      "dot" +
      (i === stepIndex ? " is-current" : "") +
      (i < stepIndex ? " is-done" : "");
    stepDots.append(dot);
  }

  // On the last step the button starts the chore instead of advancing.
  stepNextBtn.textContent = stepIndex === total - 1 ? "I'm ready — start" : "Next";
  stepBackBtn.classList.toggle("is-hidden", stepIndex === 0);
}

function nextStep() {
  const task = activeTask();
  if (stepIndex < task.steps.length - 1) {
    stepIndex++;
    renderStep();
  } else {
    startDoPhase();
  }
}

function prevStep() {
  if (stepIndex > 0) {
    stepIndex--;
    renderStep();
  }
}

/* --- Phase 2: the countdown timer --- */

function startDoPhase() {
  const task = activeTask();
  if (activeGame) {
    activeGame.teardown();
    activeGame = null;
  }
  showPhase("do");
  doTitle.textContent = task.name;
  doDoneBtn.focus();

  const total = task.minutes * 60;
  let remaining = total;

  timerEl.classList.remove("is-up");
  timerHint.textContent = "Off you go. Tap “I’ve done it” when you’re finished.";
  paintTimer(remaining, total);

  stopTimer();
  timerId = setInterval(() => {
    remaining--;
    paintTimer(remaining, total);
    if (remaining <= 0) {
      stopTimer();
      timerEl.classList.add("is-up");
      timerHint.textContent = "Time's up — finish up, then tap “I’ve done it”.";
    }
  }, 1000);
}

function paintTimer(remaining, total) {
  const safe = Math.max(0, remaining);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  timerEl.textContent = `${mins}:${String(secs).padStart(2, "0")}`;
  timerFill.style.width = (safe / total) * 100 + "%";
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function finishDoing() {
  const id = activeTaskId;
  closeOverlay();
  setState(id, "pending");
}

/* ============================================================
   DishGame — the "wash the dishes" simulation

   Three dishes, each done in three moves:
     1. Drag the dish into the sink.
     2. Scrub it clean, going round in circles (a guide shows how).
     3. Drag the clean dish into the dishwasher rack.

   It uses pointer events, so it works with a mouse or a finger.
   ============================================================ */

const TOTAL_DISHES = 3;
const DISH_SIZES = [92, 82, 74]; // a plate, then smaller dishes
// Where the dirt sits on each dish, in the SVG's 0–100 grid.
const DIRT_SPOTS = [
  [42, 44],
  [59, 42],
  [46, 60],
  [61, 57],
];

class DishGame {
  constructor(task, onComplete) {
    this.task = task;
    this.onComplete = onComplete;
    this.round = 0;
    this.dead = false;
    this.timers = [];
    // Bound handlers so we can add/remove the same references.
    this.onDown = this.handleDown.bind(this);
    this.onMove = this.handleMove.bind(this);
    this.onUp = this.handleUp.bind(this);
  }

  start() {
    this.buildStage();
    this.nextDish();
  }

  teardown() {
    this.dead = true;
    this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];
    gameStage.innerHTML = "";
  }

  later(fn, ms) {
    const id = setTimeout(() => {
      if (!this.dead) fn();
    }, ms);
    this.timers.push(id);
  }

  buildStage() {
    gameStage.innerHTML = "";
    const W = gameStage.clientWidth;
    const H = gameStage.clientHeight;

    // The sink (top, centre) and the dishwasher rack (bottom right).
    this.sink = { x: (W - 150) / 2, y: 18, w: 150, h: 112 };
    this.rack = { x: W - 132, y: H - 102, w: 120, h: 86 };
    this.pile = { cx: 64, cy: H - 54 }; // where a fresh dish appears

    this.sinkEl = this.makeZone(this.sink, "sink", "Sink");
    this.rackEl = this.makeZone(this.rack, "rack", "");
    const rackLines = document.createElement("div");
    rackLines.className = "rack-lines";
    const rackLabel = document.createElement("span");
    rackLabel.className = "zone__label";
    rackLabel.textContent = "Dishwasher";
    this.rackEl.append(rackLines, rackLabel);

    // A sponge that follows the finger while scrubbing.
    this.sponge = document.createElement("div");
    this.sponge.className = "sponge";
    gameStage.append(this.sponge);
  }

  makeZone(rect, kind, label) {
    const el = document.createElement("div");
    el.className = "zone zone--" + kind;
    el.style.left = rect.x + "px";
    el.style.top = rect.y + "px";
    el.style.width = rect.w + "px";
    el.style.height = rect.h + "px";
    if (label) {
      const span = document.createElement("span");
      span.className = "zone__label";
      span.textContent = label;
      el.append(span);
    }
    gameStage.append(el);
    return el;
  }

  nextDish() {
    this.round++;
    if (this.round > TOTAL_DISHES) {
      this.finish();
      return;
    }
    gameProgress.textContent = `Dish ${this.round} of ${TOTAL_DISHES}`;

    this.size = DISH_SIZES[this.round - 1] || 80;
    this.buildDish();
    this.setStep("toSink");
  }

  buildDish() {
    // Remove any previous dish.
    if (this.dish) this.dish.remove();

    const size = this.size;
    const dish = document.createElement("div");
    dish.className = "dish";
    dish.style.width = size + "px";
    dish.style.height = size + "px";

    dish.innerHTML = `
      <svg class="dish__svg" viewBox="0 0 100 100" width="${size}" height="${size}">
        <circle class="dish-body" cx="50" cy="50" r="46"></circle>
        <circle cx="50" cy="50" r="36" fill="none" stroke="var(--mist)" stroke-width="1.5"></circle>
        <g class="dirt-layer"></g>
        <g class="guide-layer"></g>
      </svg>`;

    gameStage.append(dish);
    this.dish = dish;
    this.dirtLayer = dish.querySelector(".dirt-layer");
    this.guideLayer = dish.querySelector(".guide-layer");

    // Start the dish at the pile, centred on the pile point.
    this.moveDishTo(this.pile.cx - size / 2, this.pile.cy - size / 2);

    dish.addEventListener("pointerdown", this.onDown);
  }

  moveDishTo(x, y) {
    const W = gameStage.clientWidth;
    const H = gameStage.clientHeight;
    // Keep the dish inside the stage.
    this.dishX = Math.max(0, Math.min(x, W - this.size));
    this.dishY = Math.max(0, Math.min(y, H - this.size));
    this.dish.style.left = this.dishX + "px";
    this.dish.style.top = this.dishY + "px";
  }

  dishCenter() {
    return { x: this.dishX + this.size / 2, y: this.dishY + this.size / 2 };
  }

  setStep(step) {
    this.step = step;
    if (step === "toSink") {
      gameInstruction.textContent = "Drag the plate into the sink.";
      this.highlight(this.sinkEl);
    } else if (step === "scrub") {
      gameInstruction.textContent =
        "Scrub round and round in circles until the plate is sparkling.";
      this.highlight(null);
      this.addDirt();
      this.addGuide();
    } else if (step === "toRack") {
      gameInstruction.textContent = "Nice! Now put it in the dishwasher.";
      this.highlight(this.rackEl);
    }
  }

  highlight(zoneEl) {
    [this.sinkEl, this.rackEl].forEach((z) =>
      z.classList.toggle("is-target", z === zoneEl)
    );
  }

  addDirt() {
    this.dirt = DIRT_SPOTS.map(([cx, cy]) => {
      const c = document.createElementNS(SVG_NS, "circle");
      c.setAttribute("cx", cx);
      c.setAttribute("cy", cy);
      c.setAttribute("r", 7);
      c.setAttribute("class", "dirt");
      this.dirtLayer.append(c);
      return { cx, cy, cleaned: 0, el: c };
    });
  }

  addGuide() {
    this.guideLayer.innerHTML = `
      <circle class="scrub-guide" cx="50" cy="50" r="24"></circle>
      <g class="scrub-orbit"><circle class="scrub-guide__dot" cx="50" cy="26" r="4"></circle></g>`;
  }

  clearGuide() {
    if (this.guideLayer) this.guideLayer.innerHTML = "";
  }

  /* ----- Pointer handling ----- */

  posInStage(e) {
    const r = gameStage.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  handleDown(e) {
    if (this.dead) return;
    this.dish.setPointerCapture(e.pointerId);
    const p = this.posInStage(e);

    if (this.step === "scrub") {
      this.scrubbing = true;
      this.sponge.classList.add("is-active");
      this.scrubAt(p);
    } else {
      // dragging (toSink or toRack)
      this.dragging = true;
      this.dish.classList.add("is-dragging");
      this.grabDX = p.x - this.dishX;
      this.grabDY = p.y - this.dishY;
    }
  }

  handleMove(e) {
    if (this.dead) return;
    const p = this.posInStage(e);
    if (this.dragging) {
      this.moveDishTo(p.x - this.grabDX, p.y - this.grabDY);
    } else if (this.scrubbing) {
      this.scrubAt(p);
    }
  }

  handleUp(e) {
    if (this.dead) return;
    try {
      this.dish.releasePointerCapture(e.pointerId);
    } catch (err) {
      /* ignore */
    }
    if (this.dragging) {
      this.dragging = false;
      this.dish.classList.remove("is-dragging");
      this.checkDrop();
    } else if (this.scrubbing) {
      this.scrubbing = false;
      this.sponge.classList.remove("is-active");
    }
  }

  scrubAt(p) {
    // Move the sponge to the finger.
    this.sponge.style.left = p.x + "px";
    this.sponge.style.top = p.y + "px";

    const scale = this.size / 100;
    let remaining = 0;
    this.dirt.forEach((spot) => {
      if (spot.cleaned >= 1) return;
      const sx = this.dishX + spot.cx * scale;
      const sy = this.dishY + spot.cy * scale;
      const dist = Math.hypot(p.x - sx, p.y - sy);
      if (dist < 26) {
        spot.cleaned = Math.min(1, spot.cleaned + 0.16);
        spot.el.style.opacity = String(1 - spot.cleaned);
        if (spot.cleaned >= 1) spot.el.remove();
      }
      if (spot.cleaned < 1) remaining++;
    });

    if (remaining === 0 && !this.cleaned) {
      this.cleaned = true;
      this.onDishClean();
    }
  }

  onDishClean() {
    this.scrubbing = false;
    this.sponge.classList.remove("is-active");
    this.clearGuide();
    this.sparkle();
    this.setStep("toRack");
  }

  sparkle() {
    const s = document.createElement("div");
    s.className = "sparkle";
    s.textContent = "✦";
    s.style.left = this.dishX + this.size / 2 - 10 + "px";
    s.style.top = this.dishY + this.size / 2 - 12 + "px";
    gameStage.append(s);
    this.later(() => s.remove(), 600);
  }

  checkDrop() {
    const c = this.dishCenter();
    if (this.step === "toSink") {
      if (pointInRect(c, this.sink)) {
        this.snapToRect(this.sink);
        this.cleaned = false;
        this.setStep("scrub");
      } else {
        this.moveDishTo(this.pile.cx - this.size / 2, this.pile.cy - this.size / 2);
      }
    } else if (this.step === "toRack") {
      if (pointInRect(c, this.rack)) {
        this.stowInRack();
      } else {
        this.snapToRect(this.sink); // back to the sink
      }
    }
  }

  snapToRect(rect) {
    this.moveDishTo(
      rect.x + rect.w / 2 - this.size / 2,
      rect.y + rect.h / 2 - this.size / 2
    );
  }

  stowInRack() {
    // Shrink the dish into the rack, then bring on the next one.
    const dish = this.dish;
    dish.removeEventListener("pointerdown", this.onDown);
    dish.style.transition = "transform 0.3s ease, opacity 0.3s ease";
    dish.style.transformOrigin = "center";
    dish.style.transform = "scale(0.35)";
    dish.style.opacity = "0";
    this.later(() => {
      dish.remove();
      this.nextDish();
    }, 300);
  }

  finish() {
    this.highlight(null);
    gameInstruction.textContent = "Sparkling clean! Ready to do it for real?";
    gameProgress.textContent = "";
    // A short beat, then hand over to the timer phase.
    this.later(() => this.onComplete(), 700);
  }
}

/* ============================================================
   ChoreGame — a reusable "drag the right thing to the right
   place" game, driven by a config (see GAME_CONFIGS below).

   Each game is a list of rounds. A round has some drop `zones`
   and some draggable `items`, and each item names the zone it
   belongs in. Drop an item on the correct zone and it locks in;
   drop it on the wrong zone and it politely bounces back.
   ============================================================ */

const ITEM_SIZE = 56;
const ITEM_GAP = 12;

class ChoreGame {
  constructor(task, config, onComplete) {
    this.task = task;
    this.config = config;
    this.onComplete = onComplete;
    this.roundIndex = 0;
    this.dead = false;
    this.timers = [];
    this.active = null; // the item currently being dragged
  }

  start() {
    this.buildRound();
  }

  teardown() {
    this.dead = true;
    this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];
    gameStage.innerHTML = "";
  }

  later(fn, ms) {
    const id = setTimeout(() => {
      if (!this.dead) fn();
    }, ms);
    this.timers.push(id);
  }

  buildRound() {
    gameStage.innerHTML = "";
    this.active = null;
    const round = this.config.rounds[this.roundIndex];
    const W = gameStage.clientWidth;
    const H = gameStage.clientHeight;

    gameInstruction.textContent = round.instruction;
    gameProgress.textContent =
      this.config.rounds.length > 1
        ? `Step ${this.roundIndex + 1} of ${this.config.rounds.length}`
        : "";

    // --- Zones across the top ---
    this.zones = {};
    const zones = round.zones;
    const zoneH = 118;
    const zoneW = Math.min(124, (W - 16 - (zones.length - 1) * 12) / zones.length);
    const zonesWidth = zones.length * zoneW + (zones.length - 1) * 12;
    let zx = (W - zonesWidth) / 2;
    zones.forEach((z) => {
      const rect = { x: zx, y: 14, w: zoneW, h: zoneH };
      const el = document.createElement("div");
      el.className = "zone zone--drop";
      el.style.left = rect.x + "px";
      el.style.top = rect.y + "px";
      el.style.width = rect.w + "px";
      el.style.height = rect.h + "px";
      el.innerHTML = `<span class="zone__emoji">${z.emoji}</span><span class="zone__label">${z.label}</span>`;
      gameStage.append(el);
      this.zones[z.id] = { rect, el };
      zx += zoneW + 12;
    });

    // --- Items along the bottom (one or two balanced rows) ---
    this.remaining = round.items.length;
    const n = round.items.length;
    const maxFit = Math.max(1, Math.floor((W - 8) / (ITEM_SIZE + ITEM_GAP)));
    const perRow = n <= maxFit ? n : Math.min(maxFit, Math.ceil(n / 2));
    const baseY = H - 14 - ITEM_SIZE;

    round.items.forEach((def, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const inThisRow = Math.min(perRow, n - row * perRow);
      const rowWidth = inThisRow * (ITEM_SIZE + ITEM_GAP) - ITEM_GAP;
      const startX = (W - rowWidth) / 2;
      const x = startX + col * (ITEM_SIZE + ITEM_GAP);
      const y = baseY - row * (ITEM_SIZE + ITEM_GAP);

      const el = document.createElement("div");
      el.className = "game-item";
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.innerHTML = `<span class="game-item__emoji">${def.emoji}</span><span class="game-item__label">${def.label}</span>`;
      gameStage.append(el);

      const item = { el, target: def.target, homeX: x, homeY: y, x, y, placed: false };
      el.addEventListener("pointerdown", (e) => this.startDrag(e, item));
    });
  }

  posInStage(e) {
    const r = gameStage.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  moveItem(item, x, y) {
    const W = gameStage.clientWidth;
    const H = gameStage.clientHeight;
    item.x = Math.max(0, Math.min(x, W - ITEM_SIZE));
    item.y = Math.max(0, Math.min(y, H - ITEM_SIZE));
    item.el.style.left = item.x + "px";
    item.el.style.top = item.y + "px";
  }

  startDrag(e, item) {
    if (this.dead || this.active || item.placed) return;
    this.active = item;
    item.el.setPointerCapture(e.pointerId);
    item.el.classList.add("is-dragging");
    const p = this.posInStage(e);
    this.grabDX = p.x - item.x;
    this.grabDY = p.y - item.y;
    // Show where this item belongs.
    const zone = this.zones[item.target];
    if (zone) zone.el.classList.add("is-target");
  }

  handleMove(e) {
    if (this.dead || !this.active) return;
    const p = this.posInStage(e);
    this.moveItem(this.active, p.x - this.grabDX, p.y - this.grabDY);
  }

  handleUp(e) {
    if (this.dead || !this.active) return;
    const item = this.active;
    this.active = null;
    try {
      item.el.releasePointerCapture(e.pointerId);
    } catch (err) {
      /* ignore */
    }
    item.el.classList.remove("is-dragging");
    Object.values(this.zones).forEach((z) => z.el.classList.remove("is-target"));

    const center = { x: item.x + ITEM_SIZE / 2, y: item.y + ITEM_SIZE / 2 };
    const zoneId = this.zoneAt(center);

    if (zoneId === item.target) {
      this.acceptItem(item, this.zones[zoneId]);
    } else {
      // Wrong zone or empty space — bounce back, no penalty.
      if (zoneId) this.shake(item);
      this.returnHome(item);
    }
  }

  zoneAt(point) {
    for (const [id, z] of Object.entries(this.zones)) {
      if (pointInRect(point, z.rect)) return id;
    }
    return null;
  }

  returnHome(item) {
    item.el.style.transition = "left 0.2s ease, top 0.2s ease";
    this.moveItem(item, item.homeX, item.homeY);
    this.later(() => (item.el.style.transition = ""), 220);
  }

  shake(item) {
    item.el.classList.add("shake");
    this.later(() => item.el.classList.remove("shake"), 320);
  }

  acceptItem(item, zone) {
    item.placed = true;
    this.remaining--;
    const cx = zone.rect.x + zone.rect.w / 2 - ITEM_SIZE / 2;
    const cy = zone.rect.y + zone.rect.h / 2 - ITEM_SIZE / 2;
    item.el.classList.add("is-placing");
    this.moveItem(item, cx, cy);
    item.el.style.transform = "scale(0.4)";
    item.el.style.opacity = "0";
    this.sparkleAt(zone.rect.x + zone.rect.w / 2, zone.rect.y + 12);
    this.later(() => item.el.remove(), 250);

    if (this.remaining === 0) {
      this.later(() => this.nextRound(), 380);
    }
  }

  sparkleAt(x, y) {
    const s = document.createElement("div");
    s.className = "sparkle";
    s.textContent = "✦";
    s.style.left = x - 10 + "px";
    s.style.top = y + "px";
    gameStage.append(s);
    this.later(() => s.remove(), 600);
  }

  nextRound() {
    this.roundIndex++;
    if (this.roundIndex >= this.config.rounds.length) {
      this.finish();
    } else {
      this.buildRound();
    }
  }

  finish() {
    gameInstruction.textContent = this.config.finishText;
    gameProgress.textContent = "";
    this.later(() => this.onComplete(), 700);
  }
}

/* The games for the other four chores. Emoji keep them clear and
   quick to change — swap them for custom art later if you like. */
const GAME_CONFIGS = {
  bed: {
    rounds: [
      {
        instruction: "Drag the duvet up to the top of the bed.",
        zones: [{ id: "bed", emoji: "🛏️", label: "Bed" }],
        items: [{ emoji: "🟦", label: "Duvet", target: "bed" }],
      },
      {
        instruction: "Now put both pillows on the bed.",
        zones: [{ id: "bed", emoji: "🛏️", label: "Bed" }],
        items: [
          { emoji: "⬜", label: "Pillow", target: "bed" },
          { emoji: "⬜", label: "Pillow", target: "bed" },
        ],
      },
    ],
    finishText: "Bed made! Ready to do it for real?",
  },

  dog: {
    rounds: [
      {
        instruction: "Scoop the food into the food bowl.",
        zones: [{ id: "food", emoji: "🍽️", label: "Food bowl" }],
        items: [
          { emoji: "🦴", label: "Food", target: "food" },
          { emoji: "🦴", label: "Food", target: "food" },
        ],
      },
      {
        instruction: "Now fill the water bowl.",
        zones: [{ id: "water", emoji: "💧", label: "Water bowl" }],
        items: [{ emoji: "🫗", label: "Water", target: "water" }],
      },
    ],
    finishText: "Dinner served! Ready to do it for real?",
  },

  recycling: {
    rounds: [
      {
        instruction: "Sort each item. Recycling on the left, rubbish on the right.",
        zones: [
          { id: "recycle", emoji: "♻️", label: "Recycling" },
          { id: "rubbish", emoji: "🗑️", label: "Rubbish" },
        ],
        items: [
          { emoji: "🥤", label: "Bottle", target: "recycle" },
          { emoji: "🥫", label: "Can", target: "recycle" },
          { emoji: "📦", label: "Box", target: "recycle" },
          { emoji: "📰", label: "Paper", target: "recycle" },
          { emoji: "🍌", label: "Peel", target: "rubbish" },
          { emoji: "🍏", label: "Core", target: "rubbish" },
        ],
      },
      {
        instruction: "Tie the bag and take it out to the door.",
        zones: [{ id: "door", emoji: "🚪", label: "Door" }],
        items: [{ emoji: "🛍️", label: "Bag", target: "door" }],
      },
    ],
    finishText: "All sorted! Ready to do it for real?",
  },

  room: {
    rounds: [
      {
        instruction: "Put everything where it belongs.",
        zones: [
          { id: "wash", emoji: "🧺", label: "Wash basket" },
          { id: "toys", emoji: "🧸", label: "Toy box" },
          { id: "books", emoji: "📚", label: "Shelf" },
        ],
        items: [
          { emoji: "👕", label: "Shirt", target: "wash" },
          { emoji: "🧦", label: "Socks", target: "wash" },
          { emoji: "🚗", label: "Toy car", target: "toys" },
          { emoji: "⚽", label: "Ball", target: "toys" },
          { emoji: "📗", label: "Book", target: "books" },
          { emoji: "📘", label: "Book", target: "books" },
        ],
      },
    ],
    finishText: "All tidy! Ready to do it for real?",
  },
};

// Track pointer moves/releases at the document level too, so a fast
// drag that leaves the item still works.
document.addEventListener("pointermove", (e) => {
  if (activeGame && !activeGame.dead) activeGame.handleMove(e);
});
document.addEventListener("pointerup", (e) => {
  if (activeGame && !activeGame.dead) activeGame.handleUp(e);
});

function pointInRect(p, r) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

/* ---------- Actions -------------------------------------- */

function setState(id, state) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  task.state = state;
  saveState();
  update();
}

function verifyTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  task.state = "verified";
  saveState();
  update();
  showToast(`+${task.points} ${task.points === 1 ? "point" : "points"}`);
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

function addReward(name, cost, emoji) {
  rewards.push({
    id: "r" + Date.now(),
    name,
    cost,
    emoji: emoji || "🎁",
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

function setPage(page) {
  currentPage = page;
  saveState();
  showView();
}

function setSection(section) {
  currentSection = section;
  closeMenu();
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
// the tabs / menu / footer in step.
function showView() {
  const key = `${currentPage}-${currentSection}`;
  Object.entries(panels).forEach(([k, el]) => (el.hidden = k !== key));

  // The child switcher only makes sense on the child pages.
  childSwitcherEl.hidden = currentPage !== "child";

  tabs.forEach((tab) => {
    const active = tab.dataset.page === currentPage;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });
  menuItems.forEach((item) =>
    item.classList.toggle("is-active", item.dataset.section === currentSection)
  );

  updateFooterNote();
}

function updateFooterNote() {
  let note;
  if (currentSection === "shop") {
    note =
      currentPage === "child"
        ? "Spend your points on a reward you can afford."
        : "Add rewards and set what each costs. The child spends points on them.";
  } else {
    note =
      currentPage === "child"
        ? "Tap <strong>Do</strong> to learn a chore and do it. A parent verifies it afterwards."
        : "Tap <strong>✓</strong> to verify a finished chore (points are added then), or <strong>↩</strong> to send it back.";
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
stepNextBtn.addEventListener("click", nextStep);
stepBackBtn.addEventListener("click", prevStep);
doDoneBtn.addEventListener("click", finishDoing);
sheetCloseBtn.addEventListener("click", closeOverlay);

// Child / Parent tabs.
tabs.forEach((tab) => tab.addEventListener("click", () => setPage(tab.dataset.page)));

// Hamburger menu → sections (Chores / Shop).
menuToggle.addEventListener("click", toggleMenu);
menuItems.forEach((item) =>
  item.addEventListener("click", () => setSection(item.dataset.section))
);
// Tapping elsewhere closes the menu.
document.addEventListener("click", (e) => {
  if (!menuEl.hidden && !menuEl.contains(e.target) && e.target !== menuToggle) {
    closeMenu();
  }
});

// Parent adds a reward to the shop.
rewardForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = rewardNameEl.value.trim();
  const cost = parseInt(rewardCostEl.value, 10);
  const emoji = rewardEmojiEl.value.trim();
  if (!name || !cost || cost < 1) return;
  addReward(name, cost, emoji);
  rewardNameEl.value = "";
  rewardCostEl.value = "";
  rewardEmojiEl.value = "🎁";
  rewardNameEl.focus();
});

// Close the overlay with Escape, or by tapping the dark backdrop.
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !overlayEl.hidden) closeOverlay();
});
overlayEl.addEventListener("click", (e) => {
  if (e.target === overlayEl) closeOverlay();
});

/* ---------- Start ---------------------------------------- */

applyStoredTheme();
loadState();
renderChildSwitcher();
showView();
update();
