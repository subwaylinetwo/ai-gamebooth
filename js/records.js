// Supabase 기록 저장 + 기록 화면
// ================================ 기록 저장 (Supabase) ================================
const SUPABASE_URL='https://srzsxjxmiupmzfxoogxp.supabase.co';
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyenN4anhtaXVwbXpmeG9vZ3hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxMTQzNjIsImV4cCI6MjEwNzY5MDM2Mn0.y1PzRlqUSAeUYd4A85Y-een0UOKRV2BmwrSpE_Ywq8c';

const toast=(()=>{let t=null;return msg=>{const el=document.getElementById('toast');el.textContent=msg;el.hidden=false;clearTimeout(t);t=setTimeout(()=>el.hidden=true,2600)}})();
// 기기 ID: 브라우저마다 한 번 만들어서 계속 씀 (같은 기기에서 친 판끼리 묶어서 분석하기 위함)
const DEVICE_ID=(()=>{
  let id=null;try{id=localStorage.getItem('deviceId')}catch(e){}
  if(!id){id=(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));try{localStorage.setItem('deviceId',id)}catch(e){}}
  return id;
})();
const Rec=(()=>{
  const configured=!SUPABASE_URL.includes('YOUR-PROJECT')&&!SUPABASE_ANON_KEY.includes('YOUR-ANON');
  const sb=configured&&window.supabase?window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY):null;
  const badge=(ok,text)=>{document.getElementById('saveBadge').classList.toggle('ok',ok);document.getElementById('saveText').textContent=text};
  badge(!!sb,sb?'기록 자동 저장':configured?'저장 라이브러리를 불러오지 못했어요':'Supabase 설정 전이라 기록이 저장되지 않아요');
  async function save(rec,retry){
    if(!sb)return;
    const {game,mode,human,ai,win,...detail}=rec;
    const len=game==='yacht'?12:(detail.hands||[]).length;
    const {error}=await sb.from('plays').insert({game,mode,human,ai,win,len,detail:{...detail,device:DEVICE_ID}});
    if(!error){toast('기록 저장됨');Records.refresh();return}
    if(!retry){setTimeout(()=>save(rec,true),800+Math.random()*800);return}
    toast('기록을 저장하지 못했어요. 인터넷 연결을 확인해 주세요');
  }
  return {save,sb};
})();

// ================================ 기록 화면 ================================
const Records={
  async refresh(){
    if(!Rec.sb)return;
    const {data,error}=await Rec.sb.from('plays').select('created_at,game,mode,human,ai,win,len,rank:detail->>rank').order('created_at',{ascending:false}).limit(500);
    if(error){toast('기록을 불러오지 못했어요');return}
    this.render(data.map(r=>({ts:Date.parse(r.created_at),game:r.game,mode:r.mode,human:r.human,ai:r.ai,win:r.win,len:r.len,rank:r.rank})));
  },
  render(list){
    const tiles=document.getElementById('r-tiles'),rows=document.getElementById('r-rows');
    const rate=a=>a.length?Math.round(a.reduce((s,r)=>s+r.win,0)/a.length*100)+'%':'–';
    const by=(g,m)=>list.filter(r=>r.game===g&&(!m||r.mode===m));
    const today=new Date().toDateString(),nToday=list.filter(r=>new Date(r.ts).toDateString()===today).length;
    const tile=(label,v,sub)=>`<div class="tile fr-inset"><div class="eyebrow">${label}</div><div class="v">${v}</div><div class="s">${sub}</div></div>`;
    const y=by('yacht'),p=by('poker');
    tiles.innerHTML=tile('전체 게임',list.length,`오늘 ${nToday}판`)
      +tile('야추 · 사람 승률',rate(y),`${y.length}판 · 최적 AI ${rate(by('yacht','ev'))} / 상대 고려 ${rate(by('yacht','win'))}`)
      +tile('포커 · 사람 승률',rate(p),`${p.length}게임 · 기본 AI ${rate(by('poker','basic'))} / 학습형 ${rate(by('poker','learn'))}`)
      +tile('포커 4인 · 1등 비율',rate(by('poker4')),`${by('poker4').length}게임`);
    if(!list.length){rows.innerHTML='<tr><td colspan="6" class="empty">아직 기록이 없어요. 야추 한 판이나 포커 한 게임을 끝내면 여기에 나타나요.</td></tr>';return}
    const MODE={ev:'최적',win:'상대 고려',basic:'기본',learn:'학습형',multi:'AI 3명'};
    const fmt=t=>{const d=new Date(t);return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`};
    rows.innerHTML=list.slice(0,100).map(r=>{
      const res=r.game==='poker4'?`<span class="pill ${r.rank==1?'win':'lose'}">${r.rank||'?'}등</span>`:r.win===1?'<span class="pill win">사람 승</span>':r.win===0?'<span class="pill lose">AI 승</span>':'<span class="pill draw">무승부</span>';
      const len=r.game==='yacht'?'12라운드':`${Number(r.len)||0}핸드`;
      return `<tr><td class="n">${fmt(r.ts)}</td><td>${r.game==='yacht'?'야추':r.game==='poker4'?'포커 4인':'포커'}</td><td>${MODE[r.mode]||'-'}</td><td>${res}</td><td class="n">${Number(r.human)||0} : ${Number(r.ai)||0}${r.game==='poker4'?' (AI 최고)':''}</td><td>${len}</td></tr>`;
    }).join('');
  }
};
Records.refresh();
document.getElementById('r-device').textContent='이 기기 ID: '+DEVICE_ID.slice(0,8);
document.querySelector('.nav button[data-g="records"]').addEventListener('click',()=>Records.refresh());
