const $=i=>document.getElementById(i);
const has=(t,...k)=>k.some(x=>t.includes(x));
const strip=(t,w)=>t.replace(new RegExp('('+w.join('|')+')','g'),' ').replace(/\s+/g,' ').trim();
function log(t,c='',h,d){const e=document.createElement('div');e.className='m '+c;if(h){const a=document.createElement('a');a.href=h;a.textContent=t;if(d)a.download=d;e.append(a)}else e.textContent=t;$('log').append(e);if(window.rdy)e.scrollIntoView({block:'end'})}
function askKey(l){const g=$('dlg'),i=$('ki');$('dt').textContent='Enter your '+l+' API key.';return new Promise(r=>{i.value='';g.returnValue='';g.onclose=()=>r(g.returnValue==='ok'&&i.value.trim()?i.value.trim():null);g.showModal()})}

/* ===== secure key storage: AES-GCM, non-extractable key in IndexedDB ===== */
const db=()=>new Promise((o,x)=>{const r=indexedDB.open('zpi-secure',1);r.onupgradeneeded=()=>r.result.createObjectStore('k');r.onsuccess=()=>o(r.result);r.onerror=()=>x(r.error)});
const dbq=async(m,f)=>{const d=await db();return new Promise((o,x)=>{const q=f(d.transaction('k',m).objectStore('k'));q.onsuccess=()=>o(q.result);q.onerror=()=>x(q.error)})};
async function mk(){let k=await dbq('readonly',s=>s.get('master'));if(!k){k=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);await dbq('readwrite',s=>s.put(k,'master'))}return k}
async function saveKey(n,t){const iv=crypto.getRandomValues(new Uint8Array(12)),ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},await mk(),new TextEncoder().encode(t));localStorage['zpi_key_'+n]=JSON.stringify({iv:[...iv],ct:[...new Uint8Array(ct)]})}
async function loadKey(n){const r=localStorage['zpi_key_'+n];if(!r)return null;try{const{iv,ct}=JSON.parse(r);return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(iv)},await mk(),new Uint8Array(ct)))}catch{return null}}
async function setKey(n,l){const k=await askKey(l);if(!k)return false;await saveKey(n,k);return true}

/* ===== speech ===== */
const lang={v:localStorage.zpi_lang||'en-IN'};
function speak(t){return new Promise(res=>{if(!('speechSynthesis' in window))return res();const c=t.replace(/[*#`_]/g,''),u=new SpeechSynthesisUtterance(c);u.lang=/[\u0C00-\u0C7F]/.test(c)?'te-IN':/[\u0900-\u097F]/.test(c)?'hi-IN':'en-IN';u.onend=u.onerror=()=>res();speechSynthesis.cancel();speechSynthesis.speak(u);setTimeout(res,20000)})}
const ERR={'not-allowed':'Microphone permission is blocked. Allow the microphone in browser settings.','service-not-allowed':'Microphone permission is blocked. Allow the microphone in browser settings.','network':'Voice needs internet right now. Check your connection, or type commands.','audio-capture':'I could not find a microphone.','language-not-supported':'Offline voice for this language is not installed. You can type commands.'};
function listen(){return new Promise((res,rej)=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){const e=new Error('Voice recognition is not supported here. Please use Chrome on Android.');e.fatal=true;return rej(e)}const r=new SR();r.lang=lang.v;if(!navigator.onLine){if('processLocally' in r)r.processLocally=true;else{const e=new Error('Voice needs internet in this browser. You can still type commands.');e.fatal=true;return rej(e)}}r.onresult=e=>res(e.results[0][0].transcript.toLowerCase().trim());r.onerror=e=>{if(e.error==='no-speech'||e.error==='aborted')return res(null);const x=new Error(ERR[e.error]||'Voice recognition error: '+e.error);x.fatal=['not-allowed','service-not-allowed','audio-capture','network','language-not-supported'].includes(e.error);rej(x)};r.onend=()=>res(null);r.start()})}

/* ===== Gemini AI: default gemini-3.8-flash, auto-detects another model if it fails ===== */
const G='https://generativelanguage.googleapis.com/v1beta/',MK='zpi_model_v2';
async function findModel(key){const r=await fetch(G+'models?pageSize=100',{headers:{'x-goog-api-key':key}});if(!r.ok)throw new Error('I could not list the available AI models.');const n=(await r.json()).models.filter(m=>(m.supportedGenerationMethods||[]).includes('generateContent')).map(m=>m.name.replace('models/',''));const p=n.find(x=>x==='gemini-3.8-flash')||n.find(x=>x==='gemini-flash-latest')||n.filter(x=>/flash/.test(x)&&!/lite|image|tts|live|thinking|exp|preview/.test(x)).sort().pop()||n.find(x=>/flash/.test(x));if(!p)throw new Error('No usable AI model was found for your key.');localStorage[MK]=p;return p}
async function gemini(text){
  let key=await loadKey('gemini');
  if(!key){if(!(await setKey('gemini','Gemini')))throw new Error('No AI key saved. Tap the AI key button to add one.');key=await loadKey('gemini')}
  let model=localStorage[MK]||'gemini-3.8-flash';
  for(let a=0;a<2;a++){
    let r;
    try{r=await fetch(G+'models/'+model+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({systemInstruction:{parts:[{text:'You are ZPI, a helpful voice assistant. Answer briefly, in the same language the user speaks.'}]},contents:[{role:'user',parts:[{text}]}]})})}
    catch{throw new Error('I could not reach the AI service. Check your internet.')}
    if(r.ok){const d=await r.json();const o=((d.candidates&&d.candidates[0]&&d.candidates[0].content&&d.candidates[0].content.parts)||[]).map(p=>p.text||'').join('').trim();if(!o)throw new Error('The AI gave an empty answer. Please try again.');localStorage[MK]=model;return o}
    const err=((await r.json().catch(()=>({}))).error||{}).message||'';
    if((r.status===400&&/API key/i.test(err))||r.status===403)throw new Error('Your Gemini key was rejected. Tap the AI key button to change it.');
    if(r.status===429)throw new Error('AI limit reached. Please try again in a minute.');
    if(a===0&&(r.status===404||/no longer available|not found/i.test(err))){model=await findModel(key);continue}
    throw new Error('AI error: '+(err||r.status));
  }
}

/* ===== media ===== */
const audio=$('audio'),cv=$('photo'),ctx=cv.getContext('2d'),vid=$('video');
let list=[],idx=0;
const loadSong=()=>{audio.src=URL.createObjectURL(list[idx])};
const need=()=>{if(!list.length)throw new Error('No music loaded. Tap the Songs button and pick songs.')};
audio.addEventListener('ended',()=>{if(list.length>1)music.next()});
const music={
  async play(){need();await audio.play();return 'Playing '+list[idx].name.replace(/\.[^.]+$/,'')},
  pause(){audio.pause();return 'Music paused'},
  next(){need();idx=(idx+1)%list.length;loadSong();audio.play();return 'Next song'},
  prev(){need();idx=(idx-1+list.length)%list.length;loadSong();audio.play();return 'Previous song'},
  volume(u){audio.volume=Math.min(1,Math.max(0,audio.volume+(u?0.2:-0.2)));return 'Volume '+Math.round(audio.volume*100)+' percent'}
};
function edit(w,h,fn){if(cv.hidden)throw new Error('First add a photo using the Photo button.');const t=document.createElement('canvas');t.width=cv.width;t.height=cv.height;t.getContext('2d').drawImage(cv,0,0);cv.width=w;cv.height=h;fn(ctx,t)}
const filt=f=>()=>{edit(cv.width,cv.height,(c,t)=>{c.filter=f;c.drawImage(t,0,0)});return 'Done'};
const photo={
  gray:filt('grayscale(1)'),blur:filt('blur(4px)'),sepia:filt('sepia(1)'),bright:filt('brightness(1.3)'),
  rotate(){edit(cv.height,cv.width,(c,t)=>{c.translate(cv.width,0);c.rotate(Math.PI/2);c.drawImage(t,0,0)});return 'Rotated'},
  resize(){edit(Math.max(1,cv.width>>1),Math.max(1,cv.height>>1),(c,t)=>c.drawImage(t,0,0,cv.width,cv.height));return 'Resized to half'},
  save(){if(cv.hidden)throw new Error('No photo to save.');log('Tap to download edited photo','',cv.toDataURL('image/jpeg',0.92),'zpi-photo.jpg');return 'Photo ready. Tap the link to download.'}
};
async function record(max,bps,label){
  if(vid.hidden||!vid.src)throw new Error('First add a video using the Video button.');
  if(!vid.captureStream||!window.MediaRecorder)throw new Error('Video editing is not supported in this browser. Use Chrome.');
  vid.currentTime=0;
  const rec=new MediaRecorder(vid.captureStream(),{videoBitsPerSecond:bps}),ch=[];
  rec.ondataavailable=e=>e.data.size&&ch.push(e.data);
  const done=new Promise(r=>rec.onstop=r);
  const halt=()=>{if(rec.state!=='inactive')rec.stop();vid.pause()};
  vid.onended=halt;rec.start();await vid.play();
  setTimeout(halt,Math.min(max,vid.duration||max)*1000);await done;
  log('Tap to download '+label+' video','',URL.createObjectURL(new Blob(ch,{type:rec.mimeType||'video/webm'})),'zpi-'+label+'.webm');
  return 'Your '+label+' video is ready. Tap the link to download.';
}
const video={trim:()=>record(10,2500000,'trimmed'),compress:()=>record(Infinity,600000,'compressed')};

/* ===== commands ===== */
function go(u,l){log(l,'',u);if(!window.open(u,'_blank'))location.href=u}
const time=()=>'The time is '+new Date().toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'});
const date=()=>'Today is '+new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
const PK={whatsapp:'com.whatsapp',youtube:'com.google.android.youtube',instagram:'com.instagram.android',facebook:'com.facebook.katana',telegram:'org.telegram.messenger',gmail:'com.google.android.gm',maps:'com.google.android.apps.maps',chrome:'com.android.chrome',spotify:'com.spotify.music',calculator:'com.google.android.calculator','play store':'com.android.vending',phonepe:'com.phonepe.app','google pay':'com.google.android.apps.nbu.paisa.user',photos:'com.google.android.apps.photos',clock:'com.google.android.deskclock'};
function openApp(t){
  const n=strip(t,['please','open','launch','start','ఓపెన్','app','యాప్']);
  if(!n)throw new Error('I did not catch which app to open.');
  let u;
  if(n==='camera')u='intent:#Intent;action=android.media.action.IMAGE_CAPTURE;end';
  else if(n==='settings')u='intent:#Intent;action=android.settings.SETTINGS;end';
  else{const p=PK[n];if(!p)throw new Error("I don't know the app "+n+'. I can open: '+Object.keys(PK).join(', ')+', camera, settings.');u='intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package='+p+';S.browser_fallback_url='+encodeURIComponent('https://play.google.com/store/apps/details?id='+p)+';end'}
  log('Tap to open '+n,'',u);location.href=u;return 'Opening '+n;
}
async function wxData(city){
  let key=await loadKey('weather');
  if(!key){if(!(await setKey('weather','OpenWeatherMap')))throw new Error('No weather key saved. Tap the Weather key button to add one.');key=await loadKey('weather')}
  let r;
  try{r=await fetch('https://api.openweathermap.org/data/2.5/weather?q='+encodeURIComponent(city)+'&appid='+key+'&units=metric')}
  catch{throw new Error('I could not reach the weather service. Check your internet.')}
  if(r.status===401)throw new Error('Your weather key is invalid, or not active yet. Tap the Weather key button to change it.');
  if(r.status===404)throw new Error('I could not find the city '+city);
  if(!r.ok)throw new Error('The weather service returned an error.');
  return r.json();
}
async function weather(t){
  const m=t.match(/(?:in|at|for)\s+([a-z .]+)$/),city=m?m[1].trim():(localStorage.zpi_city||'Hyderabad'),d=await wxData(city);
  $('wx').textContent=Math.round(d.main.temp)+'°C '+d.weather[0].main;
  return 'In '+city+', it is '+Math.round(d.main.temp)+' degrees Celsius with '+d.weather[0].description+'. Feels like '+Math.round(d.main.feels_like)+'. Humidity '+d.main.humidity+' percent.';
}
function youtube(t){const q=strip(t,['youtube','యూట్యూబ్','search','for','on','play','open','find']);if(!q)throw new Error('What should I search on YouTube?');go('https://www.youtube.com/results?search_query='+encodeURIComponent(q),'Tap to open YouTube results');return 'Searching YouTube for '+q}
function google(t){const q=strip(t,['google','search','for','on','the','web','browser','internet','వెతుకు']);if(!q)throw new Error('What should I search for?');go('https://www.google.com/search?q='+encodeURIComponent(q),'Tap to open search results');return 'Searching for '+q}
const ROUTES=[
  [t=>has(t,'reset api key','change api key','reset ai key'),async()=>(await setKey('gemini','Gemini'))?'Your new AI key is saved.':'No key saved.'],
  [t=>has(t,'reset weather key'),async()=>(await setKey('weather','OpenWeatherMap'))?'Your new weather key is saved.':'No key saved.'],
  [t=>has(t,'youtube','యూట్యూబ్'),youtube],
  [t=>has(t,'weather','temperature','forecast','వాతావరణం','వెదర్'),weather],
  [t=>has(t,'what time','current time','the time','సమయం','టైం'),time],
  [t=>has(t,'what date',"today's date",'what day','తేదీ','డేట్'),date],
  [t=>has(t,'grayscale','black and white'),photo.gray],
  [t=>has(t,'blur'),photo.blur],
  [t=>has(t,'sepia'),photo.sepia],
  [t=>has(t,'brighten','brightness'),photo.bright],
  [t=>has(t,'rotate'),photo.rotate],
  [t=>has(t,'resize'),photo.resize],
  [t=>has(t,'save photo','download photo'),photo.save],
  [t=>has(t,'trim video'),video.trim],
  [t=>has(t,'compress video'),video.compress],
  [t=>has(t,'next song','next track'),music.next],
  [t=>has(t,'previous song','previous track'),music.prev],
  [t=>has(t,'volume up','increase volume'),()=>music.volume(true)],
  [t=>has(t,'volume down','decrease volume'),()=>music.volume(false)],
  [t=>has(t,'pause','stop music'),music.pause],
  [t=>has(t,'play music','play song','resume music')||/^play$/.test(t),music.play],
  [t=>/^(please )?(open|launch|start|ఓపెన్)\b/.test(t),openApp],
  [t=>/^(search|google)\b/.test(t),google],
  [()=>true,gemini]
];
const NET=new Set([youtube,weather,google,gemini]);
async function route(t){for(const[m,f]of ROUTES)if(m(t)){if(NET.has(f)&&!navigator.onLine)throw new Error('You are offline. That needs internet. Offline I can do time, date, music, photo and video editing, and open apps.');return await f(t)}}

/* ===== main ===== */
let on=false;
const netUI=()=>{$('st').textContent=navigator.onLine?'● SYSTEM READY':'● OFFLINE MODE';$('st').style.color=navigator.onLine?'#4ade80':'#fbbf24'};
addEventListener('online',netUI);addEventListener('offline',netUI);netUI();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
const vs=s=>{$('vs').textContent=s};
async function say(t,c=''){log(t,c);await speak(t)}
async function handle(t){
  log(t,'me');
  if(/^(exit|quit|stop listening|goodbye)/.test(t)){stopMic();return say('Goodbye!')}
  vs('Thinking');
  try{await say((await route(t))||'Sorry, I did not understand that.')}
  catch(e){console.error(e);await say(e.message||'Sorry, something went wrong.','er')}
  vs(on?'Listening':'Standby');
}
async function loop(){
  while(on){
    try{vs('Listening');const t=await listen();if(t)await handle(t)}
    catch(e){await say(e.message,'er');if(e.fatal)return stopMic();await new Promise(r=>setTimeout(r,1000))}
  }
}
function stopMic(){on=false;$('mic').classList.remove('on');vs('Standby')}
$('mic').onclick=()=>{if(on)return stopMic();on=true;$('mic').classList.add('on');loop()};
$('f').onsubmit=e=>{e.preventDefault();const t=$('txt').value.toLowerCase().trim();$('txt').value='';if(t)handle(t)};
document.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{const c=b.dataset.c;if(c.endsWith(' ')){$('txt').value=c;$('txt').focus()}else handle(c)});
$('lang').value=lang.v;
$('lang').onchange=e=>{lang.v=e.target.value;localStorage.zpi_lang=lang.v;log('Language: '+lang.v)};
$('fM').onchange=e=>{if(e.target.files.length){list=[...e.target.files];idx=0;loadSong();log(list.length+' song(s) ready. Say play music.')}};
$('fP').onchange=e=>{const f=e.target.files[0];if(!f)return;const i=new Image();i.onload=()=>{cv.width=i.width;cv.height=i.height;ctx.drawImage(i,0,0);cv.hidden=false;log('Photo loaded. Say grayscale, blur, rotate, resize, or save photo.')};i.onerror=()=>log('Could not open that image.','er');i.src=URL.createObjectURL(f)};
$('fV').onchange=e=>{const f=e.target.files[0];if(f){vid.src=URL.createObjectURL(f);vid.hidden=false;log('Video loaded. Say trim video or compress video.')}};
$('kA').onclick=async()=>{if(await setKey('gemini','Gemini'))log('AI key saved securely.')};
$('kW').onclick=async()=>{if(await setKey('weather','OpenWeatherMap'))log('Weather key saved securely.')};
$('wxc').onclick=()=>handle('weather');
setInterval(()=>{$('ck').textContent=new Date().toLocaleTimeString('en-IN')},1000);
if(navigator.getBattery)navigator.getBattery().then(b=>{const u=()=>{$('bt').textContent=Math.round(b.level*100)+'%'+(b.charging?' ⚡':'')};u();b.onlevelchange=b.onchargingchange=u});
(async function init(){
  if(!(await loadKey('gemini')))await setKey('gemini','Gemini');
  log('Hello, I am ZPI. Tap the orb and speak, or type a command or any question.');
  window.rdy=true;
  if(await loadKey('weather'))wxData(localStorage.zpi_city||'Hyderabad').then(d=>{$('wx').textContent=Math.round(d.main.temp)+'°C '+d.weather[0].main}).catch(()=>{});
})();
