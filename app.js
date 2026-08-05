import { battleship } from './games/battleship.js';
import { game2048 } from './games/game2048.js';
import { minesweeper } from './games/minesweeper.js';
import { millionaire } from './games/millionaire.js';
import { tictactoe } from './games/tictactoe.js';

const games = [battleship, tictactoe, game2048, minesweeper, millionaire];
const main = document.querySelector('#mainView');
const bottomNav = document.querySelector('#bottomNav');
const headerTitle = document.querySelector('#headerTitle');
const headerEyebrow = document.querySelector('#headerEyebrow');
const backButton = document.querySelector('#backButton');
const homeButton = document.querySelector('#homeButton');
const modalRoot = document.querySelector('#modalRoot');
const toastEl = document.querySelector('#toast');
let activeCleanup = null;
let activePage = 'home';
let toastTimer = null;

const defaultSettings = {
  player1: 'Игрок 1',
  player2: 'Игрок 2',
  sound: false,
  lowPower: false,
  reduceMotion: false
};

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getSettings() {
  return { ...defaultSettings, ...readJSON('road-games-settings', {}) };
}

function saveSettings(settings) {
  writeJSON('road-games-settings', settings);
  applySettings();
}

function applySettings() {
  const settings = getSettings();
  document.body.classList.toggle('low-power', settings.lowPower);
  document.body.classList.toggle('reduce-motion', settings.reduceMotion || settings.lowPower);
}

function toast(message) {
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.classList.add('show');
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1700);
}

function showModal(content, className = '') {
  modalRoot.className = `modal-root ${className}`.trim();
  modalRoot.innerHTML = `<div class="modal-card">${content}</div>`;
  return modalRoot.querySelector('.modal-card');
}

function closeModal() {
  modalRoot.className = 'modal-root hidden';
  modalRoot.innerHTML = '';
}

function setHeader(title, eyebrow = '') {
  headerTitle.textContent = title;
  headerEyebrow.textContent = eyebrow;
  headerEyebrow.classList.toggle('hidden', !eyebrow);
}

function setGameMode(enabled) {
  bottomNav.classList.toggle('hidden', enabled);
  backButton.classList.toggle('hidden', !enabled);
  homeButton.classList.toggle('hidden', !enabled);
  main.classList.toggle('game-active', enabled);
}

function cleanupActive() {
  if (typeof activeCleanup === 'function') activeCleanup();
  activeCleanup = null;
  closeModal();
}

function storageApi(prefix) {
  return {
    read(fallback = null) { return readJSON(`road-game-${prefix}`, fallback); },
    write(value) { writeJSON(`road-game-${prefix}`, value); },
    remove() { localStorage.removeItem(`road-game-${prefix}`); }
  };
}

function contextFor(game) {
  return {
    root: main,
    toast,
    showModal,
    closeModal,
    settings: getSettings,
    saveSettings,
    storage: storageApi(game.id),
    exit: renderHome
  };
}

function launchGame(id) {
  const game = games.find(item => item.id === id);
  if (!game) return;
  cleanupActive();
  setGameMode(true);
  setHeader(game.title, game.players === 2 ? 'Игра на двоих' : 'Игра для одного');
  main.innerHTML = '';
  activeCleanup = game.mount(contextFor(game)) || null;
}

function renderHome() {
  cleanupActive();
  activePage = 'home';
  setGameMode(false);
  setHeader('В пути', 'Офлайн-коллекция');
  updateNav();

  const two = games.filter(g => g.players === 2);
  const one = games.filter(g => g.players === 1);
  main.innerHTML = `
    <section class="hero">
      <div class="hero-row">
        <div>
          <h2>Игры для дороги</h2>
          <p>Один iPhone или iPad, никакого интернета и никаких аккаунтов.</p>
        </div>
        <div id="offlineBadge" class="offline-badge">Проверяем офлайн…</div>
      </div>
    </section>

    <div class="section-title"><h2>На двоих</h2><span>передавайте устройство</span></div>
    <section class="game-grid">${two.map(gameCard).join('')}</section>

    <div class="section-title"><h2>Для одного</h2><span>короткие и долгие партии</span></div>
    <section class="game-grid">${one.map(gameCard).join('')}</section>
  `;

  main.querySelectorAll('[data-game]').forEach(button => {
    button.addEventListener('click', () => launchGame(button.dataset.game));
  });
  updateOfflineBadge();
}

function gameCard(game) {
  return `
    <button class="game-card" data-game="${game.id}" type="button">
      <div class="game-icon">${game.icon}</div>
      <h3>${game.title}</h3>
      <p>${game.description}</p>
      <div class="game-meta">
        <span class="tag">${game.players === 2 ? '2 игрока' : '1 игрок'}</span>
        <span class="tag">${game.duration}</span>
      </div>
    </button>`;
}

function renderStats() {
  cleanupActive();
  activePage = 'stats';
  setGameMode(false);
  setHeader('Статистика', 'Только на этом устройстве');
  updateNav();

  const stats = games.map(game => ({ game, ...(game.getStats?.(storageApi(game.id).read(null), getSettings()) || {}) }));
  main.innerHTML = `
    <section class="panel">
      <h2>Ваши результаты</h2>
      <p class="muted">Статистика хранится локально и не отправляется в интернет.</p>
      <div class="stat-grid">
        ${stats.map(({ game, value = '—', label = 'Нет данных' }) => `
          <div class="stat-card"><div class="game-icon">${game.icon}</div><strong>${value}</strong><span>${game.title}: ${label}</span></div>
        `).join('')}
      </div>
    </section>
    <section class="panel">
      <button id="clearAllData" class="danger full" type="button">Удалить все сохранения</button>
    </section>
  `;
  main.querySelector('#clearAllData').addEventListener('click', () => {
    const card = showModal(`
      <div class="modal-icon">🗑️</div><h2>Удалить прогресс?</h2>
      <p>Будут удалены партии и рекорды всех игр. Имена и настройки останутся.</p>
      <div class="button-row"><button id="cancelClear" class="secondary">Отмена</button><button id="confirmClear" class="danger">Удалить</button></div>`);
    card.querySelector('#cancelClear').addEventListener('click', closeModal);
    card.querySelector('#confirmClear').addEventListener('click', () => {
      games.forEach(game => storageApi(game.id).remove());
      closeModal();
      renderStats();
      toast('Сохранения удалены');
    });
  });
}

function renderSettings() {
  cleanupActive();
  activePage = 'settings';
  setGameMode(false);
  setHeader('Настройки', 'Общие для всех игр');
  updateNav();
  const s = getSettings();

  main.innerHTML = `
    <section class="panel">
      <div class="field"><label for="player1">Первый игрок</label><input id="player1" class="input" maxlength="18" value="${escapeHtml(s.player1)}"></div>
      <div class="field"><label for="player2">Второй игрок</label><input id="player2" class="input" maxlength="18" value="${escapeHtml(s.player2)}"></div>
      <button id="saveNames" class="primary full" type="button">Сохранить имена</button>
    </section>
    <section class="panel">
      <div class="switch-row"><div><strong>Звуки</strong><div class="muted">Короткие сигналы без музыки</div></div><input id="sound" class="switch" type="checkbox" ${s.sound ? 'checked' : ''}></div>
      <div class="switch-row"><div><strong>Экономия батареи</strong><div class="muted">Статичный фон и минимум эффектов</div></div><input id="lowPower" class="switch" type="checkbox" ${s.lowPower ? 'checked' : ''}></div>
      <div class="switch-row"><div><strong>Уменьшить анимации</strong><div class="muted">Для поездки и укачивания</div></div><input id="reduceMotion" class="switch" type="checkbox" ${s.reduceMotion ? 'checked' : ''}></div>
    </section>
    <section class="panel">
      <h3>Подготовка к поездке</h3>
      <p class="muted">Добавьте страницу на экран «Домой», один раз откройте ее и затем проверьте запуск в авиарежиме.</p>
      <div id="installState" class="offline-badge">Проверяем…</div>
    </section>
  `;

  main.querySelector('#saveNames').addEventListener('click', () => {
    const next = getSettings();
    next.player1 = main.querySelector('#player1').value.trim() || 'Игрок 1';
    next.player2 = main.querySelector('#player2').value.trim() || 'Игрок 2';
    saveSettings(next);
    toast('Имена сохранены');
  });
  ['sound', 'lowPower', 'reduceMotion'].forEach(key => {
    main.querySelector(`#${key}`).addEventListener('change', event => {
      saveSettings({ ...getSettings(), [key]: event.target.checked });
    });
  });
  updateInstallState();
}

function updateNav() {
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.page === activePage));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

async function updateOfflineBadge() {
  const badge = document.querySelector('#offlineBadge');
  if (!badge) return;
  if (!('serviceWorker' in navigator)) {
    badge.textContent = 'Офлайн не поддерживается';
    return;
  }
  try {
    await navigator.serviceWorker.ready;
    badge.textContent = navigator.onLine ? 'Офлайн-пакет готов ✓' : 'Работаем без сети ✓';
  } catch {
    badge.textContent = 'Откройте страницу еще раз';
  }
}

async function updateInstallState() {
  const node = document.querySelector('#installState');
  if (!node) return;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  try {
    await navigator.serviceWorker.ready;
    node.textContent = standalone ? 'Установлено и готово офлайн ✓' : 'Офлайн готово — добавьте на экран «Домой»';
  } catch {
    node.textContent = 'Для офлайн-режима нужен HTTPS';
  }
}

document.querySelectorAll('.nav-item').forEach(button => {
  button.addEventListener('click', () => {
    if (button.dataset.page === 'home') renderHome();
    if (button.dataset.page === 'stats') renderStats();
    if (button.dataset.page === 'settings') renderSettings();
  });
});
backButton.addEventListener('click', renderHome);
homeButton.addEventListener('click', renderHome);
window.addEventListener('online', updateOfflineBadge);
window.addEventListener('offline', updateOfflineBadge);

applySettings();
renderHome();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(console.error));
}
