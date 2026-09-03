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

const STORAGE_KEY = "stash-tasks-v2";
const THEME_KEY = "stash-theme";

/* The tasks we start with. Each one carries:
     points   — how many points it's worth
     minutes  — a suggested time, used for the countdown timer
     steps    — how to do the chore, shown one at a time         */
const DEFAULT_TASKS = [
  {
    id: 1,
    name: "Wash the dishes",
    points: 3,
    minutes: 5,
    state: "todo",
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
    steps: [
      "Put dirty clothes in the wash basket.",
      "Pack your toys and books away.",
      "Clear everything off the floor.",
      "Straighten your desk.",
      "Open the curtains.",
    ],
  },
];

/* Page elements */
const balanceEl = document.getElementById("balance");
const tallyEl = document.getElementById("tally");
const heroHintEl = document.getElementById("hero-hint");
const listEl = document.getElementById("task-list");
const emptyEl = document.getElementById("tasks-empty");
const toastEl = document.getElementById("toast");
const resetBtn = document.getElementById("reset");
const themeToggle = document.getElementById("theme-toggle");

/* Overlay elements */
const overlayEl = document.getElementById("overlay");
const sheetCloseBtn = document.getElementById("sheet-close");
const phaseLearn = document.getElementById("phase-learn");
const phaseDo = document.getElementById("phase-do");
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

let tasks = loadTasks();
let shownPoints = 0; // how many points the tally is currently showing

/* Overlay working state */
let activeTaskId = null;
let stepIndex = 0;
let timerId = null;

/* ---------- Saving & loading ------------------------------ */

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      // Merge saved states onto the current task definitions, so
      // steps/points always come from the code, not old storage.
      const savedStates = JSON.parse(saved);
      return DEFAULT_TASKS.map((t) => {
        const match = savedStates.find((s) => s.id === t.id);
        return { ...t, state: match ? match.state : "todo" };
      });
    }
  } catch (e) {
    /* fall through to defaults */
  }
  return DEFAULT_TASKS.map((t) => ({ ...t }));
}

function saveTasks() {
  try {
    // We only need to remember each task's state.
    const states = tasks.map((t) => ({ id: t.id, state: t.state }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
  } catch (e) {
    /* storage might be unavailable — the demo still works */
  }
}

/* ---------- Points --------------------------------------- */

function verifiedPoints() {
  return tasks
    .filter((t) => t.state === "verified")
    .reduce((sum, t) => sum + t.points, 0);
}

function pendingPoints() {
  return tasks
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

/* ---------- The task list -------------------------------- */

function renderTasks() {
  listEl.innerHTML = "";

  tasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = "task" + (task.state === "verified" ? " task--verified" : "");

    const main = document.createElement("div");
    main.className = "task__main";

    const name = document.createElement("p");
    name.className = "task__name";
    name.textContent = task.name;

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.innerHTML = `${task.points}<span class="badge__unit">pts</span>`;

    main.append(name, badge);

    const actions = document.createElement("div");
    actions.className = "task__actions";
    actions.append(...actionsFor(task));

    li.append(main, actions);
    listEl.append(li);
  });

  const allDone = tasks.length > 0 && tasks.every((t) => t.state === "verified");
  emptyEl.hidden = !allDone;
}

// Which buttons/pills a task shows depends on its state.
function actionsFor(task) {
  if (task.state === "todo" || task.state === "declined") {
    const parts = [];
    if (task.state === "declined") parts.push(statusPill("Sent back", "declined"));
    // The child starts a chore with "Do", which opens the guide.
    parts.push(button("Do", "btn btn--primary", () => openOverlay(task.id)));
    return parts;
  }

  if (task.state === "pending") {
    return [
      statusPill("Waiting on a parent", "pending"),
      iconButton("✓", "pbtn pbtn--verify", "Verify task", () => verifyTask(task.id)),
      iconButton("↩", "pbtn pbtn--decline", "Send back", () =>
        setState(task.id, "declined")
      ),
    ];
  }

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

/* ---------- The "Do" overlay ----------------------------- */

function openOverlay(id) {
  activeTaskId = id;
  stepIndex = 0;
  showLearnPhase();
  overlayEl.hidden = false;
  document.body.style.overflow = "hidden"; // stop the page behind scrolling
  stepNextBtn.focus();
}

function closeOverlay() {
  stopTimer();
  overlayEl.hidden = true;
  document.body.style.overflow = "";
  activeTaskId = null;
}

function activeTask() {
  return tasks.find((t) => t.id === activeTaskId);
}

/* --- Phase 1: learn the steps --- */

function showLearnPhase() {
  phaseLearn.hidden = false;
  phaseDo.hidden = true;
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
  phaseLearn.hidden = true;
  phaseDo.hidden = false;
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
  shownPoints = points;
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

// Close the overlay with Escape, or by tapping the dark backdrop.
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !overlayEl.hidden) closeOverlay();
});
overlayEl.addEventListener("click", (e) => {
  if (e.target === overlayEl) closeOverlay();
});

/* ---------- Start ---------------------------------------- */

applyStoredTheme();
update();
