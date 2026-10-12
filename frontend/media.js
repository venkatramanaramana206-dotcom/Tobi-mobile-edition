// Music player, photo editing (canvas) and video trim/compress (MediaRecorder).
import { log } from './ui.js';

const audio = document.getElementById('audio');
const cv = document.getElementById('photo');
const ctx = cv.getContext('2d');
const vid = document.getElementById('video');
let list = [], idx = 0;

/* ---------- Music ---------- */
function load() { audio.src = URL.createObjectURL(list[idx]); }
function need() { if (!list.length) throw new Error('No music loaded. Tap the Music button and pick songs.'); }
audio.addEventListener('ended', () => { if (list.length > 1) music.next(); });
export function addMusic(files) { list = [...files]; idx = 0; load(); log(`${list.length} song(s) ready.`); }
export const music = {
  async play() { need(); await audio.play(); return 'Playing ' + list[idx].name.replace(/\.[^.]+$/, ''); },
  pause() { audio.pause(); return 'Music paused'; },
  next() { need(); idx = (idx + 1) % list.length; load(); audio.play(); return 'Next song'; },
  prev() { need(); idx = (idx - 1 + list.length) % list.length; load(); audio.play(); return 'Previous song'; },
  volume(up) { audio.volume = Math.min(1, Math.max(0, audio.volume + (up ? 0.2 : -0.2))); return 'Volume ' + Math.round(audio.volume * 100) + ' percent'; },
};

/* ---------- Photo ---------- */
export function addPhoto(file) {
  const img = new Image();
  img.onload = () => { cv.width = img.width; cv.height = img.height; ctx.drawImage(img, 0, 0); cv.hidden = false; log('Photo loaded. Say grayscale, blur, rotate, resize, or save photo.'); };
  img.onerror = () => log('Could not open that image.', 'err');
  img.src = URL.createObjectURL(file);
}
function edit(w, h, fn) {
  if (cv.hidden) throw new Error('First add a photo using the Photo button.');
  const t = document.createElement('canvas'); t.width = cv.width; t.height = cv.height;
  t.getContext('2d').drawImage(cv, 0, 0);
  cv.width = w; cv.height = h;
  fn(ctx, t);
}
const filt = f => () => { edit(cv.width, cv.height, (c, t) => { c.filter = f; c.drawImage(t, 0, 0); }); return 'Done'; };
export const photo = {
  gray: filt('grayscale(1)'),
  blur: filt('blur(4px)'),
  sepia: filt('sepia(1)'),
  bright: filt('brightness(1.3)'),
  rotate() { edit(cv.height, cv.width, (c, t) => { c.translate(cv.width, 0); c.rotate(Math.PI / 2); c.drawImage(t, 0, 0); }); return 'Rotated'; },
  resize() { edit(Math.max(1, cv.width >> 1), Math.max(1, cv.height >> 1), (c, t) => c.drawImage(t, 0, 0, cv.width, cv.height)); return 'Resized to half'; },
  save() { if (cv.hidden) throw new Error('No photo to save.'); const u = cv.toDataURL('image/jpeg', 0.92); log('Tap to download edited photo', 'bot', u, 'zpi-photo.jpg'); return 'Photo ready. Tap the link to download.'; },
};

/* ---------- Video ---------- */
export function addVideo(file) { vid.src = URL.createObjectURL(file); vid.hidden = false; log('Video loaded. Say trim video or compress video.'); }
async function record(maxSec, bps, label) {
  if (vid.hidden || !vid.src) throw new Error('First add a video using the Video button.');
  if (!vid.captureStream || !window.MediaRecorder) throw new Error('Video editing is not supported in this browser. Use Chrome.');
  vid.currentTime = 0;
  const rec = new MediaRecorder(vid.captureStream(), { videoBitsPerSecond: bps });
  const chunks = [];
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  const done = new Promise(r => (rec.onstop = r));
  const stop = () => { if (rec.state !== 'inactive') rec.stop(); vid.pause(); };
  vid.onended = stop;
  rec.start();
  await vid.play();
  setTimeout(stop, Math.min(maxSec, vid.duration || maxSec) * 1000);
  await done;
  const url = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || 'video/webm' }));
  log(`Tap to download ${label} video`, 'bot', url, `zpi-${label}.webm`);
  return `Your ${label} video is ready. Tap the link to download.`;
}
export const video = {
  trim: () => record(10, 2_500_000, 'trimmed'),
  compress: () => record(Infinity, 600_000, 'compressed'),
};
