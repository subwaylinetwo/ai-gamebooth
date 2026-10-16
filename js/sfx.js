// 8비트 효과음
// ================================ 효과음 (8비트) ================================
const SFX=(()=>{
  let ac=null,on=true;try{on=localStorage.getItem('sfx')!=='off'}catch(e){}
  const ctx=()=>{if(!ac){const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;ac=new A()}if(ac.state==='suspended')ac.resume();return ac};
  function tone(f,d,{type='square',vol=.06,to=null,at=0}={}){const c=ctx();if(!c)return;const t=c.currentTime+at,o=c.createOscillator(),g=c.createGain();
    o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+d);
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(c.destination);o.start(t);o.stop(t+d+.02)}
  function noise(d,{vol=.06,at=0,hp=1000}={}){const c=ctx();if(!c)return;const b=c.createBuffer(1,Math.ceil(c.sampleRate*d),c.sampleRate),x=b.getChannelData(0);
    for(let i=0;i<x.length;i++)x[i]=Math.random()*2-1;const s=c.createBufferSource();s.buffer=b;const f=c.createBiquadFilter();f.type='highpass';f.frequency.value=hp;
    const g=c.createGain(),t=c.currentTime+at;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(f).connect(g).connect(c.destination);s.start(t)}
  const seq=(ns,st=.09,o={})=>ns.forEach((f,i)=>f&&tone(f,st*1.1,{...o,at:i*st}));
  const S={
    click:()=>tone(660,.05,{vol:.04}),hold:()=>tone(880,.06,{vol:.05,to:1320}),
    roll:()=>{for(let i=0;i<7;i++)noise(.035,{vol:.09,at:i*.07,hp:1800})},land:()=>noise(.07,{vol:.12,hp:500}),
    score:()=>seq([784,1046],.07),zero:()=>seq([392,262],.12,{type:'triangle',vol:.1}),
    big:()=>seq([523,659,784,1046],.08),yacht:()=>seq([523,659,784,1046,0,784,1046,1318],.09),
    jackpot:()=>{seq([523,659,784,1046,784,1046,1318,1568,0,1568,1318,1568,2093],.075,{vol:.07});seq([131,0,165,0,196,0,262,0,196,0,262,0,330],.075,{type:'triangle',vol:.12});for(let i=0;i<18;i++)tone(1700+Math.random()*1100,.04,{vol:.025,type:'triangle',at:1+i*.08})},
    taunt:()=>seq([392,0,330,262],.09,{type:'triangle',vol:.08}),bonus:()=>seq([659,784,988,1318],.08),
    chip:()=>tone(1900,.035,{vol:.03,type:'triangle',to:2600}),card:()=>noise(.045,{vol:.06,hp:3200}),
    check:()=>{tone(300,.04,{vol:.08,type:'triangle'});tone(300,.04,{vol:.08,type:'triangle',at:.09})},
    fold:()=>tone(330,.2,{type:'triangle',to:170,vol:.08}),raise:()=>seq([440,660],.06),allin:()=>seq([330,440,554,660,880],.06,{vol:.07}),
    turn:()=>tone(988,.08,{vol:.04}),win:()=>seq([523,659,784,1046,784,1046],.1),lose:()=>seq([392,330,262,196],.14,{type:'triangle',vol:.1}),
  };
  addEventListener('pointerdown',()=>{if(on)ctx()},{once:true});
  return {play:n=>{if(on&&S[n])try{S[n]()}catch(e){}},get on(){return on},toggle(){on=!on;try{localStorage.setItem('sfx',on?'on':'off')}catch(e){}return on}};
})();

