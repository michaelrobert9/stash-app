/* ============================================================
   Firebase setup for Stash.

   This config is meant to live in the app's code — it is NOT a
   secret. Access to your family's data is controlled by Firebase
   Authentication and the Firestore security rules, not by hiding
   these values.
   ============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyAnnMLIDNGji1cD_23JjdAGZOlIfW4-vR0",
  authDomain: "stash-app-afe5b.firebaseapp.com",
  projectId: "stash-app-afe5b",
  storageBucket: "stash-app-afe5b.firebasestorage.app",
  messagingSenderId: "973061271775",
  appId: "1:973061271775:web:e86605ea1c55b5d9e3796a",
};

// Start Firebase (the compat SDK exposes a global `firebase`).
firebase.initializeApp(firebaseConfig);
const fbAuth = firebase.auth();
const fbDb = firebase.firestore();
