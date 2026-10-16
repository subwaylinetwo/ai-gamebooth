// 움직이는 소용돌이 배경 (포커 화면에서는 멈춤)
// ================================ 소용돌이 배경 (WebGL, 1칸 = --p) ================================
const BG=(()=>{
  const cv=document.getElementById('bg');
  const PAL={yacht:[[.16,.42,.58],[.10,.25,.38],[.05,.12,.18]],poker:[[.18,.47,.33],[.11,.31,.22],[.05,.14,.10]],menu:[[.72,.24,.21],[.10,.35,.58],[.06,.12,.14]]};
  let cur=PAL.yacht.map(c=>c.slice()),target=PAL.yacht,gl=null,prog=null,loc={},last=0,prev=performance.now(),simT=40,frozen=false;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function fallback(){document.body.style.background='#183a3f'}
  try{gl=cv.getContext('webgl',{antialias:false,preserveDrawingBuffer:false})}catch(e){}
  if(!gl){fallback();return {set(){}}}
  const vs='attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const fs=`precision mediump float;uniform vec2 R;uniform float T;uniform vec3 C1,C2,C3;
  void main(){vec2 uv=(gl_FragCoord.xy-.5*R)/length(R);float l=length(uv);
    float an=atan(uv.y,uv.x)+T*.02-4.5*l;uv=vec2(cos(an),sin(an))*l*26.;
    float s=T*.28;vec2 u2=vec2(uv.x+uv.y);
    for(int i=0;i<5;i++){u2+=sin(max(uv.x,uv.y))+uv;uv+=.5*vec2(cos(5.1123+.353*u2.y+s*.131),sin(u2.x-.113*s));uv-=cos(uv.x+uv.y)-sin(uv.x*.711-uv.y);}
    float cm=1.55,pr=min(2.,max(0.,length(uv)*.035*cm));
    float p1=max(0.,1.-cm*abs(1.-pr)),p2=max(0.,1.-cm*abs(pr)),p3=1.-min(1.,p1+p2);
    vec3 c=.09*C1+.91*(C1*p1+C2*p2+C3*p3);
    gl_FragColor=vec4(floor(c*24.+.5)/24.,1.);}`;
  function sh(t,src){const s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw gl.getShaderInfoLog(s);return s}
  try{prog=gl.createProgram();gl.attachShader(prog,sh(gl.VERTEX_SHADER,vs));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(prog);gl.useProgram(prog)}catch(e){fallback();return {set(){}}}
  const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const al=gl.getAttribLocation(prog,'a');gl.enableVertexAttribArray(al);gl.vertexAttribPointer(al,2,gl.FLOAT,false,0,0);
  for(const n of ['R','T','C1','C2','C3'])loc[n]=gl.getUniformLocation(prog,n);
  function size(){const p=window.PX||2,w=Math.ceil(innerWidth/p),h=Math.ceil(innerHeight/p);cv.width=w;cv.height=h;cv.style.width=w*p+'px';cv.style.height=h*p+'px';gl.viewport(0,0,w,h);if(loc.R)draw()}
  addEventListener('resize',size);addEventListener('pchange',size);size();
  function draw(now){
    for(let i=0;i<3;i++)for(let j=0;j<3;j++)cur[i][j]+=(target[i][j]-cur[i][j])*.05;
    gl.uniform2f(loc.R,cv.width,cv.height);gl.uniform1f(loc.T,simT);
    gl.uniform3fv(loc.C1,cur[0]);gl.uniform3fv(loc.C2,cur[1]);gl.uniform3fv(loc.C3,cur[2]);gl.drawArrays(gl.TRIANGLE_STRIP,0,4)}
  const settled=()=>cur.every((c,i)=>c.every((v,j)=>Math.abs(v-target[i][j])<.002));
  function loop(now){const dt=(now-prev)/1000;prev=now;if(!frozen)simT+=dt;
    if(now-last>40&&!(frozen&&settled())){last=now;draw(now)}requestAnimationFrame(loop)}
  if(reduce)draw(0);else requestAnimationFrame(loop);
  // 포커 화면에서는 배경이 움직이지 않음
  return {set(name){target=PAL[name]||PAL.menu;frozen=name==='poker';if(reduce){cur=target.map(c=>c.slice());draw(0)}}};
})();

