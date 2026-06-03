let currentId = null;

const form = document.getElementById('registerForm');
const submitBtn = document.getElementById('submitBtn');
const btnText = document.getElementById('btnText');
const btnLoader = document.getElementById('btnLoader');
const formError = document.getElementById('formError');

const resultSection = document.getElementById('resultSection');
const resultLabel = document.getElementById('resultLabel');
const proxyUrlDisplay = document.getElementById('proxyUrlDisplay');
const copyBtn = document.getElementById('copyBtn');
const deleteBtn = document.getElementById('deleteBtn');
const viewStatsBtn = document.getElementById('viewStatsBtn');

const statsSection = document.getElementById('statsSection');
const statHits = document.getElementById('statHits');
const statErrors = document.getElementById('statErrors');
const statLastHit = document.getElementById('statLastHit');
const refreshStatsBtn = document.getElementById('refreshStatsBtn');

function showError(msg) {
  formError.textContent = msg;
  formError.classList.remove('hidden');
}

function clearError() {
  formError.classList.add('hidden');
}

function setLoading(loading) {
  submitBtn.disabled = loading;
  btnText.textContent = loading ? 'Creating...' : 'Generate Proxy URL';
  btnLoader.classList.toggle('hidden', !loading);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const url = document.getElementById('webhookUrl').value.trim();
  const label = document.getElementById('label').value.trim();

  if (!url) return showError('Please enter a webhook URL.');

  setLoading(true);

  try {
    const res = await fetch('/api/index', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, label }),
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.error || 'Something went wrong.');
      return;
    }

    currentId = data.id;
    resultLabel.textContent = data.label;
    proxyUrlDisplay.value = data.proxyUrl;

    resultSection.classList.remove('hidden');
    statsSection.classList.add('hidden');
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    form.reset();
  } catch {
    showError('Network error. Please try again.');
  } finally {
    setLoading(false);
  }
});

copyBtn.addEventListener('click', () => {
  const url = proxyUrlDisplay.value;
  if (!url) return;

  navigator.clipboard.writeText(url).then(() => {
    copyBtn.classList.add('copied');
    copyBtn.title = 'Copied!';
    copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    setTimeout(() => {
      copyBtn.classList.remove('copied');
      copyBtn.title = 'Copy';
      copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
    }, 2000);
  }).catch(() => {
    proxyUrlDisplay.select();
    document.execCommand('copy');
  });
});

deleteBtn.addEventListener('click', async () => {
  if (!currentId) return;
  if (!confirm('Delete this proxy? Anyone using it will stop receiving webhooks.')) return;

  try {
    const res = await fetch(`/api/webhooks/${currentId}`, { method: 'DELETE' });
    if (res.ok) {
      resultSection.classList.add('hidden');
      statsSection.classList.add('hidden');
      currentId = null;
    }
  } catch {
    alert('Failed to delete. Please try again.');
  }
});

async function loadStats() {
  if (!currentId) return;
  try {
    const res = await fetch(`/api/webhooks/${currentId}`);
    if (!res.ok) return;
    const data = await res.json();
    statHits.textContent = data.hits ?? 0;
    statErrors.textContent = data.errors ?? 0;
    statLastHit.textContent = data.lastHit
      ? new Date(data.lastHit).toLocaleString()
      : 'Never';
  } catch {}
}

viewStatsBtn.addEventListener('click', async () => {
  await loadStats();
  statsSection.classList.remove('hidden');
  statsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

refreshStatsBtn.addEventListener('click', loadStats);

document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(el => {
      el.classList.remove('open');
      el.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
    });
    if (!isOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});
