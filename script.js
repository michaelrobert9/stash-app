/* ============================================================
   Stash — the app's logic

   This file does three things:
     1. Remembers your items using the browser's "localStorage"
        (so they're still there when you come back).
     2. Draws the list on the screen.
     3. Lets you add, tick off, and delete items.

   It's written to be easy to read — feel free to change things
   and see what happens!
   ============================================================ */

// The "key" we save the list under in the browser's storage.
const STORAGE_KEY = "stash-items";

// Grab the parts of the page we need to talk to.
const form = document.getElementById("add-form");
const input = document.getElementById("new-item");
const listEl = document.getElementById("list");
const emptyMessage = document.getElementById("empty-message");
const countEl = document.getElementById("count");
const clearDoneBtn = document.getElementById("clear-done");

// Our list of items lives here while the app is open.
// Each item looks like: { id: 123, text: "Milk", done: false }
let items = loadItems();

/* ---- Loading & saving ------------------------------------ */

function loadItems() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    // If anything goes wrong reading storage, just start empty.
    return [];
  }
}

function saveItems() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    // Storage might be full or blocked — not much we can do,
    // the list still works for this visit.
  }
}

/* ---- Drawing the list ------------------------------------ */

function render() {
  // Clear whatever is currently shown, then rebuild it.
  listEl.innerHTML = "";

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "list__item" + (item.done ? " list__item--done" : "");

    // The tick box
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "list__checkbox";
    checkbox.checked = item.done;
    checkbox.addEventListener("change", () => toggleItem(item.id));

    // The item's text
    const text = document.createElement("span");
    text.className = "list__text";
    text.textContent = item.text;

    // The delete (×) button
    const del = document.createElement("button");
    del.className = "list__delete";
    del.textContent = "×";
    del.title = "Delete";
    del.addEventListener("click", () => deleteItem(item.id));

    li.append(checkbox, text, del);
    listEl.append(li);
  });

  // Show the "nothing here yet" message only when empty.
  emptyMessage.style.display = items.length === 0 ? "block" : "none";

  // Update the little counter in the footer.
  const remaining = items.filter((item) => !item.done).length;
  countEl.textContent =
    items.length === 0
      ? ""
      : `${remaining} of ${items.length} left`;
}

/* ---- Actions --------------------------------------------- */

function addItem(text) {
  items.push({
    id: Date.now(), // a simple unique id
    text: text,
    done: false,
  });
  saveItems();
  render();
}

function toggleItem(id) {
  const item = items.find((i) => i.id === id);
  if (item) item.done = !item.done;
  saveItems();
  render();
}

function deleteItem(id) {
  items = items.filter((i) => i.id !== id);
  saveItems();
  render();
}

function clearDone() {
  items = items.filter((i) => !i.done);
  saveItems();
  render();
}

/* ---- Wiring up the buttons ------------------------------- */

form.addEventListener("submit", (event) => {
  event.preventDefault(); // stop the page from reloading
  const text = input.value.trim();
  if (text === "") return; // ignore empty input
  addItem(text);
  input.value = ""; // clear the box ready for the next item
  input.focus();
});

clearDoneBtn.addEventListener("click", clearDone);

// Draw the list once when the app first opens.
render();
