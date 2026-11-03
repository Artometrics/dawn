const vscode = acquireVsCodeApi();

const spend = document.getElementById('spend');
const filament = document.getElementById('filament');
const meter = document.getElementById('meter');
const transcript = document.getElementById('transcript');
const review = document.getElementById('review');
const banner = document.getElementById('banner');
const training = document.getElementById('training');
const model = document.getElementById('model');
const context = document.getElementById('context');
const input = document.getElementById('input');
const send = document.getElementById('send');
const handoff = document.getElementById('handoff');
const form = document.getElementById('composer');
const ask = document.getElementById('ask');

const placeholders = {
  chat: 'Ask about this file',
  inline: 'Describe the change to the selection',
  agent: 'Describe a change across files',
};

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

function renderText(value) {
  const escaped = escapeHtml(value);
  const fenced = escaped.replace(/```([a-zA-Z0-9]*)\n([\s\S]*?)```/g, (_match, _lang, code) => `<pre><code>${code}</code></pre>`);
  return fenced.replace(/`([^`]+)`/g, '<code>$1</code>');
}

function setTab(mode) {
  for (const tab of document.querySelectorAll('.tab')) {
    const selected = tab.dataset.mode === mode;
    tab.setAttribute('aria-selected', selected ? 'true' : 'false');
  }
  input.placeholder = placeholders[mode] || placeholders.chat;
  ask.textContent = mode === 'chat' ? 'Ask' : 'Describe the change';
}

function render(state) {
  spend.textContent = state.spendLabel;
  const ratio = Math.max(0, Math.min(1, Number(state.spendRatio) || 0));
  filament.style.width = `${Math.round(ratio * 100)}%`;
  meter.classList.toggle('warn', Boolean(state.spendWarn));
  meter.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
  meter.setAttribute('aria-valuetext', state.spendLabel);
  setTab(state.mode);
  context.textContent = state.contextLabel;

  if (document.activeElement !== model) {
    const options = state.models.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`).join('');
    if (model.dataset.items !== options) {
      model.innerHTML = options;
      model.dataset.items = options;
    }
    model.value = state.model;
  }

  const nearBottom = transcript.scrollHeight - transcript.scrollTop - transcript.clientHeight < 48;
  if (!state.messages.length && !state.steps.length) {
    const copy = {
      chat: 'Ask about the open file or the selection.',
      inline: 'Select code, then describe the change. Nothing is written until you accept.',
      agent: 'Describe a change across files. Dawn Code holds the diff for review.',
    }[state.mode];
    transcript.innerHTML = `<p class="empty">${copy}</p>`;
  } else {
    const steps = state.steps.length
      ? `<ol class="steps">${state.steps.map((step) => `<li>${escapeHtml(step.title)}</li>`).join('')}</ol>`
      : '';
    const messages = state.messages.map((message) => {
      if (message.role === 'note') return `<p class="note">${escapeHtml(message.text)}</p>`;
      const who = message.role === 'user' ? 'You' : 'Dawn Code';
      return `<article class="bubble ${message.role}"><span class="who">${who}</span><div class="body">${renderText(message.text)}</div></article>`;
    }).join('');
    transcript.innerHTML = steps + messages;
  }
  if (nearBottom) transcript.scrollTop = transcript.scrollHeight;

  if (state.review && state.review.files.length) {
    review.hidden = false;
    const files = state.review.files.map((file) => `
      <li class="file">
        <span class="path">${escapeHtml(file.path)}</span>
        <span class="stats">+${file.added} −${file.removed}</span>
        <button type="button" class="diff" data-path="${escapeHtml(file.path)}">Diff</button>
      </li>`).join('');
    review.innerHTML = `
      <h2>Review</h2>
      <p class="context">${escapeHtml(state.review.summary)}</p>
      <ul class="files">${files}</ul>
      <div class="review-actions">
        <button type="button" class="accept" id="accept">Accept changes</button>
        <button type="button" class="ghost" id="reject">Reject</button>
      </div>`;
    review.querySelector('#accept').addEventListener('click', () => vscode.postMessage({ type: 'accept' }));
    review.querySelector('#reject').addEventListener('click', () => vscode.postMessage({ type: 'reject' }));
    for (const button of review.querySelectorAll('.diff')) {
      button.addEventListener('click', () => vscode.postMessage({ type: 'diff', path: button.dataset.path }));
    }
  } else {
    review.hidden = true;
    review.innerHTML = '';
  }

  banner.hidden = !state.banner;
  banner.textContent = state.banner || '';
  training.hidden = !state.trainingNote;
  training.textContent = state.trainingNote || '';
  send.disabled = state.busy;
  send.textContent = state.busy ? 'Working' : 'Send';
  handoff.disabled = state.busy;
}

for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', () => {
    setTab(tab.dataset.mode);
    vscode.postMessage({ type: 'mode', mode: tab.dataset.mode });
  });
}

model.addEventListener('change', () => vscode.postMessage({ type: 'model', model: model.value }));
handoff.addEventListener('click', () => vscode.postMessage({ type: 'handoff' }));

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text || send.disabled) return;
  const mode = document.querySelector('.tab[aria-selected="true"]').dataset.mode;
  vscode.postMessage({ type: 'send', mode, text, model: model.value });
  input.value = '';
});

input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'state') render(event.data.state);
});

vscode.postMessage({ type: 'ready' });
