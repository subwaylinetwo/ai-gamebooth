// 상단 메뉴 · 규칙 탭 전환 · 소리 버튼
// ================================ 공통 화면 전환 ================================
document.getElementById('brandDie').src=SPR.robot.happy;
(()=>{const b=document.getElementById('sfxBtn'),set=()=>b.textContent=SFX.on?'소리 켬':'소리 끔';set();b.onclick=()=>{SFX.toggle();set();SFX.play('click')}})();
document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>{
  SFX.play('click');
  document.querySelectorAll('.nav button').forEach(x=>{x.classList.toggle('on',x===b);FX.setFrame(x,x===b?'orange':'dark')});
  document.querySelectorAll('.game').forEach(s=>s.classList.toggle('on',s.id===b.dataset.g));
  BG.set(b.dataset.g==='yacht'?'yacht':b.dataset.g==='poker'||b.dataset.g==='poker4'?'poker':'menu');
});
document.querySelectorAll('#rules .rtab').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('#rules .rtab').forEach(x=>{x.classList.toggle('on',x===b);FX.setFrame(x,x===b?'orange':'dark')});
  document.querySelectorAll('#rules .doc').forEach(d=>d.classList.toggle('on',d.id===b.dataset.r));
});
