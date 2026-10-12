 // API key is encrypted with AES-GCM. The CryptoKey is non-extractable and
// lives in IndexedDB, so the key cannot be read as plain text from storage.
const idb = () => new Promise((res, rej) => {
  const r = indexedDB.open('zpi-secure', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('k');
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
const idbGet = async k => { const db = await idb(); return new Promise((res, rej) => { const q = db.transaction('k').objectStore('k').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); };
const idbSet = async (k, v) => { const db = await idb(); return new Promise((res, rej) => { const q = db.transaction('k', 'readwrite').objectStore('k').put(v, k); q.onsuccess = () => res(); q.onerror = () => rej(q.error); }); };

async function masterKey() {
  let k = await idbGet('master');
  if (!k) {
    k = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await idbSet('master', k);
  }
  return k;
}

export async function saveKey(text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await masterKey(), new TextEncoder().encode(text));
  localStorage.setItem('zpi_key', JSON.stringify({ iv: [...iv], ct: [...new Uint8Array(ct)] }));
}

export async function loadKey() {
  const raw = localStorage.getItem('zpi_key');
  if (!raw) return null;
  try {
    const { iv, ct } = JSON.parse(raw);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, await masterKey(), new Uint8Array(ct));
    return new TextDecoder().decode(pt);
  } catch { return null; }
}

export const clearKey = () => localStorage.removeItem('zpi_key');
