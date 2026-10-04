import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDXlfDKzeBAxKCWSg3G1914XXC1XN2AAg",
  authDomain: "whitequiz-24288.firebaseapp.com",
  databaseURL: "https://whitequiz-24288-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "whitequiz-24288",
  storageBucket: "whitequiz-24288.firebasestorage.app",
  messagingSenderId: "852892167245",
  appId: "1:852892167245:web:43afff0a3390c475bec004"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

// Prepare persistence immediately, but DO NOT await it inside the button click handler.
// Awaiting before signInWithPopup can make some browsers treat the popup as not user-initiated.
const persistenceReady = setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn("Quizxyz auth persistence setup warning:", error);
  return null;
});

function isMobileBrowser() {
  return window.matchMedia?.("(max-width: 760px)").matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export async function signInWithGoogle() {
  if (isMobileBrowser()) {
    await persistenceReady;
    sessionStorage.setItem("quizxyz_open_profile_after_redirect", "1");
    await signInWithRedirect(auth, provider);
    return null;
  }

  // Keep this call directly attached to the user's click for popup permissions.
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    const fallbackCodes = new Set([
      "auth/popup-blocked",
      "auth/cancelled-popup-request",
      "auth/operation-not-supported-in-this-environment"
    ]);
    if (fallbackCodes.has(error?.code)) {
      await persistenceReady;
      sessionStorage.setItem("quizxyz_open_profile_after_redirect", "1");
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw error;
  }
}

export async function logOut() {
  await signOut(auth);
}

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function finishRedirectLogin() {
  try {
    await persistenceReady;
    return await getRedirectResult(auth);
  } catch (error) {
    console.error("Quizxyz redirect result error:", error);
    throw error;
  }
}

export { auth };
