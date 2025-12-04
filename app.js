
// Tab switching
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.getAttribute('data-target');
    tabs.forEach(t => t.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(target).classList.add('active');
  });
});

// ---- Session length planner ----
let sessionTimer = null;
let sessionStart = null;
let sessionDuration = null; // in seconds

const statusEl = document.querySelector('[data-session-status]');
const remainingEl = document.querySelector('[data-session-remaining]');
const barEl = document.querySelector('[data-session-bar]');

function formatSessionTime(sec) {
  if (sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ':' + String(s).padStart(2, '0');
}

function clearSessionTimer() {
  if (sessionTimer) {
    clearInterval(sessionTimer);
    sessionTimer = null;
  }
  sessionStart = null;
  sessionDuration = null;
  if (statusEl) statusEl.textContent = 'No session selected';
  if (remainingEl) remainingEl.textContent = '';
  if (barEl) barEl.style.width = '0%';
}

function startSession(minutes) {
  const secs = minutes * 60;
  sessionDuration = secs;
  sessionStart = Date.now();
  if (sessionTimer) clearInterval(sessionTimer);

  if (statusEl) statusEl.textContent = `Session running: ${minutes} min`;

  const tick = () => {
    if (!sessionStart || !sessionDuration) return;
    const elapsedMs = Date.now() - sessionStart;
    const elapsed = Math.floor(elapsedMs / 1000);
    const remaining = Math.max(sessionDuration - elapsed, 0);
    const ratio = Math.min(elapsed / sessionDuration, 1);
    if (remainingEl) remainingEl.textContent = formatSessionTime(remaining) + ' left';
    if (barEl) barEl.style.width = (ratio * 100).toFixed(1) + '%';
    if (remaining <= 0) {
      clearInterval(sessionTimer);
      sessionTimer = null;
      if (statusEl) statusEl.textContent = 'Session complete';
    }
  };

  tick();
  sessionTimer = setInterval(tick, 1000);
}

document.querySelectorAll('[data-session-min]').forEach(btn => {
  btn.addEventListener('click', () => {
    const mins = parseInt(btn.dataset.sessionMin || '15', 10);
    startSession(mins);
  });
});

const resetSessionBtn = document.querySelector('[data-session-reset]');
if (resetSessionBtn) {
  resetSessionBtn.addEventListener('click', () => {
    clearSessionTimer();
  });
}

// ---- Per-drill timers (one active at a time) ----
let activeTimer = null;

function formatSeconds(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return sec + 's';
  return m + ':' + String(sec).padStart(2, '0');
}

function clearActiveTimer() {
  if (activeTimer && activeTimer.interval) {
    clearInterval(activeTimer.interval);
  }
  if (activeTimer && activeTimer.display) {
    activeTimer.display.textContent = 'Ready';
  }
  activeTimer = null;
}

function startTimer(displayEl, seconds) {
  clearActiveTimer();
  let remaining = seconds;
  displayEl.textContent = formatSeconds(remaining);
  const interval = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(interval);
      displayEl.textContent = 'Time!';
      activeTimer = null;
      return;
    }
    displayEl.textContent = formatSeconds(remaining);
  }, 1000);
  activeTimer = { interval, display: displayEl };
}

document.querySelectorAll('[data-timer-btn]').forEach(btn => {
  btn.addEventListener('click', () => {
    const seconds = parseInt(btn.dataset.seconds || '30', 10);
    const block = btn.closest('.timer-block');
    if (!block) return;
    const display = block.querySelector('[data-timer-display]');
    if (!display) return;
    startTimer(display, seconds);
  });
});

document.querySelectorAll('[data-timer-reset]').forEach(btn => {
  btn.addEventListener('click', () => {
    const block = btn.closest('.timer-block');
    const display = block ? block.querySelector('[data-timer-display]') : null;
    if (activeTimer && display && activeTimer.display === display) {
      clearActiveTimer();
    } else if (display) {
      display.textContent = 'Ready';
    }
  });
});

// ---- Checklist persistence with localStorage ----
const CHECKLIST_KEY = 'dry-fire-checklist-v1';

function saveChecklist() {
  const data = {};
  document.querySelectorAll('.check-item input[type="checkbox"][data-check]').forEach(cb => {
    const key = cb.dataset.check;
    data[key] = cb.checked;
  });
  try {
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Could not save checklist state', e);
  }
}

function loadChecklist() {
  let stored = null;
  try {
    stored = localStorage.getItem(CHECKLIST_KEY);
  } catch (e) {
    console.warn('Could not load checklist state', e);
  }
  if (!stored) return;
  try {
    const data = JSON.parse(stored);
    document.querySelectorAll('.check-item input[type="checkbox"][data-check]').forEach(cb => {
      const key = cb.dataset.check;
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        cb.checked = !!data[key];
      }
    });
  } catch (e) {
    console.warn('Bad checklist JSON', e);
  }
}

document.querySelectorAll('.check-item input[type="checkbox"][data-check]').forEach(cb => {
  cb.addEventListener('change', saveChecklist);
});

const clearBtn = document.querySelector('.clear-checklist');
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    document.querySelectorAll('.check-item input[type="checkbox"][data-check]').forEach(cb => {
      cb.checked = false;
    });
    try {
      localStorage.removeItem(CHECKLIST_KEY);
    } catch (e) {
      console.warn('Could not clear checklist storage', e);
    }
  });
}

// Initialize checklist on load
loadChecklist();

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .catch(err => console.log('SW registration failed', err));
  });
}
