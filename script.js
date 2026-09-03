/* ============================================================
   Stash — app logic

   Stash is a chore-and-reward app. A child earns points by
   doing tasks, a parent verifies the work, and only then are
   the points added to the child's stash.

   This is a single-screen demo that shows the whole loop on
   one device:
     • The child taps "Done" on a task  →  it becomes "pending".
     • The parent taps ✓ to verify      →  points are awarded
       and the tally counter draws the new strokes.
     • The parent can instead tap ↩ to send the task back.

   The tally counter is the heart of the brand: points are
   shown as bundles of five — four uprights and a strike —
   exactly like a hand-drawn tally mark.

   Everything is saved in the browser, so it stays put when you
   come back.
   ============================================================ */

const STORAGE_KEY = "stash-tasks-v1";
const THEME_KEY = "stash-theme";

/* The tasks we start with. In a real app these would come from
   what the parent has set up, filtered to the child's age. */
const DEFAULT_TASKS = [
  { id: 1, name: "Wash the dishes", points: 3, state: "todo" },
  { id: 2, name: "Make your bed", points: 1, state: "todo" },
  { id: 3, name: "Feed the dog", points: 2, state: "todo" },
  { id: 4, name: "Take out the recycling", points: 2, state: "todo" },
  { id: 5, name: "Tidy your room", points: 4, state: "todo" },
];

/* Grab the parts of the page we talk to. */
const balanceEl = document.getElementById("balance");
const tallyEl = document.getElementById("tally");
const heroHintEl = document.getElementById("hero-hint");
const listEl = document.getElementById("task-list");
const emptyEl = document.getElementById("tasks-empty");
const toastEl = document.getElementById("toast");
const resetBtn = document.getElementById("reset");
const themeToggle = document.getElementById("theme-toggle");

const SVG_NS = "http://www.w3.org/2000/svg";
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

let tasks = loadTasks();
let shownPoints = 0; // how many points the tally is currently showing

/* ---------- Saving & loading ------------------------------ */

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    /* fall through to defaults */
  }
  // Return a fresh copy so we never mutate DEFAULT_TASKS.
  return DEFAULT_TASKS.map((t) => ({ ...t }));
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    /* storage might be unavailable — the demo still works */
  }
}

/* ---------- Points --------------------------------------- */

// Verified points are the ones actually in the stash.
function verifiedPoints() {
  return tasks
    .filter((t) => t.state === "verified")
    .reduce((sum, t) => sum + t.points, 0);
}

// Pending points are earned but not yet verified (the "ghost" hint).
function pendingPoints() {
  return tasks
    .filter((t) => t.state === "pending")
    .reduce((sum, t) => sum + t.points, 0);
}

/* ---------- The tally counter ----------------------------
   Renders `points` as bundles of five. A full bundle is four
   uprights plus a strike; a partial bundle shows only its
   completed uprights. Above 25 points we collapse to a numeral
   beside a single bundle, or the row overflows.

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
    // A bundle "just completed" if it filled its 5th stroke this time.
    const justCompleted =
      strokesInBundle === 5 && b * 5 + 5 > fromPoints;
    tallyEl.append(makeBundle(strokesInBundle, b * 5, fromPoints, justCompleted));
  }

  // Show the next upright faintly when a task is waiting on a parent.
  if (pending > 0 && points <= 25) {
    const nextInBundle = points % 5; // 0..4 uprights already in the open bundle
    if (nextInBundle === 0) {
      // Start of a new bundle — add a fresh bundle holding one ghost.
      tallyEl.append(makeGhostBundle(0));
    } else if (nextInBundle < 4) {
      // Add the ghost to the last (open) bundle we just drew.
      const last = tallyEl.querySelector(".tally__bundle:last-of-type");
      if (last) last.append(makeUpright(nextInBundle, true));
    }
  }
}

// Build one bundle SVG. `base` is how many points came before it,
// so we can compare each stroke against `fromPoints` for animation.
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
    const isNew = base + 5 > fromPoints;
    svg.append(makeStrike(isNew));
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

// One upright stroke at position `i` (0..3). Coordinates match
// the supplied logo files: x = 12, 28, 44, 60.
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

// The diagonal strike that closes a bundle of five.
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

/* ---------- The task list -------------------------------- */

function renderTasks() {
  listEl.innerHTML = "";

  tasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = "task" + (task.state === "verified" ? " task--verified" : "");

    // Left side: name + point badge
    const main = document.createElement("div");
    main.className = "task__main";

    const name = document.createElement("p");
    name.className = "task__name";
    name.textContent = task.name;

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.innerHTML = `${task.points}<span class="badge__unit">pts</span>`;

    main.append(name, badge);

    // Right side: the action(s) for this task's state
    const actions = document.createElement("div");
    actions.className = "task__actions";
    actions.append(...actionsFor(task));

    li.append(main, actions);
    listEl.append(li);
  });

  // Show the empty line only when every task is verified.
  const allDone = tasks.length > 0 && tasks.every((t) => t.state === "verified");
  emptyEl.hidden = !allDone;
}

// Which buttons/pills a task shows depends on its state.
function actionsFor(task) {
  if (task.state === "todo" || task.state === "declined") {
    const parts = [];
    if (task.state === "declined") {
      parts.push(statusPill("Sent back", "declined"));
    }
    const done = button("Done", "btn btn--primary", () => setState(task.id, "pending"));
    parts.push(done);
    return parts;
  }

  if (task.state === "pending") {
    // Child sees "waiting on a parent"; parent sees verify / decline.
    const pill = statusPill("Waiting on a parent", "pending");
    const verify = iconButton("✓", "pbtn pbtn--verify", "Verify task", () =>
      verifyTask(task.id)
    );
    const decline = iconButton("↩", "pbtn pbtn--decline", "Send back", () =>
      setState(task.id, "declined")
    );
    return [pill, verify, decline];
  }

  // verified
  return [statusPill("Verified", "verified")];
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

/* ---------- Actions -------------------------------------- */

function setState(id, state) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  task.state = state;
  saveTasks();
  update();
}

function verifyTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  task.state = "verified";
  saveTasks();
  update();
  showToast(`+${task.points} ${task.points === 1 ? "point" : "points"}`);
}

function resetDemo() {
  tasks = DEFAULT_TASKS.map((t) => ({ ...t }));
  shownPoints = 0;
  saveTasks();
  update();
}

/* ---------- The hint under the balance ------------------- */

function updateHint() {
  const pending = tasks.filter((t) => t.state === "pending").length;
  const todo = tasks.filter(
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
  // let the browser register the change before animating in
  requestAnimationFrame(() => toastEl.classList.add("is-visible"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("is-visible");
    setTimeout(() => (toastEl.hidden = true), 250);
  }, 1800);
}

/* ---------- Re-draw everything --------------------------- */

function update() {
  const points = verifiedPoints();
  balanceEl.textContent = points;
  renderTally(points, shownPoints, pendingPoints());
  shownPoints = points; // remember for next time's animation
  renderTasks();
  updateHint();
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

/* ---------- Start ---------------------------------------- */

applyStoredTheme();
update();
