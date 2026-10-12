export const lang = { v: localStorage.zpi_lang || 'en-IN' };

// Text-to-speech. Resolves when finished so we don't listen to ourselves.
export function speak(text) {
  return new Promise(res => {
    if (!('speechSynthesis' in window)) return res();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-IN';
    u.onend = u.onerror = () => res();
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    setTimeout(res, 15000);
  });
}

const ERR = {
  'not-allowed': 'Microphone permission is blocked. Allow the microphone in browser settings.',
  'service-not-allowed': 'Microphone permission is blocked. Allow the microphone in browser settings.',
  'network': 'Speech recognition needs internet. Please check your connection.',
  'audio-capture': 'I could not find a microphone.',
};

export function listen() {
  return new Promise((res, rej) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { const e = new Error('Voice recognition is not supported here. Please use Chrome on Android.'); e.fatal = true; return rej(e); }
    const r = new SR();
    r.lang = lang.v;
    r.onresult = e => res(e.results[0][0].transcript.toLowerCase().trim());
    r.onerror = e => {
      if (e.error === 'no-speech' || e.error === 'aborted') return res(null);
      const err = new Error(ERR[e.error] || 'Voice recognition error: ' + e.error);
      err.fatal = ['not-allowed', 'service-not-allowed', 'audio-capture'].includes(e.error);
      rej(err);
    };
    r.onend = () => res(null);
    r.start();
  });
}
