// 포커 규칙 + AI (화면과 상관없는 부분)
// ================= 포커 코어 (헤즈업 노리밋 홀덤) =================
const PK=(()=>{
const RANKS='23456789TJQKA', SUITS='♠♥♦♣';
function mul(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
// ---- 족보 평가 (5~7장) : 값이 클수록 강함 ----
function straightHigh(m){for(let h=12;h>=4;h--)if(((m>>(h-4))&31)===31)return h;if((m&0b1000000001111)===0b1000000001111)return 3;return -1}
const cnt=new Int8Array(13),sm=new Int32Array(4),sc=new Int8Array(4);
const code=(cat,a=0,b=0,c=0,d=0,e=0)=>((((cat*13+a)*13+b)*13+c)*13+d)*13+e;
function evalHand(cs){
  cnt.fill(0);sm.fill(0);sc.fill(0);let m=0;
  for(const c of cs){const r=c>>2,s=c&3;cnt[r]++;sm[s]|=1<<r;sc[s]++;m|=1<<r}
  for(let s=0;s<4;s++)if(sc[s]>=5){const sh=straightHigh(sm[s]);if(sh>=0)return code(8,sh)}
  let q=-1;const t=[],p=[];
  for(let r=12;r>=0;r--){if(cnt[r]===4)q=r;else if(cnt[r]===3)t.push(r);else if(cnt[r]===2)p.push(r)}
  const kick=(n,ex)=>{const o=[];for(let x=12;x>=0&&o.length<n;x--)if(cnt[x]>0&&!ex.includes(x))o.push(x);return o};
  if(q>=0)return code(7,q,...kick(1,[q]));
  if(t.length>=2)return code(6,t[0],t[1]);
  if(t.length===1&&p.length>=1)return code(6,t[0],p[0]);
  for(let s=0;s<4;s++)if(sc[s]>=5){const o=[];for(let x=12;x>=0&&o.length<5;x--)if(sm[s]>>x&1)o.push(x);return code(5,...o)}
  const sh=straightHigh(m);if(sh>=0)return code(4,sh);
  if(t.length===1)return code(3,t[0],...kick(2,[t[0]]));
  if(p.length>=2)return code(2,p[0],p[1],...kick(1,[p[0],p[1]]));
  if(p.length===1)return code(1,p[0],...kick(3,[p[0]]));
  return code(0,...kick(5,[]));
}
const CAT_NAMES=['하이카드','원페어','투페어','트리플','스트레이트','플러시','풀하우스','포카드','스트레이트 플러시'];
const handName=v=>CAT_NAMES[Math.floor(v/13**5)];
const cardStr=c=>RANKS[c>>2]+SUITS[c&3];

// ---- 모든 2장 조합(1326) + 프리플랍 강도(무작위 상대 대비 승률 → 백분위) ----
const COMBOS=[];for(let a=0;a<52;a++)for(let b=a+1;b<52;b++)COMBOS.push([a,b]);
const classOf=([a,b])=>{const ra=a>>2,rb=b>>2,hi=Math.max(ra,rb),lo=Math.min(ra,rb);return hi*13+lo+((a&3)===(b&3)?169:0)};
let PRE_PCT=null; // combo index -> 0..1 (1=최강)
function initPreflop(seed=7){
  const rng=mul(seed),eqByClass=new Map();
  for(let i=0;i<COMBOS.length;i++){const k=classOf(COMBOS[i]);if(eqByClass.has(k))continue;
    const h=COMBOS[i];let w=0;const N=500;
    for(let n=0;n<N;n++){const used=new Set(h),pick=()=>{let c;do{c=Math.floor(rng()*52)}while(used.has(c));used.add(c);return c};
      const o=[pick(),pick()],bd=[pick(),pick(),pick(),pick(),pick()];
      const x=evalHand([...h,...bd]),y=evalHand([...o,...bd]);w+=x>y?1:x===y?.5:0}
    eqByClass.set(k,w/N)}
  const eq=COMBOS.map(c=>eqByClass.get(classOf(c)));
  const order=eq.map((e,i)=>i).sort((a,b)=>eq[a]-eq[b]);
  PRE_PCT=new Float64Array(COMBOS.length);order.forEach((ci,r)=>PRE_PCT[ci]=(r+0.5)/order.length);
}

// ---- 핸드 진행 상태 기계 ----
const BB=20,SB=10;
function newHand(stacks,btn,rng){
  const deck=[...Array(52).keys()];for(let i=51;i>0;i--){const j=Math.floor(rng()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}
  const h={stacks:stacks.slice(),inv:[0,0],si:[0,0],btn,hole:[[deck[0],deck[1]],[deck[2],deck[3]]],runout:deck.slice(4,9),
    board:[],street:0,toAct:btn,lastRaise:BB,acted:[false,false],raises:0,folded:-1,done:false,log:[]};
  const put=(p,x)=>{x=Math.min(x,h.stacks[p]);h.stacks[p]-=x;h.inv[p]+=x;h.si[p]+=x};
  put(btn,SB);put(1-btn,BB);h.put=put;
  return h;
}
const pot=h=>h.inv[0]+h.inv[1];
function legal(h){const p=h.toAct,toCall=Math.max(0,h.si[1-p]-h.si[p]);
  const maxTo=h.si[p]+h.stacks[p];
  const minTo=Math.min(maxTo,h.si[1-p]+Math.max(h.lastRaise,BB));
  const canRaise=h.stacks[p]>toCall&&h.stacks[1-p]>0;
  return {toCall:Math.min(toCall,h.stacks[p]),canCheck:toCall===0,canRaise,minTo,maxTo};}
function act(h,a){ // a: {t:'fold'|'check'|'call'|'raise',to}
  const p=h.toAct,L=legal(h);
  if(a.t==='fold'&&L.toCall===0)a={t:'check'};
  if(a.t==='raise'&&!L.canRaise)a={t:L.toCall?'call':'check'};
  if(a.t==='check'&&L.toCall>0)a={t:'call'};
  h.log.push({p,street:h.street,t:a.t,to:a.t==='raise'?Math.max(L.minTo,Math.min(L.maxTo,Math.round(a.to))):undefined,allin:a.t==='raise'&&Math.round(a.to)>=L.maxTo,potBefore:pot(h),toCall:L.toCall,oppSi:h.si[1-p]});
  if(a.t==='fold'){h.folded=p;finish(h);return}
  if(a.t==='call'||a.t==='check'){h.put(p,L.toCall);h.acted[p]=true}
  if(a.t==='raise'){const to=Math.max(L.minTo,Math.min(L.maxTo,Math.round(a.to)));
    const inc=to-h.si[1-p];if(inc>0)h.lastRaise=Math.max(h.lastRaise,inc);
    h.put(p,to-h.si[p]);h.raises++;h.acted=[false,false];h.acted[p]=true}
  // 스트리트 종료 판단
  const o=1-p, matched=h.si[0]===h.si[1], allin=h.stacks[0]===0||h.stacks[1]===0;
  const oppNeeds=h.si[p]>h.si[o]&&h.stacks[o]>0;
  if(oppNeeds||(!h.acted[o]&&h.stacks[o]>0&&!(allin&&h.si[o]>=h.si[p]))){h.toAct=o;return}
  // 여기 오면 베팅 라운드 끝
  if(allin||h.street===3){runToShowdown(h);return}
  nextStreet(h);
}
function nextStreet(h){h.street++;h.board=h.runout.slice(0,[0,3,4,5][h.street]);h.si=[0,0];h.acted=[false,false];h.lastRaise=BB;h.raises=0;h.toAct=1-h.btn;
  if(h.stacks[0]===0||h.stacks[1]===0)runToShowdown(h)}
function runToShowdown(h){h.board=h.runout.slice();h.street=3;finish(h)}
function finish(h){
  const m=Math.min(h.inv[0],h.inv[1]);for(const q of[0,1]){h.stacks[q]+=h.inv[q]-m;h.inv[q]=m}
  const P=h.inv[0]+h.inv[1];h.winner=-1;
  if(h.folded>=0){h.winner=1-h.folded;h.stacks[h.winner]+=P}
  else{const a=evalHand([...h.hole[0],...h.board]),b=evalHand([...h.hole[1],...h.board]);h.vals=[a,b];
    if(a>b){h.winner=0;h.stacks[0]+=P}else if(b>a){h.winner=1;h.stacks[1]+=P}else{h.stacks[0]+=P/2;h.stacks[1]+=P/2}}
  h.potWon=P;h.done=true;
}
function view(h,p){const L=legal(h);return {hole:h.hole[p],board:h.board,street:h.street,pot:pot(h),toCall:L.toCall,canRaise:L.canRaise,minTo:L.minTo,maxTo:L.maxTo,
  myStack:h.stacks[p],oppStack:h.stacks[1-p],mySi:h.si[p],oppSi:h.si[1-p],raises:h.raises,isBtn:h.btn===p}}

// ---- 업그레이드 AI: 프리플랍 차트 + 상대 성향 학습 + 범위 대비 승률 ----
const RK='AKQJT98765432';
function rangeSet(spec){
  const S=new Set(),ix=c=>RK.indexOf(c);
  for(let t of spec.split(',')){t=t.trim();if(!t)continue;
    if(t==='PAIRS'){for(const c of RK)S.add(c+c);continue}
    if(t.startsWith('ANY')){const c=t[3];for(const x of RK)if(x!==c)for(const s of 'so')S.add(ix(c)<ix(x)?c+x+s:x+c+s);continue}
    if(t.includes('-')){const [a,b]=t.split('-');
      if(a.length===2){for(let k=ix(a[0]);k<=ix(b[0]);k++)S.add(RK[k]+RK[k])}
      else for(let k=ix(a[1]);k<=ix(b[1]);k++)S.add(a[0]+RK[k]+a[2]);continue}
    if(t.endsWith('+')){t=t.slice(0,-1);
      if(t.length===2){for(let k=0;k<=ix(t[0]);k++)S.add(RK[k]+RK[k])}
      else for(let k=ix(t[0])+1;k<=ix(t[1]);k++)S.add(t[0]+RK[k]+t[2]);continue}
    if(t.length===2&&t[0]!==t[1]){S.add(t+'s');S.add(t+'o')}else S.add(t)}
  return S;
}
// 규칙 탭의 핸드 레인지 차트와 같은 범위
const CH=(()=>{
  const allS=new Set();for(let i=0;i<13;i++)for(let j=i+1;j<13;j++)allS.add(RK[i]+RK[j]+'s');
  const VAL=rangeSet('TT+,AK,AQ,AJs,KQs'),BLF=rangeSet('A5s-A2s,K9s,K8s,76s,65s');
  return {SB_FOLD:rangeSet('92o,93o,82o,83o,84o,72o,73o,74o,62o,63o,52o,42o,32o'),VAL,BLF,
    CALL:new Set([...rangeSet('99-22,AJo-A2o,KQo-K5o,QJo-Q8o,JTo-J8o,T9o-T8o,97o,98o,87o,76o'),...allS]),
    LIMP_RAISE:new Set([...VAL,...BLF,...rangeSet('99-66,ATs-A9s,AJo-ATo,KJ,KTs,QJ,JTs')]),
    V4:rangeSet('QQ+,AK'),C3:rangeSet('JJ-66,AQ,AJs-ATs,KQ,KJs-KTs,QJs,JTs,T9s,98s,A5s-A4s'),
    PUSH:rangeSet('PAIRS,ANYA,ANYK,Q2s+,Q6o+,J4s+,J8o+,T6s+,T8o+,96s+,98o,85s+,75s+,64s+,54s'),
    CALLP:rangeSet('PAIRS,ANYA,K5s+,K9o+,Q9s+,QTo+,J9s+,JTo,T9s'),JAM4:rangeSet('QQ+,AK')};
})();
function handClass(h){const r1=12-(h[0]>>2),r2=12-(h[1]>>2);const a=Math.min(r1,r2),b=Math.max(r1,r2);
  if(a===b)return RK[a]+RK[a];return RK[a]+RK[b]+((h[0]&3)===(h[1]&3)?'s':'o')}
const sig=x=>1/(1+Math.exp(-x));
function makeAI(rng,opts={}){
  let W=null,me=null;
  // 이번 매치 동안 관찰한 상대 성향
  const st={ftbN:0,ftbF:0,contN:0,contR:0,chkN:0,betN:0,sbN:0,sbPlay:0,sbRaise:0,hands:0,jamN:0,f3N:0,f3R:0,aggSeen:0,aggWeak:0,callSeen:0,callWeak:0};
  let pending=[]; // 이번 핸드에서 상대가 한 행동과 그 당시 범위 순위표 (쇼다운 때 확인)
  const ai={lastEq:null};
  ai.resetStats=()=>{for(const k in st)st[k]=0};
  const est=(a,b,prior,n)=>(a+prior*n)/(b+n);           // 관찰 빈도 (적게 봤을 땐 기본값 쪽으로)
  const ftb=()=>est(st.ftbF,st.ftbN,0.4,6);              // 베팅을 받았을 때 폴드하는 비율
  const jamRate=()=>est(st.jamN,st.hands,0.03,8);          // 한 핸드당 올인하는 빈도
  ai.profile=()=>({bluff:bluffy(),jamRate:jamRate(),foldToBet:ftb(),betWhenChecked:est(st.betN,st.chkN,0.35,5),sbPlay:est(st.sbPlay,st.sbN,0.75,4)});
  let myIdx=-1,jammedThisHand=false;
  ai.newHand=hole=>{me=hole;st.hands++;pending=[];jammedThisHand=false;myIdx=COMBOS.findIndex(([a,b])=>(a===hole[0]&&b===hole[1])||(a===hole[1]&&b===hole[0]));W=new Float64Array(COMBOS.length);
    for(let i=0;i<COMBOS.length;i++){const [a,b]=COMBOS[i];W[i]=(a===hole[0]||a===hole[1]||b===hole[0]||b===hole[1])?0:1}};
  function strength(board){
    if(board.length===0)return PRE_PCT;
    const vals=new Float64Array(COMBOS.length),idx=[],bset=new Set(board);
    for(let i=0;i<COMBOS.length;i++){const [a,b]=COMBOS[i];if(W[i]===0||bset.has(a)||bset.has(b))continue;vals[i]=evalHand([a,b,...board]);idx.push(i)}
    idx.sort((x,y)=>vals[x]-vals[y]);const s=new Float64Array(COMBOS.length);
    let j=0;while(j<idx.length){let k=j;while(k+1<idx.length&&vals[idx[k+1]]===vals[idx[j]])k++;const pc=((j+k)/2+0.5)/idx.length;for(let t=j;t<=k;t++)s[idx[t]]=pc;j=k+1}
    for(const i of idx)s[i]=0.78*s[i]+0.22*PRE_PCT[i];return s;
  }
  function rankInRange(s){ // 현재 범위 안 순위 (0=가장 약함, 1=가장 강함)
    const idx=[];for(let i=0;i<COMBOS.length;i++)if(W[i]>0)idx.push(i);
    idx.sort((a,b)=>s[a]-s[b]);let tot=0;for(const i of idx)tot+=W[i];
    const r=new Float64Array(COMBOS.length);let c=0;for(const i of idx){r[i]=(c+W[i]/2)/tot;c+=W[i]}
    return r;
  }
  // 쇼다운에서 상대 카드를 보면: 베팅/콜했던 패가 실제로 약했는지 기록
  ai.showdown=oppHole=>{
    const ci=COMBOS.findIndex(([a,b])=>(a===oppHole[0]&&b===oppHole[1])||(a===oppHole[1]&&b===oppHole[0]));
    for(const p of pending){const weak=p.R[ci]<0.5;
      if(p.t==='raise'){st.aggSeen++;if(weak)st.aggWeak++}else{st.callSeen++;if(weak)st.callWeak++}}
    pending=[];
  };
  const bluffy=()=>est(st.aggWeak,st.aggSeen,0.15,3);   // 공격적 행동 중 약한 패 비율
  const loose=()=>est(st.callWeak,st.callSeen,0.2,3);    // 콜 중 약한 패 비율
  // 상대 행동을 보면: 성향 기록 + "이 사람이 이 행동을 하는 빈도"만큼 범위를 위쪽으로 좁힘
  ai.observe=(rec,board)=>{
    if(rec.allin&&!jammedThisHand){st.jamN++;jammedThisHand=true}
    const bset=new Set(board);
    for(let i=0;i<COMBOS.length;i++){if(W[i]>0){const [a,b]=COMBOS[i];if(bset.has(a)||bset.has(b))W[i]=0}}
    const s=strength(board),R=rankInRange(s);
    if(rec.t==='raise'||(rec.t==='call'&&rec.toCall>0))pending.push({t:rec.t,R});
    const forcedSB=rec.street===0&&rec.potBefore<=BB*1.5&&rec.toCall>0;
    if(rec.street===0&&!forcedSB&&rec.toCall>0&&rec.potBefore<=BB*8){st.f3N++;if(rec.t==='raise')st.f3R++} // 내 오픈에 대한 3벳 빈도
    let keep,floor=0.03;
    if(forcedSB){ // 딜러의 첫 행동: 얼마나 많은 패로 참여하는지
      const vp=est(st.sbPlay,st.sbN,0.75,4),rr=est(st.sbRaise,st.sbPlay,0.4,4);
      st.sbN++;if(rec.t!=='fold'){st.sbPlay++;if(rec.t==='raise')st.sbRaise++}
      if(rec.t==='call'){keep=1-vp;floor=Math.max(0.03,vp-0.6)}else if(rec.t==='raise'){keep=1-vp*rr;floor=Math.max(0.08,vp*rr-0.3)}
    }else if(rec.toCall>0){ // 베팅을 받았을 때
      const F=ftb(),bet=rec.toCall/Math.max(rec.potBefore-rec.toCall,1),q=Math.max(0.03,Math.min(0.85,F*(0.6+0.4*Math.min(bet,1.5))));
      const rr=est(st.contR,st.contN,0.3,5);
      st.ftbN++;if(rec.t==='fold')st.ftbF++;else{st.contN++;if(rec.t==='raise')st.contR++}
      if(rec.t==='call'){keep=q;floor=Math.max(0.03,(1-F)-0.55)}else if(rec.t==='raise'){keep=1-(1-q)*rr;floor=Math.max(0.06,rr-0.25,rec.allin?Math.min(0.6,jamRate()*3):0)}
    }else{ // 먼저 행동할 때
      const b=est(st.betN,st.chkN,0.35,5);
      st.chkN++;if(rec.t==='raise')st.betN++;
      if(rec.t==='raise'){keep=1-b;floor=Math.max(0.1,b-0.3,rec.allin?Math.min(0.6,jamRate()*3):0)}
      else{for(let i=0;i<COMBOS.length;i++)if(W[i]>0)W[i]*=1-0.35*sig((R[i]-0.9)/0.04);return}
    }
    if(keep===undefined)return;
    if(rec.t==='raise'&&!forcedSB){ // 작은 베팅은 정보가 적음 → 덜 좁힘
      const inc=(rec.to-rec.oppSi)/Math.max(rec.potBefore+rec.toCall,1);keep*=Math.max(0.3,Math.min(1,inc/0.6))}
    if(rec.t==='raise')floor=Math.max(floor,Math.min(0.9,(bluffy()-0.15)*2));
    if(rec.t==='call')floor=Math.max(floor,Math.min(0.9,(loose()-0.2)*2));
    for(let i=0;i<COMBOS.length;i++)if(W[i]>0)W[i]*=floor+(1-floor)*sig((R[i]-keep)/0.06);
  };
  function equity(board,N=400){
    const used=new Set([...me,...board]);const ids=[],cw=[];let tot=0;
    for(let i=0;i<COMBOS.length;i++){const [a,b]=COMBOS[i];if(W[i]<=0||used.has(a)||used.has(b))continue;tot+=W[i];ids.push(i);cw.push(tot)}
    if(!ids.length)return 0.5;let w=0;
    for(let n=0;n<N;n++){let r=rng()*tot,lo=0,hi=cw.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(cw[mid]<r)lo=mid+1;else hi=mid}
      const o=COMBOS[ids[lo]],u=new Set([...used,...o]),bd=board.slice();
      while(bd.length<5){const c=Math.floor(rng()*52);if(!u.has(c)){u.add(c);bd.push(c)}}
      const x=evalHand([...me,...bd]),y=evalHand([...o,...bd]);w+=x>y?1:x===y?.5:0}
    return w/N;
  }
  // 프리플랍: 레인지 차트대로 (칩이 12BB 이하면 올인/폴드 차트)
  function preflop(v){
    const hc=handClass(v.hole),eff=Math.min(v.myStack+v.mySi,v.oppStack+v.oppSi)/BB;
    const allin={t:'raise',to:v.maxTo};
    const raiseTo=x=>{const to=Math.round(x);if(to>=v.maxTo*0.45)return allin;return {t:'raise',to:Math.max(v.minTo,Math.min(v.maxTo,to))}};
    if(v.toCall>0&&v.toCall>=v.myStack&&eff>12){
      const callFrac=Math.max(0.1,Math.min(0.65,0.1+2.5*jamRate()));
      return PRE_PCT[myIdx]>=1-callFrac?{t:'call'}:{t:'fold'};
    }
    if(eff<=12){
      if(v.raises===0&&v.toCall>0&&v.isBtn)return CH.PUSH.has(hc)?allin:{t:'fold'};
      if(v.toCall===0)return CH.CALLP.has(hc)?allin:{t:'check'};
      return CH.CALLP.has(hc)?(v.canRaise?allin:{t:'call'}):{t:'fold'};
    }
    if(v.isBtn&&v.raises===0&&v.toCall>0)return CH.SB_FOLD.has(hc)?{t:'fold'}:raiseTo(2.5*BB);
    if(!v.isBtn&&v.toCall===0&&v.raises===0)return CH.LIMP_RAISE.has(hc)?raiseTo(3*BB):{t:'check'};
    if(!v.isBtn&&v.raises===1&&v.toCall>0&&v.oppSi<=3.5*BB){
      if(CH.VAL.has(hc))return raiseTo(v.oppSi*3.2);
      if(v.oppSi<=2.2*BB)return CH.SB_FOLD.has(hc)?{t:'fold'}:{t:'call'}; // 작은 레이즈엔 거의 다 방어
      if(CH.BLF.has(hc))return rng()<0.7?raiseTo(v.oppSi*3.2):{t:'call'};
      return CH.CALL.has(hc)?{t:'call'}:{t:'fold'};
    }
    if(v.isBtn&&v.raises===2){
      if(CH.V4.has(hc))return eff<=45?allin:raiseTo(v.oppSi*2.3);
      if(CH.C3.has(hc))return {t:'call'};
      // 최소 방어 비율: 상대가 3벳을 자주 할수록 오픈 범위 중 더 많이 방어
      const mdf=(v.pot-v.toCall)/v.pot,r3=est(st.f3R,st.f3N,0.12,5);
      const defend=Math.max(0.2,Math.min(mdf,mdf*r3/0.25));
      return PRE_PCT[myIdx]>=1-0.88*defend?{t:'call'}:null; // 나머지는 팟 오즈로 판단
    }
    if(v.raises>=3&&CH.JAM4.has(hc))return v.canRaise?allin:{t:'call'};
    return null; // 차트에 없는 상황은 승률로 판단
  }
  ai.decide=v=>{
    if(v.street===0&&opts.chart!==false){const a=preflop(v);if(a){ai.lastEq=null;return a}}
    const eq=equity(v.board);ai.lastEq=eq;
    const r=rng(),P=v.pot,toCall=v.toCall,odds=toCall/(P+toCall||1);
    const raiseTo=frac=>{let to=v.oppSi+Math.round(frac*(P+toCall));to=Math.max(v.minTo,Math.min(v.maxTo,to));if(v.maxTo-to<P*0.4)to=v.maxTo;return {t:'raise',to}};
    const committed=v.myStack<P*0.6;
    if(toCall===0){
      if(!v.canRaise)return{t:'check'};
      if(eq>0.68)return raiseTo(r<0.3?1:0.66);
      if(eq>0.55&&r<0.35)return raiseTo(0.5);
      if(eq<0.35&&r<(v.street===0?0.1:0.18))return raiseTo(0.6);
      return{t:'check'};
    }
    if(v.canRaise&&v.raises<4){
      if(eq>0.74)return raiseTo(committed?9:(r<0.3?1.2:0.8));
      if(eq>0.62&&r<0.3)return raiseTo(0.75);
      if(eq<0.3&&r<0.04&&v.street<=1)return raiseTo(0.8);
    }
    if(eq>=odds+(committed?0:0.03))return{t:'call'};
    return{t:'fold'};
  };
  return ai;
}
// ---- 상대 범위를 추적하는 AI ----
function makeAIBasic(rng){
  let W=null,me=null;
  const ai={lastEq:null};
  ai.newHand=hole=>{me=hole;W=new Float64Array(COMBOS.length);
    for(let i=0;i<COMBOS.length;i++){const [a,b]=COMBOS[i];W[i]=(a===hole[0]||a===hole[1]||b===hole[0]||b===hole[1])?0:1}};
  // 현재 보드 기준 각 조합의 강도(0~1)
  function strength(board){
    if(board.length===0)return PRE_PCT;
    const vals=new Float64Array(COMBOS.length),idx=[];
    const bset=new Set(board);
    for(let i=0;i<COMBOS.length;i++){const [a,b]=COMBOS[i];if(W[i]===0||bset.has(a)||bset.has(b))continue;vals[i]=evalHand([a,b,...board]);idx.push(i)}
    idx.sort((x,y)=>vals[x]-vals[y]);
    const s=new Float64Array(COMBOS.length);
    // 같은 값은 같은 백분위
    let j=0;while(j<idx.length){let k=j;while(k+1<idx.length&&vals[idx[k+1]]===vals[idx[j]])k++;const pc=((j+k)/2+0.5)/idx.length;for(let t=j;t<=k;t++)s[idx[t]]=pc;j=k+1}
    // 드로우 가치 대충 반영: 프리플랍 강도를 일부 섞음
    for(const i of idx)s[i]=0.78*s[i]+0.22*PRE_PCT[i];
    return s;
  }
  // 상대 행동을 보고 범위 갱신
  ai.observe=(rec,board)=>{
    const s=strength(board),bset=new Set(board);
    const frac=rec.t==='raise'?Math.max(0.2,(rec.to-rec.oppSi)/Math.max(rec.potBefore+rec.toCall,1)):0;
    for(let i=0;i<COMBOS.length;i++){if(W[i]===0)continue;const [a,b]=COMBOS[i];if(bset.has(a)||bset.has(b)){W[i]=0;continue}
      let f=1;
      if(rec.t==='raise'){const t=0.45+0.25*Math.min(frac,1.5)/1.5+(rec.street===0?0.05:0);f=0.12+0.88*sig((s[i]-t)/0.08)}
      else if(rec.t==='call'){f=rec.toCall>0?0.25+0.75*sig((s[i]-(rec.street===0?0.3:0.38))/0.1):1}
      else if(rec.t==='check'){f=1-0.35*sig((s[i]-0.85)/0.05)}
      W[i]*=f}
  };
  function equity(hole,board,N=500){
    const used=new Set([...hole,...board]);const ids=[],cw=[];let tot=0;
    for(let i=0;i<COMBOS.length;i++){const [a,b]=COMBOS[i];if(W[i]<=0||used.has(a)||used.has(b))continue;tot+=W[i];ids.push(i);cw.push(tot)}
    if(!ids.length)return 0.5;
    let w=0;
    for(let n=0;n<N;n++){
      let r=rng()*tot,lo=0,hi=cw.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(cw[mid]<r)lo=mid+1;else hi=mid}
      const o=COMBOS[ids[lo]];const u=new Set([...used,...o]);const bd=board.slice();
      while(bd.length<5){const c=Math.floor(rng()*52);if(!u.has(c)){u.add(c);bd.push(c)}}
      const x=evalHand([...hole,...bd]),y=evalHand([...o,...bd]);w+=x>y?1:x===y?.5:0}
    return w/N;
  }
  ai.decide=v=>{
    const eq=equity(v.hole,v.board);ai.lastEq=eq;
    const r=rng(),P=v.pot,toCall=v.toCall,odds=toCall/(P+toCall||1);
    const raiseTo=frac=>{let to=v.oppSi+Math.round(frac*(P+toCall));to=Math.max(v.minTo,Math.min(v.maxTo,to));
      if(v.maxTo-to<P*0.4)to=v.maxTo; return {t:'raise',to}};
    const committed=v.myStack<P*0.6;
    if(toCall===0){
      if(!v.canRaise)return{t:'check'};
      if(eq>0.68)return raiseTo(r<0.3?1:0.66);
      if(eq>0.55&&r<0.35)return raiseTo(0.5);
      if(eq<0.35&&r<(v.street===0?0.1:0.18))return raiseTo(0.6);
      return {t:'check'};
    }
    if(v.canRaise&&v.raises<4){
      if(eq>0.74)return raiseTo(committed?9:(r<0.3?1.2:0.8));
      if(eq>0.62&&r<0.3)return raiseTo(0.75);
      if(eq<0.3&&r<0.04&&v.street<=1)return raiseTo(0.8);
    }
    if(eq>=odds+(committed?0:0.03))return {t:'call'};
    return {t:'fold'};
  };
  return ai;
}
return {mul,evalHand,handName,cardStr,COMBOS,initPreflop,newHand,legal,act,view,makeAI,makeAIBasic,BB,SB,pot};
})();
