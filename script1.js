const deckList = document.getElementById("deckList");

function getDecks() {
  try {
    return JSON.parse(localStorage.getItem("decks")) || [];
  } catch {
    return [];
  }
}

function saveDecks(decks) {
  localStorage.setItem("decks", JSON.stringify(decks));
}

function loadDecks() {
  const decks = getDecks();
  deckList.innerHTML = "";

  if (!decks.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No decks yet — create one";
    deckList.appendChild(option);
    deckList.disabled = true;
    updateLibraryMeta(0);
    return;
  }

  deckList.disabled = false;
  decks.forEach((deck, index) => {
    const cards = getDeckCards(deck.id);
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `${deck.name} · ${cards.length} ${cards.length === 1 ? "card" : "cards"}`;
    deckList.appendChild(option);
  });

  updateLibraryMeta(decks.length);
}

function getDeckCards(deckId) {
  try {
    return JSON.parse(localStorage.getItem(deckId)) || [];
  } catch {
    return [];
  }
}

function updateLibraryMeta(deckCount) {
  const count = document.getElementById("deckCount");
  if (count) count.textContent = `${deckCount} ${deckCount === 1 ? "deck" : "decks"}`;
}

function createDeck() {
  const input = document.getElementById("deckName");
  const name = input.value.trim();
  if (!name) return alert("Enter a deck name first.");

  const decks = getDecks();
  const exists = decks.some(d => d.name.toLowerCase() === name.toLowerCase());
  if (exists) return alert("A deck with that name already exists.");

  const newDeck = {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now()
  };

  decks.push(newDeck);
  saveDecks(decks);
  localStorage.setItem(newDeck.id, "[]");

  input.value = "";
  loadDecks();
  deckList.value = String(decks.length - 1);
}

function deleteDeck() {
  const index = deckList.value;
  if (index === "" || deckList.disabled) return alert("Select a deck first.");

  const decks = getDecks();
  const selected = decks[Number(index)];
  if (!selected) return;

  const settings = window.QuizxyzSettings?.read?.() || { confirmDelete: true };
  if (settings.confirmDelete && !confirm(`Delete “${selected.name}” and all of its cards?`)) return;

  localStorage.removeItem(selected.id);
  decks.splice(Number(index), 1);
  saveDecks(decks);
  if (localStorage.getItem("localDeckId") === selected.id) localStorage.removeItem("localDeckId");
  loadDecks();
}

function goToDeck() {
  const index = deckList.value;
  if (index === "" || deckList.disabled) return alert("Select a deck first.");

  const decks = getDecks();
  const selectedDeck = decks[Number(index)];
  if (!selectedDeck) return;

  localStorage.setItem("localDeckId", selectedDeck.id);
  window.location.href = "study.html";
}

window.createDeck = createDeck;
window.deleteDeck = deleteDeck;
window.goToDeck = goToDeck;

loadDecks();
