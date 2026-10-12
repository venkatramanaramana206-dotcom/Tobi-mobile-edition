import { speak, listen, lang } from './speech.js';
import { route } from './commands.js';
import { loadKey, saveKey } from './secure.js';
import { log, askKey } from './ui.js';
import * as M from './media.js';

const $ = id => document.getElementById(id);
let on = false;

async function say(text, cls = 'bot') { log(text, cls); await speak(text); }

async function handle(text) {
  log(text, 'me');
  if (/^(exit|quit|stop listening|goodbye)/.test(text)) { stop(); return say('Goodbye!'); }
  try {
    const reply = await route(text);
    await say(reply || 'Sorry, I did not understand that command.');
  } catch (e) {
    console.error(e);
    await say(e.message || 'Sorry, something went wrong.', 'err');
  }
}

async function loop() {
  while (on) {
    try {
      const t = await listen();
      if (t) await handle(t);
    } catch (e) {
      await say(e.message, 'err');
      if (e.fatal) return stop();
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

function stop() { on = false; $('mic').classList.remove('on'); }
$('mic').onclick = () => {
  if (on) return stop();
  on = true; $('mic').classList.add('on'); loop();
};

$('typed').onsubmit = e => {
  e.preventDefault();
  const t = $('txt').value.toLowerCase().trim();
  $('txt').value = '';
  if (t) handle(t);
};

$('lang').value = lang.v;
$('lang').onchange = e => { lang.v = e.target.value; localStorage.zpi_lang = lang.v; log('Language: ' + lang.v); };
$('fMusic').onchange = e => e.target.files.length && M.addMusic(e.target.files);
$('fPhoto').onchange = e => e.target.files[0] && M.addPhoto(e.target.files[0]);
$('fVideo').onchange = e => e.target.files[0] && M.addVideo(e.target.files[0]);
$('resetKey').onclick = async () => {
  const k = await askKey();
  if (k) { await saveKey(k); log('API key saved securely.'); }
};

(async function init() {
  if (!(await loadKey())) {
    const k = await askKey(); // first launch only
    if (k) await saveKey(k);
  }
  log('Hello, I am ZPI. Tap 🎤 and speak, or type a command.');
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
