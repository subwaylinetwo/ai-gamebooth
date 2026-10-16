// 픽셀 크기 맞추기 + 테두리 그림 만들기 (head에서 가장 먼저 실행)
// 픽셀 1칸(--p): 화면의 실제 픽셀에 딱 맞는 크기로 정해서, 글자·테두리·카드·주사위·배경이 모두 같은 픽셀 크기를 쓰게 함
(function(){
  const root=document.documentElement;
  // PC: 야추·포커가 스크롤 없이 한 화면에 들어오는 가장 큰 픽셀 크기를 고름 (실제 화면 픽셀의 정수배라서 모든 픽셀 크기가 같음)
  function setP(k){const d=devicePixelRatio||1,P=k/d;root.style.setProperty('--p',P+'px');window.PX=P}
  function fitP(){
    const d=devicePixelRatio||1;
    if(innerWidth<700){setP(Math.max(1,Math.round(1.7*d)));dispatchEvent(new Event('pchange'));return}
    let k=Math.max(1,Math.floor(Math.min(3,innerWidth/560)*d));const minK=Math.max(1,Math.ceil(1.2*d));
    setP(k);
    const secs=['yacht','poker','poker4'].map(id=>document.getElementById(id)).filter(Boolean);
    if(secs.length){
      const games=[...document.querySelectorAll('.game')],on=games.find(g=>g.classList.contains('on'));
      // 포커 오른쪽 칸 안에서 넘치는 만큼도 더함 (버튼이 잘리지 않게)
      const sideOver=sct=>{const ps=sct.querySelector('.pside');return ps?Math.max(0,ps.scrollHeight-ps.clientHeight):0};
      const tall=()=>{let m=0;for(const sct of secs){games.forEach(g=>g.classList.toggle('on',g===sct));m=Math.max(m,document.documentElement.scrollHeight+sideOver(sct))}games.forEach(g=>g.classList.toggle('on',g===on));return m};
      while(k>minK&&tall()>innerHeight){k--;setP(k)}
    }
    dispatchEvent(new Event('pchange'));
  }
  window.fitP=fitP;fitP();
  let rt=0;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(fitP,150)});
  // 9칸 조각 테두리: 모서리 계단 3칸, 아래쪽 그림자 턱 2칸
  function rr(x,x0,y0,w,h,ins,col){x.fillStyle=col;for(let y=0;y<h;y++){const i=y<ins.length?ins[y]:(y>=h-ins.length?ins[h-1-y]:0);x.fillRect(x0+i,y0+y,w-2*i,1)}}
  window.pixRR=rr;
  function frame(f,lip,edge,lipH,pressed){const W=7,Hs=7,c=document.createElement('canvas');c.width=W;c.height=Hs+lipH;const x=c.getContext('2d');
    const by=pressed?lipH:0;
    if(lipH&&!pressed)rr(x,0,lipH,W,Hs,[2,1],lip);
    rr(x,0,by,W,Hs,[2,1],edge||f);if(edge)rr(x,1,by+1,W-2,Hs-2,[1],f);
    return c.toDataURL()}
  const F={
    panel:['#2c3f43','#132024','#48646a',2], inset:['#18262a',null,'#2b3e43',0], insetgold:['#18262a',null,'#f5b143',0],
    dark:['#22343a','#0d171a',null,2], red:['#fe5f55','#a3342e',null,2], blue:['#009cfd','#005c9c',null,2],
    orange:['#fda200','#a26700',null,2], green:['#35bd86','#1d7350',null,2], gold:['#f5b143','#98691b',null,2],
    gray:['#5f7479','#33424a',null,2], white:['#f4f0e6','#99958a',null,2], slot:['rgba(0,0,0,.22)',null,'rgba(255,255,255,.2)',0],
    felt:['rgba(20,64,48,.8)','rgba(5,22,16,.85)','rgba(80,160,125,.5)',2]
  };
  let css='';
  for(const [k,[f,l,e,h]] of Object.entries(F)){
    css+=`.fr-${k}{border-style:solid;border-color:transparent;border-width:calc(var(--p)*3) calc(var(--p)*3) calc(var(--p)*${3+h});border-image:url(${frame(f,l,e,h,false)}) 3 3 ${3+h} 3 fill stretch;background:none}`;
    if(h)css+=`button.fr-${k}:active:not(:disabled){border-width:calc(var(--p)*${3+h}) calc(var(--p)*3) calc(var(--p)*3);border-image:url(${frame(f,l,e,h,true)}) ${3+h} 3 3 3 fill stretch}`;
  }
  const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);
})();
