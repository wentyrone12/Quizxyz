/* Quizxyz Google Profile/Auth - browser-safe Firebase compat implementation */
(function () {
  const PROFILE_CACHE_KEY = "quizxyz_profile_cache";
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDXlfkDKzeBAkXCWSg3G1914XXC1XN2AAg",
    authDomain: "whitequiz-24288.firebaseapp.com",
    databaseURL: "https://whitequiz-24288-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "whitequiz-24288",
    storageBucket: "whitequiz-24288.firebasestorage.app",
    messagingSenderId: "852892167245",
    appId: "1:852892167245:web:43afff0a3390c475bec004"
  };

  const $ = (id) => document.getElementById(id);
  let auth = null;
  let provider = null;
  let persistenceReady = null;

  function setModal(show) {
    const modal = $("profileModal");
    if (!modal) return;
    modal.classList.toggle("show", show);
    modal.setAttribute("aria-hidden", String(!show));
    document.body.classList.toggle("modal-open", document.querySelector(".modal.show") !== null);
  }

  function initials(data) {
    const name = data?.displayName?.trim() || data?.name?.trim() || data?.email?.trim() || "G";
    return name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "G";
  }

  function cacheProfile(user) {
    if (!user) {
      localStorage.removeItem(PROFILE_CACHE_KEY);
      return;
    }
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
      uid: user.uid,
      name: user.displayName || "Google user",
      email: user.email || "",
      photoURL: user.photoURL || ""
    }));
  }

  function renderUser(user) {
    const loggedIn = !!user;
    const name = user?.displayName || "Not signed in";
    const email = user?.email || "Sign in with Google to show your profile here.";
    const letters = initials(user || { name });
    const photo = user?.photoURL || "";

    if ($("profileName")) $("profileName").textContent = name;
    if ($("profileEmail")) $("profileEmail").textContent = email;
    if ($("profileSettingTitle")) $("profileSettingTitle").textContent = loggedIn ? name : "Google Profile";
    if ($("profileSettingStatus")) $("profileSettingStatus").textContent = loggedIn
      ? "Signed in with Google · stays signed in until you sign out."
      : "Optional · Sign in with Google to personalize your profile.";
    if ($("profileAvatarMini")) $("profileAvatarMini").textContent = letters;

    const avatar = $("profileAvatar");
    if (avatar) {
      avatar.textContent = photo ? "" : letters;
      avatar.style.backgroundImage = photo ? `url("${photo.replace(/\"/g, "%22")}")` : "";
      avatar.classList.toggle("has-photo", !!photo);
    }

    if ($("googleSignInBtn")) {
      $("googleSignInBtn").hidden = loggedIn;
      if (!loggedIn) $("googleSignInBtn").disabled = !persistenceReady || !auth;
    }
    if ($("googleSignOutBtn")) $("googleSignOutBtn").hidden = !loggedIn;
    if ($("profileNote")) $("profileNote").textContent = loggedIn
      ? "Google Authentication is active. Your decks are still stored locally in this browser."
      : "Optional account · you can continue using Quizxyz without signing in.";
  }

  function readableError(error) {
    const code = error?.code || "";
    switch (code) {
      case "auth/unauthorized-domain":
        return `This site is not authorized in Firebase Authentication. Add ${location.hostname || "this domain"} in Firebase Console → Authentication → Settings → Authorized domains.`;
      case "auth/operation-not-allowed":
        return "Google sign-in is disabled in Firebase. Enable Google in Firebase Console → Authentication → Sign-in method.";
      case "auth/popup-blocked":
        return "Your browser blocked the Google sign-in window. Quizxyz will switch to redirect sign-in.";
      case "auth/popup-closed-by-user":
        return "The Google sign-in window was closed before finishing.";
      case "auth/cancelled-popup-request":
        return "Another Google sign-in request is already running. Please try once more.";
      case "auth/network-request-failed":
        return "Firebase could not reach the network. Check your internet connection and try again.";
      case "auth/invalid-api-key":
        return "The Firebase API key in Quizxyz is invalid or does not match this Firebase project.";
      case "auth/internal-error":
        return "Firebase returned an internal authentication error. Check the browser console for details.";
      case "auth/operation-not-supported-in-this-environment":
        return "Google sign-in needs a web address such as http://localhost or HTTPS. Open Quizxyz using VS Code Live Server instead of opening index.html directly as a file.";
      default:
        return error?.message || "Google sign-in could not start.";
    }
  }

  function setNote(message, isError = false) {
    const note = $("profileNote");
    if (!note) return;
    note.textContent = message;
    note.classList.toggle("auth-error", isError);
  }

  async function redirectLogin() {
    sessionStorage.setItem("quizxyz_open_profile_after_redirect", "1");
    await auth.signInWithRedirect(provider);
  }

  async function startGoogleLogin() {
    const btn = $("googleSignInBtn");
    if (!auth || !provider) {
      setNote("Firebase Authentication has not finished loading. Please refresh the page.", true);
      return;
    }
    if (location.protocol !== "http:" && location.protocol !== "https:") {
      const message = "Google sign-in needs http://localhost or HTTPS. Open this project with VS Code Live Server, not directly from file://.";
      setNote(message, true);
      alert(message);
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.setAttribute("aria-busy", "true");
      btn.innerHTML = '<span class="google-g">G</span> Opening Google…';
    }
    setNote("Connecting securely to Google…");

    try {
      // Persistence is already prepared before the button becomes enabled.
      await persistenceReady;
      try {
        const credential = await auth.signInWithPopup(provider);
        cacheProfile(credential.user);
        setModal(false);
      } catch (error) {
        if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"].includes(error?.code)) {
          await redirectLogin();
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error("Quizxyz Google sign-in error:", error);
      const message = readableError(error);
      setNote(message, true);
      // A redirect has already navigated away; only alert remaining failures.
      if (document.visibilityState !== "hidden") alert(message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.removeAttribute("aria-busy");
        btn.innerHTML = '<span class="google-g">G</span> Continue with Google';
      }
    }
  }

  async function logout() {
    const btn = $("googleSignOutBtn");
    if (btn) btn.disabled = true;
    try {
      await auth.signOut();
      cacheProfile(null);
      setNote("You are signed out. Your local decks are still safe on this browser.");
    } catch (error) {
      console.error("Quizxyz sign-out error:", error);
      const message = readableError(error);
      setNote(message, true);
      alert(message);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function wireUI() {
    $("profileButton")?.addEventListener("click", () => setModal(true));
    $("closeProfile")?.addEventListener("click", () => setModal(false));
    $("profileModal")?.addEventListener("click", (e) => {
      if (e.target.id === "profileModal") setModal(false);
    });
    $("googleSignInBtn")?.addEventListener("click", startGoogleLogin);
    $("googleSignOutBtn")?.addEventListener("click", logout);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && $("profileModal")?.classList.contains("show")) setModal(false);
    });
  }

  async function init() {
    if (!window.firebase) {
      setNote("Firebase SDK failed to load. Check your internet connection.", true);
      return;
    }

    try {
      if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      auth = firebase.auth();
      provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      auth.useDeviceLanguage();

      // Complete persistence setup before enabling the login button.
      persistenceReady = auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      await persistenceReady;

      const btn = $("googleSignInBtn");
      if (btn) {
        btn.disabled = false;
        btn.title = "Sign in with Google";
      }

      try {
        const result = await auth.getRedirectResult();
        if (result?.user) {
          cacheProfile(result.user);
          setModal(true);
        }
      } catch (error) {
        console.error("Quizxyz Google redirect result error:", error);
        setNote(readableError(error), true);
      }

      auth.onAuthStateChanged((user) => {
        cacheProfile(user);
        renderUser(user);
        if (user && sessionStorage.getItem("quizxyz_open_profile_after_redirect") === "1") {
          sessionStorage.removeItem("quizxyz_open_profile_after_redirect");
          setModal(true);
        }
      });
    } catch (error) {
      console.error("Quizxyz Firebase initialization error:", error);
      const btn = $("googleSignInBtn");
      if (btn) btn.disabled = true;
      setNote(readableError(error), true);
    }
  }

  // Keep a global handler too, so the button remains callable even when another script uses inline HTML handlers.
  window.startGoogleLogin = startGoogleLogin;
  window.QuizxyzAuth = {
    signInWithGoogle: startGoogleLogin,
    logOut: logout
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { wireUI(); init(); }, { once: true });
  } else {
    wireUI();
    init();
  }
})();
