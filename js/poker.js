// 포커 화면과 진행 (안내, 버튼, 말풍선)
(()=>{
// ================= 게임 화면 =================
const $=id=>document.getElementById('p-'+id);
const rng=PK.mul((Date.now()^(Math.random()*1e9))|0);
const START=1000;
let stacks,handNo=0,maxHands=10,btn,h=null,ai,matchOver=false,tok=0,handLog=[],ui=null,started=false;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const RCH='23456789TJQKA',rl=r=>RCH[r]==='T'?'10':RCH[r],SUITCH='♠♥♦♣';
const STREETS=['프리플랍','플랍','턴','리버','쇼다운'];
const slots={me:[$('me0'),$('me1')],ai:[$('ai0'),$('ai1')],board:[0,1,2,3,4].map(i=>$('b'+i))};
$('myAva').src=SPR.kid;$('potChip').src=SPR.chipGold;$('deck').style.backgroundImage=`url(${SPR.back})`;
const mood=m=>{$('aiAva').src=SPR.robot[m]||SPR.robot.idle};mood('idle');
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
  await el.animate([{transform:`translate(${d.left-r.left}px,${d.top-r.top}px)`},{transform:'none'}],{duration:FX.reduce?1:300,easing:'cubic-bezier(.2,.8,.3,1)'}).finished;
}
async function flip(el,c){
  if(FX.visible(el))await el.animate([{transform:'scaleX(1)'},{transform:'scaleX(0)'}],{duration:110,easing:'steps(4,end)'}).finished;
  setCard(el,c,true);SFX.play('card');
  if(FX.visible(el))await el.animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:110,easing:'steps(4,end)'}).finished;
}
// 지금 가진 카드로 만든 족보와, 그 족보를 만드는 카드
function bestInfo(cards){
  if(cards.length<5){
    const [a,b]=cards,ra=a>>2,rb=b>>2;
    if(ra===rb)return {name:`원페어 (${rl(ra)})`,use:[a,b],val:-1};
    return {name:`하이카드 (${rl(Math.max(ra,rb))})`+((a&3)===(b&3)?' · 같은 무늬':''),use:[],val:-1};
  }
  let best=-1,bc=null;const n=cards.length,pick=[];
  (function rec(st){if(pick.length===5){const hand=pick.map(i=>cards[i]),v=PK.evalHand(hand);if(v>best){best=v;bc=hand}return}
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
  if(r.t==='check'||(r.t==='call'&&!r.toCall))return '체크';
  if(r.t==='call')return `콜 ${r.toCall}`;
  if(r.allin)return `올인 ${r.to}`;
  return (r.toCall>0||r.street===0?'레이즈 → ':'베팅 ')+r.to;
}
function sayOf(r){
  if(r.t==='fold')return {txt:'폴드',cls:'fold',sub:'이번 판은 포기'};
  if(r.t==='check'||(r.t==='call'&&!r.toCall))return {txt:'체크',cls:'check',sub:'더 걸지 않고 넘김'};
  if(r.t==='call')return {txt:`콜 ${r.toCall}`,cls:'call',sub:'따라감'};
  if(r.allin)return {txt:'올인!',cls:'allin',sub:`${r.to}칩까지 전부`};
  return {txt:(r.toCall>0||r.street===0?'레이즈!':'베팅!'),cls:'raise',sub:`${r.to}칩까지 걸었어요`};
}
function setBubble(el,s){
  const key=s?s.txt+s.cls+(s.sub||''):'';
  if(el.dataset.k===key)return;el.dataset.k=key;
  el.className='bubble fr-white'+(s?' on '+s.cls:'');
  el.innerHTML=s?`<b>${s.txt}</b>${s.sub?`<small>${s.sub}</small>`:''}`:'';
  if(s)FX.jolt(el);
}
const lastOpp=()=>{for(let i=h.log.length-1;i>=0;i--)if(h.log[i].p===1)return h.log[i];return null};
function guide(){
  const g=$('guide'),tag=t=>`<span class="gtag">${t}</span> `;
  if(ui.result){g.className='guide fr-dark '+ui.resClass;g.innerHTML=tag('결과')+ui.result;return}
  if(ui.thinking){g.className='guide fr-dark';g.innerHTML=tag('AI 차례')+'<b>AI가 고민 중이에요…</b><small>AI의 말풍선에 무엇을 했는지 나와요</small>';return}
  const myTurn=!ui.busy&&!h.done&&h.toAct===0;
  if(!myTurn){g.className='guide fr-dark';g.innerHTML=tag('진행 중')+'<b>카드를 나누는 중…</b>';return}
  const L=PK.legal(h),last=lastOpp();let main,sub;
  if(L.toCall>0){
    const allin=L.toCall>=h.stacks[0];
    if(h.street===0&&h.raises===0)main=`당신은 딜러라서 10칩을 먼저 냈어요. 빅 블라인드 20칩에 맞추려면 <em>콜 ${L.toCall}</em>`;
    else main=`AI가 <em class="ai">${h.si[1]}칩</em>까지 걸었어요. 따라가려면 <em>콜 ${L.toCall}칩</em>${allin?' (가진 칩 전부)':''}`;
    sub=`폴드하면 이번 판에 낸 ${h.inv[0]}칩을 잃어요 · 콜하면 팟 ${PK.pot(h)+L.toCall}칩을 놓고 승부해요`;
  }else{
    if(last&&last.street===h.street&&describe(last)==='체크')main='AI가 <em class="ai">체크</em>(넘김)했어요. 공짜로 다음으로 가려면 <em>체크</em>';
    else if(h.street===0)main='AI가 금액을 맞췄어요. 그냥 넘어가려면 <em>체크</em>';
    else main=`${STREETS[h.street]}이 열렸어요. 먼저 행동할 차례예요. 공짜로 넘기려면 <em>체크</em>`;
    sub='자신 있으면 금액을 골라 베팅해서 AI를 압박하세요';
  }
  g.className='guide fr-dark you';g.innerHTML=tag('내 차례')+`<b>${main}</b><small>${sub}</small>`;
}
function history(){
  const rows=[`<div class="hrow"><span class="hst">블라인드</span><span>${h.btn===0?'<i class="me">나</i> 10 · <i class="ai">AI</i> 20':'<i class="ai">AI</i> 10 · <i class="me">나</i> 20'}</span></div>`];
  for(let s=0;s<=3;s++){const acts=h.log.filter(r=>r.street===s);if(!acts.length)continue;
    rows.push(`<div class="hrow"><span class="hst">${STREETS[s]}</span><span>${acts.map(r=>`<i class="${r.p?'ai':'me'}">${r.p?'AI':'나'}</i>${describe(r)}`).join(' → ')}</span></div>`)}
  $('hist').innerHTML=rows.join('');
}
function render(){
  if(!h||!ui)return;
  const myTurn=!ui.busy&&!h.done&&h.toAct===0;
  $('handInfo').textContent=maxHands>900?`핸드 ${handNo+(matchOver?0:1)}`:`핸드 ${Math.min(handNo+(matchOver?0:1),maxHands)}/${maxHands}`;
  for(const [k,p] of [['my',0],['ai',1]]){
    $(k+'Stack').textContent=Math.round(ui.stack[p]*10)/10;
    $(k+'HPbar').style.width=Math.max(0,Math.min(100,ui.stack[p]/(2*START)*100))+'%';
    $(k+'D').hidden=h.btn!==p;
    const bz=$(k+'Bet'),b=ui.bets[p];bz.classList.toggle('on',b>0);bz.querySelector('.amt').textContent=b;
    const n=b>0?chipsFor(b):0,stk=bz.querySelector('.stk');
    if(stk.childElementCount!==n)stk.innerHTML=Array.from({length:n},()=>`<img src="${p?SPR.chipRed:SPR.chipBlue}" alt="">`).join('');
  }
  $('pot').textContent=Math.round(ui.pot*10)/10;
  $('aiSeat').classList.toggle('active',!!ui.thinking);FX.setFrame($('aiSeat'),ui.thinking?'insetgold':'inset');
  $('mySeat').classList.toggle('active',myTurn);FX.setFrame($('mySeat'),myTurn?'insetgold':'inset');
  setBubble($('aiSay'),ui.thinking?{txt:'생각 중',cls:'think'}:ui.said[1]);
  setBubble($('mySay'),ui.said[0]);
  document.querySelectorAll('#p-streets li').forEach((li,i)=>li.className=i===ui.street?'on fr-gold':i<ui.street?'done fr-inset':'fr-inset');
  // 내 족보 + 그 카드 강조
  const vis=h.board.slice(0,ui.shownBoard),mi=bestInfo([...h.hole[0],...vis]);
  $('myHand').textContent=(ui.dealt?'내 패: '+mi.name:'');$('myHand').hidden=!ui.dealt;
  let use=ui.dealt?mi.use:[];
  if(ui.sd){use=h.winner===0?ui.sd.me.use:h.winner===1?ui.sd.ai.use:[...ui.sd.me.use,...ui.sd.ai.use]}
  const U=new Set(use.map(String));
  [...slots.me,...slots.ai,...slots.board].forEach(el=>{const on=el.dataset.c!==''&&U.has(el.dataset.c)&&!el.classList.contains('folded');el.classList.toggle('hl',on);
    if(el.dataset.c!==''&&el.dataset.hl!==String(on)){el.dataset.hl=String(on);el.style.backgroundImage=`url(${SPR.card(+el.dataset.c,on)})`}});
  // 버튼
  const L=myTurn?PK.legal(h):null;
  $('ctrl').style.opacity=myTurn||ui.result?1:.6;
  $('bFold').disabled=!myTurn||L.toCall===0;
  $('bFold').innerHTML='폴드<small>포기</small>';
  $('bCall').disabled=!myTurn;
  $('bCall').innerHTML=L&&L.toCall>0?`콜 ${L.toCall}<small>${L.toCall>=h.stacks[0]?'전부 걸고 따라가기':'따라가기'}</small>`:'체크<small>넘기기</small>';
  const canR=myTurn&&L.canRaise;
  $('bRaise').disabled=!canR;
  document.querySelectorAll('#p-quick button').forEach(b=>b.disabled=!canR);
  const rr=$('raiseRange');rr.disabled=!canR;
  if(canR){rr.min=L.minTo;rr.max=L.maxTo;rr.step=10;
    if(+rr.value<L.minTo||+rr.value>L.maxTo||rr.dataset.h!==String(h.log.length)){rr.value=L.minTo;rr.dataset.h=String(h.log.length)}}
  updRaiseLabel();guide();history();
}
function updRaiseLabel(){
  const rr=$('raiseRange');
  if(rr.disabled||!h||h.done){$('raiseVal').textContent='';$('bRaise').innerHTML='레이즈<small>더 걸기</small>';return}
  const L=PK.legal(h),all=+rr.value>=L.maxTo-9,v=all?L.maxTo:+rr.value;
  $('raiseVal').textContent=v;
  $('bRaise').innerHTML=all?`올인 ${v}<small>전부 걸기</small>`:(L.toCall>0||h.street===0?`레이즈 ${v}<small>더 올리기</small>`:`베팅 ${v}<small>걸기</small>`);
}

// ---------- 진행 ----------
function newMatch(){
  tok++;started=true;handLog=[];ai.resetStats&&ai.resetStats();stacks=[START,START];handNo=0;maxHands=+$('lenSel').value;btn=Math.random()<0.5?0:1;matchOver=false;
  $('aiRead').textContent='';startHand();
}
async function startHand(){
  const t=tok;
  h=PK.newHand(stacks,btn,rng);ai.newHand(h.hole[1]);
  ui={stack:h.stacks.slice(),bets:h.si.slice(),pot:0,street:0,shownBoard:0,busy:true,thinking:false,said:[null,null],result:null,resClass:'',sd:null,dealt:false};
  [...slots.me,...slots.ai].forEach(el=>setCard(el,null,false,'none'));
  slots.board.forEach(el=>setCard(el,null));
  $('aiHand').hidden=true;$('nextRow').hidden=true;mood('idle');
  render();SFX.play('chip');
  await wait(250);if(t!==tok)return;
  const order=[[slots.me[0],h.hole[0][0],true],[slots.ai[0],h.hole[1][0],false],[slots.me[1],h.hole[0][1],true],[slots.ai[1],h.hole[1][1],false]];
  await Promise.all(order.map(([el,c,f],i)=>dealTo(el,c,f,i*150)));
  if(t!==tok)return;
  ui.dealt=true;next();
}
async function next(){
  const t=tok;
  if(h.done){await finishHand();return}
  if(h.toAct===1){
    ui.busy=true;ui.thinking=true;mood('think');render();
    await wait(900+rng()*700);if(t!==tok)return;
    ui.thinking=false;mood('idle');
    const a=ai.decide(PK.view(h,1));
    await apply(1,a);if(t!==tok)return;
    next();
  }else{ui.busy=false;render();SFX.play('turn')}
}
async function humanAct(a){
  if(!ui||ui.busy||h.done||h.toAct!==0)return;
  const t=tok;ui.busy=true;const before=h.board.slice();
  await apply(0,a,()=>ai.observe(h.log[h.log.length-1],before));
  if(t!==tok)return;next();
}
async function apply(p,a,after){
  const t=tok,si=h.si.slice(),street=h.street,L=PK.legal(h);
  PK.act(h,a);after&&after();
  const r=h.log[h.log.length-1];
  const added=r.t==='call'?L.toCall:r.t==='raise'?r.to-si[p]:0;
  ui.said[p]=sayOf(r);
  SFX.play(r.allin?'allin':r.t==='raise'?'raise':r.t==='fold'?'fold':added?'chip':'check');
  if(r.t==='fold')(p?slots.ai:slots.me).forEach(el=>el.classList.add('folded'));
  if(added>0){
    ui.stack[p]-=added;render();
    await FX.fly($(p?'aiHP':'myHP'),$(p?'aiBet':'myBet'),Math.min(5,chipsFor(added)),{src:p?SPR.chipRed:SPR.chipBlue});if(t!==tok)return;
    ui.bets[p]=si[p]+added;
  }
  render();
  if(added>0){const bz=$(p?'aiBet':'myBet');FX.jolt(bz)}
  if(r.allin){FX.banner(p?'AI 올인!':'올인!',{frame:'red',sub:`${r.to}칩`,dur:1100});FX.shake($('table'),3)}
  if(h.done||h.street!==street){
    await wait(r.t==='fold'?350:700);if(t!==tok)return;
    await collect();if(t!==tok)return;
    if(!h.done){
      await revealBoard(h.board.length);if(t!==tok)return;
      ui.said=[null,null];ui.street=h.street;render();
    }
  }else if(p===1)await wait(200);
}
async function collect(){
  const sum=ui.bets[0]+ui.bets[1];if(!sum)return;
  const fl=[];for(const p of [0,1])if(ui.bets[p]>0)fl.push(FX.fly($(p?'aiBet':'myBet'),$('potZone'),Math.min(4,chipsFor(ui.bets[p])),{src:p?SPR.chipRed:SPR.chipBlue}));
  ui.bets=[0,0];render();await Promise.all(fl);
  ui.pot+=sum;render();
  FX.jolt($('potZone'));
}
async function revealBoard(target){
  const t=tok;
  while(ui.shownBoard<target){
    const from=ui.shownBoard,k=from===0?3:1;
    ui.street=from===0?1:from===3?2:3;render();
    await Promise.all([...Array(k)].map((_,j)=>(async()=>{const el=slots.board[from+j],c=h.board[from+j];await dealTo(el,c,false,j*150);await flip(el,c)})()));
    if(t!==tok)return;
    ui.shownBoard=from+k;render();
    if(ui.shownBoard<target)await wait(h.done?900:300);
  }
}
async function finishHand(){
  const t=tok;ui.busy=true;
  const sd=h.folded<0;
  if(sd){
    await revealBoard(5);if(t!==tok)return;
    ui.street=4;ui.said=[null,null];render();await wait(350);
    await flip(slots.ai[0],h.hole[1][0]);await flip(slots.ai[1],h.hole[1][1]);if(t!==tok)return;
    ui.sd={me:bestInfo([...h.hole[0],...h.board]),ai:bestInfo([...h.hole[1],...h.board])};
    $('aiHand').textContent='AI 패: '+ui.sd.ai.name;$('aiHand').hidden=false;
    render();await wait(800);if(t!==tok)return;
  }
  ui.pot=h.potWon;render();
  const win=h.winner,delta=Math.round((h.stacks[0]-stacks[0])*10)/10;
  const title=win===0?`이번 판 승리! +${delta}칩`:win===1?`이번 판 패배 ${delta}칩`:'무승부 · 팟을 나눠 가져요';
  const detail=sd?`나 <em>${ui.sd.me.name}</em> vs AI <em class="ai">${ui.sd.ai.name}</em>`:h.folded===1?'AI가 폴드해서 팟을 가져와요':'폴드해서 AI가 팟을 가져가요';
  FX.banner(win===0?'이겼다!':win===1?'졌다…':'무승부',{frame:win===0?'gold':win===1?'red':'gray',sub:title,dur:1200});
  SFX.play(win===0?'win':win===1?'lose':'check');
  mood(win===1?'happy':win===0?'sad':'idle');
  {const one=x=>x[Math.floor(rng()*x.length)];
   const T=h.folded===0?['쫄았구나? <b>현명해.</b>','<b>도망가는 거 봤다.</b>','팟은 내가 <b>잘 쓸게.</b>']
     :h.folded===1?['<b>이번만 보내준다.</b>','패가 안 와서 그래. <b>진짜야.</b>','<b>…작전상 후퇴.</b>']
     :win===1?['<b>칩 고마워.</b> 잘 쓸게.','그 패로 여기까지? <b>용기 칭찬해.</b>','<b>계산대로야.</b> 놀랍지도 않아.']
     :win===0?['<b>운빨.</b> 기록해 둘게.','<b>…방금 건 봐준 거야.</b>','다음 판에 <b>이자 붙여서</b> 받는다.']:['<b>비겼네.</b> 재미없게.'];
   ui.said[1]={txt:one(T),cls:'taunt'};ui.said[1].txt=ui.said[1].txt.replace(/<\/?b>/g,'')}
  if(win>=0)await FX.fly($('potZone'),$(win===0?'myHP':'aiHP'),Math.min(8,chipsFor(h.potWon)+2));
  else await Promise.all([FX.fly($('potZone'),$('myHP'),3),FX.fly($('potZone'),$('aiHP'),3)]);
  if(t!==tok)return;
  if(win===0&&FX.visible($('myHP'))){const c=FX.centerOf($('myHP'));FX.burst(c.x,c.y,{n:26,colors:['#ffd23f','#ffffff','#4da3ff']})}
  ui.stack=h.stacks.slice();ui.pot=0;
  // AI 정보
  const notes=[];
  if(ai.lastEq!=null)notes.push(`AI가 마지막에 본 자기 승률 ${Math.round(ai.lastEq*100)}%`);
  if(sd&&ai.showdown)ai.showdown(h.hole[0]);
  if(ai.profile){const pf=ai.profile();notes.push(`AI가 파악한 당신: 베팅 받으면 ${Math.round(pf.foldToBet*100)}% 폴드 · 먼저 베팅 ${Math.round(pf.betWhenChecked*100)}% · 딜러일 때 참여 ${Math.round(pf.sbPlay*100)}%`)}
  $('aiRead').textContent=notes.length?'AI 머릿속 · '+notes.join(' · '):'';
  handLog.push({btn:h.btn,you:h.hole[0].map(PK.cardStr),ai:h.hole[1].map(PK.cardStr),board:h.board.map(PK.cardStr),acts:h.log.map(r=>[r.p,r.street,r.t,r.to||0,r.toCall]),winner:h.winner,pot:h.potWon,sd,stacks:h.stacks.slice()});
  stacks=h.stacks.slice();handNo++;btn=1-btn;
  if(stacks[0]<=0||stacks[1]<=0||handNo>=maxHands){
    matchOver=true;
    Rec.save({game:'poker',mode:$('aiSel').value,human:stacks[0],ai:stacks[1],win:stacks[0]>stacks[1]?1:stacks[0]<stacks[1]?0:0.5,maxHands,hands:handLog});
    const mw=stacks[0]>stacks[1]?1:stacks[0]<stacks[1]?0:.5;
    ui.result=`<b>게임 끝! ${mw===1?'당신의 승리':mw===0?'AI의 승리':'무승부'} · ${stacks[0]} : ${stacks[1]}</b><small>마지막 판: ${title} · ${detail}</small>`;
    ui.resClass=mw===1?'win':mw===0?'lose':'';
    setTimeout(()=>{if(t!==tok)return;FX.banner(mw===1?'당신의 승리!':mw===0?'AI 승리':'무승부',{frame:mw===1?'gold':mw===0?'red':'gray',sub:`${stacks[0]} : ${stacks[1]}`,dur:2200});if(mw===1)FX.confetti();SFX.play(mw===1?'win':'lose')},700);
    $('bNext').textContent='새 게임';
  }else{
    ui.result=`<b>${title}</b><small>${detail}</small>`;ui.resClass=win===0?'win':win===1?'lose':'';
    $('bNext').textContent='다음 핸드';
  }
  $('nextRow').hidden=false;render();
}

// ---------- 입력 ----------
$('raiseRange').oninput=updRaiseLabel;
document.querySelectorAll('#p-quick button').forEach(b=>b.onclick=()=>{
  if(!h||h.done)return;
  const L=PK.legal(h),rr=$('raiseRange');
  let v=b.dataset.f==='all'?L.maxTo:h.si[1]+Math.round(+b.dataset.f*(PK.pot(h)+L.toCall));
  v=Math.max(L.minTo,Math.min(L.maxTo,v));rr.value=v;updRaiseLabel();SFX.play('click');
});
$('bFold').onclick=()=>humanAct({t:'fold'});
$('bCall').onclick=()=>humanAct({t:'call'});
$('bRaise').onclick=()=>{const rr=$('raiseRange'),L=PK.legal(h);let v=+rr.value;if(v>=L.maxTo-9)v=L.maxTo;humanAct({t:'raise',to:v})};
$('bNext').onclick=()=>{SFX.play('click');if(matchOver)newMatch();else startHand()};
$('lenSel').onchange=()=>{if(ai)newMatch()};
const makeSelected=()=>$('aiSel').value==='learn'?PK.makeAI(rng):PK.makeAIBasic(rng);
$('aiSel').onchange=()=>{if(!ai)return;ai=makeSelected();newMatch()};

// 포커 탭을 처음 열 때 시작 (보이지 않는 곳에서 카드가 날아가지 않도록)
$('load').textContent='AI 준비 중…';
setTimeout(()=>{PK.initPreflop((Date.now()%1000)+1);ai=makeSelected();$('load').textContent='';
  if(document.getElementById('poker').classList.contains('on'))newMatch()},30);
document.querySelector('.nav button[data-g="poker"]').addEventListener('click',()=>{if(ai&&!started)setTimeout(newMatch,60)});

})();
