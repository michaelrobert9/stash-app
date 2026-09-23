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
  "parent-manage": document.getElementById("panel-parent-manage"),
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

/* Parent · Manage */
const familyNameForm = document.getElementById("family-name-form");
const familyNameInput = document.getElementById("family-name-input");
const manageCodeEl = document.getElementById("manage-code");
const manageChildrenEl = document.getElementById("manage-children");
const childForm = document.getElementById("child-form");
const childNameEl = document.getElementById("child-name");
const childAgeEl = document.getElementById("child-age");
const manageChoresEl = document.getElementById("manage-chores");
const choreForm = document.getElementById("chore-form");
const choreNameEl = document.getElementById("chore-name");
const choreChildEl = document.getElementById("chore-child");
const choreAwardsEl = document.getElementById("chore-awards");

/* Kid mode + passcode */
const handoverBtn = document.getElementById("handover-btn");
const exitKidBtn = document.getElementById("exit-kid");
const handoverOverlay = document.getElementById("handover-overlay");
const handoverListEl = document.getElementById("handover-list");
const pinOverlay = document.getElementById("pin-overlay");
const pinInput = document.getElementById("pin-input");
const pinError = document.getElementById("pin-error");
const passcodeForm = document.getElementById("passcode-form");
const passcodeInput = document.getElementById("passcode-input");
const passcodeStatus = document.getElementById("passcode-status");

let familyName = "Our family"; // kept in sync from the household doc

const SVG_NS = "http://www.w3.org/2000/svg";
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

/* ---------- App state ------------------------------------
   The family's data now lives in Firestore. These arrays are kept
   in sync by live listeners (see initApp): whenever the cloud data
   changes — on this device or another — the arrays update and the
   screen re-renders. */

let children = [];
let tasks = []; // chores
let rewards = [];
let redemptions = [];
let activeChildId = null; // which child the Child page is showing (a UI choice)
let shownPoints = 0; // how much stash cash the tally is currently showing

let householdId = null; // the current family's id (also the family code)
let unsubscribers = []; // live-listener teardown functions

let userRole = "parent"; // "parent" | "child"
let childScopeId = null; // when a child is signed in, the child doc they own

// "Kid mode": a signed-in parent hands the phone to a child. The app
// locks to that child's view until the family passcode is entered.
let locked = false;
let lockedChildId = null;
let familyPin = null; // the family's 4-digit parent passcode (from the household doc)

const UI_KEY = "stash-ui"; // small per-device UI preferences

/* ---------- Per-device UI preferences (not family data) ---------- */

function loadUiPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(UI_KEY)) || {};
    if (p.page === "child" || p.page === "parent") currentPage = p.page;
    if (p.section === "chores" || p.section === "shop") currentSection = p.section;
    if (p.activeChildId) activeChildId = p.activeChildId;
    // Kid mode survives a refresh, so a child can't escape it by reloading.
    if (p.locked) {
      locked = true;
      lockedChildId = p.lockedChildId || null;
      if (lockedChildId) activeChildId = lockedChildId;
    }
  } catch (e) {
    /* ignore */
  }
}
function saveUiPrefs() {
  try {
    localStorage.setItem(
      UI_KEY,
      JSON.stringify({
        page: currentPage,
        section: currentSection,
        activeChildId,
        locked,
        lockedChildId,
      })
    );
  } catch (e) {
    /* ignore */
  }
}

/* ---------- Firestore helpers ---------- */

// A subcollection under the current household.
function hcol(name) {
  return fbDb.collection("households").doc(householdId).collection(name);
}
const serverTime = () => firebase.firestore.FieldValue.serverTimestamp();

/* ---------- Child logins ----------
   Children don't have email addresses, so they sign in with a simple
   username. Behind the scenes each username maps to a synthetic email
   ("zac" -> "zac@stash.kids") that Firebase Authentication can use. */

const CHILD_EMAIL_DOMAIN = "stash.kids";

// A tidy username: lowercase, letters/numbers/dot/underscore/hyphen only.
function normalizeUsername(raw) {
  return (raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
}

// The synthetic email a username signs in with.
function childEmailFromUsername(raw) {
  return `${normalizeUsername(raw)}@${CHILD_EMAIL_DOMAIN}`;
}

// Is this signed-in account a child (created with a synthetic email)?
function isChildEmail(email) {
  return typeof email === "string" && email.endsWith("@" + CHILD_EMAIL_DOMAIN);
}

/* ---------- Login / family gate ---------------------------
   Three screens: login → family setup → the app. */

const authScreenEl = document.getElementById("auth-screen");
const familyScreenEl = document.getElementById("family-screen");
const appScreenEl = document.querySelector(".screen");

function setGate(state) {
  authScreenEl.style.display = state === "login" ? "flex" : "none";
  familyScreenEl.style.display = state === "family" ? "flex" : "none";
  appScreenEl.style.display = state === "app" ? "flex" : "none";
  // Never leave the drawer open across a screen change (e.g. sign out).
  if (state !== "app" && typeof closeMenu === "function") closeMenu();
}

// Called by auth.js whenever the signed-in user changes.
async function onAuthChange(user) {
  if (!user) {
    detachListeners();
    householdId = null;
    userRole = "parent";
    childScopeId = null;
    locked = false;
    lockedChildId = null;
    saveUiPrefs();
    applyRoleUI();
    setGate("login");
    return;
  }
  const emailEl = document.getElementById("drawer-email");

  // A child signs in with a username -> we look up which family and
  // which child they are, and lock the app to their own view.
  if (isChildEmail(user.email)) {
    let map = null;
    try {
      const doc = await fbDb.collection("childAuth").doc(user.uid).get();
      map = doc.exists ? doc.data() : null;
    } catch (e) {
      /* ignore — treated as an unlinked login below */
    }
    if (map && map.householdId && map.childId) {
      userRole = "child";
      householdId = map.householdId;
      childScopeId = map.childId;
      activeChildId = map.childId;
      if (emailEl) emailEl.textContent = "@" + user.email.split("@")[0];
      applyRoleUI();
      setGate("app");
      initApp();
    } else {
      // Their login exists but a parent has unlinked or not set it up.
      showToast("This login isn't set up yet. Ask a parent.");
      await fbAuth.signOut();
    }
    return;
  }

  // Otherwise this is a parent.
  userRole = "parent";
  childScopeId = null;
  if (emailEl) emailEl.textContent = user.email || "";
  applyRoleUI();

  // Find the family this parent belongs to.
  let hid = null;
  try {
    const doc = await fbDb.collection("users").doc(user.uid).get();
    hid = doc.exists ? doc.data().householdId || null : null;
  } catch (e) {
    /* ignore — treat as no family */
  }

  if (hid) {
    householdId = hid;
    setGate("app");
    initApp();
  } else {
    setGate("family");
  }
}

/* ---------- Family setup (create or join) ---------- */

// A short, readable family code (no easily-confused characters).
function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

async function createFamily() {
  const user = fbAuth.currentUser;
  if (!user) return;

  // Create the household under a fresh code (retry if the code is taken).
  let code = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const candidate = generateCode();
    try {
      await fbDb.collection("households").doc(candidate).set({
        name: "Our family",
        code: candidate,
        ownerUid: user.uid,
        createdAt: serverTime(),
      });
      code = candidate;
      break;
    } catch (e) {
      /* code likely taken — try another */
    }
  }
  if (!code) throw new Error("Could not create a family, please try again.");

  // Become a member, then seed the starter data.
  await fbDb
    .collection("households")
    .doc(code)
    .collection("members")
    .doc(user.uid)
    .set({
      role: "parent",
      name: user.displayName || "",
      email: user.email || "",
      joinedAt: serverTime(),
    });

  householdId = code;
  await seedFamily();
  await fbDb.collection("users").doc(user.uid).set({ householdId: code }, { merge: true });

  setGate("app");
  initApp();
  showToast(`Family created! Your code is ${code} — share it with your partner.`);
}

// Fill a brand-new family with the starter children, chores and rewards.
async function seedFamily() {
  const batch = fbDb.batch();
  DEFAULT_CHILDREN.forEach((c) => {
    batch.set(hcol("children").doc(c.id), { name: c.name, age: c.age, color: c.color });
  });
  CHORE_TEMPLATES.forEach((tpl) => {
    const childIds = CHORE_ASSIGNMENTS[tpl.id] || DEFAULT_CHILDREN.map((c) => c.id);
    childIds.forEach((cid) => {
      batch.set(hcol("chores").doc(`${cid}-${tpl.id}`), {
        childId: cid,
        name: tpl.name,
        awards: tpl.awards,
        points: Math.max(...tpl.awards),
        state: "todo",
      });
    });
  });
  DEFAULT_REWARDS.forEach((r) => {
    batch.set(hcol("rewards").doc(r.id), {
      name: r.name,
      emoji: r.emoji,
      cost: r.cost,
      childIds: r.childIds || [],
    });
  });
  await batch.commit();
}

async function joinFamily(rawCode) {
  const user = fbAuth.currentUser;
  if (!user) return;
  const code = (rawCode || "").trim().toUpperCase();
  if (!code) throw new Error("Enter the family code your partner shared.");

  // Creating our member doc only succeeds if the family (household) exists.
  await fbDb
    .collection("households")
    .doc(code)
    .collection("members")
    .doc(user.uid)
    .set({
      role: "parent",
      name: user.displayName || "",
      email: user.email || "",
      joinedAt: serverTime(),
    });

  householdId = code;
  await fbDb.collection("users").doc(user.uid).set({ householdId: code }, { merge: true });
  setGate("app");
  initApp();
}

/* ---------- Live data: keep the arrays in sync with Firestore ---------- */

function detachListeners() {
  unsubscribers.forEach((u) => u());
  unsubscribers = [];
}

function initApp() {
  detachListeners();
  if (userRole === "child") {
    initChildApp();
  } else {
    initParentApp();
  }
}

// A parent sees the whole family and keeps it in sync.
function initParentApp() {
  // Show the family code in the menu so it can be shared with a partner.
  const famEl = document.getElementById("drawer-family");
  if (famEl && householdId) {
    famEl.innerHTML = `Family code: <strong>${householdId}</strong>`;
    famEl.hidden = false;
  }

  // The household doc holds the family name.
  unsubscribers.push(
    fbDb
      .collection("households")
      .doc(householdId)
      .onSnapshot((doc) => {
        const data = doc.data() || {};
        familyName = data.name || "Our family";
        familyPin = data.pin || null;
        renderParentManage();
      })
  );

  unsubscribers.push(
    hcol("children").onSnapshot((snap) => {
      children = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      children.sort((a, b) => (b.age || 0) - (a.age || 0));
      if (!children.some((c) => c.id === activeChildId)) {
        activeChildId = children.length ? children[0].id : null;
      }
      renderChildSwitcher();
      update();
    })
  );
  unsubscribers.push(
    hcol("chores").onSnapshot((snap) => {
      tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      update();
    })
  );
  unsubscribers.push(
    hcol("rewards").onSnapshot((snap) => {
      rewards = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      update();
    })
  );
  unsubscribers.push(
    hcol("redemptions").onSnapshot((snap) => {
      redemptions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      update();
    })
  );
}

// A child only ever sees their own data — the listeners are scoped
// to their child record, their chores and their redemptions. (The
// security rules enforce this too, so a child can't read anyone else.)
function initChildApp() {
  const famEl = document.getElementById("drawer-family");
  if (famEl) famEl.hidden = true;

  unsubscribers.push(
    hcol("children")
      .doc(childScopeId)
      .onSnapshot((doc) => {
        children = doc.exists ? [{ id: doc.id, ...doc.data() }] : [];
        activeChildId = childScopeId;
        update();
      })
  );
  unsubscribers.push(
    hcol("chores")
      .where("childId", "==", childScopeId)
      .onSnapshot((snap) => {
        tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        update();
      })
  );
  unsubscribers.push(
    hcol("rewards").onSnapshot((snap) => {
      rewards = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      update();
    })
  );
  unsubscribers.push(
    hcol("redemptions")
      .where("childId", "==", childScopeId)
      .onSnapshot((snap) => {
        redemptions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        update();
      })
  );
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
  return getChild(activeChildId) || children[0] || null;
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
  if (!child) {
    heroLabelEl.textContent = "Your stash";
    balanceEl.textContent = "0";
    listEl.innerHTML = "";
    colorSwatchesEl.innerHTML = "";
    return;
  }
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
  if (!child) {
    shopNoteEl.textContent = "";
    shopGridEl.innerHTML = "";
    return;
  }
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

/* ---------- Actions (write to Firestore; live listeners re-render) --- */

const DELETE = () => firebase.firestore.FieldValue.delete();

function setState(id, state) {
  const patch = { state };
  if (state !== "verified") patch.award = DELETE(); // clear any chosen award
  hcol("chores").doc(id).update(patch).catch(warnWrite);
}

// The parent verifies a chore and chooses how much stash cash to award
// (a badly-done chore can earn less than the full value).
function verifyTask(id, points) {
  const task = tasks.find((t) => t.id === id);
  const award = typeof points === "number" ? points : task ? task.points : 0;
  hcol("chores").doc(id).update({ state: "verified", award }).catch(warnWrite);
  showToast(`+${award} stash cash`);
}

function setActiveChild(id) {
  if (locked) return; // in kid mode you can't switch to another child
  activeChildId = id;
  shownPoints = childPoints(id); // no draw-on animation just for switching
  saveUiPrefs();
  renderChildSwitcher();
  update();
}

function setChildColor(id, color) {
  hcol("children").doc(id).update({ color }).catch(warnWrite);
}

function redeem(childId, rewardId) {
  const reward = rewards.find((r) => r.id === rewardId);
  if (!reward) return;
  if (childPoints(childId) < reward.cost) return; // can't afford
  hcol("redemptions")
    .add({ childId, name: reward.name, cost: reward.cost, at: serverTime() })
    .catch(warnWrite);
  showToast(`Redeemed ${reward.name}!`);
}

function addReward(name, cost, emoji, forValue) {
  hcol("rewards")
    .add({
      name,
      cost,
      emoji: emoji || "🎁",
      childIds: forValue && forValue !== "all" ? [forValue] : [],
    })
    .catch(warnWrite);
}

function deleteReward(id) {
  hcol("rewards").doc(id).delete().catch(warnWrite);
}

function warnWrite(err) {
  console.warn("Save failed:", err);
  showToast("Couldn't save — check your connection.");
}

/* ---------- Manage: family, children, chores ------------- */

function renameFamily(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return;
  fbDb.collection("households").doc(householdId).update({ name: trimmed }).catch(warnWrite);
  showToast("Family name saved.");
}

// Pick a colour not already used by another child (falls back to the first).
function nextChildColor() {
  const used = children.map((c) => c.color);
  const free = CHILD_COLORS.find((c) => !used.includes(c.value));
  return (free || CHILD_COLORS[0]).value;
}

function addChild(name, age) {
  hcol("children")
    .add({ name: name.trim(), age: age || null, color: nextChildColor() })
    .catch(warnWrite);
  showToast(`${name.trim()} added.`);
}

async function removeChild(childId) {
  const child = getChild(childId);
  const ok = window.confirm(
    `Remove ${child ? child.name : "this child"}? Their chores will be removed too. This can't be undone.`
  );
  if (!ok) return;
  try {
    const snap = await hcol("chores").where("childId", "==", childId).get();
    const batch = fbDb.batch();
    snap.forEach((d) => batch.delete(d.ref));
    batch.delete(hcol("children").doc(childId));
    await batch.commit();
    showToast("Child removed.");
  } catch (e) {
    warnWrite(e);
  }
}

// Parse "5,10,15" (or "3") into a sorted list of positive whole numbers.
function parseAwards(text) {
  const nums = (text || "")
    .split(/[\s,]+/)
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  return Array.from(new Set(nums)).sort((a, b) => a - b);
}

function addChore(name, childId, awards) {
  if (!name.trim() || !childId || !awards.length) return;
  hcol("chores")
    .add({
      childId,
      name: name.trim(),
      awards,
      points: Math.max(...awards),
      state: "todo",
    })
    .catch(warnWrite);
  showToast("Chore added.");
}

function removeChore(choreId) {
  hcol("chores").doc(choreId).delete().catch(warnWrite);
}

/* ---------- Manage: child logins ------------------------- */

// Child accounts are created on a SECONDARY Firebase app so making one
// doesn't sign the parent out of their own account.
let childMakerApp = null;
function childMaker() {
  if (!childMakerApp) {
    childMakerApp = firebase.initializeApp(firebaseConfig, "child-maker");
  }
  return childMakerApp;
}

async function createChildLogin(childId, rawUsername, password) {
  const username = normalizeUsername(rawUsername);
  if (!username) {
    showToast("Pick a username for your child.");
    return;
  }
  if (!password || password.length < 6) {
    showToast("Password needs at least 6 characters.");
    return;
  }
  const email = childEmailFromUsername(username);
  const app = childMaker();
  try {
    const cred = await app.auth().createUserWithEmailAndPassword(email, password);
    const uid = cred.user.uid;
    // The child reads this to find their own family + record when they log in.
    await fbDb.collection("childAuth").doc(uid).set({ householdId, childId });
    // Remember the login on the child so we can show and manage it.
    await hcol("children").doc(childId).update({ username, uid });
    await app.auth().signOut();
    showToast(`Login created for @${username}.`);
  } catch (e) {
    if (e && e.code === "auth/email-already-in-use") {
      showToast("That username is taken — try another.");
    } else {
      warnWrite(e);
    }
  }
}

async function changeChildPassword(childId, currentPw, newPw) {
  const child = getChild(childId);
  if (!child || !child.username) return;
  if (!newPw || newPw.length < 6) {
    showToast("New password needs at least 6 characters.");
    return;
  }
  const email = childEmailFromUsername(child.username);
  const app = childMaker();
  try {
    const cred = await app.auth().signInWithEmailAndPassword(email, currentPw);
    await cred.user.updatePassword(newPw);
    await app.auth().signOut();
    showToast("Password updated.");
  } catch (e) {
    if (e && (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential")) {
      showToast("Current password is incorrect.");
    } else {
      warnWrite(e);
    }
  }
}

async function removeChildLogin(childId) {
  const child = getChild(childId);
  if (!child || !child.username) return;
  const ok = window.confirm(
    `Remove @${child.username}'s login? They won't be able to sign in anymore.`
  );
  if (!ok) return;
  try {
    if (child.uid) await fbDb.collection("childAuth").doc(child.uid).delete();
    await hcol("children").doc(childId).update({ username: DELETE(), uid: DELETE() });
    showToast("Login removed.");
  } catch (e) {
    warnWrite(e);
  }
}

// The login status + controls shown under each child in Manage.
function childLoginRow(child) {
  const wrap = document.createElement("div");
  wrap.className = "manage-login";

  if (child.username) {
    const label = document.createElement("span");
    label.className = "manage-login__user";
    label.textContent = "@" + child.username;

    const form = document.createElement("form");
    form.className = "manage-login__form";
    form.hidden = true;
    const curEl = passwordInput("Current password");
    const newEl = passwordInput("New password");
    const save = button("Save", "btn btn--secondary", null);
    save.type = "submit";
    form.append(curEl, newEl, save);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      changeChildPassword(child.id, curEl.value, newEl.value);
      form.reset();
      form.hidden = true;
    });

    const change = button("Change password", "text-button manage-login__link", () => {
      form.hidden = !form.hidden;
      if (!form.hidden) curEl.focus();
    });
    const remove = button(
      "Remove login",
      "text-button manage-login__link manage-login__danger",
      () => removeChildLogin(child.id)
    );

    const actions = document.createElement("div");
    actions.className = "manage-login__actions";
    actions.append(label, change, remove);
    wrap.append(actions, form);
  } else {
    const form = document.createElement("form");
    form.className = "manage-login__form";
    form.hidden = true;
    const userEl = document.createElement("input");
    userEl.type = "text";
    userEl.placeholder = "Username";
    userEl.setAttribute("aria-label", "Username");
    userEl.autocomplete = "off";
    userEl.value = normalizeUsername(child.name);
    const pwEl = passwordInput("Password");
    const go = button("Create", "btn btn--secondary", null);
    go.type = "submit";
    form.append(userEl, pwEl, go);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      createChildLogin(child.id, userEl.value, pwEl.value);
    });

    const create = button("Create login", "text-button manage-login__link", () => {
      form.hidden = !form.hidden;
      if (!form.hidden) pwEl.focus();
    });
    const actions = document.createElement("div");
    actions.className = "manage-login__actions";
    actions.append(create);
    wrap.append(actions, form);
  }
  return wrap;
}

function passwordInput(placeholder) {
  const el = document.createElement("input");
  el.type = "password";
  el.placeholder = placeholder;
  el.setAttribute("aria-label", placeholder);
  el.autocomplete = "off";
  el.minLength = 6;
  return el;
}

/* ---------- Parent · Manage (render) ---------- */

function renderParentManage() {
  if (userRole === "child") return; // parents only
  // Family
  if (familyNameInput && document.activeElement !== familyNameInput) {
    familyNameInput.value = familyName;
  }
  if (manageCodeEl) manageCodeEl.textContent = householdId || "";
  if (passcodeStatus) {
    passcodeStatus.textContent = familyPin ? "A passcode is set. " : "No passcode set yet. ";
  }

  // Children list
  if (manageChildrenEl) {
    manageChildrenEl.innerHTML = "";
    children.forEach((child) => {
      const li = document.createElement("li");
      li.className = "manage-item manage-child";
      li.style.setProperty("--accent", child.color);
      const age = child.age ? ` · ${child.age}` : "";

      const top = document.createElement("div");
      top.className = "manage-child__top";
      top.innerHTML = `<span class="manage-item__dot" style="background:${child.color}"></span>
        <span class="manage-item__name">${child.name}<span class="manage-item__meta">${age}</span></span>`;
      top.append(
        iconButton("×", "pbtn pbtn--decline manage-item__del", "Remove child", () =>
          removeChild(child.id)
        )
      );

      li.append(top, childLoginRow(child));
      manageChildrenEl.append(li);
    });
  }

  // The "which child" picker on the add-chore form
  if (choreChildEl) {
    const current = choreChildEl.value;
    choreChildEl.innerHTML = "";
    children.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      choreChildEl.append(opt);
    });
    if (children.some((c) => c.id === current)) choreChildEl.value = current;
  }

  // Chores list, grouped by child
  if (manageChoresEl) {
    manageChoresEl.innerHTML = "";
    children.forEach((child) => {
      const mine = tasksFor(child.id);
      if (!mine.length) return;
      mine.forEach((task) => {
        const li = document.createElement("li");
        li.className = "manage-item";
        li.style.setProperty("--accent", child.color);
        li.innerHTML = `
          <span class="child-chip" style="background:${child.color}">${child.name}</span>
          <span class="manage-item__name">${task.name}</span>
          <span class="badge">${pointsLabel(task)}<span class="badge__unit">SC</span></span>`;
        li.append(
          iconButton("×", "pbtn pbtn--decline manage-item__del", "Remove chore", () =>
            removeChore(task.id)
          )
        );
        manageChoresEl.append(li);
      });
    });
  }
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
  // Any kid view is locked to the child's own pages.
  if (isKidView()) page = "child";
  currentPage = page;
  currentSection = section;
  saveUiPrefs();
  showView();
}

// A parent who has handed the phone to a child (kid mode).
function isLockedParent() {
  return userRole === "parent" && locked;
}
// The app is showing a child-only view — either a signed-in child, or a
// parent in kid mode.
function isKidView() {
  return userRole === "child" || isLockedParent();
}

// Show or hide the parent-only bits depending on who's using the app.
function applyRoleUI() {
  const kid = isKidView();
  const parentsGroup = document.getElementById("drawer-parents-group");
  if (parentsGroup) parentsGroup.hidden = kid;
  if (handoverBtn) handoverBtn.hidden = kid; // only a full parent can hand over
  // In kid mode, Sign out would end the parent's session, so we hide it and
  // offer "switch back to parent" (guarded by the passcode) instead.
  const signOut = document.getElementById("sign-out");
  if (signOut) signOut.hidden = isLockedParent();
  if (exitKidBtn) exitKidBtn.hidden = !isLockedParent();
  if (kid) {
    currentPage = "child";
    if (currentSection !== "chores" && currentSection !== "shop") {
      currentSection = "chores";
    }
    if (lockedChildId) activeChildId = lockedChildId;
  }
  showView();
}

/* ---------- Kid mode: hand the phone to a child ---------- */

function openModal(el) {
  if (el) el.hidden = false;
}
function closeModal(el) {
  if (el) el.hidden = true;
}

// Parent taps "Hand phone to a child" — pick which one.
function openHandover() {
  if (!familyPin) {
    showToast("Set a parent passcode first (Parents → Manage).");
    navigate("parent", "manage");
    return;
  }
  handoverListEl.innerHTML = "";
  children.forEach((child) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "handover-child";
    b.innerHTML = `<span class="handover-child__dot" style="background:${child.color}"></span>${child.name}`;
    b.addEventListener("click", () => {
      closeModal(handoverOverlay);
      enterKidMode(child.id);
    });
    handoverListEl.append(b);
  });
  openModal(handoverOverlay);
}

function enterKidMode(childId) {
  if (!familyPin) {
    showToast("Set a parent passcode first (Parents → Manage).");
    return;
  }
  locked = true;
  lockedChildId = childId;
  activeChildId = childId;
  currentPage = "child";
  currentSection = "chores";
  saveUiPrefs();
  closeMenu();
  applyRoleUI();
  update();
}

function exitKidMode() {
  locked = false;
  lockedChildId = null;
  saveUiPrefs();
  applyRoleUI();
  update();
}

// The passcode prompt shown when switching back to the parent side.
function askPin() {
  pinInput.value = "";
  pinError.hidden = true;
  openModal(pinOverlay);
  setTimeout(() => pinInput.focus(), 50);
}
function submitPin() {
  if (pinInput.value === familyPin) {
    closeModal(pinOverlay);
    exitKidMode();
  } else {
    pinError.hidden = false;
    pinInput.value = "";
    pinInput.focus();
  }
}

function setFamilyPin(raw) {
  const pin = (raw || "").replace(/\D/g, "").slice(0, 4);
  if (pin.length !== 4) {
    showToast("Passcode must be 4 digits.");
    return;
  }
  fbDb.collection("households").doc(householdId).update({ pin }).catch(warnWrite);
  showToast("Passcode saved.");
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
  // In any kid view (a signed-in child, or a parent in kid mode) only the
  // child pages are reachable.
  if (isKidView()) currentPage = "child";
  const key = `${currentPage}-${currentSection}`;
  Object.entries(panels).forEach(([k, el]) => (el.hidden = k !== key));

  // The child switcher lets a parent flip between children; in kid mode
  // there's only the one child's view, so it's hidden.
  childSwitcherEl.hidden = currentPage !== "child" || isKidView();

  drawerItems.forEach((item) => {
    const active =
      item.dataset.page === currentPage && item.dataset.section === currentSection;
    item.classList.toggle("is-active", active);
  });

  updateFooterNote();
}

function updateFooterNote() {
  let note;
  if (currentSection === "manage") {
    note =
      "Add or remove children and chores, and rename your family. Share the family code so another parent can join.";
  } else if (currentSection === "shop") {
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
  renderParentManage();
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

/* ---------- Parent · Manage wiring ---------- */

// Rename the family.
if (familyNameForm) {
  familyNameForm.addEventListener("submit", (e) => {
    e.preventDefault();
    renameFamily(familyNameInput.value);
    familyNameInput.blur();
  });
}

// Add a child.
if (childForm) {
  childForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = childNameEl.value.trim();
    if (!name) return;
    const age = parseInt(childAgeEl.value, 10);
    addChild(name, Number.isFinite(age) ? age : null);
    childNameEl.value = "";
    childAgeEl.value = "";
    childNameEl.focus();
  });
}

// Add a chore for a child.
if (choreForm) {
  choreForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = choreNameEl.value.trim();
    const childId = choreChildEl.value;
    const awards = parseAwards(choreAwardsEl.value);
    if (!name || !childId || !awards.length) return;
    addChore(name, childId, awards);
    choreNameEl.value = "";
    choreAwardsEl.value = "";
    choreNameEl.focus();
  });
}

/* ---------- Kid mode wiring ---------- */

if (handoverBtn) {
  handoverBtn.addEventListener("click", () => {
    closeMenu();
    openHandover();
  });
}
if (exitKidBtn) {
  exitKidBtn.addEventListener("click", () => {
    closeMenu();
    askPin();
  });
}
if (handoverOverlay) {
  handoverOverlay
    .querySelectorAll('[data-close="handover"]')
    .forEach((el) => el.addEventListener("click", () => closeModal(handoverOverlay)));
}
if (pinOverlay) {
  const pinOk = document.getElementById("pin-ok");
  const pinCancel = document.getElementById("pin-cancel");
  if (pinOk) pinOk.addEventListener("click", submitPin);
  if (pinCancel) pinCancel.addEventListener("click", () => closeModal(pinOverlay));
  pinInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitPin();
  });
}
if (passcodeForm) {
  passcodeForm.addEventListener("submit", (e) => {
    e.preventDefault();
    setFamilyPin(passcodeInput.value);
    passcodeInput.value = "";
  });
}

// Close the drawer with Escape.
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !menuEl.hidden) closeMenu();
});

/* ---------- Family setup screen wiring ---------- */

const familyCreateBtn = document.getElementById("family-create");
const familyJoinBtn = document.getElementById("family-join-btn");
const familyCodeInput = document.getElementById("family-code");
const familyError = document.getElementById("family-error");

function showFamilyError(msg) {
  if (!familyError) return;
  familyError.textContent = msg;
  familyError.hidden = false;
}

if (familyCreateBtn) {
  familyCreateBtn.addEventListener("click", async () => {
    familyError.hidden = true;
    familyCreateBtn.disabled = true;
    familyCreateBtn.textContent = "Setting up…";
    try {
      await createFamily();
    } catch (e) {
      showFamilyError("Couldn't set up your family. Please try again.");
      familyCreateBtn.disabled = false;
      familyCreateBtn.textContent = "Create a new family";
    }
  });
}
if (familyJoinBtn) {
  familyJoinBtn.addEventListener("click", async () => {
    familyError.hidden = true;
    try {
      await joinFamily(familyCodeInput.value);
    } catch (e) {
      showFamilyError("That family code didn't work. Check it and try again.");
    }
  });
}

/* ---------- Start ---------------------------------------- */

applyStoredTheme();
loadUiPrefs();
showView();
setGate("login"); // auth.js will move us to the family setup or the app
// The signed-in state (and everything after) is driven by onAuthChange,
// which auth.js calls from Firebase's auth listener.
