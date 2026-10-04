let cards = [];
let current = 0;
let mcCards = [];
let mcIndex = 0;
let mcScore = 0;
let mcAnswered = false;
let mcQuizOrder = [];
let mcWrong = 0;
let mcStudyMode = "manual";

const urlParams = new URLSearchParams(window.location.search);
let deckId = urlParams.get("deck") || localStorage.getItem("localDeckId");

function safeRead(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function persistCards() {
  localStorage.setItem(deckId, JSON.stringify(cards));
}

function getDecks() {
  return safeRead("decks", []);
}

function getCurrentDeck() {
  return getDecks().find(deck => deck.id === deckId);
}

function normalizeCard(card) {
  return {
    id: card.id ?? Date.now(),
    q: String(card.q ?? ""),
    a: String(card.a ?? ""),
    choices: Array.isArray(card.choices) ? card.choices : null,
    correct: typeof card.correct === "string" ? card.correct : null
  };
}

function isMCReady(card) {
  return Array.isArray(card.choices) && card.choices.length === 4 &&
    card.choices.every(choice => String(choice || "").trim()) &&
    ["A", "B", "C", "D"].includes(card.correct);
}

function loadCards() {
  if (!deckId) {
    alert("No study deck selected.");
    window.location.href = "index.html";
    return;
  }

  localStorage.setItem("localDeckId", deckId);
  cards = safeRead(deckId, []).map(normalizeCard);
  current = Math.min(current, Math.max(cards.length - 1, 0));

  const deck = getCurrentDeck();
  document.title = `Quizxyz | ${deck?.name || "Study Deck"}`;
  const subtitle = document.getElementById("deckSubtitle");
  if (subtitle) subtitle.textContent = deck ? `${deck.name} · ${cards.length} ${cards.length === 1 ? "card" : "cards"}` : "Local study deck";

  showCard();
}

function showCard() {
  const q = document.getElementById("question");
  const a = document.getElementById("answer");
  const counter = document.getElementById("cardCounter");

  if (!cards.length) {
    q.innerText = "No cards yet";
    a.innerText = "Add your first question below.";
    counter.textContent = "0 / 0";
    return;
  }

  q.innerText = cards[current].q;
  a.innerText = cards[current].a;
  counter.textContent = `${current + 1} / ${cards.length}`;
}

function addCard() {
  const qInput = document.getElementById("qInput");
  const aInput = document.getElementById("aInput");
  const q = qInput.value.trim();
  const a = aInput.value.trim();

  if (!q || !a) return alert("Fill in both Question and Answer.");

  cards.push({ id: Date.now() + Math.random(), q, a, choices: null, correct: null });
  current = cards.length - 1;
  persistCards();

  qInput.value = "";
  aInput.value = "";
  resetFlip();
  showCard();
}

function deleteCard() {
  if (!cards.length) return alert("There is no card to delete.");

  const settings = window.QuizxyzSettings?.read?.() || { confirmDelete: true };
  if (settings.confirmDelete && !confirm(`Delete card ${current + 1}?`)) return;

  cards.splice(current, 1);
  current = Math.min(current, Math.max(cards.length - 1, 0));
  persistCards();
  resetFlip();
  showCard();
}

function flipCard() {
  if (!cards.length) return;
  document.getElementById("card").classList.toggle("flipped");
}

function nextCard() {
  if (!cards.length) return;
  current = (current + 1) % cards.length;
  resetFlip();
  showCard();
}

function prevCard() {
  if (!cards.length) return;
  current = (current - 1 + cards.length) % cards.length;
  resetFlip();
  showCard();
}

function resetFlip() {
  document.getElementById("card")?.classList.remove("flipped");
}

function goBack() {
  window.location.href = "index.html";
}

function setModal(id, show) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.toggle("show", show);
  modal.setAttribute("aria-hidden", String(!show));
  document.body.classList.toggle("modal-open", document.querySelector(".modal.show") !== null);
}

function updateModeSummary() {
  mcCards = cards.filter(isMCReady);
  const qaCount = document.getElementById("qaCount");
  const mcCount = document.getElementById("mcCount");
  if (qaCount) qaCount.textContent = cards.length;
  if (mcCount) mcCount.textContent = mcCards.length;
  const name = document.getElementById("modesDeckName");
  if (name) name.textContent = getCurrentDeck()?.name || "Local deck";
}

function openStudyModes() {
  updateModeSummary();
  setModal("modesModal", true);
}

function closeStudyModes() {
  setModal("modesModal", false);
}

function openQAMode() {
  closeStudyModes();
  renderQAList();
  setModal("qaModal", true);
  document.getElementById("qaSearch")?.focus();
}

function closeQAMode() {
  setModal("qaModal", false);
}

function renderQAList(filter = "") {
  const list = document.getElementById("qaList");
  if (!list) return;
  const needle = filter.trim().toLowerCase();
  const filtered = cards.filter(card => !needle || card.q.toLowerCase().includes(needle) || card.a.toLowerCase().includes(needle));

  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state compact"><div class="empty-icon">⌕</div><h3>${cards.length ? "No matching questions" : "No cards yet"}</h3><p>${cards.length ? "Try another search." : "Create a Q&A card below first."}</p></div>`;
    return;
  }

  list.innerHTML = filtered.map((card, index) => `
    <button class="qa-item" type="button" onclick="toggleQAAnswer(this)">
      <span class="qa-number">${index + 1}</span>
      <span class="qa-copy">
        <span class="qa-question">${escapeHtml(card.q)}</span>
        <span class="qa-answer">${escapeHtml(card.a)}</span>
      </span>
      <span class="qa-chevron">⌄</span>
    </button>
  `).join("");
}

function toggleQAAnswer(button) {
  button.classList.toggle("open");
}

function expandAllQA() {
  document.querySelectorAll("#qaList .qa-item").forEach(item => item.classList.add("open"));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[ch]));
}

function openMCMode() {
  // Opening the chooser starts a fresh decision. Manual is the default until Auto Create is chosen.
  mcStudyMode = "manual";
  closeStudyModes();
  updateMCSetupSummary();
  setModal("mcChoiceModal", true);
}

function closeMCChoiceMode() {
  setModal("mcChoiceModal", false);
}

function updateMCSetupSummary() {
  const source = document.getElementById("mcSourceCount");
  const ready = document.getElementById("mcReadySetupCount");
  if (source) source.textContent = cards.filter(card => card.q.trim() && card.a.trim()).length;
  if (ready) ready.textContent = cards.filter(isMCReady).length;
}

function openCreateMCMode() {
  mcStudyMode = "manual";
  closeMCChoiceMode();
  openMCEditor();
}

function autoCreateMC() {
  mcStudyMode = "auto";
  const eligible = cards.filter(card => card.q.trim() && card.a.trim());
  if (eligible.length < 4) {
    mcStudyMode = "manual";
    alert("Auto-create needs at least 4 flashcards with different answers so each question can get 3 distractors.");
    return;
  }

  const uniqueAnswers = [...new Map(eligible.map(card => [card.a.trim().toLowerCase(), card])).values()];
  if (uniqueAnswers.length < 4) {
    mcStudyMode = "manual";
    alert("Auto-create needs at least 4 different answers across your flashcards.");
    return;
  }

  const rebuild = cards.some(isMCReady) ? confirm("Create new choices from your Q&A? Your old MC choices will be replaced.") : true;
  if (!rebuild) return;

  eligible.forEach(card => {
    const correctText = card.a.trim();
    const distractors = shuffleArray(eligible
      .filter(other => other.id !== card.id && other.a.trim().toLowerCase() !== correctText.toLowerCase())
      .map(other => other.a.trim())
      .filter((answer, index, all) => all.findIndex(item => item.toLowerCase() === answer.toLowerCase()) === index))
      .slice(0, 3);

    if (distractors.length < 3) return;
    const choices = shuffleArray([correctText, ...distractors]);
    const correct = ["A", "B", "C", "D"][choices.findIndex(choice => choice === correctText)];
    card.choices = choices;
    card.correct = correct;
  });

  persistCards();
  updateModeSummary();
  updateMCSetupSummary();
  closeMCChoiceMode();
  resetMCQuiz();
  renderMCMode();
  setModal("mcModal", true);
}

function shuffleArray(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function closeMCMode() {
  setModal("mcModal", false);
}

function resetMCQuiz() {
  mcCards = cards.filter(isMCReady);
  mcIndex = 0;
  mcScore = 0;
  mcWrong = 0;
  mcAnswered = false;
  mcQuizOrder = [...mcCards].sort(() => Math.random() - 0.5);
}

function shuffleMCQuiz() {
  if (!mcCards.length) return;
  mcQuizOrder = [...mcCards].sort(() => Math.random() - 0.5);
  mcIndex = 0;
  mcScore = 0;
  mcWrong = 0;
  mcAnswered = false;
  closeMCResult();
  renderMCQuestion();
}

function renderMCMode() {
  const empty = document.getElementById("mcEmpty");
  const quiz = document.getElementById("mcQuiz");
  const readyList = document.getElementById("mcReadyList");
  mcCards = cards.filter(isMCReady);

  if (!mcCards.length) {
    empty.hidden = false;
    quiz.hidden = true;
    readyList.innerHTML = renderNotReadyList();
    const manualEmptyBtn = document.getElementById("mcEmptyCreateBtn");
    if (manualEmptyBtn) manualEmptyBtn.hidden = mcStudyMode !== "manual";
    return;
  }

  empty.hidden = true;
  quiz.hidden = false;
  readyList.innerHTML = `<div class="ready-note">${mcCards.length} MC question${mcCards.length === 1 ? "" : "s"} ready · Your best score is saved locally.</div>`;
  const manualAction = document.getElementById("mcManualAction");
  if (manualAction) manualAction.hidden = mcStudyMode !== "manual";
  renderMCQuestion();
}

function renderNotReadyList() {
  if (!cards.length) return "";
  const missing = cards.filter(card => !isMCReady(card));
  if (!missing.length) return "";
  return `<div class="not-ready-box"><strong>${missing.length} card${missing.length === 1 ? "" : "s"} need MC choices.</strong><span>Use “Create MC card” or add/edit a multiple-choice card below.</span></div>`;
}

function renderMCQuestion() {
  if (!mcQuizOrder.length) return;
  const card = mcQuizOrder[mcIndex];
  const question = document.getElementById("mcQuestion");
  const grid = document.getElementById("choicesGrid");
  const progress = document.getElementById("mcProgress");
  const score = document.getElementById("mcScore");
  const best = document.getElementById("mcBest");
  const feedback = document.getElementById("mcFeedback");
  const next = document.getElementById("mcNextBtn");

  mcAnswered = false;
  question.textContent = card.q;
  progress.textContent = `${mcIndex + 1} / ${mcQuizOrder.length}`;
  score.textContent = `Score ${mcScore}`;
  if (best) best.textContent = `Best ${Number(localStorage.getItem(`${deckId}_mcBest`) || 0)}`;
  feedback.textContent = "";
  feedback.className = "mc-feedback";
  next.textContent = mcIndex === mcQuizOrder.length - 1 ? "Finish quiz →" : "Next question →";
  next.onclick = nextMCQuestion;

  const choices = card.choices.map((text, i) => ({ key: ["A", "B", "C", "D"][i], text }));
  grid.innerHTML = choices.map(choice => `
    <button class="choice-card" type="button" onclick="answerMC('${choice.key}')">
      <span class="choice-key">${choice.key}</span><span class="choice-text">${escapeHtml(choice.text)}</span>
    </button>
  `).join("");
}

function answerMC(key) {
  if (mcAnswered) return;
  const card = mcQuizOrder[mcIndex];
  const buttons = [...document.querySelectorAll("#choicesGrid .choice-card")];
  const clicked = buttons.find(btn => btn.querySelector(".choice-key")?.textContent === key);
  const correct = buttons.find(btn => btn.querySelector(".choice-key")?.textContent === card.correct);
  mcAnswered = true;

  buttons.forEach(btn => btn.disabled = true);
  if (key === card.correct) {
    mcScore += 1;
    clicked?.classList.add("correct");
    showMCFeedback("Correct! Nice work. ✓", "good");
  } else {
    mcWrong += 1;
    clicked?.classList.add("wrong");
    correct?.classList.add("correct");
    showMCFeedback(`Not quite. The correct answer is ${card.correct}.`, "bad");
  }

  const previousBest = Number(localStorage.getItem(`${deckId}_mcBest`) || 0);
  const newBest = Math.max(previousBest, mcScore);
  localStorage.setItem(`${deckId}_mcBest`, String(newBest));
  document.getElementById("mcScore").textContent = `Score ${mcScore}`;
  const best = document.getElementById("mcBest");
  if (best) best.textContent = `Best ${newBest}`;

  if (mcIndex === mcQuizOrder.length - 1) {
    setTimeout(showMCResult, 220);
  }
}

function showMCFeedback(message, type) {
  const el = document.getElementById("mcFeedback");
  el.textContent = message;
  el.className = `mc-feedback ${type}`;
}

function nextMCQuestion() {
  if (!mcAnswered) return showMCFeedback("Pick an answer first.", "warn");
  if (mcIndex >= mcQuizOrder.length - 1) {
    showMCResult();
    return;
  }
  mcIndex += 1;
  renderMCQuestion();
  document.getElementById("mcQuestion")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function showMCResult() {
  const total = mcQuizOrder.length;
  if (!total) return;
  const wrong = Math.max(0, total - mcScore);
  const percent = Math.round((mcScore / total) * 100);
  const modal = document.getElementById("mcResultModal");
  if (!modal) return;

  document.getElementById("mcFinalScore").textContent = `${mcScore} / ${total}`;
  document.getElementById("mcFinalPercent").textContent = `${percent}%`;
  document.getElementById("mcCorrectCount").textContent = String(mcScore);
  document.getElementById("mcWrongCount").textContent = String(wrong);
  document.getElementById("mcTotalCount").textContent = String(total);

  const title = document.getElementById("mcResultTitle");
  const summary = document.getElementById("mcResultSummary");
  const icon = document.getElementById("mcResultIcon");
  if (percent >= 90) {
    title.textContent = "Excellent work!";
    summary.textContent = "You really know this deck.";
    icon.textContent = "🏆";
  } else if (percent >= 70) {
    title.textContent = "Nice work!";
    summary.textContent = "A solid score — keep practicing.";
    icon.textContent = "✓";
  } else if (percent >= 50) {
    title.textContent = "Keep going!";
    summary.textContent = "Review the answers you missed and try again.";
    icon.textContent = "↻";
  } else {
    title.textContent = "More practice!";
    summary.textContent = "Go back to Q&A review, then try the quiz again.";
    icon.textContent = "✦";
  }

  setModal("mcResultModal", true);
}

function closeMCResult() {
  setModal("mcResultModal", false);
}

function backToStudyModesFromResult() {
  closeMCResult();
  closeMCMode();
  openStudyModes();
}

function restartFromResult() {
  closeMCResult();
  resetMCQuiz();
  renderMCMode();
}

function openMCEditor(cardId = null) {
  const fallbackId = mcQuizOrder[mcIndex]?.id ?? null;
  const targetId = cardId ?? fallbackId;
  const existing = targetId ? cards.find(card => String(card.id) === String(targetId)) : null;
  document.getElementById("mcQInput").value = existing?.q || "";
  const choices = existing?.choices || ["", "", "", ""];
  ["A", "B", "C", "D"].forEach((key, index) => {
    document.getElementById(`mc${key}Input`).value = choices[index] || "";
  });
  document.getElementById("mcCorrectInput").value = existing?.correct || "A";
  document.getElementById("mcForm").dataset.editId = existing?.id || "";
  setModal("mcEditorModal", true);
  document.getElementById("mcQInput")?.focus();
}

function closeMCEditor() {
  setModal("mcEditorModal", false);
}

function saveMCForm(event) {
  event.preventDefault();
  const q = document.getElementById("mcQInput").value.trim();
  const choices = ["A", "B", "C", "D"].map(key => document.getElementById(`mc${key}Input`).value.trim());
  const correct = document.getElementById("mcCorrectInput").value;
  const form = document.getElementById("mcForm");
  const editId = form.dataset.editId;

  if (!q || choices.some(choice => !choice)) return alert("Complete the question and all four choices.");
  if (new Set(choices.map(v => v.toLowerCase())).size !== 4) return alert("Use four different answer choices.");

  const existingIndex = cards.findIndex(card => String(card.id) === String(editId));
  const newCard = {
    id: editId || Date.now() + Math.random(),
    q,
    a: choices["ABCD".indexOf(correct)],
    choices,
    correct
  };

  if (existingIndex >= 0) cards[existingIndex] = { ...cards[existingIndex], ...newCard };
  else cards.push(newCard);

  persistCards();
  current = Math.max(0, cards.findIndex(card => String(card.id) === String(newCard.id)));
  resetFlip();
  showCard();
  closeMCEditor();
  updateModeSummary();
  if (document.getElementById("mcModal")?.classList.contains("show")) {
    resetMCQuiz();
    renderMCMode();
  }
}

function renderMCReadyList() {
  const host = document.getElementById("mcReadyList");
  if (!host) return;
  host.innerHTML = mcCards.map(card => `
    <button class="ready-card" type="button" onclick="openMCEditor('${String(card.id).replace(/'/g, "\\'")}')">
      <span>${escapeHtml(card.q)}</span><small>Edit</small>
    </button>
  `).join("");
}

// Wire UI events.
document.addEventListener("DOMContentLoaded", () => {
  const card = document.getElementById("card");
  let startX = 0;
  let moved = false;

  card.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
    moved = false;
  }, { passive: true });
  card.addEventListener("touchmove", e => {
    moved = Math.abs(e.touches[0].clientX - startX) > 8;
  }, { passive: true });
  card.addEventListener("touchend", e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 50) return;
    moved = true;
    diff > 0 ? nextCard() : prevCard();
  }, { passive: true });

  document.getElementById("qaSearch")?.addEventListener("input", e => renderQAList(e.target.value));
  document.getElementById("mcForm")?.addEventListener("submit", saveMCForm);

  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", e => {
      if (e.target === modal) {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
        document.body.classList.toggle("modal-open", document.querySelector(".modal.show") !== null);
      }
    });
  });

  loadCards();
});

// Global handlers for inline HTML buttons.
window.addCard = addCard;
window.deleteCard = deleteCard;
window.flipCard = flipCard;
window.goBack = goBack;
window.nextCard = nextCard;
window.prevCard = prevCard;
window.openStudyModes = openStudyModes;
window.closeStudyModes = closeStudyModes;
window.openQAMode = openQAMode;
window.closeQAMode = closeQAMode;
window.toggleQAAnswer = toggleQAAnswer;
window.expandAllQA = expandAllQA;
window.openMCMode = openMCMode;
window.closeMCChoiceMode = closeMCChoiceMode;
window.openCreateMCMode = openCreateMCMode;
window.autoCreateMC = autoCreateMC;
window.closeMCMode = closeMCMode;
window.shuffleMCQuiz = shuffleMCQuiz;
window.answerMC = answerMC;
window.nextMCQuestion = nextMCQuestion;
window.openMCEditor = openMCEditor;
window.closeMCEditor = closeMCEditor;
window.showMCResult = showMCResult;
window.closeMCResult = closeMCResult;
window.backToStudyModesFromResult = backToStudyModesFromResult;
window.restartFromResult = restartFromResult;
