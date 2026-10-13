 const $=i=>document.getElementById(i),has=(t,...k)=>k.some(x=>t.includes(x)),strip=(t,w)=>t.split(/\s+/).filter(x=>x&&!w.includes(x)).join(' ');
function log(t,c='',h,d){const e=document.createElement('div');e.className='m '+c;if(h){const a=document.createElement('a');a.href=h;a.textContent=t;if(d)a.download=d;e.append(a)}else e.textContent=t;$('log').append(e);if(window.rdy)e.scrollIntoView({block:'end'})}
function askKey(){const g=$('dlg'),i=$('ki');return new Promise(r=>{i.value='';g.returnValue='';g.onclose=()=>r(g.returnValue==='ok'&&i.value.trim()?i.value.trim():null);g.showModal()})}

/* secure key storage: AES-GCM, non-extractable key in IndexedDB */
const db=()=>new Promise((o,x)=>{const r=indexedDB.open('zpi-secure',2);r.onupgradeneeded=()=>{const d=r.result;['k','songs'].forEach(n=>d.objectStoreNames.contains(n)||d.createObjectStore(n))};r.onsuccess=()=>o(r.result);r.onerror=()=>x(r.error)});
const dbq=async(m,f,st='k')=>{const d=await db();return new Promise((o,x)=>{const q=f(d.transaction(st,m).objectStore(st));q.onsuccess=()=>o(q.result);q.onerror=()=>x(q.error)})};
async function mk(){let k=await dbq('readonly',s=>s.get('master'));if(!k){k=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);await dbq('readwrite',s=>s.put(k,'master'))}return k}
async function saveKey(t){const iv=crypto.getRandomValues(new Uint8Array(12)),ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},await mk(),new TextEncoder().encode(t));localStorage.zpi_key_gemini=JSON.stringify({iv:[...iv],ct:[...new Uint8Array(ct)]})}
async function loadKey(){const r=localStorage.zpi_key_gemini;if(!r)return null;try{const{iv,ct}=JSON.parse(r);return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(iv)},await mk(),new Uint8Array(ct)))}catch{return null}}
async function setKey(){const k=await askKey();if(!k)return false;await saveKey(k);return true}

/* speech */
const lang={v:localStorage.zpi_lang||'en-IN'};
function speak(t){return new Promise(res=>{if(!('speechSynthesis' in window))return res();const c=t.replace(/[*#`_]/g,''),u=new SpeechSynthesisUtterance(c);u.lang=/[\u0C00-\u0C7F]/.test(c)?'te-IN':/[\u0900-\u097F]/.test(c)?'hi-IN':'en-IN';u.onend=u.onerror=()=>res();speechSynthesis.cancel();speechSynthesis.speak(u);setTimeout(res,30000)})}
const mic1='Microphone permission is blocked. Allow the microphone in browser settings.',ERR={'not-allowed':mic1,'service-not-allowed':mic1,'network':'Voice needs internet right now. Check your connection, or type commands.','audio-capture':'I could not find a microphone.','language-not-supported':'Offline voice for this language is not installed. You can type commands.'};
function listen(){return new Promise((res,rej)=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition,bad=m=>{const e=new Error(m);e.fatal=true;rej(e)};if(!SR)return bad('Voice recognition is not supported here. Please use Chrome on Android.');const r=new SR();r.lang=lang.v;if(!navigator.onLine){if('processLocally' in r)r.processLocally=true;else return bad('Voice needs internet in this browser. You can still type commands.')}r.onresult=e=>res(e.results[0][0].transcript.toLowerCase().trim());r.onerror=e=>{if(e.error==='no-speech'||e.error==='aborted')return res(null);const x=new Error(ERR[e.error]||'Voice recognition error: '+e.error);x.fatal=Object.keys(ERR).includes(e.error);rej(x)};r.onend=()=>res(null);r.start()})}

/* Gemini AI with Google Search, remembers the last few turns */
const G='https://generativelanguage.googleapis.com/v1beta/',MK='zpi_model_v2',hist=[];
async function findModel(key){const r=await fetch(G+'models?pageSize=100',{headers:{'x-goog-api-key':key}});if(!r.ok)throw new Error('I could not list the available AI models.');const n=(await r.json()).models.filter(m=>(m.supportedGenerationMethods||[]).includes('generateContent')).map(m=>m.name.replace('models/',''));const p=n.find(x=>x==='gemini-3.8-flash')||n.find(x=>x==='gemini-flash-latest')||n.filter(x=>/flash/.test(x)&&!/lite|image|tts|live|thinking|exp|preview/.test(x)).sort().pop()||n.find(x=>/flash/.test(x));if(!p)throw new Error('No usable AI model was found for your key.');localStorage[MK]=p;return p}
async function gemini(text){
  let key=await loadKey();
  if(!key){if(!(await setKey()))throw new Error('No AI key saved. Tap the AI key button to add one.');key=await loadKey()}
  let model=localStorage[MK]||'gemini-3.8-flash',tools=true;
  hist.push({role:'user',parts:[{text}]});
  const fail=m=>{hist.pop();throw new Error(m)};
  for(let a=0;a<3;a++){
    const c=hist.slice(-8);while(c.length&&c[0].role!=='user')c.shift();
    const body={systemInstruction:{parts:[{text:'You are ZPI, a helpful voice assistant. Answer in 2 to 4 short spoken sentences, in the same language the user speaks. Use Google Search for current facts.'}]},contents:c};
    if(tools)body.tools=[{google_search:{}}];
    let r;
    try{r=await fetch(G+'models/'+model+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(body)})}
    catch{fail('I could not reach the AI service. Check your internet.')}
    if(r.ok){const d=await r.json(),o=((((d.candidates||[])[0]||{}).content||{}).parts||[]).map(p=>p.text||'').join('').trim();if(!o)fail('The AI gave an empty answer. Please try again.');localStorage[MK]=model;hist.push({role:'model',parts:[{text:o}]});return o}
    const err=((await r.json().catch(()=>({}))).error||{}).message||'';
    if((r.status===400&&/API key/i.test(err))||r.status===403)fail('Your Gemini key was rejected. Tap the AI key button to change it.');
    if(r.status===429)fail('AI limit reached. Please try again in a minute.');
    if(r.status===404||/no longer available|not found/i.test(err)){model=await findModel(key);continue}
    if(tools){tools=false;continue}
    fail('AI error: '+(err||r.status));
  }
  fail('The AI is not available right now.');
}

/* media */
const audio=$('audio'),cv=$('photo'),ctx=cv.getContext('2d'),vid=$('video');
let list=[],idx=0;
const loadSong=()=>{audio.src=URL.createObjectURL(list[idx])},need=()=>{if(!list.length)throw new Error('No music loaded. Tap Tools, then Songs, and pick songs.')},sname=()=>list[idx].name.replace(/\.[^.]+$/,'');
audio.addEventListener('ended',()=>{if(list.length>1)music.next()});
const music={
  async play(){need();await audio.play();return 'Playing '+sname()},
  pause(){audio.pause();return 'Music paused'},
  next(){need();idx=(idx+1)%list.length;loadSong();audio.play();return 'Next song'},
  prev(){need();idx=(idx-1+list.length)%list.length;loadSong();audio.play();return 'Previous song'},
  volume(u){audio.volume=Math.min(1,Math.max(0,audio.volume+(u?0.2:-0.2)));return 'Volume '+Math.round(audio.volume*100)+' percent'}
};
function edit(w,h,fn){if(cv.hidden)throw new Error('First add a photo. Tap Tools, then Photo.');const t=document.createElement('canvas');t.width=cv.width;t.height=cv.height;t.getContext('2d').drawImage(cv,0,0);cv.width=w;cv.height=h;fn(ctx,t)}
const filt=f=>()=>{edit(cv.width,cv.height,(c,t)=>{c.filter=f;c.drawImage(t,0,0)});return 'Done'};
const photo={
  gray:filt('grayscale(1)'),blur:filt('blur(4px)'),
  rotate(){edit(cv.height,cv.width,(c,t)=>{c.translate(cv.width,0);c.rotate(Math.PI/2);c.drawImage(t,0,0)});return 'Rotated'},
  resize(){edit(Math.max(1,cv.width>>1),Math.max(1,cv.height>>1),(c,t)=>c.drawImage(t,0,0,cv.width,cv.height));return 'Resized to half'},
  save(){if(cv.hidden)throw new Error('No photo to save.');log('Tap to download edited photo','',cv.toDataURL('image/jpeg',0.92),'zpi-photo.jpg');return 'Photo ready. Tap the link to download.'}
};
async function record(max,bps,label){
  if(vid.hidden||!vid.src)throw new Error('First add a video. Tap Tools, then Video.');
  if(!vid.captureStream||!window.MediaRecorder)throw new Error('Video editing is not supported in this browser. Use Chrome.');
  vid.currentTime=0;
  const rec=new MediaRecorder(vid.captureStream(),{videoBitsPerSecond:bps}),ch=[];
  rec.ondataavailable=e=>e.data.size&&ch.push(e.data);
  const done=new Promise(r=>rec.onstop=r),halt=()=>{if(rec.state!=='inactive')rec.stop();vid.pause()};
  vid.onended=halt;rec.start();await vid.play();
  setTimeout(halt,Math.min(max,vid.duration||max)*1000);await done;
  log('Tap to download '+label+' video','',URL.createObjectURL(new Blob(ch,{type:rec.mimeType||'video/webm'})),'zpi-'+label+'.webm');
  return 'Your '+label+' video is ready. Tap the link to download.';
}
const video={trim:t=>record(+(t.match(/\d+/)||[10])[0],2500000,'trimmed'),compress:()=>record(Infinity,600000,'compressed')};

/* commands */
function go(u,l){log(l,'',u);if(!window.open(u,'_blank'))location.href=u}
const time=()=>'The time is '+new Date().toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'}),date=()=>'Today is '+new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
const PK={whatsapp:'com.whatsapp',youtube:'com.google.android.youtube','youtube music':'com.google.android.apps.youtube.music',instagram:'com.instagram.android',facebook:'com.facebook.katana',telegram:'org.telegram.messenger',gmail:'com.google.android.gm',maps:'com.google.android.apps.maps',chrome:'com.android.chrome',spotify:'com.spotify.music',netflix:'com.netflix.mediaclient',calculator:'com.google.android.calculator','play store':'com.android.vending',phonepe:'com.phonepe.app','google pay':'com.google.android.apps.nbu.paisa.user',photos:'com.google.android.apps.photos'};
const ALIAS={'వాట్సాప్':'whatsapp','యూట్యూబ్':'youtube','కెమెరా':'camera','సెట్టింగ్స్':'settings','క్రోమ్':'chrome','ఇన్స్టాగ్రామ్':'instagram','జీమెయిల్':'gmail','మ్యాప్స్':'maps','whats app':'whatsapp','you tube':'youtube'};
const OPENW=['please','open','launch','start','ఓపెన్','app','యాప్','చేయి','చెయ్యి','చెయ్','చేయండి','చేయ్','the','my'];
function openApp(t){
  let n=strip(t,OPENW);n=ALIAS[n]||n;
  if(!n)throw new Error('I did not catch which app to open.');
  const I='intent:#Intent;action=android.',S={camera:I+'media.action.IMAGE_CAPTURE;end',settings:I+'settings.SETTINGS;end',phone:I+'intent.action.DIAL;end'};
  let u=S[n];
  if(!u){const p=PK[n]||PK[n.replace(/ /g,'')];if(!p)throw new Error("I don't know the app "+n+'. I can open: '+Object.keys(PK).join(', ')+', camera, settings, phone.');u=I+'intent.action.MAIN;category=android.intent.category.LAUNCHER;package='+p+';S.browser_fallback_url='+encodeURIComponent('https://play.google.com/store/apps/details?id='+p)+';end'}
  location.href=u;
  setTimeout(()=>{if(!document.hidden)log('Tap here to open '+n,'',u)},1500);
  return 'Opening '+n;
}
const WMO={0:'clear sky',1:'mainly clear',2:'partly cloudy',3:'overcast',45:'foggy',51:'light drizzle',61:'light rain',63:'rain',65:'heavy rain',71:'snow',80:'rain showers',95:'a thunderstorm'};
const where=()=>new Promise(res=>{if(!navigator.geolocation)return res(null);navigator.geolocation.getCurrentPosition(p=>res({lat:p.coords.latitude,lon:p.coords.longitude,name:'your location'}),()=>res(null),{timeout:6000,maximumAge:600000})});
async function geo(city){const r=await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&name='+encodeURIComponent(city));if(!r.ok)throw new Error('The weather service returned an error.');const d=await r.json();if(!d.results||!d.results[0])throw new Error('I could not find the city '+city);const x=d.results[0];return{lat:x.latitude,lon:x.longitude,name:x.name}}
async function wxData(city){
  let p,r;
  try{p=city?await geo(city):((await where())||await geo(localStorage.zpi_city||'Hyderabad'));r=await fetch('https://api.open-meteo.com/v1/forecast?latitude='+p.lat+'&longitude='+p.lon+'&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code')}
  catch(e){if(e instanceof TypeError)throw new Error('I could not reach the weather service. Check your internet.');throw e}
  if(!r.ok)throw new Error('The weather service returned an error.');
  const c=(await r.json()).current;
  return{name:p.name,t:Math.round(c.temperature_2m),f:Math.round(c.apparent_temperature),h:c.relative_humidity_2m,d:WMO[c.weather_code]||'unknown conditions'};
}
async function weather(t){
  const m=t.match(/(?:in|at|for)\s+([a-z .]+)$/),d=await wxData(m?m[1].replace(/\s*(please|today|now)$/,'').trim():null);
  $('wx').textContent=d.t+'°C';
  return 'In '+d.name+', it is '+d.t+' degrees Celsius with '+d.d+'. Feels like '+d.f+'. Humidity '+d.h+' percent.';
}
const SVC={'youtube music':q=>'https://music.youtube.com/search?q='+q,spotify:q=>'https://open.spotify.com/search/'+q,youtube:q=>'https://www.youtube.com/results?search_query='+q};
const PLAYW=['please','play','ప్లే','song','songs','music','పాట','పాటలు','సాంగ్','సాంగ్స్','చేయి','చెయ్యి','చెయ్','చేయండి','చేయ్','on','in','from','the','a','ఒక','ఈ'];
async function playSong(t){
  const x=t.replace(/you ?tube music/g,'youtube music'),svc=Object.keys(SVC).find(k=>x.includes(k))||null,q=strip(x.replace(/youtube music|spotify|youtube/g,' '),PLAYW);
  if(!q){if(svc)return openApp('open '+svc);if(!list.length)throw new Error('No songs on this device yet. Say play and a song name, like play Butta Bomma, or tap Tools, then Songs.');return music.play()}
  if(!svc){const h=list.findIndex(f=>f.name.toLowerCase().includes(q));if(h>=0){idx=h;loadSong();await audio.play();return 'Playing '+sname()}}
  if(!navigator.onLine)throw new Error('You are offline. I can only play songs you added with the Songs button.');
  const k=svc||'youtube';go(SVC[k](encodeURIComponent(q)),'Tap to open '+q);return 'Playing '+q+' on '+k;
}
const youtube=t=>{const q=strip(t,['youtube','యూట్యూబ్','search','for','on','play','open','find','in']);if(!q)throw new Error('What should I search on YouTube?');go('https://www.youtube.com/results?search_query='+encodeURIComponent(q),'Tap to open YouTube results');return 'Searching YouTube for '+q};
const google=t=>{const q=strip(t,['google','search','for','on','the','web','browser','internet','వెతుకు']);if(!q)throw new Error('What should I search for?');go('https://www.google.com/search?q='+encodeURIComponent(q),'Tap to open search results');return 'Searching for '+q};
const ROUTES=[
  [t=>has(t,'reset api key','change api key','reset ai key'),async()=>(await setKey())?'Your new AI key is saved.':'No key saved.'],
  [t=>/^(please )?(open|launch|start|ఓపెన్)(\s|$)/.test(t)||t.includes('ఓపెన్'),openApp],
  [t=>has(t,'next song','next track'),music.next],
  [t=>has(t,'previous song','previous track'),music.prev],
  [t=>has(t,'volume up','increase volume'),()=>music.volume(true)],
  [t=>has(t,'volume down','decrease volume'),()=>music.volume(false)],
  [t=>/^(please )?(pause|stop music|stop the music|stop song|resume)/.test(t),music.pause],
  [t=>/^(please )?(play(\s|$)|ప్లే)/.test(t)||has(t,'ప్లే','పాట','సాంగ్','play song','play music'),playSong],
  [t=>has(t,'youtube','యూట్యూబ్'),youtube],
  [t=>has(t,'weather','temperature','forecast','వాతావరణం','వెదర్'),weather],
  [t=>has(t,'what time','current time','the time','సమయం','టైం'),time],
  [t=>has(t,'what date',"today's date",'what day','తేదీ','డేట్'),date],
  [t=>has(t,'grayscale','black and white'),photo.gray],
  [t=>has(t,'blur'),photo.blur],
  [t=>has(t,'rotate'),photo.rotate],
  [t=>has(t,'resize'),photo.resize],
  [t=>has(t,'save photo','download photo'),photo.save],
  [t=>has(t,'trim video'),video.trim],
  [t=>has(t,'compress video'),video.compress],
  [t=>/^(search|google)(\s|$)/.test(t),google],
  [()=>true,gemini]
];
const NET=new Set([youtube,weather,google,gemini]);
async function route(t){for(const[m,f]of ROUTES)if(m(t)){if(NET.has(f)&&!navigator.onLine)throw new Error('You are offline. That needs internet. Offline I can do time, date, music, photo and video editing, and open apps.');return await f(t)}}

/* main */
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
async function loop(){while(on){try{vs('Listening');const t=await listen();if(t)await handle(t)}catch(e){await say(e.message,'er');if(e.fatal)return stopMic();await new Promise(r=>setTimeout(r,1000))}}}
function stopMic(){on=false;$('mic').classList.remove('on');vs('Standby')}
$('mic').onclick=()=>{if(on)return stopMic();on=true;$('mic').classList.add('on');loop()};
$('f').onsubmit=e=>{e.preventDefault();const t=$('txt').value.toLowerCase().trim();$('txt').value='';if(t)handle(t)};
document.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{const c=b.dataset.c;if(c.endsWith(' ')){$('txt').value=c;$('txt').focus()}else handle(c)});
$('lang').value=lang.v;
$('lang').onchange=e=>{lang.v=e.target.value;localStorage.zpi_lang=lang.v;log('Language: '+lang.v)};
$('fM').onchange=async e=>{if(!e.target.files.length)return;list=[...e.target.files];idx=0;loadSong();log(list.length+' song(s) ready. Say play music.');try{await dbq('readwrite',s=>s.put(list,'list'),'songs')}catch{log('Songs could not be saved for next time.','er')}};
$('fP').onchange=e=>{const f=e.target.files[0];if(!f)return;const i=new Image();i.onload=()=>{cv.width=i.width;cv.height=i.height;ctx.drawImage(i,0,0);cv.hidden=false;log('Photo loaded. Say grayscale, blur, rotate, resize, or save photo.')};i.onerror=()=>log('Could not open that image.','er');i.src=URL.createObjectURL(f)};
$('fV').onchange=e=>{const f=e.target.files[0];if(f){vid.src=URL.createObjectURL(f);vid.hidden=false;log('Video loaded. Say trim video, trim video 5 seconds, or compress video.')}};
$('kA').onclick=async()=>{if(await setKey())log('AI key saved securely.')};
$('wxc').onclick=()=>handle('weather');
setInterval(()=>{$('ck').textContent=new Date().toLocaleTimeString('en-IN')},1000);
if(navigator.getBattery)navigator.getBattery().then(b=>{const u=()=>{$('bt').textContent=Math.round(b.level*100)+'%'+(b.charging?' ⚡':'')};u();b.onlevelchange=b.onchargingchange=u});
(async function init(){
  if(!localStorage.zpi_asked&&!(await loadKey())){localStorage.zpi_asked='1';await setKey()}
  try{const sv=await dbq('readonly',x=>x.get('list'),'songs');if(sv&&sv.length){list=sv;idx=0;loadSong();log(list.length+' saved song(s) ready. Say play music.')}}catch{}
  log('Hello, I am ZPI. Tap the orb and speak, or type a command or any question.');
  window.rdy=true;
  if(navigator.onLine)wxData(localStorage.zpi_city||'Hyderabad').then(d=>{$('wx').textContent=d.t+'°C'}).catch(()=>{});
})();
