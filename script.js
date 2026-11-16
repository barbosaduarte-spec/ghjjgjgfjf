import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =========================================================================
// CONFIGURAÇÃO DO BANCO DE DADOS (FIREBASE FIRESTORE)
// Substitua os valores abaixo pelos dados do seu projeto no Firebase Console
// =========================================================================
const firebaseConfig = {
  apiKey: "COLE_SUA_API_KEY_AQUI",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO_ID",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:000000000000"
};

const isFirebaseConfigured = firebaseConfig.apiKey !== "COLE_SUA_API_KEY_AQUI";
let db = null;

if (isFirebaseConfigured) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  document.getElementById("db-status").textContent = "Nuvem Conectada";
}

// Elementos da interface
const arena = document.getElementById("game-arena");
const startBtn = document.getElementById("start-btn");
const scoreEl = document.getElementById("score");
const comboEl = document.getElementById("combo");
const timeEl = document.getElementById("time");
const nameInput = document.getElementById("player-name");
const leaderboardList = document.getElementById("leaderboard-list");

// Estado do jogo
let score = 0;
let combo = 1;
let timeLeft = 30;
let isPlaying = false;
let timerInterval = null;

// Efeito sonoro simples via Web Audio API (não precisa baixar arquivos MP3)
function playHitSound(pitch = 520) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(pitch, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.12);
}

// Salva a pontuação no Firebase Firestore (ou localStorage se não configurado)
async function saveScore(playerName, finalScore) {
  if (finalScore <= 0) return;

  if (db) {
    try {
      await addDoc(collection(db, "ranking"), {
        nome: playerName,
        pontos: finalScore,
        criadoEm: Date.now()
      });
    } catch (error) {
      console.error("Erro ao salvar no Firebase:", error);
    }
  } else {
    const localScores = JSON.parse(localStorage.getItem("neon_ranking") || "[]");
    localScores.push({ nome: playerName, pontos: finalScore });
    localScores.sort((a, b) => b.pontos - a.pontos);
    localStorage.setItem("neon_ranking", JSON.stringify(localScores.slice(0, 10)));
  }

  await loadLeaderboard();
}

// Carrega o Top 10 do banco de dados
async function loadLeaderboard() {
  leaderboardList.innerHTML = "<li>Atualizando ranking...</li>";
  let scores = [];

  if (db) {
    try {
      const q = query(
        collection(db, "ranking"),
        orderBy("pontos", "desc"),
        limit(10)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach((doc) => scores.push(doc.data()));
    } catch (error) {
      console.error("Erro ao ler ranking:", error);
    }
  } else {
    scores = JSON.parse(localStorage.getItem("neon_ranking") || "[]");
  }

  leaderboardList.innerHTML = "";

  if (scores.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.textContent = "Nenhuma pontuação registrada ainda. Seja o primeiro!";
    leaderboardList.appendChild(emptyItem);
    return;
  }

  scores.forEach((entry, index) => {
    const li = document.createElement("li");
    const nameSpan = document.createElement("span");
    const scoreStrong = document.createElement("strong");

    nameSpan.textContent = `#${index + 1} ${entry.nome}`;
    scoreStrong.textContent = `${entry.pontos} pts`;

    li.appendChild(nameSpan);
    li.appendChild(scoreStrong);
    leaderboardList.appendChild(li);
  });
}

function spawnTarget() {
  const existing = arena.querySelector(".target");
  if (existing) existing.remove();

  const target = document.createElement("div");
  target.className = "target";

  const targetSize = 48;
  const maxX = arena.clientWidth - targetSize;
  const maxY = arena.clientHeight - targetSize;

  target.style.left = `${Math.floor(Math.random() * maxX)}px`;
  target.style.top = `${Math.floor(Math.random() * maxY)}px`;

  target.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    if (!isPlaying) return;

    score += 10 * combo;
    combo = Math.min(combo + 1, 10);
    scoreEl.textContent = score;
    comboEl.textContent = `${combo}x`;

    playHitSound(440 + combo * 40);
    spawnTarget();
  });

  arena.appendChild(target);
}

// Clicar fora do alvo zera o combo
arena.addEventListener("pointerdown", () => {
  if (!isPlaying) return;
  combo = 1;
  comboEl.textContent = "1x";
});

function startGame() {
  score = 0;
  combo = 1;
  timeLeft = 30;
  isPlaying = true;

  scoreEl.textContent = "0";
  comboEl.textContent = "1x";
  timeEl.textContent = "30s";
  startBtn.style.display = "none";

  spawnTarget();

  timerInterval = setInterval(() => {
    timeLeft--;
    timeEl.textContent = `${timeLeft}s`;

    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

async function endGame() {
  isPlaying = false;
  clearInterval(timerInterval);

  const existing = arena.querySelector(".target");
  if (existing) existing.remove();

  const playerName = nameInput.value.trim() || "Jogador Anônimo";
  startBtn.textContent = `Fim de jogo! (${score} pts) — Jogar de novo`;
  startBtn.style.display = "block";

  await saveScore(playerName, score);
}

startBtn.addEventListener("click", startGame);

// Carrega o ranking ao abrir a página
loadLeaderboard();
