(()=>{
const cv=document.getElementById('c'),cx=cv.getContext('2d'),stage=document.getElementById('screen-wrap');
const $=id=>document.getElementById(id);
const C={sky:'#1d1846',bolt:'#ffe14d',teal:'#5fd3e6',pink:'#f28bb8',ink:'#f7f5ff',deep:'#0e0b26'};
let W=0,H=0,S=1,DPR=1,groundY=0,paused=false,mute=false,AC=null,bgmNode=null;
let st; // game state（resize() から参照するので宣言はここ。TDZ回避）
// 移動・ジャンプの物理（すべて S 倍でスケールする）
const MOVE_SPD=245, JUMP_V=620, GRAV=1900, AIR_CTRL=.82, EDGE=26;
const DODGE_H=52;   // この高さより上にいれば敵の攻撃をかわせる
function resize(){
  const r=stage.getBoundingClientRect();DPR=Math.min(window.devicePixelRatio||1,2);
  W=r.width;H=r.height;cv.width=W*DPR;cv.height=H*DPR;cx.setTransform(DPR,0,0,DPR,0,0);
  cv.dataset.logicalWidth=String(Math.round(W));cv.dataset.logicalHeight=String(Math.round(H));
  S=Math.min(W/600,H/700,1.4);S=Math.max(S,.6);groundY=H*.74;
  if(st&&st.p)st.p.x=Math.max(EDGE*S,Math.min(W-EDGE*S,st.p.x));
}
window.addEventListener('resize',resize);window.addEventListener('orientationchange',resize);resize();

let best=0;try{best=+localStorage.getItem('tg.245.best')||+localStorage.getItem('raiken-best')||0}catch(e){}
const showBest=()=>{$('best').textContent=best?`ベストスコア ${best}`:''};showBest();
try{mute=localStorage.getItem('tg.245.mute')==='1';}catch(e){}

function unlockAudio(){
  try{
    AC=AC||new(window.AudioContext||window.webkitAudioContext)();
    if(AC.state==='suspended')AC.resume();
    const buf=AC.createBuffer(1,1,22050);const src=AC.createBufferSource();src.buffer=buf;src.connect(AC.destination);src.start(0);
    startBgm();
  }catch(e){}
}
function startBgm(){
  if(!AC||mute||bgmNode)return;
  try{
    const buf=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate);const data=buf.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=Math.sin(2*Math.PI*98*i/AC.sampleRate)*0.03+Math.sin(2*Math.PI*196*i/AC.sampleRate)*0.012;
    const src=AC.createBufferSource(),g=AC.createGain();g.gain.value=.2;src.buffer=buf;src.loop=true;src.connect(g);g.connect(AC.destination);src.start();bgmNode=src;
  }catch(e){}
}
function stopBgm(){if(bgmNode){try{bgmNode.stop();}catch(e){}bgmNode=null;}}
function blip(f=440){if(mute||!AC)return;try{const o=AC.createOscillator(),g=AC.createGain();o.frequency.value=f;g.gain.value=.05;o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+.08);}catch(e){}}
function setMute(v){mute=v;try{localStorage.setItem('tg.245.mute',mute?'1':'0');}catch(e){}$('btnMute').textContent=mute?'🔇':'♪';if($('btnMuteDlg'))$('btnMuteDlg').textContent=mute?'音: オフ':'音: オン';if(mute)stopBgm();else startBgm();}
function bindTap(el,handler){if(!el)return;const fire=e=>{e.preventDefault();try{el.setPointerCapture(e.pointerId);}catch(err){}el.classList.add('is-pressed');if(navigator.vibrate)navigator.vibrate(15);handler(e);};const release=()=>el.classList.remove('is-pressed');el.addEventListener('pointerdown',fire);el.addEventListener('pointerup',release);el.addEventListener('pointercancel',release);}
function setPaused(on){if(!$('title').classList.contains('hidden')&&on)return;paused=on;if(typeof clearHeld==='function')clearHeld();if(on){try{$('pauseDlg').showModal();}catch(e){}stopBgm();}else{try{$('pauseDlg').close();}catch(e){}if(!mute)startBgm();}}
setMute(mute);
let lastTouchEnd=0;document.addEventListener('touchend',e=>{const now=Date.now();if(now-lastTouchEnd<=300)e.preventDefault();lastTouchEnd=now;},{passive:false});
document.addEventListener('touchmove',e=>{if(e.target.closest('[data-scrollable]'))return;e.preventDefault();},{passive:false});
document.addEventListener('dblclick',e=>e.preventDefault());document.addEventListener('contextmenu',e=>e.preventDefault());document.addEventListener('selectstart',e=>e.preventDefault());
document.addEventListener('visibilitychange',()=>{if(document.hidden){if($('title').classList.contains('hidden'))setPaused(true);stopBgm();}});

// background elements
const stars=Array.from({length:70},()=>({x:Math.random(),y:Math.random()*.6,r:Math.random()*1.4+.3,t:Math.random()*6}));
const isles=[{x:.15,y:.36,w:.22,sp:.004},{x:.7,y:.26,w:.16,sp:.006},{x:.5,y:.5,w:.12,sp:.003}];

function reset(){
  st={t:0,run:true,hp:100,gauge:0,score:0,wave:0,combo:0,comboT:0,
    p:{x:W/2,y:0,vy:0,onGround:true,face:1,punchT:0,hurtT:0,charge:0,charging:false},
    en:[],bolts:[],parts:[],strikes:[],toSpawn:0,spawnT:0,banner:0,shake:0,flash:0,texts:[]};
  clearHeld();nextWave();updHud();
}
function nextWave(){st.wave++;st.toSpawn=4+st.wave*2;st.spawnT=1.4;st.banner=1.6;}

function spawn(){
  const side=Math.random()<.5?-1:1,brute=Math.random()<Math.min(.08+st.wave*.06,.45);
  st.en.push({x:side<0?-40:W+40,dir:-side,hp:brute?3:1,max:brute?3:1,brute,
    sp:(brute?38:62+Math.random()*22+st.wave*4)*S,atkT:.6+Math.random()*.6,hitT:0,kb:0,bob:Math.random()*6});
}

// ---- input
let holdStart=0;
const held={left:false,right:false};
let chargePid=null;
function clearHeld(){held.left=held.right=false;
  ['btnLeft','btnRight','btnJump'].forEach(id=>{const el=$(id);if(el)el.classList.remove('is-pressed')});}
function jump(){
  if(paused||!st||!st.run)return;
  const p=st.p;if(!p.onGround)return;
  p.vy=JUMP_V*S;p.onGround=false;blip(700);
  for(let i=0;i<6;i++)st.parts.push({x:p.x+(Math.random()-.5)*20*S,y:groundY,vx:(Math.random()-.5)*160*S,vy:-Math.random()*80*S,life:.3,c:C.teal});
}
function punch(dir){
  if(paused||!st||!st.run)return;blip(520);
  const p=st.p;p.face=dir;p.punchT=.18;
  const reach=95*S;let target=null,bd=1e9;
  for(const e of st.en){const d=(e.x-p.x)*dir;if(d>-10&&d<reach&&d<bd){bd=d;target=e}}
  if(target){
    st.combo=st.comboT>0?st.combo+1:1;st.comboT=.9;
    const big=st.combo%5===0;hit(target,big?2:1,dir,big?120:40);
    st.gauge=Math.min(100,st.gauge+(big?14:8));
    if(big){st.shake=.25;popText(p.x+dir*60*S,groundY-p.y-110*S,'COMBO!',C.bolt)}
  }
  updHud();
}
function fireBolt(){
  const p=st.p;if(p.charge<.45){p.charge=0;return}
  const lv=p.charge>=2?3:p.charge>=1?2:1;
  const pow=[0,2,3,6][lv],r=[0,15,22,44][lv]*S,sp=[0,700,700,520][lv];
  st.bolts.push({x:p.x+p.face*40*S,y:groundY-68*S-p.y,dir:p.face,pow,lv,sp,hit:new Set(),life:2,r});
  if(lv===3){st.shake=.4;st.flash=.15;popText(p.x+p.face*80*S,groundY-p.y-150*S,'轟雷弾',C.pink,1.4)}
  else st.shake=.12;
  p.charge=0;
}
function special(){
  if(paused||!st||!st.run||st.gauge<100)return;blip(880);
  st.gauge=0;st.flash=.5;st.shake=.5;
  for(const e of st.en){st.strikes.push({x:e.x,t:.35});hit(e,5,e.x<st.p.x?-1:1,160)}
  popText(W/2,H*.4,'天雷拳',C.bolt,1.8);updHud();
}
function hit(e,dmg,dir,kb){
  e.hp-=dmg;e.hitT=.15;e.kb=dir*kb*S;
  for(let i=0;i<10;i++)st.parts.push({x:e.x,y:groundY-40*S,vx:(Math.random()-.5)*300*S+dir*120*S,vy:-Math.random()*260*S,life:.5,c:Math.random()<.5?C.bolt:C.teal});
}
function popText(x,y,s,c,scale=1){st.texts.push({x,y,s,c,t:1,scale})}

cv.addEventListener('pointerdown',ev=>{
  if(paused||!st||!st.run)return;ev.preventDefault();
  try{cv.setPointerCapture(ev.pointerId);}catch(e){}
  const r=cv.getBoundingClientRect(),x=ev.clientX-r.left;
  punch(x<st.p.x?-1:1);st.p.charging=true;chargePid=ev.pointerId;holdStart=performance.now();
});
// ためを始めた指以外の pointerup では暴発させない（移動ボタンとの同時押し対策）
function endHold(ev){
  if(!st||!st.p.charging)return;
  if(ev&&ev.pointerId!==undefined&&chargePid!==null&&ev.pointerId!==chargePid)return;
  st.p.charging=false;chargePid=null;fireBolt();
}
window.addEventListener('pointerup',endHold);window.addEventListener('pointercancel',endHold);
const KEY={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'};
const JUMPKEY={ArrowUp:1,w:1,W:1};
const PUNCHKEY={z:1,Z:1,j:1,J:1,Enter:1};
window.addEventListener('keydown',ev=>{
  if(ev.key==='Escape'||ev.key==='p'||ev.key==='P'){ev.preventDefault();setPaused(!paused);return;}
  if(paused||!st||!st.run)return;
  const mv=KEY[ev.key];
  if(mv){ev.preventDefault();held[mv]=true;return}
  if(ev.repeat)return;
  if(JUMPKEY[ev.key]){ev.preventDefault();jump()}
  else if(PUNCHKEY[ev.key]){ev.preventDefault();punch(st.p.face)}
  else if(ev.key===' '){ev.preventDefault();st.p.charging=true;chargePid=null}
  else if(ev.key==='k'||ev.key==='K')special();
});
window.addEventListener('keyup',ev=>{
  const mv=KEY[ev.key];if(mv){held[mv]=false;return}
  if(ev.key===' ')endHold();
});
window.addEventListener('blur',clearHeld);
// 押しっぱなし用。setPointerCapture で指がボタン外へ滑っても離すまで効き続ける
function bindHold(el,down,up){
  if(!el)return;
  const press=e=>{e.preventDefault();try{el.setPointerCapture(e.pointerId);}catch(err){}
    el.classList.add('is-pressed');if(navigator.vibrate)navigator.vibrate(10);down();};
  const release=()=>{el.classList.remove('is-pressed');up();};
  el.addEventListener('pointerdown',press);
  ['pointerup','pointercancel','lostpointercapture'].forEach(t=>el.addEventListener(t,release));
}
bindHold($('btnLeft'),()=>{held.left=true},()=>{held.left=false});
bindHold($('btnRight'),()=>{held.right=true},()=>{held.right=false});
bindTap($('btnJump'),jump);
bindTap($('btnL'),()=>punch(-1));
bindTap($('btnR'),()=>punch(1));
$('btnCharge').addEventListener('pointerdown',e=>{e.preventDefault();try{$('btnCharge').setPointerCapture(e.pointerId);}catch(err){}$('btnCharge').classList.add('is-pressed');if(st&&st.run&&!paused){st.p.charging=true;chargePid=e.pointerId;}});
['pointerup','pointercancel','lostpointercapture'].forEach(ev=>$('btnCharge').addEventListener(ev,()=>{$('btnCharge').classList.remove('is-pressed');endHold();}));
bindTap($('special'),special);

function updHud(){
  $('hp').firstElementChild.style.width=Math.max(0,st.hp)+'%';
  $('gauge').firstElementChild.style.width=st.gauge+'%';
  $('score').textContent=st.score;$('wave').textContent='WAVE '+st.wave;
  $('special').disabled=!(st.gauge>=100&&st.run);
}

// ---- loop
let last=0;
function loop(ts){
  const dt=Math.min((ts-last)/1000||0,.05);last=ts;
  if(st&&st.run&&!paused)update(dt);
  draw(ts/1000);
  requestAnimationFrame(loop);
}
function update(dt){
  const p=st.p;st.t+=dt;
  // 左右移動（空中は少しだけ効きを落とす）
  const mv=(held.right?1:0)-(held.left?1:0);
  if(mv){
    p.face=mv;
    p.x+=mv*MOVE_SPD*S*dt*(p.onGround?1:AIR_CTRL);
    p.x=Math.max(EDGE*S,Math.min(W-EDGE*S,p.x));
    if(p.onGround&&Math.random()<dt*14)
      st.parts.push({x:p.x-mv*12*S,y:groundY-2*S,vx:-mv*70*S,vy:-Math.random()*50*S,life:.25,c:'rgba(95,211,230,.8)'});
  }
  // 重力とジャンプ
  if(!p.onGround||p.vy>0){
    p.vy-=GRAV*S*dt;p.y+=p.vy*dt;
    if(p.y<=0){
      if(!p.onGround)for(let i=0;i<5;i++)st.parts.push({x:p.x+(Math.random()-.5)*26*S,y:groundY,vx:(Math.random()-.5)*180*S,vy:-Math.random()*70*S,life:.25,c:C.teal});
      p.y=0;p.vy=0;p.onGround=true;
    }
  }
  p.punchT=Math.max(0,p.punchT-dt);p.hurtT=Math.max(0,p.hurtT-dt);
  if(p.charging){const before=p.charge;p.charge=Math.min(2,p.charge+dt*1.1);
    const cy=groundY-p.y-140*S;
    if(before<1&&p.charge>=1)popText(p.x,cy,'チャージ2',C.teal,.8);
    if(before<2&&p.charge>=2){popText(p.x,cy,'MAX!!',C.pink,1.2);st.shake=.15}}
  st.comboT-=dt;if(st.comboT<=0)st.combo=0;
  st.banner=Math.max(0,st.banner-dt);st.shake=Math.max(0,st.shake-dt);st.flash=Math.max(0,st.flash-dt);

  if(st.toSpawn>0){st.spawnT-=dt;if(st.spawnT<=0){spawn();st.toSpawn--;st.spawnT=Math.max(.45,1.5-st.wave*.1)*(.6+Math.random()*.8)}}
  else if(st.en.length===0&&st.banner===0){st.score+=st.wave*50;nextWave();updHud()}

  const reach=48*S;
  for(const e of st.en){
    e.hitT=Math.max(0,e.hitT-dt);e.bob+=dt*6;
    if(e.kb){e.x+=e.kb*dt*4;e.kb*=Math.pow(.02,dt);if(Math.abs(e.kb)<5)e.kb=0}
    const dx=p.x-e.x;e.dir=Math.sign(dx)||1;
    if(Math.abs(dx)>reach){e.x+=e.dir*e.sp*dt}
    else{e.atkT-=dt;if(e.atkT<=0){e.atkT=e.brute?1.6:1.2;
      if(p.y>DODGE_H*S){popText(p.x,groundY-p.y-130*S,'かわした!',C.teal,.8)}
      else if(p.hurtT<=0){st.hp-=e.brute?14:8;p.hurtT=.4;st.shake=.2;st.combo=0;updHud();
        if(st.hp<=0)return gameOver()}}}
  }
  for(const b of st.bolts){
    b.x+=b.dir*b.sp*S*dt;b.life-=dt;
    b.y+=((groundY-68*S)-b.y)*Math.min(1,dt*5);
    if(b.lv===3&&Math.random()<.6)st.parts.push({x:b.x,y:b.y+(Math.random()-.5)*b.r*2,vx:-b.dir*80*S,vy:-Math.random()*120*S,life:.4,c:Math.random()<.5?C.pink:C.bolt});
    for(const e of st.en)if(!b.hit.has(e)&&Math.abs(e.x-b.x)<b.r+20*S){b.hit.add(e);hit(e,b.pow,b.dir,b.lv===3?200:90);st.gauge=Math.min(100,st.gauge+5);if(b.lv===3)st.shake=Math.max(st.shake,.15)}
  }
  st.bolts=st.bolts.filter(b=>b.life>0&&b.x>-60&&b.x<W+60);
  const alive=[];
  for(const e of st.en){if(e.hp>0)alive.push(e);else{
    const pts=(e.brute?300:100)*(1+Math.floor(st.combo/5));st.score+=pts;popText(e.x,groundY-90*S,'+'+pts,C.teal)}}
  if(alive.length!==st.en.length)updHud();
  st.en=alive;
  for(const q of st.parts){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=700*S*dt;q.life-=dt}
  st.parts=st.parts.filter(q=>q.life>0);
  for(const s of st.strikes)s.t-=dt;st.strikes=st.strikes.filter(s=>s.t>0);
  for(const t of st.texts){t.t-=dt;t.y-=40*dt}st.texts=st.texts.filter(t=>t.t>0);
  if(st.gauge>=100)updHud();
}
function gameOver(){
  st.run=false;clearHeld();updHud();
  if(st.score>best){best=st.score;try{localStorage.setItem('tg.245.best',best);localStorage.setItem('raiken-best',best);}catch(e){}}
  $('result').textContent=`WAVE ${st.wave} まで到達、スコア ${st.score}（ベスト ${best}）`;
  $('over').classList.remove('hidden');$('special').disabled=true;
}

// ---- draw
function draw(t){
  cx.save();
  if(st&&st.shake>0){cx.translate((Math.random()-.5)*14*st.shake*S*4,(Math.random()-.5)*10*st.shake*S*4)}
  const g=cx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#120e33');g.addColorStop(.55,C.sky);g.addColorStop(1,'#3b2360');
  cx.fillStyle=g;cx.fillRect(-20,-20,W+40,H+40);
  for(const s of stars){cx.globalAlpha=.4+.4*Math.sin(t*2+s.t);cx.fillStyle=C.ink;cx.beginPath();cx.arc(s.x*W,s.y*H,s.r,0,7);cx.fill()}
  cx.globalAlpha=1;
  // floating isles
  for(const i of isles){
    const x=((i.x+t*i.sp)%1.3-.15)*W,y=i.y*H+Math.sin(t+i.x*9)*6,w=i.w*W;
    cx.fillStyle='rgba(95,211,230,.18)';cx.beginPath();cx.moveTo(x-w/2,y);cx.lineTo(x+w/2,y);cx.lineTo(x+w*.1,y+w*.45);cx.closePath();cx.fill();
    cx.fillStyle='rgba(242,139,184,.25)';cx.fillRect(x-w/2,y-4,w,5);
    for(let k=0;k<3;k++){cx.fillStyle='rgba(247,245,255,.12)';cx.fillRect(x-w/3+k*w/4,y-18-k*6,w/8,14+k*6)}
  }
  // rooftop
  cx.fillStyle='#2a2155';cx.fillRect(-20,groundY,W+40,H-groundY+20);
  cx.fillStyle=C.pink;cx.fillRect(-20,groundY,W+40,3*S);
  cx.strokeStyle='rgba(95,211,230,.25)';cx.lineWidth=1;
  for(let x=((-t*20)%40);x<W;x+=40){cx.beginPath();cx.moveTo(x,groundY+6);cx.lineTo(x-30,H);cx.stroke()}

  if(st){
    for(const e of st.en)drawEnemy(e,t);
    drawPlayer(st.p,t);
    for(const b of st.bolts)drawBolt(b,t);
    for(const s of st.strikes)drawStrike(s.x,s.t);
    for(const q of st.parts){cx.globalAlpha=q.life*2;cx.fillStyle=q.c;cx.fillRect(q.x,q.y,4*S,4*S)}
    cx.globalAlpha=1;
    for(const tx of st.texts){cx.globalAlpha=Math.min(1,tx.t*2);cx.fillStyle=tx.c;cx.textAlign='center';
      cx.font=`${Math.round(22*S*tx.scale)}px "Dela Gothic One",sans-serif`;cx.fillText(tx.s,tx.x,tx.y)}
    cx.globalAlpha=1;
    if(st.combo>=2){cx.textAlign='left';cx.fillStyle=C.bolt;cx.font=`${Math.round(30*S)}px "Dela Gothic One",sans-serif`;
      cx.fillText(st.combo+' HIT',16,H*.2)}
    if(st.banner>0&&st.run){cx.globalAlpha=Math.min(1,st.banner);cx.textAlign='center';cx.fillStyle=C.ink;
      cx.font=`${Math.round(46*S)}px "Dela Gothic One",sans-serif`;cx.fillText('WAVE '+st.wave,W/2,H*.38);cx.globalAlpha=1}
    if(st.flash>0){cx.fillStyle=`rgba(255,240,170,${st.flash*1.4})`;cx.fillRect(-20,-20,W+40,H+40)}
  }
  cx.restore();
}
function drawPlayer(p,t){
  const x=p.x,y=groundY-p.y,s=S,f=p.face,air=p.y>0,bob=air?0:Math.sin(t*5)*2*s;
  // 接地影（高いほど小さく薄く）
  const k=Math.max(0,1-p.y/(150*s));
  cx.fillStyle=`rgba(0,0,0,${.18+k*.22})`;cx.beginPath();
  cx.ellipse(p.x,groundY+2,(16+k*6)*s,(4+k*2)*s,0,0,7);cx.fill();
  if(p.hurtT>0&&Math.floor(t*20)%2)return;
  if(p.charge>0){
    const c1=Math.min(p.charge,1);
    cx.fillStyle=`rgba(255,225,77,${.15+c1*.35})`;cx.beginPath();cx.arc(x,y-50*s,(40+c1*30)*s,0,7);cx.fill();
    if(p.charge>1){const c2=p.charge-1,pulse=p.charge>=2?Math.sin(t*25)*6*s:0;
      cx.strokeStyle=`rgba(242,139,184,${.4+c2*.6})`;cx.lineWidth=(3+c2*5)*s;
      cx.beginPath();cx.arc(x,y-50*s,(72+c2*28)*s+pulse,0,7);cx.stroke();
      cx.strokeStyle=C.ink;cx.lineWidth=2*s;
      for(let i=0;i<Math.floor(2+c2*6);i++){const a=Math.random()*7,r1=30*s,r2=(70+c2*40)*s;
        cx.beginPath();cx.moveTo(x+Math.cos(a)*r1,y-50*s+Math.sin(a)*r1);
        cx.lineTo(x+Math.cos(a+.3)*(r1+r2)/2,y-50*s+Math.sin(a-.2)*(r1+r2)/2);
        cx.lineTo(x+Math.cos(a)*r2,y-50*s+Math.sin(a)*r2);cx.stroke()}}
  }
  cx.strokeStyle=C.ink;cx.lineCap='round';cx.lineWidth=7*s;
  // legs
  if(air){const tuck=p.vy>0?1:.55;
    cx.beginPath();cx.moveTo(x,y-40*s);cx.lineTo(x-16*s,y-18*s*tuck);cx.lineTo(x-20*s,y-4*s);
    cx.moveTo(x,y-40*s);cx.lineTo(x+16*s,y-18*s*tuck);cx.lineTo(x+20*s,y-4*s);cx.stroke();}
  else{cx.beginPath();cx.moveTo(x,y-40*s);cx.lineTo(x-14*s,y);cx.moveTo(x,y-40*s);cx.lineTo(x+14*s,y);cx.stroke();}
  // body
  cx.strokeStyle=C.teal;cx.lineWidth=12*s;cx.beginPath();cx.moveTo(x,y-42*s+bob);cx.lineTo(x,y-78*s+bob);cx.stroke();
  // arms
  const ext=p.punchT>0?52:26;cx.strokeStyle=C.ink;cx.lineWidth=7*s;
  cx.beginPath();cx.moveTo(x,y-72*s+bob);cx.lineTo(x+f*ext*s,y-68*s+bob);
  cx.moveTo(x,y-72*s+bob);cx.lineTo(x-f*16*s,y-58*s+bob);cx.stroke();
  // fist glow
  cx.fillStyle=C.bolt;cx.shadowColor=C.bolt;cx.shadowBlur=(p.punchT>0?24:10)*s;
  cx.beginPath();cx.arc(x+f*ext*s,y-68*s+bob,(p.punchT>0?9:6)*s,0,7);cx.fill();cx.shadowBlur=0;
  // head + scarf
  cx.fillStyle=C.ink;cx.beginPath();cx.arc(x,y-94*s+bob,13*s,0,7);cx.fill();
  cx.strokeStyle=C.pink;cx.lineWidth=4*s;cx.beginPath();cx.moveTo(x-f*6*s,y-80*s+bob);
  cx.quadraticCurveTo(x-f*26*s,y-84*s+bob+Math.sin(t*9)*5*s,x-f*38*s,y-76*s+bob+Math.sin(t*9+1)*6*s);cx.stroke();
  cx.fillStyle=C.deep;cx.fillRect(x+f*3*s-2*s,y-97*s+bob,4*s,4*s);
  if(p.punchT>0){cx.strokeStyle=C.bolt;cx.lineWidth=2*s;for(let i=0;i<3;i++){cx.beginPath();
    cx.moveTo(x+f*(ext+10)*s,y-(74-i*6)*s);cx.lineTo(x+f*(ext+26+i*6)*s,y-(76-i*6)*s);cx.stroke()}}
}
function drawEnemy(e,t){
  const s=S*(e.brute?1.45:1),x=e.x,y=groundY,b=Math.sin(e.bob)*3*s;
  cx.fillStyle=e.hitT>0?C.ink:(e.brute?'#6b3fa0':'#4a3a8c');
  cx.beginPath();cx.ellipse(x,y-30*s+b,22*s,26*s,0,0,7);cx.fill();
  cx.beginPath();for(let i=-2;i<=2;i++)cx.arc(x+i*9*s,y-54*s+b+Math.abs(i)*4*s,9*s,0,7);cx.fill();
  cx.fillStyle=C.bolt;cx.beginPath();cx.arc(x+e.dir*8*s,y-34*s+b,4*s,0,7);cx.arc(x+e.dir*18*s,y-34*s+b,3*s,0,7);cx.fill();
  cx.fillStyle='rgba(0,0,0,.25)';cx.beginPath();cx.ellipse(x,y+2,18*s,4*s,0,0,7);cx.fill();
  if(e.max>1){cx.fillStyle='rgba(255,255,255,.2)';cx.fillRect(x-20*s,y-80*s,40*s,4*s);
    cx.fillStyle=C.pink;cx.fillRect(x-20*s,y-80*s,40*s*Math.max(0,e.hp)/e.max,4*s)}
}
function drawBolt(b,t){
  const y=b.y;
  if(b.lv===3){
    cx.shadowColor=C.pink;cx.shadowBlur=40*S;cx.fillStyle='rgba(242,139,184,.55)';
    cx.beginPath();cx.arc(b.x,y,b.r*1.35+Math.sin(t*30)*4*S,0,7);cx.fill();
    cx.fillStyle=C.bolt;cx.beginPath();cx.arc(b.x,y,b.r,0,7);cx.fill();
    cx.fillStyle=C.ink;cx.beginPath();cx.arc(b.x,y,b.r*.5,0,7);cx.fill();cx.shadowBlur=0;
    cx.strokeStyle=C.ink;cx.lineWidth=3*S;
    for(let k=0;k<4;k++){const a=Math.random()*7;cx.beginPath();cx.moveTo(b.x,y);
      cx.lineTo(b.x+Math.cos(a)*b.r*.9,y+Math.sin(a)*b.r*.9);cx.lineTo(b.x+Math.cos(a+.4)*b.r*1.6,y+Math.sin(a+.4)*b.r*1.6);cx.stroke()}
  }else{cx.shadowColor=C.bolt;cx.shadowBlur=20*S;cx.fillStyle=C.bolt;
  cx.beginPath();cx.arc(b.x,y,b.r,0,7);cx.fill();cx.shadowBlur=0;}
  cx.strokeStyle=C.ink;cx.lineWidth=2*S;cx.beginPath();
  for(let i=0;i<5;i++){cx.lineTo(b.x-b.dir*i*14*S,y+(Math.random()-.5)*b.r*1.6)}cx.stroke();
}
function drawStrike(x,tl){
  cx.strokeStyle=C.bolt;cx.lineWidth=5*S;cx.shadowColor=C.bolt;cx.shadowBlur=20;cx.globalAlpha=tl/.35;
  cx.beginPath();let px=x,py=0;cx.moveTo(px,py);
  while(py<groundY-10){py+=30*S;px=x+(Math.random()-.5)*40*S;cx.lineTo(px,py)}cx.stroke();
  cx.shadowBlur=0;cx.globalAlpha=1;
}

bindTap($('start'),()=>{unlockAudio();$('title').classList.add('hidden');reset();});
bindTap($('retry'),()=>{unlockAudio();$('over').classList.add('hidden');reset();});
bindTap($('btnMute'),()=>setMute(!mute));
bindTap($('btnPause'),()=>setPaused(true));
bindTap($('btnResume'),()=>setPaused(false));
bindTap($('btnMuteDlg'),()=>setMute(!mute));
bindTap($('btnQuit'),()=>{setPaused(false);if(st)st.run=false;$('over').classList.add('hidden');$('title').classList.remove('hidden');showBest();});
requestAnimationFrame(loop);
})();
