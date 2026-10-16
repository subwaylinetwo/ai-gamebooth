// 야추 규칙 + AI 계산 (화면과 상관없는 부분)
const Yacht=(()=>{
// ================= 규칙 =================
const CATS=[
  {id:'u1',name:'Aces (1)'},{id:'u2',name:'Deuces (2)'},{id:'u3',name:'Threes (3)'},
  {id:'u4',name:'Fours (4)'},{id:'u5',name:'Fives (5)'},{id:'u6',name:'Sixes (6)'},
  {id:'choice',name:'Choice'},{id:'four',name:'4 of a Kind'},{id:'full',name:'Full House'},
  {id:'ss',name:'S. Straight'},{id:'ls',name:'L. Straight'},{id:'yacht',name:'Yacht'}
];
const UPPER=CATS.slice(0,6), LOWER=CATS.slice(6);
const PIPS={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
function counts(d){const c=[0,0,0,0,0,0,0];d.forEach(v=>c[v]++);return c}
function calc(id,d){
  const c=counts(d), s=d.reduce((a,b)=>a+b,0);
  if(id[0]==='u'){const n=+id[1];return c[n]*n}
  switch(id){
    case 'choice': return s;
    case 'four':   return c.some(x=>x>=4)?s:0;
    case 'full':   return c.filter(x=>x>0).sort().join()==='2,3'?s:0;
    case 'ss':     return [[1,2,3,4],[2,3,4,5],[3,4,5,6]].some(r=>r.every(v=>c[v]))?15:0;
    case 'ls':     return [[1,2,3,4,5],[2,3,4,5,6]].some(r=>r.every(v=>c[v]))?30:0;
    case 'yacht':  return c.some(x=>x===5)?50:0;
  }
}
const upperSum=s=>UPPER.reduce((a,c)=>a+(s[c.id]??0),0);
const bonus=s=>upperSum(s)>=63?35:0;
const total=s=>CATS.reduce((a,c)=>a+(s[c.id]??0),0)+bonus(s);

// ================= 솔버 (모든 상태의 기대 점수표) =================
// 상태 = (채운 족보 12비트, 윗줄 합 0~63). 각 상태에서 "남은 점수의 평균·제곱평균"을 끝에서부터 거꾸로 계산
const Solver=(()=>{
  const CAT=CATS.map(c=>c.id);
  function scoreOf(ci,c,s){
    if(ci<6){const n=ci+1;return c[n]*n}
    switch(ci){
      case 6: return s;
      case 7: return c.some(x=>x>=4)?s:0;
      case 8: return c.filter(x=>x>0).sort().join()==='2,3'?s:0;
      case 9: return [[1,2,3,4],[2,3,4,5],[3,4,5,6]].some(r=>r.every(v=>c[v]))?15:0;
      case 10:return [[1,2,3,4,5],[2,3,4,5,6]].some(r=>r.every(v=>c[v]))?30:0;
      case 11:return c.some(x=>x===5)?50:0;
    }
  }
  const keyOf=c=>{let k=0;for(let v=1;v<=6;v++)k=k*6+c[v];return k};
  const KIDX=new Map(), KEPT=[];
  (function gen(v,left,c){
    if(v>6){KIDX.set(keyOf(c),KEPT.length);KEPT.push(c.slice());return}
    for(let n=0;n<=left;n++){c[v]=n;gen(v+1,left-n,c)}c[v]=0;
  })(1,5,[0,0,0,0,0,0,0]);
  const NK=KEPT.length, ksize=KEPT.map(c=>c.reduce((a,b)=>a+b,0));
  const ROLLS=[];for(let i=0;i<NK;i++)if(ksize[i]===5)ROLLS.push(i);
  const NR=ROLLS.length, RIDX=new Map(ROLLS.map((k,i)=>[k,i]));
  const SC=ROLLS.map(k=>{const c=KEPT[k];let s=0;for(let v=1;v<=6;v++)s+=c[v]*v;return CAT.map((_,ci)=>scoreOf(ci,c,s))});
  const SUBS=ROLLS.map(k=>{const c=KEPT[k],out=[];
    (function g(v,cur){if(v>6){out.push(KIDX.get(keyOf(cur)));return}for(let n=0;n<=c[v];n++){cur[v]=n;g(v+1,cur)}cur[v]=0})(1,[0,0,0,0,0,0,0]);
    return out;});
  const fact=[1,1,2,6,24,120];
  const TR=KEPT.map((k,ki)=>{const m=5-ksize[ki],out=[];
    for(let i=0;i<NK;i++){if(ksize[i]!==m)continue;
      const a=KEPT[i];let p=fact[m];for(let v=1;v<=6;v++)p/=fact[a[v]];p/=6**m;
      const r=k.slice();for(let v=1;v<=6;v++)r[v]+=a[v];
      out.push([RIDX.get(KIDX.get(keyOf(r))),p]);}
    return out;});
  const TRo=new Int32Array(NK+1);{let n=0;for(let k=0;k<NK;k++){TRo[k]=n;n+=TR[k].length}TRo[NK]=n}
  const TRr=new Int32Array(TRo[NK]),TRp=new Float64Array(TRo[NK]);
  for(let k=0;k<NK;k++)TR[k].forEach(([r,p],i)=>{TRr[TRo[k]+i]=r;TRp[TRo[k]+i]=p});
  const SBo=new Int32Array(NR+1);{let n=0;for(let r=0;r<NR;r++){SBo[r]=n;n+=SUBS[r].length}SBo[NR]=n}
  const SBk=new Int32Array(SBo[NR]);for(let r=0;r<NR;r++)SUBS[r].forEach((k,i)=>SBk[SBo[r]+i]=k);
  const P0=new Float64Array(NR);for(const [r,p] of TR[KIDX.get(keyOf([0,0,0,0,0,0,0]))])P0[r]=p;

  const V=new Float64Array(4096*64), M2=new Float64Array(4096*64);
  const reach=new Uint8Array(64*64);
  for(let um=0;um<64;um++){let set=new Set([0]);
    for(let i=0;i<6;i++)if(um>>i&1){const ns=new Set();for(const s of set)for(let n=0;n<=5;n++)ns.add(Math.min(63,s+n*(i+1)));set=ns}
    for(const s of set)reach[um*64+s]=1;}
  const popc=x=>{let n=0;while(x){n+=x&1;x>>=1}return n};

  function expand(E,Es,K){for(let k=0;k<NK;k++){let a=0,b=0;for(let i=TRo[k];i<TRo[k+1];i++){const r=TRr[i],p=TRp[i];a+=p*E[r];b+=p*Es[r]}K[k]=a;K[k+NK]=b}}
  function reduce(K,E,Es){for(let r=0;r<NR;r++){let best=-1e18,bs=0;for(let i=SBo[r];i<SBo[r+1];i++){const k=SBk[i];if(K[k]>best){best=K[k];bs=K[k+NK]}}E[r]=best;Es[r]=bs}}
  // 한 턴 안의 표: E3(마지막 굴림 후 가치), K2(두 번째 굴림 후 남길 것의 가치), K1(첫 굴림 후 남길 것의 가치)
  function turn(leaf){
    const E3=new Float64Array(NR),E3s=new Float64Array(NR),C3=new Int8Array(NR);
    for(let r=0;r<NR;r++){const t=leaf(r);E3[r]=t[0];E3s[r]=t[1];C3[r]=t[2]}
    const KK2=new Float64Array(2*NK);expand(E3,E3s,KK2);
    const E2=new Float64Array(NR),E2s=new Float64Array(NR);reduce(KK2,E2,E2s);
    const KK1=new Float64Array(2*NK);expand(E2,E2s,KK1);
    return {E3,E3s,C3,KK1,K2:KK2.subarray(0,NK),K2s:KK2.subarray(NK),K1:KK1.subarray(0,NK),K1s:KK1.subarray(NK)};
  }
  function evLeaf(mask,u){
    return r=>{let best=-1e18,bs=0,bc=-1;
      for(let c=0;c<12;c++){if(mask>>c&1)continue;
        let s=SC[r][c],nu=u;
        if(c<6){nu=Math.min(63,u+s);if(u<63&&u+s>=63)s+=35}
        const j=(mask|1<<c)*64+nu,m=s+V[j],m2=s*s+2*s*V[j]+M2[j];
        if(m>best){best=m;bs=m2;bc=c}}
      return [best,bs,bc];};
  }
  async function build(onProgress){
    const order=[];for(let m=0;m<4096;m++)order.push(m);
    order.sort((a,b)=>popc(b)-popc(a));
    const E1=new Float64Array(NR),E1s=new Float64Array(NR);let done=0;
    for(const mask of order){
      let mx=0;for(let i=0;i<6;i++)if(!(mask>>i&1))mx+=5*(i+1);
      let rep=-1;
      if(mask!==4095)for(let u=0;u<64;u++){
        if(!reach[(mask&63)*64+u])continue;
        if(u+mx<63&&rep>=0){V[mask*64+u]=V[mask*64+rep];M2[mask*64+u]=M2[mask*64+rep];continue}
        if(u+mx<63)rep=u;
        const T=turn(evLeaf(mask,u));
        reduce(T.KK1,E1,E1s);let a=0,b=0;
        for(let r=0;r<NR;r++){a+=P0[r]*E1[r];b+=P0[r]*E1s[r]}
        V[mask*64+u]=a;M2[mask*64+u]=b;
      }
      if(++done%64===0){onProgress(done/4096);await new Promise(r=>setTimeout(r,0))}
    }
  }

  // ----- 게임 중 결정 -----
  function stateOf(sc){let mask=0,u=0,t=0;CAT.forEach((id,c)=>{if(id in sc){mask|=1<<c;t+=sc[id];if(c<6)u+=sc[id]}});
    return {mask,u:Math.min(63,u),t:t+(u>=63?35:0)}}
  const rIndex=d=>RIDX.get(KIDX.get(keyOf(counts(d))));
  function heldFromKept(d,ki){const want=KEPT[ki].slice();return d.map(v=>{if(want[v]>0){want[v]--;return true}return false})}
  // 상대 고려: 내 최종점수와 상대 최종점수를 정규분포로 보고 z=(평균차)/표준편차 를 최대화
  // 단, 상대가 끝났고 내 마지막 턴이면 승리 확률을 정확히 계산
  function winTurn(me,op){
    if(popc(me.mask)===11&&popc(op.mask)===12){
      const leaf=r=>{let best=-1,bc=-1;
        for(let c=0;c<12;c++){if(me.mask>>c&1)continue;let s=SC[r][c];if(c<6&&me.u<63&&me.u+s>=63)s+=35;
          const f=me.t+s,v=(f>op.t?1:f===op.t?0.5:0)+f*1e-6;if(v>best){best=v;bc=c}}
        return [best,best*best,bc];};
      return {T:turn(leaf),exact:true};
    }
    const oi=op.mask*64+op.u, om=op.t+V[oi], ov=Math.max(0,M2[oi]-V[oi]*V[oi]);
    const leaf=r=>{let best=-1e18,bc=-1,bm=0,b2=0;
      for(let c=0;c<12;c++){if(me.mask>>c&1)continue;
        let s=SC[r][c],nu=me.u;if(c<6){nu=Math.min(63,me.u+s);if(me.u<63&&me.u+s>=63)s+=35}
        const j=(me.mask|1<<c)*64+nu,m=s+V[j],m2=s*s+2*s*V[j]+M2[j];
        const z=(me.t+m-om)/Math.sqrt(Math.max(0,m2-m*m)+ov+1);
        if(z>best){best=z;bc=c;bm=m;b2=m2}}
      return [bm,b2,bc];};
    return {T:turn(leaf),exact:false,om,ov};
  }
  const zOf=(m,m2,me,W)=>(me.t+m-W.om)/Math.sqrt(Math.max(0,m2-m*m)+W.ov+1);
  const Phi=z=>{const t=1/(1+0.2316419*Math.abs(z)),d=0.3989423*Math.exp(-z*z/2);
    const p=d*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));return z>0?1-p:p};
  const info=(mode,W,v,me)=>mode==='win'
    ?`예상 승률 ${Math.round(Math.min(1,W.exact?v:Phi(v))*100)}%`
    :`예상 최종 점수 ${Math.round(me.t+v)}점`;

  function decideKeep(d,rollsLeft,mine,opp,mode){
    const me=stateOf(mine),op=stateOf(opp),ri=rIndex(d);
    let T,W=null;
    if(mode==='win'){W=winTurn(me,op);T=W.T}else T=turn(evLeaf(me.mask,me.u));
    const K=rollsLeft===2?T.K1:T.K2, Ks=rollsLeft===2?T.K1s:T.K2s;
    let best=-1e18,bk=-1;
    for(const k of SUBS[ri]){const v=(W&&!W.exact)?zOf(K[k],Ks[k],me,W):K[k];if(v>best+1e-12){best=v;bk=k}}
    return {held:heldFromKept(d,bk),info:info(mode,W,best,me)};
  }
  function decideCat(d,mine,opp,mode){
    const me=stateOf(mine),op=stateOf(opp),ri=rIndex(d);
    if(mode==='win'){const W=winTurn(me,op),v=W.exact?W.T.E3[ri]:zOf(W.T.E3[ri],W.T.E3s[ri],me,W);
      return {id:CAT[W.T.C3[ri]],info:info(mode,W,v,me)};}
    const t=evLeaf(me.mask,me.u)(ri);
    return {id:CAT[t[2]],info:info(mode,null,t[0],me)};
  }
  return {build,decideKeep,decideCat};
})();
return {CATS,UPPER,LOWER,calc,upperSum,bonus,total,Solver};
})();
