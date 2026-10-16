// 다인 포커 규칙 + 성격 있는 AI (화면과 상관없는 부분). poker-engine.js 의 PK(족보 평가, 2장 조합)를 씀
const PM=(()=>{
const BB=20,SB=10;
// ---------- 진행 ----------
function newHand(stacks,btn,rng){
  const n=stacks.length,deck=[...Array(52).keys()];
  for(let i=51;i>0;i--){const j=Math.floor(rng()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}
  const h={n,stacks:stacks.slice(),inv:Array(n).fill(0),si:Array(n).fill(0),btn,hole:[],board:[],street:0,
    out:stacks.map(s=>s<=0),folded:stacks.map(s=>s<=0),acted:Array(n).fill(false),lock:Array(n).fill(false),cur:0,lastRaise:BB,raises:0,done:false,log:[]};
  let di=0;for(let i=0;i<n;i++)h.hole[i]=h.out[i]?null:[deck[di++],deck[di++]];
  h.runout=deck.slice(di,di+5);
  const alive=i=>!h.out[i];
  const nAlive=h.out.filter(x=>!x).length;
  h.sb=nAlive===2?btn:nextFrom(h,btn,alive);h.bb=nextFrom(h,h.sb,alive);
  put(h,h.sb,SB);put(h,h.bb,BB);h.cur=Math.max(...h.si);
  h.toAct=nextFrom(h,h.bb,i=>canAct(h,i));
  if(h.toAct<0||!needsAct(h,h.toAct))afterAction(h,h.bb);
  return h;
}
function nextFrom(h,i,pred){for(let k=1;k<=h.n;k++){const j=(i+k)%h.n;if(pred(j))return j}return -1}
const canAct=(h,i)=>!h.folded[i]&&h.stacks[i]>0;
const live=h=>{const a=[];for(let i=0;i<h.n;i++)if(!h.folded[i])a.push(i);return a};
const needsAct=(h,i)=>canAct(h,i)&&(!h.acted[i]||h.si[i]<h.cur);
function put(h,p,x){x=Math.min(x,h.stacks[p]);h.stacks[p]-=x;h.inv[p]+=x;h.si[p]+=x}
const pot=h=>h.inv.reduce((a,b)=>a+b,0);
function legal(h){
  const p=h.toAct,toCall=Math.max(0,h.cur-h.si[p]),maxTo=h.si[p]+h.stacks[p];
  const minTo=Math.min(maxTo,h.cur+Math.max(h.lastRaise,BB));
  const others=live(h).filter(i=>i!==p&&h.stacks[i]>0).length;
  // 모자란 올인 레이즈 뒤에는, 이미 행동한 사람은 콜/폴드만 가능 (lock)
  return {toCall:Math.min(toCall,h.stacks[p]),canCheck:toCall===0,canRaise:h.stacks[p]>toCall&&others>0&&!h.lock[p],minTo,maxTo};
}
function act(h,a){
  const p=h.toAct,L=legal(h);
  if(a.t==='fold'&&L.toCall===0)a={t:'check'};
  if(a.t==='raise'&&!L.canRaise)a={t:L.toCall?'call':'check'};
  if(a.t==='check'&&L.toCall>0)a={t:'call'};
  if(a.t==='call'&&L.toCall===0)a={t:'check'};
  const to=a.t==='raise'?Math.max(L.minTo,Math.min(L.maxTo,Math.round(a.to))):undefined;
  h.log.push({p,street:h.street,t:a.t,to,allin:a.t==='raise'?to>=L.maxTo:(a.t==='call'&&L.toCall>=h.stacks[p]),potBefore:pot(h),toCall:L.toCall,cur:h.cur});
  if(a.t==='fold'){h.folded[p]=true}
  else if(a.t==='call'||a.t==='check'){put(h,p,L.toCall);h.acted[p]=true}
  else{const inc=to-h.cur,full=inc>=h.lastRaise;put(h,p,to-h.si[p]);h.cur=Math.max(h.cur,h.si[p]);h.raises++;
    if(full){h.lastRaise=inc;for(let i=0;i<h.n;i++){h.acted[i]=false;h.lock[i]=false}}
    else for(let i=0;i<h.n;i++)if(i!==p&&h.acted[i])h.lock[i]=true; // 모자란 레이즈: 다시 레이즈할 권리는 안 열림
    h.acted[p]=true}
  afterAction(h,p);
}
function afterAction(h,p){
  if(live(h).length===1){finish(h);return}
  const nx=nextFrom(h,p,i=>needsAct(h,i));
  if(nx>=0){h.toAct=nx;return}
  // 베팅 라운드 끝
  const actors=live(h).filter(i=>h.stacks[i]>0).length;
  if(h.street===3||actors<=1){h.board=h.runout.slice();h.street=3;finish(h);return}
  h.street++;h.board=h.runout.slice(0,[0,3,4,5][h.street]);h.si.fill(0);h.cur=0;h.acted.fill(false);h.lock.fill(false);h.lastRaise=BB;h.raises=0;
  h.toAct=nextFrom(h,h.btn,i=>canAct(h,i));
}
function finish(h){
  const L=live(h),n=h.n;h.payout=Array(n).fill(0);h.pots=[];
  if(L.length===1){
    // 아무도 따라오지 않은 내 베팅은 돌려받는 것, 나머지만 실제로 딴 팟
    const w=L[0],others=Math.max(0,...h.inv.filter((_,i)=>i!==w)),back=Math.max(0,h.inv[w]-others);
    h.payout[w]=pot(h);h.pots.push({amt:pot(h)-back,win:[w]});if(back)h.pots.push({amt:back,win:[w],ret:true});h.sd=false}
  else{
    h.sd=true;h.vals=Array(n).fill(-1);for(const i of L)h.vals[i]=PK.evalHand([...h.hole[i],...h.board]);
    const levels=[...new Set(h.inv.filter(x=>x>0))].sort((a,b)=>a-b);let prev=0;
    for(const lv of levels){
      let amt=0;for(let i=0;i<n;i++)amt+=Math.max(0,Math.min(h.inv[i],lv)-prev);
      let el=L.filter(i=>h.inv[i]>=lv);
      if(!el.length)el=[...Array(n).keys()].filter(i=>h.inv[i]>=lv); // 남은 돈은 낸 사람에게 돌려줌
      const best=Math.max(...el.map(i=>h.vals[i])),win=el.filter(i=>h.vals[i]===best);
      // 나머지 칩은 딜러 왼쪽부터
      const order=[];for(let k=1;k<=n;k++){const j=(h.btn+k)%n;if(win.includes(j))order.push(j)}
      const share=Math.floor(amt/win.length);let rem=amt-share*win.length;
      for(const w of order){h.payout[w]+=share+(rem>0?1:0);if(rem>0)rem--}
      // 이 층에 한 사람만 칩을 냈으면 팟이 아니라 '아무도 못 받은 내 칩을 돌려받는 것'
      const contrib=[...Array(n).keys()].filter(i=>h.inv[i]>prev).length;
      if(amt>0)h.pots.push({amt,win:order,ret:contrib===1});prev=lv;
    }
  }
  // 이기는 사람이 같은 팟은 하나로 합쳐서 보여줌
  const merged=[];for(const pt of h.pots){const l=merged[merged.length-1];if(l&&!!l.ret===!!pt.ret&&l.win.join()===pt.win.join())l.amt+=pt.amt;else merged.push({...pt})}h.pots=merged;
  for(let i=0;i<n;i++)h.stacks[i]+=h.payout[i];
  h.done=true;
}
function view(h,p){const L=legal(h);return {hole:h.hole[p],board:h.board,street:h.street,pot:pot(h),toCall:L.toCall,canRaise:L.canRaise,minTo:L.minTo,maxTo:L.maxTo,
  myStack:h.stacks[p],mySi:h.si[p],cur:h.cur,raises:h.raises,opps:live(h).filter(i=>i!==p),me:p}}

// ---------- AI: 상대마다 패 범위를 따로 추적하고, 남은 상대 전체를 상대로 승률 계산 ----------
const sig=x=>1/(1+Math.exp(-x));
// 성격: T=베팅 기준(+면 신중), A=공격성, B=블러프 배수, C=콜 기준(+면 잘 접음), S=강한 패로 슬로플레이, Z=베팅 크기
const PERS={
  bull:{name:'불도저',T:-0.06,A:0.15,B:1.8,C:-0.02,S:0,Z:1.25},
  rock:{name:'바위',T:0.06,A:-0.12,B:0.2,C:0.05,S:0,Z:0.9},
  fox:{name:'여우',T:0,A:0.05,B:3,C:0,S:0.35,Z:1}
};
function makeAI(rng,key){
  const P=PERS[key],COMBOS=PK.COMBOS;let me=null,W=new Map();
  const ai={key,name:P.name,lastEq:null};
  ai.newHand=(hole,players)=>{me=hole;W=new Map();
    for(const p of players){const w=new Float64Array(COMBOS.length);
      for(let i=0;i<COMBOS.length;i++){const [a,b]=COMBOS[i];w[i]=(a===hole[0]||a===hole[1]||b===hole[0]||b===hole[1])?0:1}W.set(p,w)}};
  function strength(board,w){
    const PRE=PK.prePct();if(board.length===0)return PRE;
    const vals=new Float64Array(COMBOS.length),idx=[],bset=new Set(board);
    for(let i=0;i<COMBOS.length;i++){const [a,b]=COMBOS[i];if(w[i]===0||bset.has(a)||bset.has(b))continue;vals[i]=PK.evalHand([a,b,...board]);idx.push(i)}
    idx.sort((x,y)=>vals[x]-vals[y]);const s=new Float64Array(COMBOS.length);
    let j=0;while(j<idx.length){let k=j;while(k+1<idx.length&&vals[idx[k+1]]===vals[idx[j]])k++;const pc=((j+k)/2+0.5)/idx.length;for(let t=j;t<=k;t++)s[idx[t]]=pc;j=k+1}
    for(const i of idx)s[i]=0.78*s[i]+0.22*PRE[i];return s;
  }
  ai.observe=(rec,board)=>{
    const w=W.get(rec.p);if(!w)return;
    const s=strength(board,w),bset=new Set(board);
    const frac=rec.t==='raise'?Math.max(0.2,(rec.to-rec.cur)/Math.max(rec.potBefore+rec.toCall,1)):0;
    for(let i=0;i<COMBOS.length;i++){if(w[i]===0)continue;const [a,b]=COMBOS[i];if(bset.has(a)||bset.has(b)){w[i]=0;continue}
      let f=1;
      if(rec.t==='raise'){const t=0.45+0.25*Math.min(frac,1.5)/1.5+(rec.street===0?0.05:0);f=0.12+0.88*sig((s[i]-t)/0.08)}
      else if(rec.t==='call'){f=rec.toCall>0?0.25+0.75*sig((s[i]-(rec.street===0?0.3:0.38))/0.1):1}
      else if(rec.t==='check'){f=1-0.35*sig((s[i]-0.85)/0.05)}
      w[i]*=f}
  };
  // 상대 범위에서 패 뽑기: 판단마다 누적 가중치를 한 번 만들고 이분 탐색, 카드가 겹치면 다시 뽑기
  function sampler(w,board){
    const bset=new Set([...me,...board]),ids=[],cw=[];let tot=0;
    for(let i=0;i<w.length;i++){const [a,b]=COMBOS[i];if(w[i]>0&&!bset.has(a)&&!bset.has(b)){tot+=w[i];ids.push(i);cw.push(tot)}}
    return used=>{
      if(!ids.length){let a,b;do{a=Math.floor(rng()*52)}while(used.has(a));do{b=Math.floor(rng()*52)}while(used.has(b)||b===a);return [a,b]}
      for(let t=0;t<30;t++){let r=rng()*tot,lo=0,hi=cw.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(cw[mid]<r)lo=mid+1;else hi=mid}
        const c=COMBOS[ids[lo]];if(!used.has(c[0])&&!used.has(c[1]))return c}
      let a,b;do{a=Math.floor(rng()*52)}while(used.has(a));do{b=Math.floor(rng()*52)}while(used.has(b)||b===a);return [a,b]};
  }
  function equity(board,opps,N=300){
    const S=opps.map(p=>sampler(W.get(p)||new Float64Array(COMBOS.length).fill(1),board));let win=0;
    for(let n=0;n<N;n++){
      const used=new Set([...me,...board]),hands=[];
      for(const pick of S){const c=pick(used);used.add(c[0]);used.add(c[1]);hands.push(c)}
      const bd=board.slice();while(bd.length<5){const c=Math.floor(rng()*52);if(!used.has(c)){used.add(c);bd.push(c)}}
      const x=PK.evalHand([...me,...bd]);let best=-1,ties=0;
      for(const o of hands){const y=PK.evalHand([...o,...bd]);if(y>best){best=y;ties=0}if(y===best)ties++}
      win+=x>best?1:x===best?1/(ties+1):0;
    }
    return win/N;
  }
  ai.decide=v=>{
    const k=Math.max(1,v.opps.length),eq=equity(v.board,v.opps);ai.lastEq=eq;
    const e1=Math.pow(eq,1/k); // 1대1로 환산한 강도
    const r=rng(),Pt=v.pot,toCall=v.toCall,odds=toCall/(Pt+toCall||1);
    const raiseTo=frac=>{let to=v.cur+Math.round(frac*P.Z*(Pt+toCall)/10)*10;to=Math.max(v.minTo,Math.min(v.maxTo,to));if(v.maxTo-to<Pt*0.4)to=v.maxTo;return {t:'raise',to}};
    const committed=v.myStack<Pt*0.6;
    if(toCall===0){
      if(!v.canRaise)return{t:'check'};
      if(e1>0.8&&r<P.S)return{t:'check'}; // 여우: 강한 패로 함정
      if(e1>0.68+P.T)return raiseTo(r<0.3?1:0.66);
      if(e1>0.55+P.T&&r<0.35+P.A)return raiseTo(0.5);
      if(e1<0.35&&r<(v.street===0?0.08:0.14)*P.B/Math.max(1,k-0.5))return raiseTo(0.6);
      return{t:'check'};
    }
    if(v.canRaise&&v.raises<4){
      if(e1>0.74+P.T)return raiseTo(committed?9:(r<0.3?1.2:0.8));
      if(e1>0.62+P.T&&r<0.3+P.A)return raiseTo(0.75);
      if(e1<0.3&&r<0.03*P.B&&v.street<=1&&k===1)return raiseTo(0.8);
    }
    if(eq>=odds+(committed?0:0.03)+P.C)return{t:'call'};
    return{t:'fold'};
  };
  return ai;
}
return {BB,SB,newHand,legal,act,view,pot,live,makeAI,PERS};
})();
