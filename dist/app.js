const typeNames = { P: 'Película', S: 'Serie', A: 'Animación', E: 'Especial' };
const categories = [
  ['all', 'Todas'], ['ucm', 'UCM'], ['xmen', 'X-Men'],
  ['spider', 'Spider-Man'], ['fantastic', '4 Fantásticos'], ['other', 'Otras series']
];
const storageKey = 'marvel-watchlist-progress-v1'; // Se conserva para migrar el progreso anterior.
const storageVersion = 2;
const releaseDate = { year: 2026, month: 12, day: 18 };
const $ = id => document.getElementById(id);

let groups = [];
let done = new Set();
let category = 'all';
let query = '';
let pending = false;
let installPrompt = null;
let toastTimer;

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function allItems() {
  return groups.flatMap(group => group.items);
}

function normalizeProgressIds(ids) {
  const valid = new Set(allItems().map(item => item.id));
  const oldToNew = new Map(allItems().map(item => [item.legacyId, item.id]));
  return new Set(ids.map(id => valid.has(id) ? id : oldToNew.get(id)).filter(Boolean));
}

function readProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (!Array.isArray(saved?.done)) return new Set();
    const restored = normalizeProgressIds(saved.done);
    if (saved.version !== storageVersion) {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ version: storageVersion, done: [...restored] }));
      } catch { /* La lista puede seguir funcionando sin almacenamiento. */ }
    }
    return restored;
  } catch {
    return new Set();
  }
}

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ version: storageVersion, done: [...done] }));
  } catch {
    showToast('No se pudo guardar en este navegador');
  }
  updateDoomsday();
}

function groupCategory(name) {
  if (name.startsWith('UCM')) return 'ucm';
  if (name.startsWith('X-Men')) return 'xmen';
  if (name.startsWith('Spider-Man')) return 'spider';
  if (name.startsWith('Los 4')) return 'fantastic';
  return 'other';
}

function normalized(value) {
  return value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function renderTabs() {
  const host = $('category-tabs');
  host.replaceChildren();
  categories.forEach(([id, label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'category-tab';
    button.textContent = label;
    button.setAttribute('aria-pressed', String(category === id));
    button.addEventListener('click', () => {
      category = id;
      renderTabs();
      renderGroups();
    });
    host.append(button);
  });
}

function makeItem(item) {
  const label = document.createElement('label');
  label.className = 'item' + (done.has(item.id) ? ' checked' : '');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = done.has(item.id);
  input.setAttribute('aria-label', `Visto: ${item.title}`);
  input.addEventListener('change', () => {
    if (input.checked) done.add(item.id);
    else done.delete(item.id);
    label.classList.toggle('checked', input.checked);
    save();
    updateProgress();
    if (pending) renderGroups();
    else updateGroupCounts();
  });
  const text = document.createElement('div');
  text.className = 'item-text';
  const title = document.createElement('div');
  title.className = 'item-title';
  title.textContent = item.title;
  const meta = document.createElement('div');
  meta.className = 'item-meta';
  meta.textContent = `${item.year} · ${typeNames[item.kind]}`;
  text.append(title, meta);
  const kind = document.createElement('span');
  kind.className = 'type-pill ' + (item.kind === 'P' ? 'film' : item.kind === 'E' ? 'special' : '');
  kind.textContent = item.kind === 'P' ? 'CINE' : item.kind === 'E' ? 'ESPECIAL' : 'SERIE';
  label.append(input, text, kind);
  return label;
}

function renderGroups() {
  const host = $('groups');
  const openNames = new Set([...host.querySelectorAll('details[open]')].map(el => el.dataset.name));
  const needle = normalized(query);
  host.replaceChildren();
  let visible = 0;
  let shownGroups = 0;
  groups.forEach((group, index) => {
    if (category !== 'all' && groupCategory(group.name) !== category) return;
    const matches = group.items.filter(item =>
      (!pending || !done.has(item.id)) &&
      (!needle || normalized(`${item.title} ${item.year} ${group.name}`).includes(needle))
    );
    if (!matches.length) return;
    visible += matches.length;
    const details = document.createElement('details');
    details.className = 'group';
    details.dataset.name = group.name;
    details.open = !!query || pending || openNames.has(group.name) || shownGroups === 0;
    const summary = document.createElement('summary');
    const name = document.createElement('span');
    name.className = 'group-title';
    name.textContent = group.name;
    const count = document.createElement('span');
    count.className = 'group-progress';
    count.dataset.group = index;
    summary.append(name, count);
    details.append(summary);
    const list = document.createElement('div');
    list.className = 'group-items';
    matches.forEach(item => list.append(makeItem(item)));
    details.append(list);
    host.append(details);
    shownGroups++;
  });
  $('visible-count').textContent = `${visible} título${visible === 1 ? '' : 's'} en esta vista`;
  $('empty-state').hidden = visible > 0;
  updateGroupCounts();
}

function updateGroupCounts() {
  groups.forEach((group, index) => {
    const el = document.querySelector(`[data-group="${index}"]`);
    if (el) el.textContent = `${group.items.filter(item => done.has(item.id)).length}/${group.items.length}`;
  });
}

function updateProgress() {
  const total = allItems().length;
  const count = done.size;
  const remaining = total - count;
  $('done-count').textContent = count;
  $('total-count').textContent = total;
  $('remaining-count').textContent = `${remaining} título${remaining === 1 ? '' : 's'} pendiente${remaining === 1 ? '' : 's'}`;
  $('overall-progress').max = total;
  $('overall-progress').value = count;
  $('progress-message').textContent = count === 0
    ? 'Cada gran saga empieza por una película.'
    : count === total ? '¡Misión completada! Eres leyenda.'
    : `${Math.round(count / total * 100)}% de tu misión completada.`;
}

function doomsdayItems() {
  return DOOMSDAY_GROUPS.flatMap(group => group.items);
}

function updateDoomsday() {
  const items = doomsdayItems();
  const count = items.filter(item => item.ids.every(id => done.has(id))).length;
  $('doom-done').textContent = count;
  $('doom-total').textContent = items.length;
  $('doom-progress').max = items.length;
  $('doom-progress').value = count;
  $('doom-remaining').textContent = count === items.length ? '¡Listo para Doomsday!' : `${items.length - count} por ver`;
  document.querySelectorAll('[data-doom-item]').forEach(row => {
    const checked = items[Number(row.dataset.doomItem)].ids.every(id => done.has(id));
    row.classList.toggle('checked', checked);
    row.querySelector('input').checked = checked;
  });
}

function initDoomsday() {
  const host = $('doom-groups');
  let index = 0;
  DOOMSDAY_GROUPS.forEach(group => {
    const card = document.createElement('div');
    card.className = 'doom-group';
    const heading = document.createElement('h4');
    heading.textContent = group.name;
    card.append(heading);
    group.items.forEach(item => {
      const label = document.createElement('label');
      label.className = 'doom-item';
      label.dataset.doomItem = index++;
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.setAttribute('aria-label', `Visto: ${item.title}`);
      checkbox.addEventListener('change', () => {
        item.ids.forEach(id => checkbox.checked ? done.add(id) : done.delete(id));
        save();
        renderGroups();
        updateProgress();
      });
      const content = document.createElement('span');
      content.className = 'doom-item-text';
      const title = document.createElement('strong');
      title.textContent = item.title;
      const meta = document.createElement('small');
      meta.textContent = `${item.year} · ${typeNames[item.kind]}${item.note ? ' · ' + item.note : ''}`;
      content.append(title, meta);
      label.append(checkbox, content);
      card.append(label);
    });
    host.append(card);
  });
  updateDoomsday();
}

function daysUntilDoomsday(now = new Date()) {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const release = Date.UTC(releaseDate.year, releaseDate.month - 1, releaseDate.day);
  return Math.max(0, Math.round((release - today) / 86400000));
}

function updateCountdown() {
  const days = daysUntilDoomsday();
  $('doom-days').textContent = days;
  $('doom-days-unit').textContent = days === 1 ? 'día' : 'días';
  $('doom-countdown-label').textContent = days === 0 ? '¡DOOMSDAY YA LLEGÓ!' : 'DÍAS PARA EL ESTRENO';
}

function exportProgress() {
  const content = {
    app: 'Marvel Watchlist', version: storageVersion,
    exportedAt: new Date().toISOString(), done: [...done]
  };
  const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'marvel-watchlist-progreso.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  showToast('Progreso exportado');
}

async function importProgress(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.done)) throw new Error('Formato inválido');
    const imported = normalizeProgressIds(data.done);
    if (data.done.length && !imported.size) throw new Error('Archivo incompatible');
    if (done.size && !confirm(`¿Reemplazar tus ${done.size} checks actuales por ${imported.size} del archivo?`)) return;
    done = imported;
    save();
    renderGroups();
    updateProgress();
    showToast('Progreso importado');
  } catch {
    showToast('No se pudo leer ese archivo');
  } finally {
    $('import-input').value = '';
  }
}

async function installApp() {
  if (installPrompt) {
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
  } else {
    $('install-dialog').showModal();
  }
}

function init() {
  try {
    groups = MARVEL_GROUPS;
    done = readProgress();
    renderTabs();
    renderGroups();
    updateProgress();
    initDoomsday();
  } catch (error) {
    console.error('No se pudo cargar el checklist:', error);
    $('groups').textContent = 'No se pudo cargar la lista. Recarga la página para intentarlo de nuevo.';
    $('visible-count').textContent = 'Lista no disponible';
    return;
  }

  updateCountdown();
  setInterval(updateCountdown, 60000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateCountdown();
  });
  if (location.protocol === 'file:') $('offline-download').hidden = true;
  $('search').addEventListener('input', event => {
    query = event.target.value.trim();
    renderGroups();
  });
  $('pending-button').addEventListener('click', () => {
    pending = !pending;
    $('pending-button').setAttribute('aria-pressed', String(pending));
    renderGroups();
  });
  $('export-button').addEventListener('click', exportProgress);
  $('import-button').addEventListener('click', () => $('import-input').click());
  $('import-input').addEventListener('change', event => importProgress(event.target.files[0]));
  $('install-button').addEventListener('click', installApp);
  $('close-dialog').addEventListener('click', () => $('install-dialog').close());
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
  });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

init();
