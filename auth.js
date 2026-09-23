/* ============================================================
   auth.js — the login gate.

   Shows a sign-in / sign-up screen and only reveals the app once
   a parent is signed in. Parents use email + password.
   (Child logins and syncing the data to the cloud come next.)
   ============================================================ */

const authScreen = document.getElementById("auth-screen");
const authForm = document.getElementById("auth-form");
const authTitle = document.getElementById("auth-title");
const authSub = document.getElementById("auth-sub");
const authNameField = document.getElementById("auth-name-field");
const authName = document.getElementById("auth-name");
const authEmail = document.getElementById("auth-email");
const authEmailLabel = document.getElementById("auth-email-label");
const authPassword = document.getElementById("auth-password");
const authError = document.getElementById("auth-error");
const authSubmit = document.getElementById("auth-submit");
const authToggle = document.getElementById("auth-toggle");
const signOutBtn = document.getElementById("sign-out");
const drawerEmail = document.getElementById("drawer-email");

let authMode = "signin"; // "signin" | "signup"

/* ---------- Switch between sign in and sign up ---------- */

function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === "signup";
  authNameField.hidden = !signup;
  authName.required = signup;
  // Only parents sign up (with an email). Signing in also accepts a
  // child's username.
  if (authEmailLabel) authEmailLabel.textContent = signup ? "Email" : "Email or username";
  authEmail.setAttribute("autocomplete", signup ? "email" : "username");
  authTitle.textContent = signup ? "Create your account" : "Welcome back";
  authSub.textContent = signup
    ? "Set up a parent account for your family."
    : "Sign in to your Stash account.";
  authSubmit.textContent = signup ? "Create account" : "Sign in";
  authToggle.textContent = signup
    ? "Already have an account? Sign in"
    : "New here? Create an account";
  authPassword.setAttribute(
    "autocomplete",
    signup ? "new-password" : "current-password"
  );
  hideError();
}

authToggle.addEventListener("click", () =>
  setAuthMode(authMode === "signin" ? "signup" : "signin")
);

/* ---------- Errors ---------- */

function showError(message) {
  authError.textContent = message;
  authError.hidden = false;
}
function hideError() {
  authError.hidden = true;
}

// Turn Firebase's error codes into plain language.
function friendlyError(err) {
  const code = (err && err.code) || "";
  switch (code) {
    case "auth/invalid-email":
      return "That doesn't look like a valid email address.";
    case "auth/missing-password":
    case "auth/weak-password":
      return "Please use a password of at least 6 characters.";
    case "auth/email-already-in-use":
      return "That email already has an account. Try signing in instead.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is incorrect.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Can't reach the server — check your internet connection.";
    default:
      return (err && err.message) || "Something went wrong. Please try again.";
  }
}

/* ---------- Submitting the form ---------- */

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();
  const email = authEmail.value.trim();
  const password = authPassword.value;
  const name = authName.value.trim();

  authSubmit.disabled = true;
  authSubmit.textContent = authMode === "signup" ? "Creating…" : "Signing in…";

  try {
    if (authMode === "signup") {
      const cred = await fbAuth.createUserWithEmailAndPassword(email, password);
      if (name) await cred.user.updateProfile({ displayName: name });
      // Best-effort parent record (needs the Firestore rules; the
      // account still works even if this write is blocked).
      try {
        await fbDb.collection("users").doc(cred.user.uid).set({
          name: name || "",
          email,
          role: "parent",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      } catch (writeErr) {
        console.warn("Could not save parent profile yet:", writeErr);
      }
    } else {
      // Parents type an email; children type just their username, which
      // maps to a synthetic email behind the scenes.
      const loginId = email.includes("@") ? email : childEmailFromUsername(email);
      await fbAuth.signInWithEmailAndPassword(loginId, password);
    }
    // onAuthStateChanged will reveal the app.
  } catch (err) {
    showError(friendlyError(err));
  } finally {
    authSubmit.disabled = false;
    authSubmit.textContent =
      authMode === "signup" ? "Create account" : "Sign in";
  }
});

/* ---------- Sign out ---------- */

if (signOutBtn) {
  signOutBtn.addEventListener("click", () => fbAuth.signOut());
}

/* ---------- React to who's signed in ----------
   onAuthChange (in script.js) drives the login → family → app gate. */

fbAuth.onAuthStateChanged((user) => {
  authPassword.value = ""; // start fresh next time
  if (!user) setAuthMode("signin"); // signing out returns to the sign-in view
  onAuthChange(user);
});

// Start on the sign-in view.
setAuthMode("signin");
