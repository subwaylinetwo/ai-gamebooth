// 화면 효과: 파티클, 배너, 흔들기, 칩 날리기, 잭팟
// ================================ 화면 효과 (픽셀 격자에 맞춤) ================================
const FX=(()=>{
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,FX_REDUCE=reduce;
  const cv=document.getElementById('fx'),cx=cv.getContext('2d'),layer=document.getElementById('fxl');
  let W=0,H=0,parts=[],raf=0;
  const P=()=>window.PX||2;
  function size(){const d=devicePixelRatio||1;W=innerWidth;H=innerHeight;cv.width=Math.round(W*d);cv.height=Math.round(H*d);cv.style.width=W+'px';cv.style.height=H+'px';cx.setTransform(d,0,0,d,0,0);cx.imageSmoothingEnabled=false}
  addEventListener('resize',size);size();
  function tick(){
    const p=P();cx.clearRect(0,0,W,H);parts=parts.filter(q=>q.life>0&&q.y<H+40);
    for(const q of parts){q.vy+=q.g;q.x+=q.vx;q.y+=q.vy;q.vx*=.985;q.life--;
      cx.globalAlpha=q.life<10?.5:1;const sx=Math.round(q.x/p)*p,sy=Math.round(q.y/p)*p;
      if(q.img)cx.drawImage(q.img,sx,sy,10*p,10*p);else{cx.fillStyle=q.c;cx.fillRect(sx,sy,q.s*p,q.s*p)}}
    cx.globalAlpha=1;raf=parts.length?requestAnimationFrame(tick):0;
  }
  function add(ps){if(reduce)return;parts.push(...ps);if(!raf)raf=requestAnimationFrame(tick)}
  function burst(x,y,o={}){const n=o.n||14,cs=o.colors||['#f5b143','#fff'],ps=[];
    for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=(o.speed||4)*(.4+Math.random());
      ps.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-(o.up??1.5),g:o.gravity??.18,life:(o.life||34)+Math.random()*18,c:cs[i%cs.length],s:o.size||(Math.random()<.5?2:1)})}
    add(ps)}
  function confetti(){const cs=['#f5b143','#009cfd','#fe5f55','#35bd86','#ffffff','#fda200'],ps=[];
    for(let i=0;i<150;i++)ps.push({x:Math.random()*W,y:-20-Math.random()*H*.5,vx:(Math.random()-.5)*2,vy:2+Math.random()*3,g:.035,life:150+Math.random()*90,c:cs[i%cs.length],s:Math.random()<.5?2:3});
    add(ps)}
  const visible=el=>{if(!el)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0};
  function centerOf(el){const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}}
  const snap=v=>Math.round(v/P())*P();
  function float(x,y,text,frame='blue'){
    const d=document.createElement('div');d.className='float fr-'+frame;d.textContent=text;layer.appendChild(d);
    const w=d.offsetWidth,h=d.offsetHeight;d.style.left=snap(x-w/2)+'px';d.style.top=snap(y-h/2)+'px';
    const p=P(),k=[];for(let i=0;i<=8;i++)k.push({transform:`translateY(${-i*2*p}px)`,opacity:i<6?1:1-(i-5)/3});
    const a=d.animate(k,{duration:reduce?400:950,easing:'steps(8,end)'});a.onfinish=()=>d.remove()}
  let chain=Promise.resolve();
  function banner(text,o={}){
    chain=chain.then(()=>new Promise(res=>{
      const d=document.createElement('div');d.className='banner fr-'+(o.frame||'orange');
      d.innerHTML=`<span class="t14">${text}</span>${o.sub?`<small>${o.sub}</small>`:''}`;layer.appendChild(d);
      const w=d.offsetWidth,h=d.offsetHeight;d.style.left=snap(innerWidth/2-w/2)+'px';d.style.top=snap(innerHeight*.38-h/2)+'px';
      const p=P();
      const a=d.animate([{transform:`translateY(${8*p}px)`,opacity:0},{transform:'translateY(0)',opacity:1,offset:.1},{transform:`translateY(${-2*p}px)`,offset:.14},{transform:'translateY(0)',offset:.18},{transform:'translateY(0)',opacity:1,offset:.86},{transform:`translateY(${-6*p}px)`,opacity:0}],{duration:reduce?700:(o.dur||1300),easing:'steps(24,end)'});
      a.onfinish=()=>{d.remove();res()}}));
    return chain}
  function shake(el,m=3){if(reduce||!el)return;const p=P(),k=[];for(let i=0;i<7;i++){const s=Math.max(1,Math.round(m*(1-i/7)));k.push({transform:`translate(${(Math.round(Math.random()*2-1))*s*p}px,${(Math.round(Math.random()*2-1))*s*p}px)`})}k.push({transform:'none'});el.animate(k,{duration:320,easing:'steps(8,end)'})}
  function jolt(el){if(reduce||!el||!visible(el))return;const p=P();el.animate([{transform:`translateY(${-2*p}px)`},{transform:`translateY(${p}px)`},{transform:'none'}],{duration:240,easing:'steps(3,end)'})}
  function fly(a,b,n=3,o={}){
    if(!visible(a)||!visible(b))return Promise.resolve();
    const A=centerOf(a),B=centerOf(b),ps=[],p=P(),half=5*p;
    for(let i=0;i<n;i++){
      const d=document.createElement('img');d.src=o.src||SPR.chipGold;d.className='flychip';d.alt='';layer.appendChild(d);
      const jx=snap((Math.random()-.5)*18),jy=snap((Math.random()-.5)*10),mx=(A.x+B.x)/2+jx,my=Math.min(A.y,B.y)-50;
      const an=d.animate([{transform:`translate(${snap(A.x-half)}px,${snap(A.y-half)}px)`},{transform:`translate(${snap(mx-half)}px,${snap(my-half)}px)`,offset:.5},{transform:`translate(${snap(B.x-half+jx)}px,${snap(B.y-half+jy)}px)`}],
        {duration:reduce?120:430,delay:i*60,easing:'ease-in-out',fill:'backwards'});
      ps.push(an.finished.then(()=>d.remove()));
      setTimeout(()=>SFX.play('chip'),i*60+390);
    }
    return Promise.all(ps)}
  const setFrame=(el,name)=>{el.className=el.className.replace(/\bfr-[a-z]+\b/,'fr-'+name)};
  // 칩 비: 위에서 쏟아지거나(x 없음) 한 점에서 분수처럼 튀어오름
  const coinImg=[SPR.chipGold,SPR.chipGold,SPR.chipRed,SPR.chipBlue].map(s=>{const i=new Image();i.src=s;return i});
  function coins(n,x,y){const ps=[],top=x==null;
    for(let i=0;i<n;i++)ps.push(top?{x:Math.random()*W,y:-30-Math.random()*80,vx:(Math.random()-.5)*1.6,vy:2+Math.random()*3,g:.2,life:200,img:coinImg[i%4]}
      :{x,y,vx:(Math.random()-.5)*10,vy:-(6+Math.random()*8),g:.3,life:200,img:coinImg[i%4]});
    add(ps)}
  // 잭팟: 화면 번쩍임 + 전광판 글자 + 점수 올라가기 + 칩 비
  function jackpot(o={}){
    return new Promise(res=>{
      const p=P(),ai=o.who==='a',txt=o.text||'YACHT!!';
      const ov=document.createElement('div');ov.className='jp'+(ai?' ai':'');
      ov.innerHTML=`<div class="jp-box fr-dark"><div class="jp-who t11">${o.label||''}</div><canvas class="jp-led"></canvas><div class="jp-amt t14">+0</div><div class="jp-sub">${o.sub||''}</div></div>`;
      document.body.appendChild(ov);
      // 글자를 작은 캔버스에 쓰고, 켜진 픽셀마다 전구 하나
      const off=document.createElement('canvas'),ox=off.getContext('2d'),F='15px Galmuri14';
      ox.font=F;const tw=Math.ceil(ox.measureText(txt).width)+2,th=22;off.width=tw;off.height=th;
      ox.font=F;ox.textBaseline='top';ox.fillStyle='#fff';ox.fillText(txt,1,2);
      const d=ox.getImageData(0,0,tw,th).data,lit=[];let y0=th,y1=0;
      for(let y=0;y<th;y++)for(let x=0;x<tw;x++)if(d[(y*tw+x)*4+3]>110){lit.push([x,y]);y0=Math.min(y0,y);y1=Math.max(y1,y)}
      const gh=Math.max(1,y1-y0+1),cell=Math.max(2,Math.min(5,Math.floor(innerWidth*.8/(tw*p)))),pad=1;
      const led=ov.querySelector('.jp-led'),lx=led.getContext('2d');
      led.width=(tw+pad*2)*cell;led.height=(gh+pad*2)*cell;led.style.width=led.width*p+'px';led.style.height=led.height*p+'px';
      const on=new Set(lit.map(([x,y])=>x+','+(y-y0)));
      const COL=ai?['#fe5f55','#ffffff','#fe5f55','#a3342e']:['#fe5f55','#fda200','#f5b143','#ffffff','#35bd86','#009cfd'];
      let fr=0;
      const draw=()=>{lx.clearRect(0,0,led.width,led.height);
        for(let y=-pad;y<gh+pad;y++)for(let x=-pad;x<tw+pad;x++){
          const edge=y<0||y>=gh||x<0||x>=tw;let c;
          if(edge)c=((x+y+fr)>>1)%2?'#f5b143':'#4a3510';            // 테두리 전구가 빙글빙글 돌아감
          else if(on.has(x+','+y))c=x<fr*6?COL[(((x+y)>>2)+fr)%COL.length]:'#3a2a10';
          else c='#1a1408';
          lx.fillStyle=c;lx.fillRect((x+pad)*cell,(y+pad)*cell,cell-1,cell-1)}};
      draw();
      const box=ov.querySelector('.jp-box');
      box.animate([{transform:`translateY(${-30*p}px)`},{transform:`translateY(${4*p}px)`,offset:.6},{transform:'none'}],{duration:FX_REDUCE?1:320,easing:'steps(8,end)'});
      SFX.play('jackpot');
      const T=FX_REDUCE?1200:3200,t0=performance.now(),amt=ov.querySelector('.jp-amt'),goal=o.amount||50;let last=-1,done=false;
      const iv=setInterval(()=>{fr++;draw();
        const t=performance.now()-t0,v=Math.round(goal*Math.max(0,Math.min(1,(t-500)/1100)));
        if(v!==last){last=v;amt.textContent='+'+v;if(v>0&&v%5===0)SFX.play('chip')}
        if(fr%3===0&&t<2000)coins(6);
        if(t>T)end()},70);
      coins(30,innerWidth/2,innerHeight*.62);confetti();
      if(o.shake){shake(o.shake,5);setTimeout(()=>shake(o.shake,4),600);setTimeout(()=>shake(o.shake,3),1300)}
      setTimeout(()=>{coins(24,innerWidth*.2,innerHeight);coins(24,innerWidth*.8,innerHeight)},700);
      function end(){if(done)return;done=true;clearInterval(iv);amt.textContent='+'+goal;
        ov.animate([{opacity:1},{opacity:0}],{duration:250,easing:'steps(4,end)'}).onfinish=()=>{ov.remove();res()}}
      ov.onclick=end;
    })}
  return {reduce,burst,confetti,float,banner,shake,jolt,fly,centerOf,visible,setFrame,coins,jackpot};
})();

