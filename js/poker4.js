// 포커 4인: 나 + 성격 다른 AI 3명 (화면과 진행)
(()=>{
const $=id=>document.getElementById('q-'+id);
const rng=PK.mul((Date.now()^(Math.random()*1e9))|0);
const START=1000,N=4,KEYS=[null,'bull','rock','fox'],NAMES=['나','불도저','바위','여우'];
const DESC={bull:'겁 없이 밀어붙이는 공격형',rock:'좋은 패만 치는 신중형',fox:'블러프와 함정을 섞는 여우'};
const ga=i=>i===0?'내가':NAMES[i]+'가';
const TAUNT={
  bull:{win:['힘으로 밀었지!','겁먹었냐?','다 밀어버려!','칩은 용기 있는 자의 것'],lose:['…다음엔 더 세게 민다','칫, 운이 좋았네']},
  rock:{win:['좋은 패만 친다. 그게 다야.','기다린 보람이 있군','참을성이 이긴다'],lose:['…패가 안 오네','조용히 다음 판']},
  fox:{win:['내가 뭘 들었을 것 같아?','속았지?','후후, 함정이었어'],lose:['이번엔 봐준 거야','다음 판엔 속을걸']}
};
const one=a=>a[Math.floor(rng()*a.length)];
let stacks,handNo=0,maxHands=12,btn=0,h=null,ais=[],matchOver=false,tok=0,handLog=[],ui=null,started=false,bust=[];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const RCH='23456789TJQKA',rl=r=>RCH[r]==='T'?'10':RCH[r],SUITCH='♠♥♦♣';
const STREETS=['프리플랍','플랍','턴','리버','쇼다운'];
const cards=[0,1,2,3].map(i=>[$(`c${i}0`),$(`c${i}1`)]),boardEl=[0,1,2,3,4].map(i=>$('b'+i));
const seatEl=i=>$('s'+i),betEl=i=>$('bet'+i);
$('ava0').src=SPR.kid;$('potChip').src=SPR.chipGold;$('deck').style.backgroundImage=`url(${SPR.back})`;
for(let i=1;i<N;i++){betEl(i).querySelector('img').src=SPR.chipRed}
const mood=(i,m)=>{if(i>0)$('ava'+i).src=SPR.robot[m]||SPR.robot.idle};[1,2,3].forEach(i=>mood(i,'idle'));
const chipsFor=x=>Math.max(1,Math.min(6,Math.round(Math.log2(Math.max(x,10)/10))+1));

function setCard(el,c,face,cls='slot'){
  el.className='pc';el.dataset.c='';el.dataset.hl='';el.style.backgroundImage='';el.removeAttribute('aria-label');el.setAttribute('role','img');
  if(c==null){el.classList.add(cls);if(cls==='slot')el.classList.add('fr-slot');return}
  if(!face){el.style.backgroundImage=`url(${SPR.back})`;el.setAttribute('aria-label','뒷면 카드');return}
  el.dataset.c=c;el.style.backgroundImage=`url(${SPR.card(c,false)})`;el.setAttribute('aria-label',rl(c>>2)+SUITCH[c&3]);
}
async function dealTo(el,c,face,delay){
  await wait(delay);setCard(el,c,face);SFX.play('card');
  if(!FX.visible(el))return;
  const d=$('deck').getBoundingClientRect(),r=el.getBoundingClientRect();
  await el.animate([{transform:`translate(${d.left-r.left}px,${d.top-r.top}px)`},{transform:'none'}],{duration:FX.reduce?1:260,easing:'cubic-bezier(.2,.8,.3,1)'}).finished;
}
async function flip(el,c,slow){
  const D=slow?420:110,S=slow?8:4;
  if(FX.visible(el))await el.animate([{transform:'scaleX(1)'},{transform:'scaleX(0)'}],{duration:D,easing:`steps(${S},end)`}).finished;
  setCard(el,c,true);SFX.play(slow?'reveal':'card');
  if(FX.visible(el))await el.animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:D,easing:`steps(${S},end)`}).finished;
}
async function suspense(el,c){
  const t=tok;ui.suspense=true;render();
  for(const gap of [650,520,400,300,240]){SFX.play('beat');FX.jolt(el);await wait(gap);if(t!==tok)return}
  await flip(el,c,true);ui.suspense=false;
  if(FX.visible(el)){const r=FX.centerOf(el);FX.burst(r.x,r.y,{n:18,colors:['#ffffff','#f5b143'],speed:3})}
}
// 공개된 패들끼리 승률 (남은 카드 2장 이하면 전부 세고, 아니면 3000번 깔아 봄)
function runEq(ps,vis){
  const used=new Set(vis);ps.forEach(p=>h.hole[p].forEach(c=>used.add(c)));
  const deck=[];for(let c=0;c<52;c++)if(!used.has(c))deck.push(c);
  const need=5-vis.length,w=ps.map(()=>0);let n=0;
  const score=bd=>{const v=ps.map(p=>PK.evalHand([...h.hole[p],...bd])),m=Math.max(...v),k=v.filter(x=>x===m).length;v.forEach((x,i)=>{if(x===m)w[i]+=1/k});n++};
  if(need===0)score(vis);
  else if(need===1)for(const c of deck)score([...vis,c]);
  else if(need===2){for(let i=0;i<deck.length;i++)for(let j=i+1;j<deck.length;j++)score([...vis,deck[i],deck[j]])}
  else for(let k=0;k<3000;k++){const d=deck.slice(),bd=vis.slice();for(let m=0;m<need;m++){const r=m+Math.floor(Math.random()*(d.length-m));[d[m],d[r]]=[d[r],d[m]];bd.push(d[m])}score(bd)}
  const out={};ps.forEach((p,i)=>out[p]=w[i]/n);return out;
}
function bestInfo(cs){
  if(cs.length<5){const [a,b]=cs,ra=a>>2,rb=b>>2;
    if(ra===rb)return {name:`원페어 (${rl(ra)})`,use:[a,b],val:-1};
    return {name:`하이카드 (${rl(Math.max(ra,rb))})`+((a&3)===(b&3)?' · 같은 무늬':''),use:[],val:-1}}
  let best=-1,bc=null;const n=cs.length,pick=[];
  (function rec(st){if(pick.length===5){const hand=pick.map(i=>cs[i]),v=PK.evalHand(hand);if(v>best){best=v;bc=hand}return}
    for(let i=st;i<n;i++){pick.push(i);rec(i+1);pick.pop()}})(0);
  const cat=Math.floor(best/13**5),d=[];let v=best;for(let i=0;i<5;i++){d.unshift(v%13);v=Math.floor(v/13)}
  let name=PK.handName(best),use=bc;const of=rs=>bc.filter(c=>rs.includes(c>>2));
  if(cat===0){use=[];name+=` (${rl(d[0])})`}
  else if(cat===1||cat===3||cat===7){use=of([d[0]]);name+=` (${rl(d[0])})`}
  else if(cat===2||cat===6){if(cat===2)use=of([d[0],d[1]]);name+=` (${rl(d[0])}, ${rl(d[1])})`}
  else if(cat===4||cat===8)name+=` (${rl(d[0])} 하이)`;
  return {name,use,val:best};
}
function describe(r){
  if(r.t==='fold')return '폴드';
  if(r.t==='check')return '체크';
  if(r.t==='call')return r.allin?`올인 콜 ${r.toCall}`:`콜 ${r.toCall}`;
  if(r.allin)return `올인 ${r.to}`;
  return (r.cur>0?'레이즈 → ':'베팅 ')+r.to;
}
function sayOf(r){
  if(r.t==='fold')return {txt:'폴드',cls:'fold'};
  if(r.t==='check')return {txt:'체크',cls:'check'};
  if(r.t==='call')return {txt:r.allin?'올인 콜!':`콜 ${r.toCall}`,cls:r.allin?'allin':'call',sub:'따라감'};
  if(r.allin)return {txt:`올인! ${r.to}`,cls:'allin'};
  return {txt:(r.cur>0?'레이즈 ':'베팅 ')+r.to,cls:'raise',sub:`${r.to}칩까지`};
}
function setBubble(el,s){
  const key=s?s.txt+s.cls+(s.sub||''):'';
  if(el.dataset.k===key)return;el.dataset.k=key;
  el.className='bubble fr-white'+(s?' on '+s.cls:'');
  el.innerHTML=s?`<b>${s.txt}</b>${s.sub?`<small>${s.sub}</small>`:''}`:'';
  if(s)FX.jolt(el);
}
const lastRaiser=()=>{for(let i=h.log.length-1;i>=0;i--){const r=h.log[i];if(r.street!==h.street)break;if(r.t==='raise')return r.p}return -1};
function guide(){
  const g=$('guide'),tag=t=>`<span class="gtag">${t}</span> `;
  if(ui.result){g.className='guide fr-dark '+ui.resClass;g.innerHTML=tag('결과')+ui.result;return}
  if(ui.allin){g.className='guide fr-dark';g.innerHTML=tag('올인')+(ui.suspense?'<b>마지막 카드…!</b>':'<b>더 걸 사람이 없어요! 카드를 공개하고 남은 카드를 돌려요</b>')+'<small>이름 아래 승률은 남은 카드가 어떻게 나올 수 있는지 다 따져 본 확률이에요</small>';return}
  if(ui.thinking>0){const k=KEYS[ui.thinking];g.className='guide fr-dark';g.innerHTML=tag(NAMES[ui.thinking]+' 차례')+`<b>${NAMES[ui.thinking]}가 고민 중이에요…</b><small>${DESC[k]}</small>`;return}
  const myTurn=!ui.busy&&!h.done&&h.toAct===0;
  if(h.done&&h.sd){g.className='guide fr-dark';g.innerHTML=tag('쇼다운')+'<b>남은 사람들의 카드를 공개해요</b><small>가장 높은 족보가 팟을 가져가요</small>';return}
  if(!myTurn){g.className='guide fr-dark';g.innerHTML=tag('진행 중')+(h.folded[0]&&!h.out[0]?'<b>폴드했어요. 남은 사람들끼리 진행 중…</b>':'<b>카드를 나누는 중…</b>');return}
  const L=PM.legal(h),n=PM.live(h).length;let main,sub;
  if(L.toCall>0){
    const lr=lastRaiser(),allin=L.toCall>=h.stacks[0];
    if(h.street===0&&lr<0)main=`블라인드 20칩에 맞추려면 <em>콜 ${L.toCall}</em>`;
    else main=`${lr>=0?`<em class="ai">${NAMES[lr]}</em>가 `:''}${h.cur}칩까지 걸었어요 · <em>콜 ${L.toCall}</em>${allin?' (전부)':''}`;
    sub=`폴드하면 낸 ${h.inv[0]}칩을 잃어요 · ${n}명이 팟 ${PM.pot(h)}칩을 두고 겨뤄요`;
  }else{
    main=h.street===0?'아무도 더 안 걸었어요 · 넘기려면 <em>체크</em>':`${STREETS[h.street]} · 공짜로 넘기려면 <em>체크</em>`;
    sub=`${n}명 남음 · 자신 있으면 베팅해서 압박하세요`;
  }
  g.className='guide fr-dark you';g.innerHTML=tag('내 차례')+`<b>${main}</b><small>${sub}</small>`;
}
function history(){
  const rows=[`<div class="hrow"><span class="hst">블라인드</span><span><i class="c${h.sb}">${NAMES[h.sb]}</i>10 · <i class="c${h.bb}">${NAMES[h.bb]}</i>20</span></div>`];
  for(let s=0;s<=3;s++){const acts=h.log.filter(r=>r.street===s);if(!acts.length)continue;
    rows.push(`<div class="hrow"><span class="hst">${STREETS[s]}</span><span>${acts.map(r=>`<i class="c${r.p}">${NAMES[r.p]}</i>${describe(r)}`).join(' → ')}</span></div>`)}
  $('hist').innerHTML=rows.join('');
}
function render(){
  if(!h||!ui)return;
  const myTurn=!ui.busy&&!h.done&&h.toAct===0;
  $('handInfo').textContent=`핸드 ${Math.min(handNo+(matchOver?0:1),maxHands)}/${maxHands}`;
  const vis=h.board.slice(0,ui.shownBoard);
  if(ui.shown&&!ui.noEq&&ui.eqAt!==ui.shownBoard){ui.eq=runEq([...ui.shown],vis);ui.eqAt=ui.shownBoard}
  for(let i=0;i<N;i++){
    $('stk'+i).textContent=ui.stack[i];
    if(i===0)$('hp0').style.width=Math.max(0,Math.min(100,ui.stack[i]/(2*START)*100))+'%';
    $('d'+i).hidden=h.btn!==i;
    $('pos'+i).textContent=h.out[i]?'탈락':i===h.sb?'SB':i===h.bb?'BB':'';
    seatEl(i).classList.toggle('out',!!h.out[i]);
    const act=i===0?myTurn:ui.thinking===i;
    seatEl(i).classList.toggle('active',act);FX.setFrame(seatEl(i),act?'insetgold':'inset');
    const b=ui.bets[i],bz=betEl(i);bz.classList.toggle('on',b>0);bz.querySelector('.amt').textContent=b;
    if(i===0){const n=b>0?chipsFor(b):0,stk=bz.querySelector('.stk');if(stk.childElementCount!==n)stk.innerHTML=Array.from({length:n},()=>`<img src="${SPR.chipBlue}" alt="">`).join('')}
    const eqs=ui.shown&&ui.shown.has(i)&&ui.eq&&!ui.noEq?` · 승률 ${Math.round(ui.eq[i]*100)}%`:'';
    const handB=i>0&&ui.shown&&ui.shown.has(i)&&!ui.said[i]?{txt:bestInfo([...h.hole[i],...vis]).name+eqs,cls:'hand'}:null;
    setBubble($('say'+i),ui.thinking===i?{txt:'생각 중',cls:'think'}:ui.said[i]||handB);
    if(i===0){const mi=ui.dealt&&!h.out[0]?bestInfo([...h.hole[0],...vis]):null;$('hand0').textContent=mi?'내 패: '+mi.name+eqs:''}
  }
  // 팟 숫자 = 가운데 모인 칩 + 각자 앞에 놓인 이번 라운드 베팅(블라인드 포함)
  $('pot').textContent=ui.pot+ui.bets.reduce((a,b)=>a+b,0);
  document.querySelectorAll('#q-streets li').forEach((li,i)=>li.className=i===ui.street?'on fr-gold':i<ui.street?'done fr-inset':'fr-inset');
  // 강조: 진행 중엔 내 족보, 끝나면 이긴 사람 족보
  let use=[];
  if(ui.winUse)use=ui.winUse;else if(ui.dealt&&!h.out[0]&&!h.folded[0])use=bestInfo([...h.hole[0],...vis]).use;
  const U=new Set(use.map(String));
  [...cards.flat(),...boardEl].forEach(el=>{const on=el.dataset.c!==''&&U.has(el.dataset.c)&&!el.classList.contains('folded');el.classList.toggle('hl',on);
    if(el.dataset.c!==''&&el.dataset.hl!==String(on)){el.dataset.hl=String(on);el.style.backgroundImage=`url(${SPR.card(+el.dataset.c,on)})`}});
  const L=myTurn?PM.legal(h):null;
  $('ctrl').style.opacity=myTurn||ui.result?1:.6;
  $('bFold').disabled=!myTurn||L.toCall===0;$('bFold').innerHTML='폴드<small>포기하기</small>';
  $('bCall').disabled=!myTurn;
  $('bCall').innerHTML=L&&L.toCall>0?`콜 ${L.toCall}<small>${L.toCall>=h.stacks[0]?'전부 걸고 따라가기':'같은 금액 따라가기'}</small>`:'체크<small>그냥 넘기기</small>';
  const canR=myTurn&&L.canRaise;
  $('bRaise').disabled=!canR;document.querySelectorAll('#q-quick button').forEach(b=>b.disabled=!canR);
  const rr=$('raiseRange');rr.disabled=!canR;
  if(canR){rr.min=L.minTo;rr.max=L.maxTo;rr.step=10;
    if(+rr.value<L.minTo||+rr.value>L.maxTo||rr.dataset.h!==String(h.log.length)){rr.value=L.minTo;rr.dataset.h=String(h.log.length)}}
  updRaiseLabel();guide();history();
}
function updRaiseLabel(){
  const rr=$('raiseRange');
  if(rr.disabled||!h||h.done){$('raiseVal').textContent='';$('bRaise').innerHTML='레이즈<small>더 걸기</small>';return}
  const L=PM.legal(h),all=+rr.value>=L.maxTo-9,v=all?L.maxTo:+rr.value;
  $('raiseVal').textContent=v;
  $('bRaise').innerHTML=all?`올인 ${v}<small>가진 칩 전부</small>`:(h.cur>0?`레이즈 ${v}<small>${v}칩까지 올리기</small>`:`베팅 ${v}<small>${v}칩 걸기</small>`);
}
const stackAnchor=i=>i===0?$('hp0'):$('stk'+i);

// ---------- 진행 ----------
function newMatch(){
  if(!PK.prePct())PK.initPreflop((Date.now()%1000)+1);
  tok++;started=true;handLog=[];bust=[];stacks=Array(N).fill(START);handNo=0;maxHands=+$('lenSel').value;btn=Math.floor(Math.random()*N);matchOver=false;
  ais=[null,...[1,2,3].map(i=>PM.makeAI(rng,KEYS[i]))];
  startHand();
}
async function startHand(){
  const t=tok;
  h=PM.newHand(stacks,btn,rng);
  const alive=[...Array(N).keys()].filter(i=>!h.out[i]);
  for(const i of alive)if(ais[i])ais[i].newHand(h.hole[i],alive.filter(j=>j!==i));
  ui={stack:stacks.slice(),bets:Array(N).fill(0),pot:0,street:0,shownBoard:0,busy:true,thinking:-1,said:Array(N).fill(null),result:null,resClass:'',dealt:false,shown:null,eq:null,eqAt:-1,winUse:null,allin:false};
  cards.flat().forEach(el=>setCard(el,null,false,'none'));boardEl.forEach(el=>setCard(el,null));
  $('nextRow').hidden=true;[1,2,3].forEach(i=>mood(i,'idle'));
  render();
  if(handNo===0&&window.fitP)fitP();
  // 블라인드: 칩이 각자 자리에서 베팅 자리로 날아감
  await wait(200);if(t!==tok)return;
  for(const [p,lbl] of [[h.sb,'스몰 블라인드'],[h.bb,'빅 블라인드']]){
    const amt=h.si[p],from=stackAnchor(p);if(!amt)continue;
    if(FX.visible(from)){const c=FX.centerOf(from);FX.float(c.x,c.y+(p?18:-12)*(window.PX||2),`${lbl} ${amt}`,p?'red':'blue')}
    ui.stack[p]-=amt;render();
    await FX.fly(from,betEl(p),Math.min(3,chipsFor(amt)),{src:p?SPR.chipRed:SPR.chipBlue});if(t!==tok)return;
    ui.bets[p]=amt;render();await wait(150);if(t!==tok)return;
  }
  // 스몰 블라인드부터 한 장씩 두 바퀴
  const order=[];for(let r=0;r<2;r++)for(let k=0;k<N;k++){const i=(h.sb+k)%N;if(!h.out[i])order.push([cards[i][r],h.hole[i][r],i===0])}
  await Promise.all(order.map(([el,c,f],j)=>dealTo(el,c,f,j*110)));
  if(t!==tok)return;
  ui.dealt=true;next();
}
async function next(){
  const t=tok;
  if(h.done){await finishHand();return}
  const p=h.toAct;
  if(p!==0){
    ui.busy=true;ui.thinking=p;mood(p,'think');render();
    await wait(600+rng()*300);if(t!==tok)return;
    ui.thinking=-1;mood(p,'idle');
    await apply(p,ais[p].decide(PM.view(h,p)));if(t!==tok)return;
    next();
  }else{ui.busy=false;ui.turnStart=performance.now();render();SFX.play('turn')}
}
async function humanAct(a){
  if(!ui||ui.busy||h.done||h.toAct!==0)return;
  const t=tok;ui.busy=true;const ms=Math.round(performance.now()-(ui.turnStart||performance.now()));
  await apply(0,a,ms);if(t!==tok)return;next();
}
async function apply(p,a,ms){
  const t=tok,si=h.si.slice(),street=h.street,L=PM.legal(h),before=h.board.slice();
  PM.act(h,a);const r=h.log[h.log.length-1];if(ms!=null)r.ms=ms;
  for(let i=1;i<N;i++)if(i!==p&&!h.out[i])ais[i].observe(r,before);
  const added=r.t==='call'?L.toCall:r.t==='raise'?r.to-si[p]:0;
  ui.said[p]=sayOf(r);
  SFX.play(r.allin?'allin':r.t==='raise'?'raise':r.t==='fold'?'fold':added?'chip':'check');
  if(r.t==='fold')cards[p].forEach(el=>el.classList.add('folded'));
  if(added>0){
    ui.stack[p]-=added;render();
    await FX.fly(stackAnchor(p),betEl(p),Math.min(5,chipsFor(added)),{src:p?SPR.chipRed:SPR.chipBlue});if(t!==tok)return;
    ui.bets[p]=si[p]+added;
  }
  render();
  if(added>0)FX.jolt(betEl(p));
  if(r.allin&&r.t==='raise'){FX.banner(p?`${NAMES[p]} 올인!`:'올인!',{frame:'red',sub:`${r.to}칩`,dur:1000});FX.shake($('table'),3)}
  if(h.done||h.street!==street){
    await wait(r.t==='fold'?350:650);if(t!==tok)return;
    await collect();if(t!==tok)return;
    if(!h.done){
      await revealBoard(h.board.length);if(t!==tok)return;
      ui.said=ui.said.map((s,i)=>h.folded[i]&&!h.out[i]?{txt:'폴드',cls:'fold'}:null);ui.street=h.street;render();
    }
  }else await wait(120);
}
async function collect(){
  const sum=ui.bets.reduce((a,b)=>a+b,0);if(!sum)return;
  const fl=[];for(let p=0;p<N;p++)if(ui.bets[p]>0)fl.push(FX.fly(betEl(p),$('potZone'),Math.min(4,chipsFor(ui.bets[p])),{src:p?SPR.chipRed:SPR.chipBlue}));
  ui.bets=Array(N).fill(0);render();await Promise.all(fl);
  ui.pot+=sum;render();FX.jolt($('potZone'));
}
async function revealBoard(target){
  const t=tok;
  while(ui.shownBoard<target){
    const from=ui.shownBoard,k=from===0?3:1;
    ui.street=from===0?1:from===3?2:3;render();
    const locked=ui.eq&&Object.values(ui.eq).some(x=>x>=0.9999);
    await Promise.all([...Array(k)].map((_,j)=>(async()=>{const el=boardEl[from+j],c=h.board[from+j];await dealTo(el,c,false,j*150);
      if(ui.allin&&from+j===4&&!locked)await suspense(el,c);else await flip(el,c)})()));
    if(t!==tok)return;
    ui.shownBoard=from+k;render();
    if(ui.shownBoard<target)await wait(h.done?(ui.allin?1300:900):300);
  }
}
async function finishHand(){
  const t=tok;ui.busy=true;
  const live=PM.live(h),before=stacks.slice();
  if(h.sd){
    ui.said=Array(N).fill(null);
    const show=live.filter(i=>i!==0);
    if(ui.shownBoard<5){
      ui.allin=true;render();
      FX.banner('카드 공개!',{frame:'orange',sub:'남은 카드를 돌려요',dur:1100});
      await wait(400);for(const i of show){await flip(cards[i][0],h.hole[i][0]);await flip(cards[i][1],h.hole[i][1])}if(t!==tok)return;
      ui.shown=new Set(live);render();await wait(1400);if(t!==tok)return;
      await revealBoard(5);if(t!==tok)return;
      ui.street=4;render();await wait(600);
    }else{
      ui.street=4;render();await wait(350);
      for(const i of show){await flip(cards[i][0],h.hole[i][0]);await flip(cards[i][1],h.hole[i][1])}if(t!==tok)return;
      ui.shown=new Set(live);
    }
    ui.noEq=true;render();await wait(700);if(t!==tok)return;
  }
  // 결과 정리
  const real=h.pots.filter(pt=>!pt.ret&&pt.amt>0),main=real[0]||h.pots[0],delta=h.stacks[0]-before[0];
  const nameOfHand=i=>h.sd?bestInfo([...h.hole[i],...h.board]).name:'';
  const potLines=real.map((pt,k)=>`${real.length>1?(k===0?'메인 팟':'사이드 팟')+' ':''}${pt.amt}칩 → ${pt.win.map(i=>`<em${i?' class="ai"':''}>${NAMES[i]}</em>`).join('·')}${pt.win.length>1?' (나눠 가짐)':''}${h.sd?' ('+nameOfHand(pt.win[0])+')':' (다른 사람이 모두 폴드)'}`);
  const ret=h.pots.filter(pt=>pt.ret&&pt.amt>0);if(ret.length)potLines.push(ret.map(pt=>`${NAMES[pt.win[0]]}가 아무도 안 따라온 ${pt.amt}칩을 돌려받음`).join(' · '));
  if(h.sd)ui.winUse=bestInfo([...h.hole[main.win[0]],...h.board]).use;
  ui.pot=0;render();
  // 승패는 실제로 칩이 늘었는지로 판단 (돌려받은 칩, 나눠 가진 팟은 승리가 아님)
  const iWon=delta>0,even=delta===0&&h.payout[0]>0,title=delta>0?`이번 판 +${delta}칩`:delta<0?`이번 판 ${delta}칩`:'이번 판 ±0';
  FX.banner(iWon?'이겼다!':even?'본전':`${NAMES[main.win[0]]} 승리`,{frame:iWon?'gold':even?'gray':'red',sub:even?'팟을 나눠 가져서 칩 변화 없음':title,dur:1200});
  SFX.play(iWon?'win':even?'check':'lose');
  // AI 한마디
  for(let i=1;i<N;i++){if(h.out[i])continue;const d=h.stacks[i]-before[i];
    if(h.stacks[i]-before[i]>0){ui.said[i]={txt:one(TAUNT[KEYS[i]].win),cls:'taunt'};mood(i,'happy')}
    else if(d<=-200){ui.said[i]={txt:one(TAUNT[KEYS[i]].lose),cls:'taunt'};mood(i,'sad')}}
  render();
  await Promise.all(h.pots.flatMap(pt=>pt.win.map(w=>FX.fly($('potZone'),stackAnchor(w),Math.min(6,chipsFor(pt.amt/pt.win.length)+1)))));
  if(t!==tok)return;
  if(iWon&&FX.visible($('hp0'))){const c=FX.centerOf($('hp0'));FX.burst(c.x,c.y,{n:26,colors:['#ffd23f','#ffffff','#4da3ff']})}
  ui.stack=h.stacks.slice();
  handLog.push({btn:h.btn,holes:h.hole.map(c=>c&&c.map(PK.cardStr)),board:h.board.map(PK.cardStr),acts:h.log.map(r=>[r.p,r.street,r.t,r.to||0,r.toCall,r.ms||0]),pots:h.pots,sd:h.sd,stacks:h.stacks.slice()});
  // 탈락 기록 (같은 판에서 여러 명이면 칩이 적었던 사람이 먼저)
  const gone=[...Array(N).keys()].filter(i=>before[i]>0&&h.stacks[i]<=0).sort((a,b)=>before[a]-before[b]);bust.push(...gone);
  stacks=h.stacks.slice();handNo++;
  for(let k=1;k<=N;k++){const j=(btn+k)%N;if(stacks[j]>0){btn=j;break}}
  const alive=[...Array(N).keys()].filter(i=>stacks[i]>0);
  if(stacks[0]<=0||alive.length<=1||handNo>=maxHands){
    matchOver=true;
    const rank=[...alive.sort((a,b)=>stacks[b]-stacks[a]),...bust.slice().reverse()],my=rank.indexOf(0)+1;
    Rec.save({game:'poker4',mode:'multi',human:stacks[0],ai:Math.max(stacks[1],stacks[2],stacks[3]),win:my===1?1:0,rank:my,ranking:rank.map(i=>NAMES[i]),maxHands,hands:handLog});
    ui.result=`<b>게임 끝! ${my}등${stacks[0]<=0?' (탈락)':''} · 내 칩 ${stacks[0]}</b><small>${rank.map((i,k)=>`${k+1}등 ${NAMES[i]} ${stacks[i]}`).join(' · ')}</small>`;
    ui.resClass=my===1?'win':my===4?'lose':'';
    setTimeout(()=>{if(t!==tok)return;FX.banner(my===1?'1등!':`${my}등`,{frame:my===1?'gold':my===4?'red':'gray',sub:`내 칩 ${stacks[0]}`,dur:2200});if(my===1)FX.confetti();SFX.play(my===1?'win':'lose')},700);
    $('bNext').textContent='새 게임';
  }else{
    ui.result=`<b>${title}</b><small>${potLines.join(' · ')}</small>`;ui.resClass=delta>0?'win':delta<0?'lose':'';
    $('bNext').textContent='다음 핸드';
  }
  $('nextRow').hidden=false;render();
}

// ---------- 입력 ----------
$('raiseRange').oninput=updRaiseLabel;
document.querySelectorAll('#q-quick button').forEach(b=>b.onclick=()=>{
  if(!h||h.done)return;
  const L=PM.legal(h),rr=$('raiseRange');
  let v=b.dataset.f==='all'?L.maxTo:h.cur+Math.round(+b.dataset.f*(PM.pot(h)+L.toCall));
  v=Math.max(L.minTo,Math.min(L.maxTo,v));rr.value=v;updRaiseLabel();SFX.play('click');
});
$('bFold').onclick=()=>humanAct({t:'fold'});
$('bCall').onclick=()=>humanAct({t:'call'});
$('bRaise').onclick=()=>{const rr=$('raiseRange'),L=PM.legal(h);let v=+rr.value;if(v>=L.maxTo-9)v=L.maxTo;humanAct({t:'raise',to:v})};
$('bNext').onclick=()=>{SFX.play('click');if(matchOver)newMatch();else startHand()};
$('lenSel').onchange=()=>{if(started)newMatch()};
// 탭을 처음 열 때 시작
document.querySelector('.nav button[data-g="poker4"]').addEventListener('click',()=>{if(!started)setTimeout(newMatch,80)});
})();
