// 도트 그림: 카드, 주사위, 로봇, 칩
// ================================ 도트 스프라이트 (모두 1칸 = --p) ================================
const SPR=(()=>{
  const rr=window.pixRR;
  const cv=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d')]};
  const rows=(r,col)=>{const [c,x]=cv(Math.max(...r.map(s=>s.length)),r.length);x.fillStyle=col;r.forEach((s,y)=>[...s].forEach((ch,i)=>{if(ch==='x')x.fillRect(i,y,1,1)}));return c};
  const pal=(r,p)=>{const [c,x]=cv(Math.max(...r.map(s=>s.length)),r.length);r.forEach((s,y)=>[...s].forEach((ch,i)=>{if(p[ch]){x.fillStyle=p[ch];x.fillRect(i,y,1,1)}}));return c};
  const blit=(x,src,dx,dy,flip)=>{if(!flip){x.drawImage(src,dx,dy);return}x.save();x.translate(dx+src.width,dy+src.height);x.scale(-1,-1);x.drawImage(src,0,0);x.restore()};
  const SUITCOL=['#3d3a8f','#e8364f','#e5672e','#1f6b62'];   // ♠ ♥ ♦ ♣
  const S5=[["..x..",".xxx.","xxxxx","..x..",".xxx."],[".x.x.","xxxxx","xxxxx",".xxx.","..x.."],["..x..",".xxx.","xxxxx",".xxx.","..x.."],[".xxx.",".xxx.","xxxxx","..x..",".xxx."]];
  const S7=[["...x...","..xxx..",".xxxxx.","xxxxxxx","xxxxxxx",".x.x.x.","..xxx.."],[".xx.xx.","xxxxxxx","xxxxxxx","xxxxxxx",".xxxxx.","..xxx..","...x..."],["...x...","..xxx..",".xxxxx.","xxxxxxx",".xxxxx.","..xxx..","...x..."],["..xxx..","..xxx..","xxxxxxx","xxxxxxx","xx.x.xx","...x...","..xxx.."]];
  const S9=[["....x....","...xxx...","..xxxxx..",".xxxxxxx.","xxxxxxxxx","xxxxxxxxx",".xx.x.xx.","....x....","..xxxxx.."],
            [".xx...xx.","xxxx.xxxx","xxxxxxxxx","xxxxxxxxx","xxxxxxxxx",".xxxxxxx.","..xxxxx..","...xxx...","....x...."],
            ["....x....","...xxx...","..xxxxx..",".xxxxxxx.","xxxxxxxxx",".xxxxxxx.","..xxxxx..","...xxx...","....x...."],
            ["...xxx...","..xxxxx..","...xxx...",".xx.x.xx.","xxxxxxxxx","xxxxxxxxx",".xx.x.xx.","....x....","..xxxxx.."]];
  const s5=S5.map((r,i)=>rows(r,SUITCOL[i])),s7=S7.map((r,i)=>rows(r,SUITCOL[i])),s9=S9.map((r,i)=>rows(r,SUITCOL[i]));
  const G3={0:["xx.","..x",".x.","x..","xxx"],1:["xx.","..x",".x.","..x","xx."],2:["x.x","x.x","xxx","..x","..x"],3:["xxx","x..","xx.","..x","xx."],4:[".xx","x..","xxx","x.x","xxx"],
    5:["xxx","..x",".x.",".x.",".x."],6:["xxx","x.x","xxx","x.x","xxx"],7:["xxx","x.x","xxx","..x","xx."],8:["x.xxx","x.x.x","x.x.x","x.x.x","x.xxx"],
    9:["..x","..x","..x","x.x",".x."],10:[".x.","x.x","x.x","xx.",".xx"],11:["x.x","xx.","x..","xx.","x.x"],12:[".x.","x.x","xxx","x.x","x.x"]};
  const G5={9:["..xxx","...x.","...x.","...x.","x..x.","x..x.",".xx.."],10:[".xxx.","x...x","x...x","x...x","x.x.x","x..x.",".xx.x"],11:["x...x","x..x.","x.x..","xx...","x.x..","x..x.","x...x"]};
  const PIPL={0:[[17,9],[17,39]],1:[[17,9],[17,24],[17,39]],2:[[10,9],[24,9],[10,39],[24,39]],3:[[10,9],[24,9],[10,39],[24,39],[17,24]],
    4:[[10,9],[24,9],[10,24],[24,24],[10,39],[24,39]],5:[[10,9],[24,9],[10,24],[24,24],[10,39],[24,39],[17,16]],
    6:[[10,9],[24,9],[10,24],[24,24],[10,39],[24,39],[17,16],[17,32]],7:[[10,9],[24,9],[10,19],[24,19],[10,29],[24,29],[10,39],[24,39],[17,24]],
    8:[[10,9],[24,9],[10,19],[24,19],[10,29],[24,29],[10,39],[24,39],[17,14],[17,34]]};
  const cache=new Map();
  function body(x,edge,fill){rr(x,0,2,35,49,[2,1],'rgba(0,0,0,.42)');rr(x,0,0,35,49,[2,1],edge);rr(x,1,1,33,47,[1],fill)}
  function card(c,hl){
    const k=c+(hl?'h':'');if(cache.has(k))return cache.get(k);
    const [cn,x]=cv(35,51),r=c>>2,s=c&3,col=SUITCOL[s];
    body(x,hl?'#f5b143':'#b9b09d','#f4f0e6');
    if(hl)rr(x,1,1,33,47,[1],'#f5b143'),rr(x,2,2,31,45,[1],'#f4f0e6');
    const g=rows(G3[r],col),dx=2+((5-g.width)>>1);
    blit(x,g,dx,3);blit(x,s5[s],2,9);
    blit(x,g,35-dx-g.width,49-3-5,true);blit(x,s5[s],35-2-5,49-9-5,true);
    if(r<=8){for(const [cx,cy] of PIPL[r])blit(x,s7[s],cx-3,cy-3,cy>24)}
    else if(r===12)blit(x,s9[s],13,20);
    else{const tint=s===0?'#dcdcf2':s===1?'#fbd9de':s===2?'#fbe1d2':'#d3ece7';
      rr(x,8,7,19,35,[1],col);rr(x,9,8,17,33,[1],tint);
      blit(x,rows(G5[r],col),15,12);blit(x,s9[s],13,22);blit(x,s5[s],15,34)}
    const u=cn.toDataURL();cache.set(k,u);return u;
  }
  const back=(()=>{const [cn,x]=cv(35,51);body(x,'#f4f0e6','#f4f0e6');rr(x,3,3,29,43,[1],'#c8372f');x.fillStyle='#e45a4f';
    for(let yy=4;yy<45;yy++)for(let xx=4;xx<31;xx++)if((xx+yy)%6===0||(xx-yy+66)%6===0)x.fillRect(xx,yy,1,1);
    const dm=rows(["...x...","..xxx..",".xxxxx.","xxxxxxx",".xxxxx.","..xxx..","...x..."],'#f4f0e6');rr(x,12,19,11,11,[2,1],'#c8372f');blit(x,dm,14,21);return cn.toDataURL()})();
  const PIPS={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
  const dcache=new Map();
  function die(v,held){const k=v+(held?'h':'');if(dcache.has(k))return dcache.get(k);
    const [cn,x]=cv(29,31);
    rr(x,0,2,29,29,[2,1],'rgba(0,0,0,.42)');rr(x,0,0,29,29,[2,1],held?'#98691b':'#b9b09d');rr(x,1,1,27,27,[1],held?'#f5b143':'#f4f0e6');
    x.fillStyle=held?'#d99a33':'#ddd6c6';x.fillRect(2,26,25,1);
    x.fillStyle=v===1?'#e8364f':'#28302f';
    for(const p of PIPS[v])x.fillRect([5,12,19][p%3],[5,12,19][Math.floor(p/3)],5,5);
    const u=cn.toDataURL();dcache.set(k,u);return u}
  function robot(m){const [cn,x]=cv(24,24),R=(a,b,w,h,c)=>{x.fillStyle=c;x.fillRect(a,b,w,h)};
    R(10,0,4,2,'#f5b143');R(11,2,2,3,'#1d2628');
    rr(x,1,5,22,14,[2,1],'#1d2628');rr(x,2,6,20,12,[1],'#c9d3e3');R(3,16,18,1,'#98a5ba');
    R(0,9,2,5,'#1d2628');R(22,9,2,5,'#1d2628');R(0,10,1,3,'#fe5f55');R(23,10,1,3,'#fe5f55');
    rr(x,4,8,16,8,[1],'#1d2a44');const E='#5cf2ff';
    if(m==='think'){R(8,9,2,2,E);R(16,9,2,2,E);R(11,14,2,1,E)}
    else if(m==='happy'){for(const o of [7,15]){R(o,11,1,1,E);R(o+1,10,1,1,E);R(o+2,11,1,1,E)}R(9,13,1,1,E);R(14,13,1,1,E);R(10,14,4,1,E)}
    else if(m==='sad'){R(7,11,3,1,E);R(14,11,3,1,E);R(10,13,4,1,E);R(9,14,1,1,E);R(14,14,1,1,E)}
    else{R(7,10,2,3,E);R(15,10,2,3,E);R(10,14,4,1,E)}
    R(10,18,4,1,'#1d2628');rr(x,4,19,16,5,[1],'#1d2628');R(5,20,14,4,'#7d89aa');R(8,21,2,2,'#fe5f55');R(14,21,2,2,'#f5b143');
    return cn.toDataURL()}
  function kid(){const [cn,x]=cv(24,24),R=(a,b,w,h,c)=>{x.fillStyle=c;x.fillRect(a,b,w,h)},k='#1d2628';
    rr(x,4,1,16,17,[3,1,1],k);rr(x,5,2,14,15,[2,1],'#ffd2a8');rr(x,5,2,14,5,[2,1],'#6b3f22');R(5,7,2,3,'#6b3f22');R(17,7,2,3,'#6b3f22');
    R(8,10,2,2,k);R(14,10,2,2,k);R(7,13,2,1,'#ff9d8a');R(15,13,2,1,'#ff9d8a');R(11,14,2,1,k);
    rr(x,3,18,18,6,[2],k);rr(x,4,19,16,5,[1],'#009cfd');return cn.toDataURL()}
  const chipRows=["..kkkkkk..",".kccwwcck.","kcwccccwck","kcccwwccck","kwcwccwcwk","kwcwccwcwk","kcccwwccck","kcwccccwck",".kccwwcck.","..kkkkkk.."];
  const chip=c=>pal(chipRows,{k:'#1d2628',w:'#ffffff',c}).toDataURL();
  const lock=pal(["..kkkkk..",".k.....k.",".k.....k.","kkkkkkkkk","kyyyyyyyk","kyyykyyyk","kyyyyyyyk","kkkkkkkkk"],{k:'#1d2628',y:'#f5b143'}).toDataURL();
  return {card,back,die,lock,robot:{idle:robot('idle'),think:robot('think'),happy:robot('happy'),sad:robot('sad')},kid:kid(),chipRed:chip('#fe5f55'),chipBlue:chip('#009cfd'),chipGold:chip('#f5b143')};
})();

