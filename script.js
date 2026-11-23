// =========================================================================
// CONFIGURAÇÃO DA API 
// Substitua o link abaixo pela URL que o Render gerou para o seu backend
// =========================================================================
const API_URL = "https://seu-backend.onrender.com/dados"; // <-- COLOQUE SEU LINK AQUI

// Elementos da interface
const arena = document.getElementById("game-arena");
const startBtn = document.getElementById("start-btn");
const scoreEl = document.getElementById("score");
const comboEl = document.getElementById("combo");
const timeEl = document.getElementById("time");
const nameInput = document.getElementById("player-name");
const leaderboardList = document.getElementById("leaderboard-list");
const dbStatus = document.getElementById("db-status");

// Estado do jogo
let score = 0;
let combo = 1;
let timeLeft = 30;
let isPlaying = false;
let timerInterval = null;

// Efeito sonoro simples via Web Audio API
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

// =========================================================================
// FUNÇÃO 1: SALVAR DADOS NO BANCO (POST)
// =========================================================================
async function saveScore(playerName, finalScore) {
  if (finalScore <= 0) return;

  try {
    await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      // Aqui usamos "nome" e "valor" para bater certinho com o seu backend
      body: JSON.stringify({
        nome: playerName,
        valor: finalScore
      })
    });
  } catch (error) {
    console.error("Erro ao salvar no banco:", error);
    alert("Erro ao salvar. Verifique se a URL da API está correta.");
  }

  // Depois de salvar, atualiza a tabela
  await loadLeaderboard();
}

// =========================================================================
// FUNÇÃO 2: BUSCAR DADOS DO BANCO (GET)
// =========================================================================
async function loadLeaderboard() {
  // Aviso útil porque o plano gratuito do Render demora uns 40s para "acordar"
  leaderboardList.innerHTML = "<li>Conectando ao banco (O Render gratuito pode levar 50s para acordar)...</li>";
  
  if (dbStatus) dbStatus.textContent = "Conectando...";
  let scores = [];

  try {
    const resposta = await fetch(API_URL);
    scores = await resposta.json();
    
    if (dbStatus) {
      dbStatus.textContent = "API Online";
      dbStatus.style.backgroundColor = "#065f46"; // Verde escuro para indicar sucesso
    }
  } catch (error) {
    console.error("Erro ao conectar na API:", error);
    leaderboardList.innerHTML = "<li>Erro de conexão. A API está offline ou a URL está incorreta.</li>";
    if (dbStatus) dbStatus.textContent = "API Offline";
    return;
  }

  leaderboardList.innerHTML = "";

  if (scores.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.textContent = "Nenhuma pontuação registrada ainda. Seja o primeiro!";
    leaderboardList.appendChild(emptyItem);
    return;
  }

  // Desenha os itens na tela
  scores.forEach((entry, index) => {
    const li = document.createElement("li");
    const nameSpan = document.createElement("span");
    const scoreStrong = document.createElement("strong");

    nameSpan.textContent = `#${index + 1} ${entry.nome}`;
    scoreStrong.textContent = `${entry.valor} pts`;

    li.appendChild(nameSpan);
    li.appendChild(scoreStrong);
    leaderboardList.appendChild(li);
  });
}

// =========================================================================
// LÓGICA DO JOGO
// =========================================================================
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
  
  // Impede que o jogador clique várias vezes e envie várias pontuações
  startBtn.style.display = "block";
  startBtn.disabled = true;
  startBtn.textContent = "Salvando no banco de dados...";

  await saveScore(playerName, score);
  
  startBtn.textContent = `Fim! (${score} pts) — Jogar de novo`;
  startBtn.disabled = false;
}

startBtn.addEventListener("click", startGame);

// Carrega o ranking assim que a pessoa abre o site
loadLeaderboard();
