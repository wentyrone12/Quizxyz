const deckList = document.getElementById("deckList");

// LOAD LOCAL DECKS ONLY
function loadDecks() {
  const decks = JSON.parse(localStorage.getItem("decks")) || [];

  deckList.innerHTML = "";

  decks.forEach((deck, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = deck.name;
    deckList.appendChild(option);
  });
}

// CREATE DECK (LOCAL ONLY)
function createDeck() {
  const name = document.getElementById("deckName").value.trim();
  if (!name) return alert("Enter name!");

  const decks = JSON.parse(localStorage.getItem("decks")) || [];

  const newDeck = {
    id: crypto.randomUUID(),
    name: name
  };

  decks.push(newDeck);
  localStorage.setItem("decks", JSON.stringify(decks));

  document.getElementById("deckName").value = "";
  loadDecks();
}

// DELETE DECK
function deleteDeck() {
  const index = deckList.value;
  if (index === "") return alert("Select deck!");

  const decks = JSON.parse(localStorage.getItem("decks")) || [];

  decks.splice(index, 1);
  localStorage.setItem("decks", JSON.stringify(decks));

  loadDecks();
}

// OPEN DECK (LOCAL MODE)
function goToDeck() {
  const index = deckList.value;
  if (index === "") return alert("Select deck!");

  const decks = JSON.parse(localStorage.getItem("decks")) || [];

  const selectedDeck = decks[index];

  // save deckId locally
  localStorage.setItem("localDeckId", selectedDeck.id);

  window.location.href = "study.html";
}

window.createDeck = createDeck;
window.deleteDeck = deleteDeck;
window.goToDeck = goToDeck;

loadDecks();