const STORAGE_KEY = 'xinema_scripts';

function generateId() {
  return (window.crypto?.randomUUID?.()) ||
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getAllScripts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveScript(script) {
  const all = getAllScripts();
  const idx = all.findIndex(s => s.id === script.id);
  if (idx >= 0) {
    all[idx] = script;
  } else {
    all.push(script);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  window.dispatchEvent(new CustomEvent('xinema:scriptsUpdated'));
}

export function deleteScript(id) {
  const all = getAllScripts().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  window.dispatchEvent(new CustomEvent('xinema:scriptsUpdated'));
}

export function duplicateScript(id) {
  const all = getAllScripts();
  const orig = all.find(s => s.id === id);
  if (!orig) return;
  const copy = {
    ...orig,
    id: generateId(),
    name: `Copy of ${orig.name}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  all.push(copy);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  window.dispatchEvent(new CustomEvent('xinema:scriptsUpdated'));
}

export function parseSentences(text) {
  if (!text || !text.trim()) return [];
  // Split on sentence-ending punctuation followed by whitespace or end
  return text
    .split(/(?<=[.?!])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

export { generateId };
