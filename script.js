import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, deleteDoc, doc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDbQYqXIZ2gEYQmMP0knHioyGEjgsBV9Tg",
  authDomain: "confesskana-46bed.firebaseapp.com",
  projectId: "confesskana-46bed",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let cards = [];
let current = 0;

const urlParams = new URLSearchParams(window.location.search);
let deckId = urlParams.get("deck");
let isShared = true;

// PRIVATE MODE
if (!deckId) {
  isShared = false;

  deckId = localStorage.getItem("localDeckId");

  if (!deckId) {
    deckId = crypto.randomUUID();
    localStorage.setItem("localDeckId", deckId);
  }
}

function getCollection() {
  return collection(db, "decks", deckId, "flashcards");
}

async function loadCards() {
  cards = [];

  if (isShared) {
    const snapshot = await getDocs(getCollection());

    snapshot.forEach(docSnap => {
      cards.push({
        id: docSnap.id,
        q: docSnap.data().q,
        a: docSnap.data().a
      });
    });
  } else {
    const local = JSON.parse(localStorage.getItem(deckId)) || [];
    cards = local;
  }

  current = 0;
  showCard();
}

function showCard() {
  const q = document.getElementById("question");
  const a = document.getElementById("answer");

  if (!cards.length) {
    q.innerText = "No cards yet";
    a.innerText = "...";
    return;
  }

  q.innerText = cards[current].q;
  a.innerText = cards[current].a;
}

async function addCard() {
  const q = document.getElementById("qInput").value;
  const a = document.getElementById("aInput").value;

  if (!q || !a) return alert("Fill all fields");

  if (isShared) {
    await addDoc(getCollection(), { q, a });
  } else {
    cards.push({ id: Date.now(), q, a });
    localStorage.setItem(deckId, JSON.stringify(cards));
  }

  document.getElementById("qInput").value = "";
  document.getElementById("aInput").value = "";

  loadCards();
}

async function deleteCard() {
  if (!cards.length) return;

  if (isShared) {
    await deleteDoc(doc(db, "decks", deckId, "flashcards", cards[current].id));
  } else {
    cards.splice(current, 1);
    localStorage.setItem(deckId, JSON.stringify(cards));
  }

  loadCards();
}

function flipCard() {
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
  document.getElementById("card").classList.remove("flipped");
}

function goBack() {
  window.location.href = "index.html";
}

function generateLink() {
  const link = window.location.origin + window.location.pathname + "?deck=" + deckId;
  const input = document.getElementById("shareLink");

  input.value = link;
  input.select();
  document.execCommand("copy");

  alert("Link copied!");
}

// SWIPE FIX
window.addEventListener("DOMContentLoaded", () => {
  const card = document.getElementById("card");

  let startX = 0;
  let endX = 0;

  card.addEventListener("touchstart", e => startX = e.touches[0].clientX);
  card.addEventListener("touchend", e => {
    endX = e.changedTouches[0].clientX;
    handleSwipe();
  });

  card.addEventListener("mousedown", e => startX = e.clientX);
  card.addEventListener("mouseup", e => {
    endX = e.clientX;
    handleSwipe();
  });

  function handleSwipe() {
    let diff = startX - endX;

    if (Math.abs(diff) < 50) return;

    if (diff > 0) nextCard();
    else prevCard();
  }

  loadCards();
});

// EXPORT
window.addCard = addCard;
window.deleteCard = deleteCard;
window.flipCard = flipCard;
window.goBack = goBack;
window.nextCard = nextCard;
window.prevCard = prevCard;
window.generateLink = generateLink;