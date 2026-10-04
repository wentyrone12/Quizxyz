(function () {
  const KEY = "quizxyz_settings";
  const defaults = {
    theme: "dark",
    reduceMotion: false,
    compactMode: false,
    confirmDelete: true
  };

  function read() {
    try {
      return { ...defaults, ...(JSON.parse(localStorage.getItem(KEY)) || {}) };
    } catch {
      return { ...defaults };
    }
  }

  function write(settings) {
    localStorage.setItem(KEY, JSON.stringify(settings));
    apply(settings);
    document.dispatchEvent(new CustomEvent("quizxyz:settings", { detail: settings }));
  }

  function apply(settings = read()) {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.motion = settings.reduceMotion ? "reduced" : "full";
    document.documentElement.dataset.compact = settings.compactMode ? "true" : "false";
  }

  function set(key, value) {
    const settings = read();
    settings[key] = value;
    write(settings);
  }

  function reset() {
    localStorage.setItem(KEY, JSON.stringify(defaults));
    apply(defaults);
    document.dispatchEvent(new CustomEvent("quizxyz:settings", { detail: defaults }));
    location.reload();
  }

  window.QuizxyzSettings = { read, write, set, reset, apply };
  apply();

  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("settingsButton");
    const modal = document.getElementById("settingsModal");
    const close = document.getElementById("closeSettings");
    const theme = document.getElementById("themeSelect");
    const motion = document.getElementById("reduceMotionToggle");
    const compact = document.getElementById("compactToggle");
    const confirmDelete = document.getElementById("confirmDeleteToggle");
    const resetBtn = document.getElementById("resetSettingsBtn");

    if (!btn || !modal) return;

    function syncUI() {
      const s = read();
      if (theme) theme.value = s.theme;
      if (motion) motion.checked = s.reduceMotion;
      if (compact) compact.checked = s.compactMode;
      if (confirmDelete) confirmDelete.checked = s.confirmDelete;
    }

    function open() {
      syncUI();
      modal.classList.add("show");
      document.body.classList.add("modal-open");
    }

    function hide() {
      modal.classList.remove("show");
      document.body.classList.remove("modal-open");
    }

    btn.addEventListener("click", open);
    close?.addEventListener("click", hide);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) hide();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("show")) hide();
    });

    theme?.addEventListener("change", () => set("theme", theme.value));
    motion?.addEventListener("change", () => set("reduceMotion", motion.checked));
    compact?.addEventListener("change", () => set("compactMode", compact.checked));
    confirmDelete?.addEventListener("change", () => set("confirmDelete", confirmDelete.checked));
    resetBtn?.addEventListener("click", () => {
      if (confirm("Reset Quizxyz settings to default?")) reset();
    });

    syncUI();
  });
})();
