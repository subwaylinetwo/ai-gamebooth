// 야추 화면과 진행 (대사, 효과, 점수표)
(()=>{
const {CATS,UPPER,LOWER,calc,upperSum,bonus,total,Solver}=Yacht;
// ================= 게임 진행 =================
const MODES={
  ev:'최적 AI는 모든 상태를 미리 계산해서 매 순간 기대 점수가 가장 높은 수를 둬요.',
  win:'상대 고려 AI는 지고 있으면 모험하고, 이기고 있으면 안전하게 둬요.'
};
const BIG={full:'풀하우스',four:'포 오브 어 카인드'};
// AI 대사 (장난스럽게 약 올리기)
const one=a=>a[Math.floor(Math.random()*a.length)];
const LINES={
  start:['또 도전자야? 계산 끝났어. <b>넌 졌어.</b>','주사위는 공평해. <b>머리는 아니지만.</b>','먼저 굴려. <b>어차피 결과는 같아.</b>','나 평균 192점이야. <b>넌 몇 점이야?</b>'],
  myTurn:['<b>네 차례.</b> 천천히 해, 안 지루해. 거짓말이야.','<b>굴려.</b> 기도도 같이 하고.','<b>네 차례.</b> 실수 기대할게.','<b>자, 굴려봐.</b> 결과는 내가 이미 알지만.'],
  pZero:['<b>0점 ㅋㅋ</b> 일부러 그런 거지?','<b>0점!</b> 내 계산표엔 이런 수가 없는데.','<b>0점.</b> 이렇게 배려받아도 돼?','<b>0점…</b> 괜찮아, 원래 다들 그래.'],
  pHigh:['<b>운 좋았네.</b> 운은 계산이 안 되거든.','<b>…쫄았냐고?</b> 0.3초 쫄았어.','<b>그 정도는</b> 나도 자면서 해.','<b>오, 제법인데?</b> 지금만 그럴 거야.'],
  pMid:['<b>그 칸?</b> …네 판단 존중해. 틀렸지만.','<b>평범하네.</b> 아주 평범해.','<b>계산 중…</b> 아, 너 방금 불리해졌어.','<b>흠.</b> 나라면 안 그랬어.'],
  aiGo:['<b>내 차례.</b> 잘 봐, 이게 정석이야.','<b>비켜,</b> 계산기 나가신다.','<b>252가지</b> 경우 다 봤어. 굴린다.','<b>내 차례.</b> 필기 준비해.'],
  aiAllKeep:['<b>이대로 완벽.</b> 더 굴릴 필요도 없어.','<b>스톱.</b> 이게 최적이야.'],
  aiRerollAll:['<b>전부 다시.</b> 이것도 계산이야.','<b>싹 다 다시!</b> 걱정 마, 다 계획이야.'],
  aiHigh:['점. <b>박수 쳐도 돼.</b>','점. <b>보고 배워.</b>','점. <b>너무 쉽다.</b>'],
  aiMid:['점. <b>예상대로.</b>','점. <b>계산대로야.</b>','점. <b>이게 최적이야.</b>'],
  aiZero:['0점… <b>이건 전략적 희생이야.</b> 진짜야.','0점. <b>일부러 봐준 거야.</b>','0점. <b>…못 본 걸로 해.</b>'],
  aiYacht:['<b>YACHT.</b> 사진 찍어도 돼.','<b>YACHT!</b> 이게 실력이야.'],
  pYacht:['<b>야추?!</b> …주사위 바꿔 온 거 아니지?','<b>야추라고?</b> 버그 신고 넣는다.'],
  loading:['계산표 만드는 중. <b>너 이기는 법 정리 중이야.</b>'],
  pWin:['<b>…버그야.</b> 재경기 요청한다.','<b>졌다.</b> 근데 기대 점수는 내가 더 높았어.','<b>축하해.</b> 오늘 운 다 썼다.'],
  aiWin:['<b>GG.</b> 다음 사람 데려와.','<b>예상대로네.</b> 한 판 더? 결과는 같겠지만.','<b>봤지?</b> 이게 계산의 힘이야.'],
  draw:['<b>무승부?</b> 내가 봐준 거야.']
};
let mode='ev',solverReady=false,readyWait=null;
let dice,held,rollsLeft,turn,round,score,busy,over,anim=false,gameId=0,turnLog=[],cur={rolls:[],holds:[]},lastPick=null;
const spinning=new Set();
const $=id=>document.getElementById('y-'+id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const nameOf=id=>CATS.find(c=>c.id===id).name;
$('meAva').src=SPR.kid;$('aiSideAva').src=SPR.robot.idle;
const mood=m=>{$('aiAva').src=SPR.robot[m]||SPR.robot.idle};
function say(html){$('say').innerHTML=html;FX.jolt($('say'))}
function setStatus(t){$('status').textContent=t}

const dieEls=[];
for(let i=0;i<5;i++){
  const el=document.createElement('button');el.type='button';el.className='die';
  el.innerHTML=`<img class="lock" src="${SPR.lock}" alt=""><img class="face" alt="">`;
  el.onclick=()=>toggle(i);$('dice').appendChild(el);dieEls.push(el);
}
const setFace=(el,v,h)=>{el.querySelector('.face').src=SPR.die(v,h)};

function newGame(){
  gameId++;
  dice=[1,2,3,4,5];held=Array(5).fill(false);rollsLeft=3;
  turn='p';round=1;score={p:{},a:{}};busy=false;over=false;anim=false;spinning.clear();turnLog=[];cur={rolls:[],holds:[]};lastPick=null;
  $('over').hidden=true;$('aiInfo').textContent='';document.querySelectorAll('#yacht .tab').forEach(b=>b.title=MODES[b.dataset.mode]);document.querySelector('#yacht .rollrow').hidden=false;document.querySelector('#yacht .hint').hidden=false;
  mood('idle');say(one(LINES.start));
  setStatus('1라운드 · 당신 차례예요');
  render();
}
function doRoll(){cur.holds.push(held.map(Number));const idx=[];for(let i=0;i<5;i++)if(!held[i]){dice[i]=1+Math.floor(Math.random()*6);idx.push(i)}rollsLeft--;cur.rolls.push(dice.slice());return idx}
async function rollAnim(idx){
  if(!idx.length)return;
  idx.forEach(i=>spinning.add(i));render();SFX.play('roll');
  const els=idx.map(i=>dieEls[i]),T=FX.reduce?60:560,p=window.PX||2;
  els.forEach((el,j)=>el.animate([{transform:'translateY(0)'},{transform:`translateY(${-14*p}px)`},{transform:`translateY(${-4*p}px)`},{transform:`translateY(${-8*p}px)`},{transform:'translateY(0)'}],{duration:T,easing:'steps(10,end)',delay:j*30}));
  const t0=performance.now();
  while(performance.now()-t0<T){els.forEach(el=>setFace(el,1+Math.floor(Math.random()*6),false));await sleep(70)}
  spinning.clear();render();SFX.play('land');
  els.forEach(el=>{const c=FX.centerOf(el);FX.burst(c.x,c.y+12*p,{n:6,colors:['#c9e3e8','#8fb3ba'],speed:2.2,up:.4,gravity:.12,size:1,life:16})});
  const c=FX.centerOf($('dice'));
  if(calc('yacht',dice)===50)FX.float(c.x,c.y-24*p,'야추 찬스!','gold');
}
function toggle(i){if(turn!=='p'||busy||over||anim||rollsLeft===3)return;held[i]=!held[i];SFX.play(held[i]?'hold':'click');render()}
function logTurn(who,id){turnLog.push({who,cat:id,pts:who==='p'?score.p[id]:score.a[id],rolls:cur.rolls,holds:cur.holds});cur={rolls:[],holds:[]}}
function scoreFx(w,id,pts,bonusNow){
  const cell=document.querySelector(`#y-board td[data-w="${w}"][data-id="${id}"]`);if(!cell)return;
  const c=FX.centerOf(cell),fr=w==='p'?'blue':'red',who=w==='a'?'AI · ':'';
  if(pts===0){FX.float(c.x,c.y,'0점','gray');SFX.play('zero');FX.shake(cell,1)}
  else{FX.float(c.x,c.y,'+'+pts,fr);FX.burst(c.x,c.y,{n:Math.min(30,8+pts/2),colors:[w==='p'?'#009cfd':'#fe5f55','#ffffff','#f5b143'],speed:3.5});SFX.play('score')}
  FX.jolt($(w==='p'?'meSide':'aiSide'));
  dieEls.forEach(FX.jolt);
  if(bonusNow){FX.banner(who+'보너스 +35',{frame:'green',sub:'윗줄 63점 달성',dur:1300});SFX.play('bonus')}
  if(id==='yacht'&&pts>0){FX.coins(20,c.x,c.y);
    return FX.jackpot({who:w,amount:50,label:w==='p'?'잭팟!':'AI 잭팟',sub:w==='p'?'주사위 5개가 전부 같아요! (누르면 닫혀요)':'AI가 야추를 띄웠어요…',shake:document.getElementById('yacht')})}
  if(pts>0&&BIG[id]){FX.banner(who+BIG[id],{frame:fr,sub:`+${pts}점`,dur:1100});SFX.play('big')}
  return null;
}
async function pick(id){
  if(turn!=='p'||busy||over||anim||rollsLeft===3||id in score.p)return;
  const g=gameId,ub=upperSum(score.p);
  score.p[id]=calc(id,dice);logTurn('p',id);lastPick={w:'p',id};busy=true;
  const pts=score.p[id];
  render();const jp=scoreFx('p',id,pts,ub<63&&upperSum(score.p)>=63);
  if(id==='yacht'&&pts){mood('sad');say(one(LINES.pYacht))}
  else{say(one(pts===0?LINES.pZero:pts>=25?LINES.pHigh:LINES.pMid));if(pts===0){mood('happy');SFX.play('taunt')}}
  if(jp)await jp;else await sleep(BIG[id]&&pts>0?1200:650);if(g!==gameId)return;mood('idle');
  busy=false;endTurn();
}
function endTurn(){
  held=Array(5).fill(false);rollsLeft=3;
  if(turn==='p'){turn='a';render();aiTurn()}
  else{turn='p';round++;if(round>12){finish();return}setStatus(`${round}라운드 · 당신 차례예요`);say(one(LINES.myTurn));SFX.play('turn');render()}
}
const aiKeep=()=>Solver.decideKeep(dice,rollsLeft,score.a,score.p,mode);
const aiCat=()=>Solver.decideCat(dice,score.a,score.p,mode);
async function aiTurn(){
  const g=gameId;busy=true;mood('think');
  if(!solverReady){say(one(LINES.loading));setStatus('AI 준비 중');await readyWait;if(g!==gameId)return}
  setStatus(`${round}라운드 · AI 차례`);say(one(LINES.aiGo));render();
  await sleep(600);if(g!==gameId)return;
  for(let r=0;r<3;r++){
    if(r>0){
      const res=aiKeep();held=res.held;if(res.info)$('aiInfo').textContent='AI 계산: '+res.info;
      const kept=dice.filter((_,i)=>held[i]);
      if(held.every(x=>x)){say(one(LINES.aiAllKeep));render();await sleep(700);break}
      say(kept.length?`<b>${kept.join(' ')}</b> 남긴다. 이유? ${one(['넌 몰라도 돼.','설명해도 모를걸.','계산이야.'])}`:one(LINES.aiRerollAll));
      SFX.play('hold');render();await sleep(950);if(g!==gameId)return;
    }
    const idx=doRoll();render();await rollAnim(idx);if(g!==gameId)return;await sleep(500);if(g!==gameId)return;
  }
  const res=aiCat(),ub=upperSum(score.a);
  score.a[res.id]=calc(res.id,dice);logTurn('a',res.id);lastPick={w:'a',id:res.id};
  if(res.info)$('aiInfo').textContent='AI 계산: '+res.info;
  const pts=score.a[res.id];
  say(res.id==='yacht'&&pts?one(LINES.aiYacht):pts===0?`${nameOf(res.id)}에 `+one(LINES.aiZero):`${nameOf(res.id)}에 ${pts}`+one(pts>=25?LINES.aiHigh:LINES.aiMid));mood(pts>=25?'happy':pts===0?'sad':'idle');
  setStatus(`AI → ${nameOf(res.id)} ${pts}점`);
  render();const jp=scoreFx('a',res.id,pts,ub<63&&upperSum(score.a)>=63);
  if(jp)await jp;else await sleep(BIG[res.id]&&pts>0?1500:1100);if(g!==gameId)return;
  busy=false;mood('idle');endTurn();
}
function finish(){
  over=true;render();
  const p=total(score.p),a=total(score.a);
  Rec.save({game:'yacht',mode,human:p,ai:a,win:p>a?1:p<a?0:0.5,turns:turnLog});
  const res=p>a?'win':p<a?'lose':'draw';
  mood(res==='win'?'sad':res==='lose'?'happy':'idle');
  say(one(res==='win'?LINES.pWin:res==='lose'?LINES.aiWin:LINES.draw));
  FX.banner(res==='win'?'당신의 승리!':res==='lose'?'AI 승리':'무승부',{frame:res==='win'?'gold':res==='lose'?'red':'gray',sub:`${p} : ${a}`,dur:2200});
  if(res==='win')FX.confetti();
  SFX.play(res==='win'?'win':'lose');
  $('over').hidden=false;document.querySelector('#yacht .rollrow').hidden=true;document.querySelector('#yacht .hint').hidden=true;
  $('over').innerHTML=`<div class="t14">${res==='win'?'승리!':res==='lose'?'AI 승리':'무승부'} ${p} : ${a}</div><button class="btn big fr-green" id="y-again">다시 하기</button>`;
  $('again').onclick=()=>{SFX.play('click');newGame()};
  setStatus('게임 종료');
}
function render(){
  $('meScore').textContent=total(score.p);$('aiScore').textContent=total(score.a);
  $('meSide').classList.toggle('active',!over&&turn==='p');$('aiSide').classList.toggle('active',!over&&turn==='a');
  $('round').textContent=over?'게임 종료':`${Math.min(round,12)}라운드 / 12`;
  const canTouch=turn==='p'&&!busy&&!over&&!anim&&rollsLeft<3;
  dieEls.forEach((el,i)=>{
    if(!spinning.has(i))setFace(el,dice[i],held[i]);
    el.classList.toggle('held',held[i]);el.classList.toggle('idle',rollsLeft===3);el.classList.toggle('can',canTouch);
    el.setAttribute('aria-disabled',String(!canTouch));
    el.setAttribute('aria-label',`주사위 ${dice[i]}${held[i]?' (고정됨)':''}`);
  });
  const btn=$('rollBtn');btn.disabled=turn!=='p'||busy||over||anim||rollsLeft===0;
  btn.textContent=rollsLeft===3?'굴리기':'다시 굴리기';
  $('rolls').textContent=rollsLeft;
  const lp=lastPick;lastPick=null;
  const cell=(who,c)=>{
    const s=score[who],base=`data-w="${who}" data-id="${c.id}"`,just=lp&&lp.w===who&&lp.id===c.id?' just':'';
    if(c.id in s)return `<td ${base} class="c done${s[c.id]?'':' z'}${just}"><span class="cv">${s[c.id]}</span></td>`;
    if(turn===who&&rollsLeft<3&&!over&&!spinning.size){const v=calc(c.id,dice);
      return who==='p'&&!busy?`<td ${base} class="c pick${v?'':' zero'}" role="button" tabindex="0" aria-label="${c.name}에 ${v}점 기록"><span class="cv">${v}</span></td>`:`<td ${base} class="c preview"><span class="cv">${v}</span></td>`}
    return `<td ${base} class="c"><span class="cv"></span></td>`;
  };
  const row=c=>`<tr><th>${c.name}</th>${cell('p',c)}${cell('a',c)}</tr>`;
  const t=$('board');
  t.innerHTML=`<tr class="head"><th>점수표</th><th class="me">나</th><th class="ai">AI</th></tr>`
    +UPPER.map(row).join('')
    +`<tr class="sub"><th>소계 · 63 넘으면 +35</th><td>${upperSum(score.p)}${bonus(score.p)?'+35':''}</td><td>${upperSum(score.a)}${bonus(score.a)?'+35':''}</td></tr>`
    +LOWER.map(row).join('')
    +`<tr class="tot"><th class="t11">합계</th><td style="color:var(--blue)">${total(score.p)}</td><td style="color:var(--red)">${total(score.a)}</td></tr>`;
  t.querySelectorAll('td.pick').forEach(td=>{td.onclick=()=>pick(td.dataset.id);td.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(td.dataset.id)}}});
}
$('rollBtn').onclick=async()=>{
  if(turn!=='p'||busy||over||anim||rollsLeft===0)return;
  const g=gameId;anim=true;const idx=doRoll();render();
  await rollAnim(idx);if(g!==gameId)return;anim=false;
  setStatus(rollsLeft>0?`남은 굴리기 ${rollsLeft}회 · 고정할 주사위를 고르거나 점수를 기록하세요`:'점수표에서 기록할 칸을 고르세요');
  render();
};
document.querySelectorAll('#yacht .tab').forEach(b=>b.onclick=()=>{
  if(b.dataset.mode===mode)return;
  mode=b.dataset.mode;SFX.play('click');
  document.querySelectorAll('#yacht .tab').forEach(x=>{x.classList.toggle('on',x===b);FX.setFrame(x,x===b?'orange':'dark')});
  newGame();
});
newGame();
// 솔버 표 계산 (처음 한 번, 수십 초)
readyWait=(async()=>{
  const t0=Date.now();
  await Solver.build(p=>{$('load').textContent=`AI 계산표 준비 중 ${Math.round(p*100)}% (먼저 굴려도 돼요)`});
  solverReady=true;
  $('load').textContent=`AI 준비 완료 (${((Date.now()-t0)/1000).toFixed(0)}초)`;
})();

})();
