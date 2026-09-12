const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const boot=$('#boot'), gate=$('#authGate'), intro=$('#intro'), app=$('#app'), video=$('#introVideo'), nextWrap=$('#nextWrap');
const MEDIA={intro:['assets/intro.mp4'],dashboard:['assets/dashboard-base.mp4']};

setTimeout(()=>boot?.classList.add('hidden'),850);

function showVideoError(id,show=true){const el=$(id); if(el) el.classList.toggle('hidden',!show);}
function loadMedia(el,sources,onFail){
  if(!el)return;
  let i=0;
  const cleanup=()=>el.removeEventListener('error',handleError);
  const handleError=()=>{
    if(i<sources.length){el.src=sources[i++];el.load();return;}
    cleanup();onFail?.();
  };
  el.addEventListener('error',handleError);
  el.src=sources[i++];el.load();
}

function startIntroVideo(){
  nextWrap.classList.remove('show');
  showVideoError('#videoError',false);
  video.muted=true;
  video.autoplay=true;
  video.controls=false;
  video.playsInline=true;
  loadMedia(video,MEDIA.intro,()=>showVideoError('#videoError',true));
  const reveal=()=>video.play().catch(()=>showVideoError('#videoError',true));
  video.addEventListener('canplay',reveal,{once:true});
  if(video.readyState>=3)reveal();
}

$('#fingerprint')?.addEventListener('click',()=>{
  const status=$('#authStatus');
  status.innerHTML='<i style="background:#b77cff;box-shadow:0 0 14px #b77cff"></i> MEMINDAI...';
  const fp=$('#fingerprint');fp.disabled=true;fp.style.pointerEvents='none';
  setTimeout(()=>{
    status.innerHTML='<i></i> AKSES TERVERIFIKASI';
    gate.style.opacity='0';gate.style.transition='.45s';
    setTimeout(()=>{gate.classList.add('hidden');intro.classList.remove('hidden');intro.style.display='grid';startIntroVideo();},450);
  },900);
});
video.addEventListener('loadeddata',()=>showVideoError('#videoError',false));
video.addEventListener('ended',()=>nextWrap.classList.add('show'));
$('#introMute')?.addEventListener('click',()=>{
  video.muted=!video.muted;
  $('#introMute').innerHTML=video.muted?'<span class="svg-icon" data-icon="volume-off"></span>':'<span class="svg-icon" data-icon="volume"></span>';
  mountIcons();
});

/* Dashboard audio sequencing: muted video starts immediately, welcome voice finishes first, then video sound is enabled. */
const dashboardVideo=$('#dashboardVideo'),dashboardMute=$('#dashboardMute');
let dashboardStarted=false,dashboardUserMuted=false,greetingFinished=false;
function updateDashboardMuteIcon(){
  if(!dashboardMute||!dashboardVideo)return;
  dashboardMute.innerHTML=dashboardVideo.muted?'<span class="svg-icon" data-icon="volume-off"></span>':'<span class="svg-icon" data-icon="volume"></span>';
  dashboardMute.setAttribute('aria-label',dashboardVideo.muted?'Nyalakan suara video':'Matikan suara video');
  mountIcons();
}
function playDashboardMuted(){
  if(!dashboardVideo)return Promise.resolve();
  dashboardVideo.muted=true;
  dashboardVideo.loop=true;
  dashboardVideo.playsInline=true;
  return new Promise(resolve=>{
    const ready=()=>{dashboardVideo.play().catch(()=>{});resolve();};
    dashboardVideo.addEventListener('canplay',ready,{once:true});
    loadMedia(dashboardVideo,MEDIA.dashboard,()=>{
      dashboardVideo.style.backgroundImage='url("assets/dashboard-base-poster.jpg")';
      dashboardVideo.style.backgroundSize='cover';
      resolve();
    });
    if(dashboardVideo.readyState>=3)ready();
  });
}
function startDashboardSequence(){
  if(dashboardStarted)return;
  dashboardStarted=true;
  playDashboardMuted();
  const finish=()=>{
    if(greetingFinished)return;
    greetingFinished=true;
    if(!dashboardUserMuted&&dashboardVideo)dashboardVideo.muted=false;
    updateDashboardMuteIcon();
  };
  if(!('speechSynthesis' in window)){setTimeout(finish,1200);return;}
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance('Hello everyone, welcome to LearnX');
  u.lang='en-US';u.rate=.86;u.pitch=1.05;u.volume=.68;
  const voices=window.speechSynthesis.getVoices();
  const preferred=voices.find(v=>/female|samantha|zira|aria|jenny|ava|google us english/i.test(v.name))||voices.find(v=>/^en(-|_)/i.test(v.lang));
  if(preferred)u.voice=preferred;
  u.onend=finish;u.onerror=finish;
  window.speechSynthesis.speak(u);
  setTimeout(finish,7000);
}
dashboardMute?.addEventListener('click',()=>{
  dashboardUserMuted=!dashboardUserMuted;
  if(dashboardVideo){dashboardVideo.muted=dashboardUserMuted;if(!dashboardUserMuted)dashboardVideo.play().catch(()=>{});}
  updateDashboardMuteIcon();
});

$('#nextBtn')?.addEventListener('click',()=>{
  intro.classList.add('hidden');app.classList.remove('hidden');window.scrollTo({top:0,behavior:'instant'});startDashboardSequence();toast('Learning OS siap digunakan');
});

function openSection(id){
  $$('.page').forEach(p=>p.classList.toggle('active-page',p.id===id));
  $$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.section===id));
  window.scrollTo({top:0,behavior:'smooth'});
}
$$('[data-section]').forEach(el=>el.addEventListener('click',e=>{
  const id=el.dataset.section;
  if(id) openSection(id);
}));

const search=$('#globalSearch');
search.addEventListener('keydown',e=>{
  if(e.key==='Enter'){
    const q=search.value.trim().toLowerCase();
    const map=[['jepang','japanese'],['japan','japanese'],['iq','iq'],['psikologi','psychology'],['fokus','focus'],['catatan','notes'],['progress','progress'],['kurikulum','curriculum']];
    const hit=map.find(([k])=>q.includes(k));
    openSection(hit?hit[1]:'curriculum');
    toast(hit?`Membuka ${hit[0]}`:'Membuka kurikulum');
  }
});
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();search.focus();}
});

const musicDock=$('#musicDock');
$('#musicOpen').onclick=()=>musicDock.classList.add('open');
$('#musicClose').onclick=()=>musicDock.classList.remove('open');
$('#themeBtn').onclick=()=>document.body.classList.toggle('light');
const tracks=['ambient','night','zen']; let trackIndex=0, playing=false, audioCtx=null, osc=null, gain=null;
const names={ambient:'Ambient Focus',night:'Night Study',zen:'Zen Notes'};
function updateTrack(){ $('#trackName').textContent=names[tracks[trackIndex]]; $('#trackMeta').textContent='LearnX Sound Engine • Generated locally'; }
function stopTone(){ if(osc){try{osc.stop()}catch{} osc=null} if(audioCtx){audioCtx.close();audioCtx=null} }
function startTone(){
  stopTone();
  audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  gain=audioCtx.createGain(); gain.gain.value=Number($('#volume').value)*.05; gain.connect(audioCtx.destination);
  osc=audioCtx.createOscillator(); osc.type=trackIndex===2?'sine':'triangle'; osc.frequency.value=trackIndex===1?174:trackIndex===2?220:196; osc.connect(gain); osc.start();
}
$('#play').onclick=()=>{playing=!playing;$('#play').innerHTML=playing?'<span class="svg-icon" data-icon="pause"></span>':'<span class="svg-icon" data-icon="play"></span>'; mountIcons();if(playing)startTone();else stopTone()};
$('#prev').onclick=()=>{trackIndex=(trackIndex+tracks.length-1)%tracks.length;updateTrack();if(playing)startTone()};
$('#next').onclick=()=>{trackIndex=(trackIndex+1)%tracks.length;updateTrack();if(playing)startTone()};
$('#volume').oninput=e=>{if(gain)gain.gain.value=Number(e.target.value)*.05};
$$('#trackList button').forEach((b,i)=>b.onclick=()=>{trackIndex=i;updateTrack();playing=true;$('#play').innerHTML='<span class="svg-icon" data-icon="pause"></span>'; mountIcons();startTone()});
$('#musicSearch').addEventListener('input',e=>{
  const q=e.target.value.toLowerCase();
  $$('#trackList button').forEach(b=>b.style.display=b.textContent.toLowerCase().includes(q)?'block':'none');
});

/* Dynamic IQ / logic engine: fresh question signatures are avoided across sessions on this device. */
const IQ_COUNT=10;
const randInt=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const shuffle=a=>{const x=[...a];for(let i=x.length-1;i>0;i--){const j=randInt(0,i);[x[i],x[j]]=[x[j],x[i]]}return x};
const unique=a=>[...new Set(a)];
function makeIQQuestion(){
  const type=randInt(0,6);
  if(type===0){
    const a=randInt(2,12),d=randInt(2,9),n=5,seq=Array.from({length:n+1},(_,i)=>a+d*i),c=seq[n];
    const o=shuffle(unique([c,c+d,c-d,c+2*d]));return [`Pola: ${seq.slice(0,n).join(', ')}, ...`,o.map(String),o.indexOf(c)];
  }
  if(type===1){
    const a=randInt(2,5),r=randInt(2,3),n=4,seq=Array.from({length:n+1},(_,i)=>a*r**i),c=seq[n];
    const o=shuffle(unique([c,c/r,c*r,c+r]));return [`Pola: ${seq.slice(0,n).join(', ')}, ...`,o.map(String),o.indexOf(c)];
  }
  if(type===2){
    const x=randInt(3,14),y=randInt(2,9),z=randInt(2,12),c=x*y+z;
    const o=shuffle(unique([c,c+y,c-z,c+z]));return [`Jika ${x} × ${y} = ${x*y}, maka ${x} × ${y} + ${z} = ...`,o.map(String),o.indexOf(c)];
  }
  if(type===3){
    const sets=[['Segitiga','Persegi','Lingkaran','Kubus'],['Apel','Jeruk','Mangga','Wortel'],['Januari','Maret','Mei','Selasa'],['Kucing','Kelinci','Kuda','Elang'],['Merah','Biru','Hijau','Pensil']];
    const set=sets[randInt(0,sets.length-1)],o=shuffle(set);const odd=set.indexOf('Kubus')>=0?'Kubus':set.indexOf('Wortel')>=0?'Wortel':set.indexOf('Selasa')>=0?'Selasa':set.indexOf('Elang')>=0?'Elang':'Pensil';
    return ['Mana yang berbeda dari kelompok berikut?',o,o.indexOf(odd)];
  }
  if(type===4){
    const n=randInt(3,15),c=n*n,o=shuffle(unique([c,c+n,c-1,c+2*n]));return [`Jika pola mengikuti kuadrat bilangan, ${n}² = ...`,o.map(String),o.indexOf(c)];
  }
  if(type===5){
    const start=randInt(1,5),step=randInt(1,4),letters=Array.from({length:5},(_,i)=>String.fromCharCode(65+start+step*i)),c=String.fromCharCode(65+start+step*5),o=shuffle(unique([c,String.fromCharCode(c.charCodeAt(0)-1),String.fromCharCode(c.charCodeAt(0)+1),String.fromCharCode(c.charCodeAt(0)+2)]));
    return [`Pola huruf: ${letters.join(', ')}, ...`,o,o.indexOf(c)];
  }
  const a=randInt(10,40),b=randInt(2,9),c=a-b,d=b+randInt(1,5),answer=c+d;
  const o=shuffle(unique([answer,answer+b,answer-d,answer+2]));return [`Jika ${a} − ${b} = ${c}, lalu ${c} + ${d} = ...`,o.map(String),o.indexOf(answer)];
}
const IQ_HISTORY_KEY='learnx_iq_history_v2';
function getIQHistory(){try{return JSON.parse(localStorage.getItem(IQ_HISTORY_KEY)||'[]')}catch{return[]}}
function saveIQHistory(sig){const h=getIQHistory();h.push(sig);localStorage.setItem(IQ_HISTORY_KEY,JSON.stringify(h.slice(-120)));}
function buildIQ(){
  const history=new Set(getIQHistory()),bank=[],session=new Set();
  let guard=0;
  while(bank.length<IQ_COUNT&&guard++<1000){
    const q=makeIQQuestion(),sig=q[0]+'|'+q[1].join('|')+'|'+q[2];
    if(!history.has(sig)&&!session.has(sig)){session.add(sig);bank.push(q);saveIQHistory(sig)}
  }
  // If the long-term history becomes crowded, the generator still guarantees a fresh session signature when possible.
  while(bank.length<IQ_COUNT){const q=makeIQQuestion();bank.push(q)}
  return shuffle(bank);
}
let iq=buildIQ(),iqStep=0,iqScore=0;
function renderIQ(){
  const [q,a]=iq[iqStep];$('#iqQuestion').textContent=q;$('#iqNum').textContent=iqStep+1;$('#iqBar').style.width=((iqStep+1)/iq.length*100)+'%';
  $('#iqAnswers').innerHTML=a.map((x,i)=>`<button class="answer" data-i="${i}">${x}</button>`).join('');
  $$('#iqAnswers .answer').forEach(b=>b.onclick=()=>{
    if(+b.dataset.i===iq[iqStep][2])iqScore++;
    $$('#iqAnswers .answer').forEach(x=>x.disabled=true);iqStep++;
    if(iqStep<iq.length)renderIQ();else{
      $('#iqAnswers').innerHTML='';$('#iqResult').classList.remove('hidden');
      $('#iqResult').innerHTML=`<b>Simulasi selesai — ${iqScore}/${iq.length}</b><br><small>Sesi berikutnya memakai pertanyaan dan parameter baru. Skor latihan bukan pengukuran IQ klinis.</small><br><button id="iqAgain" class="primary-btn" style="margin-top:12px">Tes Lagi</button>`;
      $('#iqAgain').onclick=()=>{iq=buildIQ();iqStep=0;iqScore=0;$('#iqResult').classList.add('hidden');renderIQ()};
    }
  });
}
renderIQ();

let secs=1500,timerInt=null;
function showTime(){let m=Math.floor(secs/60),s=secs%60;$('#timer').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
$('#timerStart').onclick=()=>{
  if(timerInt){clearInterval(timerInt);timerInt=null;$('#timerStart').textContent='Mulai';return}
  $('#timerStart').textContent='Jeda';timerInt=setInterval(()=>{secs=Math.max(0,secs-1);showTime();if(secs===0){clearInterval(timerInt);timerInt=null;toast('Sesi fokus selesai')}} ,1000)
};
$('#timerReset').onclick=()=>{clearInterval(timerInt);timerInt=null;secs=1500;showTime();$('#timerStart').textContent='Mulai'};

const notes=$('#notesArea');notes.value=localStorage.getItem('learnx_notes')||'';
notes.addEventListener('input',()=>{localStorage.setItem('learnx_notes',notes.value);toast('Catatan tersimpan')});

function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('show'),1300)}

document.addEventListener('pointerdown',e=>{
  if(!$('#touchToggle').checked)return;
  const r=document.createElement('span');r.className='touch-ripple';r.style.left=e.clientX+'px';r.style.top=e.clientY+'px';document.body.appendChild(r);setTimeout(()=>r.remove(),650);
});
$('#liveToggle').addEventListener('change',e=>document.body.style.setProperty('--live',e.target.checked?'1':'0'));
updateTrack();
