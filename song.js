// Invitation background song — plain HTML/CSS/JS, no build step needed.
// Reads the active song for this invitation from Firestore (uploaded via the admin panel).
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// Firebase config (safe to be public; Firestore rules protect the data).
const firebaseConfig = {
  apiKey: "AIzaSyD9a74k4IXWhq8eR62PPnuxsGUYtBUStzE",
  authDomain: "fizza-7a796.firebaseapp.com",
  projectId: "fizza-7a796",
  storageBucket: "fizza-7a796.firebasestorage.app",
  messagingSenderId: "180855693736",
  appId: "1:180855693736:web:c739b1a44fe0c21f61bd9d",
  measurementId: "G-9XZDJGKR7H",
};

const audio = document.getElementById("invite-song");
const toggle = document.getElementById("song-toggle");
// Which invitation is this page? Set in HTML: <audio id="invite-song" data-invitation="nikkah">
const invitationId = audio?.dataset.invitation;

let songReady = false; // song URL loaded from Firestore
let userPaused = false; // guest deliberately paused with the button
let gestureSeen = false; // guest already tapped (e.g. OPEN) before the song finished loading

async function fetchSongUrl(id) {
  const db = getFirestore(initializeApp(firebaseConfig));
  const snap = await getDocs(
    query(
      collection(db, "songs"),
      where("invitationId", "==", id),
      orderBy("createdAt", "desc"),
      limit(1),
    ),
  );
  return snap.empty ? null : snap.docs[0].data().audioUrl;
}

function syncButton() {
  const playing = !audio.paused;
  toggle.classList.toggle("is-playing", playing);
  toggle.setAttribute("aria-label", playing ? "Pause music" : "Play music");
}

// Browsers only allow sound after a tap. The first tap anywhere (the envelope's OPEN
// button is normally that tap) starts the song.
const GESTURES = ["click", "touchend", "keydown"];
function removeGestureListeners() {
  GESTURES.forEach((name) => document.removeEventListener(name, onGesture, true));
}
async function playNow() {
  if (userPaused) return;
  try {
    await audio.play();
    removeGestureListeners();
  } catch {
    /* still blocked: wait for the next tap */
  }
}
function onGesture(event) {
  if (event.target.closest?.("#song-toggle")) return; // the button handles itself
  gestureSeen = true;
  if (songReady) playNow(); // otherwise it starts as soon as the song has loaded
}

async function init() {
  if (!audio || !toggle || !invitationId) return;

  audio.addEventListener("play", syncButton);
  audio.addEventListener("pause", syncButton);
  GESTURES.forEach((name) => document.addEventListener(name, onGesture, true));

  let url;
  try {
    url = await fetchSongUrl(invitationId);
  } catch (error) {
    // "The query requires an index" -> create it from the link in this message.
    console.error("Could not load the invitation song:", error);
    return;
  }
  if (!url) return; // no song uploaded for this invitation: stay silent, button stays hidden

  audio.preload = "auto"; // buffer while the envelope is still closed
  audio.src = url;
  songReady = true;
  toggle.hidden = false;
  syncButton();

  // Play/pause button.
  toggle.addEventListener("click", () => {
    if (audio.paused) {
      userPaused = false;
      audio.play().then(removeGestureListeners).catch(() => {});
    } else {
      audio.pause();
      userPaused = true;
    }
  });

  if (gestureSeen) {
    playNow(); // guest was faster than the download
  } else {
    audio.play().then(removeGestureListeners).catch(() => {}); // works only if the browser allows autoplay
  }

  // Pause when the guest switches tab / locks the phone, resume when they come back.
  let wasPlaying = false;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      wasPlaying = !audio.paused;
      audio.pause();
    } else if (wasPlaying && !userPaused) {
      audio.play().catch(() => {});
    }
  });
}

init();