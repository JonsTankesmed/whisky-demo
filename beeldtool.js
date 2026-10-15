/* Beeldtool — productfoto's opmaken in de beheeromgeving.
   Zelfde regels als de beeldpijplijn (DevWhiskysite 26/28), nu in de browser:
   1. bijsnijden op wat zichtbaar is (de CDN vult foto's aan met doorzichtige randen);
   2. achtergrond bepalen aan de rand van dat zichtbare deel: al transparant, wit,
      egaal gekleurd of niet-egaal;
   3. alleen een EGALE achtergrond weghalen, en alleen wat vanaf de rand bereikbaar is —
      wit binnen een etiket blijft staan;
   4. kaderen: 800 x 800, fles op 92% van de hoogte (hooguit 94% breed), gecentreerd;
   5. bewaren met doorzichtige achtergrond (WebP, anders PNG).
   Geen generatieve AI en geen model (besluit F-c). De bewerking gebeurt in de browser.
   Gekozen uit de catalogus of de aandachtslijst? Dan zet 'Opslaan op de site' de WebP als
   <product-ID>.webp in Supabase (opslag ws-beelden, tabel ws_beelden). beelden-live.js toont
   hem daarna bij iedere bezoeker op dat product; geen push nodig. Alleen met login (RLS).
   Het archiveren in de repo (beelden/p/) doet John apart met haal-beelden.ps1. */
(function(){
"use strict";
var BT={KADER:800,DOELHOOGTE:0.92,MAXBREEDTE:0.94,TOL:14,UNIFORM:0.97,WIT:244,RAND:3,MAXBRON:2400,MAXMB:20};
var TEGELS=[["grijs","Grijs","#ece8e3"],["wit","Wit","#ffffff"],["creme","Crème","#f7f3ee"],["donker","Donker","#241b16"],["ruit","Ruit",""]];
var st={img:null,naam:"foto",pid:null,kies:null,vakken:[],vorm:"rect",punten:[],hover:null,dicht:true,bezig:false,klaar:[],tol:BT.TOL,laatStaan:false,forceer:false,tegel:"grijs",uit:null};

function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function $(id){return document.getElementById(id);}
function veiligeNaam(s){return (String(s||"foto").replace(/\.[a-z0-9]+$/i,"").toLowerCase().replace(/[^a-z0-9_-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60))||"foto";}
function mediaan(a){a.sort(function(p,q){return p-q;});var m=a.length>>1;return a.length%2?a[m]:(a[m-1]+a[m])/2;}

/* ---------- beeldbewerking ---------- */
function naarCanvas(img){
 var w=img.naturalWidth||img.width,h=img.naturalHeight||img.height,f=Math.min(1,BT.MAXBRON/Math.max(w,h));
 var c=document.createElement("canvas");c.width=Math.max(1,Math.round(w*f));c.height=Math.max(1,Math.round(h*f));
 var x=c.getContext("2d",{willReadFrequently:true});x.imageSmoothingQuality="high";x.drawImage(img,0,0,c.width,c.height);
 return c;
}
function vak(d,w,h,drempel){
 var a=d.data,x0=w,y0=h,x1=-1,y1=-1,x,y,r;
 for(y=0;y<h;y++){r=y*w*4;for(x=0;x<w;x++){if(a[r+x*4+3]>drempel){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}}}
 return x1<0?null:{x0:x0,y0:y0,x1:x1,y1:y1};
}
function uitsnede(c,v){
 var o=document.createElement("canvas");o.width=v.x1-v.x0+1;o.height=v.y1-v.y0+1;
 o.getContext("2d",{willReadFrequently:true}).drawImage(c,v.x0,v.y0,o.width,o.height,0,0,o.width,o.height);return o;
}
function achtergrond(d,w,h,tol){
 var a=d.data,R=Math.min(BT.RAND,Math.floor(Math.min(w,h)/2)||1),px=[],x,y,i;
 function neem(x,y){i=(y*w+x)*4;px.push([a[i],a[i+1],a[i+2],a[i+3]]);}
 for(y=0;y<h;y++){
  if(y<R||y>=h-R){for(x=0;x<w;x++)neem(x,y);}
  else{for(x=0;x<R;x++){neem(x,y);neem(w-1-x,y);}}
 }
 var dek=px.filter(function(p){return p[3]>200;});
 if(dek.length/px.length<0.5)return {soort:"transparant"};
 var k=[0,1,2].map(function(j){return Math.round(mediaan(dek.map(function(p){return p[j];})));});
 var binnen=dek.filter(function(p){return Math.abs(p[0]-k[0])<=tol&&Math.abs(p[1]-k[1])<=tol&&Math.abs(p[2]-k[2])<=tol;}).length/dek.length;
 return {soort:binnen<BT.UNIFORM?"niet-uniform":(k.every(function(v){return v>=BT.WIT;})?"wit":"egaal-gekleurd"),kleur:k,egaal:binnen};
}
/* Egale achtergrond weg, alleen wat vanaf de rand bereikbaar is. Al doorzichtige pixels zijn
   begaanbaar. Daarna één ring zachte overgang, zodat er op donker geen witte rand blijft. */
function witWeg(c,k,tol,bes){
 var w=c.width,h=c.height,x=c.getContext("2d",{willReadFrequently:true}),d=x.getImageData(0,0,w,h),a=d.data,n=w*h;
 var gelijk=new Uint8Array(n),weg=new Uint8Array(n),stapel=new Int32Array(n),sp=0,i,j,p,px,py;
 function afst(j){return Math.max(Math.abs(a[j]-k[0]),Math.abs(a[j+1]-k[1]),Math.abs(a[j+2]-k[2]));}
 for(i=0;i<n;i++){j=i*4;if((a[j+3]<=16||afst(j)<=tol)&&!(bes&&bes[i]))gelijk[i]=1;}
 function zaai(i){if(gelijk[i]&&!weg[i]){weg[i]=1;stapel[sp++]=i;}}
 for(px=0;px<w;px++){zaai(px);zaai((h-1)*w+px);}
 for(py=0;py<h;py++){zaai(py*w);zaai(py*w+w-1);}
 while(sp){p=stapel[--sp];px=p%w;py=(p-px)/w;
  if(px>0)zaai(p-1);if(px<w-1)zaai(p+1);if(py>0)zaai(p-w);if(py<h-1)zaai(p+w);}
 var weggehaald=0;
 for(i=0;i<n;i++)if(weg[i]){a[i*4+3]=0;weggehaald++;}
 for(i=0;i<n;i++){
  if(weg[i])continue;px=i%w;py=(i-px)/w;
  if(!((px>0&&weg[i-1])||(px<w-1&&weg[i+1])||(py>0&&weg[i-w])||(py<h-1&&weg[i+w])))continue;
  j=i*4;var f=Math.min(1,Math.max(0,(afst(j)-tol)/(tol*2)));a[j+3]=Math.round(a[j+3]*(0.35+0.65*f));
 }
 x.putImageData(d,0,0);return weggehaald/n;
}
/* Voor een achtergrond met een licht verloop (vignet, schaduw) werkt één vaste kleur niet:
   de hoeken zijn lichter dan het midden. Dan groeit het weg te halen vlak van pixel naar
   pixel: een buur doet mee als hij bijna gelijk is aan de pixel waar hij aan grenst
   (stap), en niet te ver afwijkt van de randkleur (plafond). Een productrand is een sprong
   en houdt de groei tegen. Alleen op uitdrukkelijke keuze van de gebruiker. */
function verloopWeg(c,k,tol,bes){
 var w=c.width,h=c.height,x=c.getContext("2d",{willReadFrequently:true}),d=x.getImageData(0,0,w,h),a=d.data,n=w*h;
 var stap=Math.max(3,Math.round(tol/3)),plafond=tol*4,weg=new Uint8Array(n),stapel=new Int32Array(n),sp=0,p,px,py;
 function ver(i,j){i*=4;j*=4;return Math.max(Math.abs(a[i]-a[j]),Math.abs(a[i+1]-a[j+1]),Math.abs(a[i+2]-a[j+2]));}
 function bg(i){if(bes&&bes[i])return false;i*=4;return a[i+3]<=16||Math.max(Math.abs(a[i]-k[0]),Math.abs(a[i+1]-k[1]),Math.abs(a[i+2]-k[2]))<=plafond;}
 /* Zaaien alleen op randpixels die echt de achtergrondkleur hebben (binnen de tolerantie).
    Een fles of doos die tegen de rand van de foto staat, wordt zo niet als achtergrond
    meegenomen; de groei daarna stopt bij elke sprong groter dan 'stap'. */
 function kern(i){if(bes&&bes[i])return false;i*=4;return a[i+3]<=16||Math.max(Math.abs(a[i]-k[0]),Math.abs(a[i+1]-k[1]),Math.abs(a[i+2]-k[2]))<=tol;}
 function zaai(i){if(!weg[i]&&kern(i)){weg[i]=1;stapel[sp++]=i;}}
 function groei(q,i){if(!weg[i]&&bg(i)&&(a[i*4+3]<=16||ver(q,i)<=stap)){weg[i]=1;stapel[sp++]=i;}}
 for(px=0;px<w;px++){zaai(px);zaai((h-1)*w+px);}
 for(py=0;py<h;py++){zaai(py*w);zaai(py*w+w-1);}
 while(sp){p=stapel[--sp];px=p%w;py=(p-px)/w;
  if(px>0)groei(p,p-1);if(px<w-1)groei(p,p+1);if(py>0)groei(p,p-w);if(py<h-1)groei(p,p+w);}
 var tel=0;for(var i=0;i<n;i++)if(weg[i]){a[i*4+3]=0;tel++;}
 x.putImageData(d,0,0);return tel/n;
}
/* Vakken die de gebruiker om een doos trekt: binnen een vak wordt niets weggehaald.
   Vakken staan in fracties van de hele foto; hier omgerekend naar de uitsnede. */
function beschermMasker(w,h,v,cw,ch){
 if(!st.vakken.length)return null;
 var c=document.createElement("canvas");c.width=w;c.height=h;var x=c.getContext("2d",{willReadFrequently:true});
 x.fillStyle="#000";
 st.vakken.forEach(function(r){var q=vakPunten(r);x.beginPath();
  q.forEach(function(pt,k){var px=pt.x*cw-v.x0,py=pt.y*ch-v.y0;if(k)x.lineTo(px,py);else x.moveTo(px,py);});
  x.closePath();x.fill();});
 var a=x.getImageData(0,0,w,h).data,m=new Uint8Array(w*h),t=0;
 for(var i=0;i<w*h;i++)if(a[i*4+3]>127){m[i]=1;t++;}
 return t?m:null;
}
/* Een vak is een rechthoek {x0,y0,x1,y1} of een vrije vorm {p:[{x,y},…]}, in fracties van de foto. */
function vakPunten(r){return r.p?r.p:[{x:r.x0,y:r.y0},{x:r.x1,y:r.y0},{x:r.x1,y:r.y1},{x:r.x0,y:r.y1}];}
/* Een witte doos op een witte achtergrond wordt via een zwakke rand soms 'leeggelopen':
   het witte vlak verdwijnt, de opdruk blijft zweven. Zulke weggehaalde pixels liggen dan
   ingesloten in het product: links én rechts in dezelfde rij, en boven én onder in dezelfde
   kolom staat nog product. Die zetten we terug naar het origineel. De ruimte tussen twee
   losse voorwerpen (fles en doos) is niet ingesloten en blijft doorzichtig. */
function gatenDicht(c,orig){
 var w=c.width,h=c.height,x=c.getContext("2d",{willReadFrequently:true}),d=x.getImageData(0,0,w,h),a=d.data,o=orig.data,n=w*h,i,px,py;
 var rl=new Int32Array(h).fill(w),rr=new Int32Array(h).fill(-1),kb=new Int32Array(w).fill(h),ko=new Int32Array(w).fill(-1),dek=0;
 for(py=0;py<h;py++)for(px=0;px<w;px++){if(a[(py*w+px)*4+3]>128){dek++;
  if(px<rl[py])rl[py]=px;if(px>rr[py])rr[py]=px;if(py<kb[px])kb[px]=py;if(py>ko[px])ko[px]=py;}}
 var terug=0;
 for(py=0;py<h;py++)for(px=0;px<w;px++){i=(py*w+px)*4;
  if(a[i+3]<=128&&o[i+3]>16&&px>rl[py]&&px<rr[py]&&py>kb[px]&&py<ko[px]){a[i]=o[i];a[i+1]=o[i+1];a[i+2]=o[i+2];a[i+3]=o[i+3];terug++;}}
 if(terug)x.putImageData(d,0,0);
 return dek?terug/dek:0;
}
function kaderen(c){
 var x=c.getContext("2d",{willReadFrequently:true}),v=vak(x.getImageData(0,0,c.width,c.height),c.width,c.height,16);
 if(!v)return null;
 var bron=uitsnede(c,v),bw=bron.width,bh=bron.height,K=BT.KADER;
 var s=K*BT.DOELHOOGTE/bh;if(bw*s>K*BT.MAXBREEDTE)s=K*BT.MAXBREEDTE/bw;
 var nw=Math.max(1,Math.round(bw*s)),nh=Math.max(1,Math.round(bh*s));
 while(bron.width/2>nw&&bron.height/2>nh){ /* in stappen verkleinen: scherper dan in één keer */
  var t=document.createElement("canvas");t.width=Math.round(bron.width/2);t.height=Math.round(bron.height/2);
  var tx=t.getContext("2d");tx.imageSmoothingQuality="high";tx.drawImage(bron,0,0,t.width,t.height);bron=t;}
 var o=document.createElement("canvas");o.width=K;o.height=K;
 var ox=o.getContext("2d");ox.imageSmoothingQuality="high";ox.drawImage(bron,Math.round((K-nw)/2),Math.round((K-nh)/2),nw,nh);
 return {canvas:o,schaal:s,hoogte:nh/K};
}
function verwerk(){
 if(!st.img)return;
 var c=naarCanvas(st.img),x=c.getContext("2d",{willReadFrequently:true}),d;
 try{d=x.getImageData(0,0,c.width,c.height);}
 catch(e){meld("fout","Deze foto mag de browser niet bewerken: de winkel-CDN geeft er geen toestemming voor. Open de foto, sla hem op en sleep hem hierheen.");return;}
 var v=vak(d,c.width,c.height,16);if(!v){meld("fout","De foto is helemaal doorzichtig — er staat niets op.");return;}
 var kern=uitsnede(c,v),kd=kern.getContext("2d",{willReadFrequently:true}).getImageData(0,0,kern.width,kern.height);
 var ag=achtergrond(kd,kern.width,kern.height,st.tol),regels=[],niveau="ok";
 var bes=beschermMasker(kern.width,kern.height,v,c.width,c.height),geknipt=false;
 if(ag.soort==="transparant")regels.push("Achtergrond is al doorzichtig — niets weggehaald.");
 else if(st.laatStaan)regels.push("Achtergrond bewust laten staan ("+ag.soort+").");
 else if(ag.soort==="niet-uniform"&&!st.forceer){niveau="waarschuwing";
  regels.push("Achtergrond is niet egaal ("+Math.round(ag.egaal*100)+"% van de rand is gelijk). Die wordt niet automatisch weggehaald: raden hoort niet bij de regels."
   +(ag.egaal>=0.75?" Gaat het om een licht verloop of een schaduw, kies dan zelf voor 'Toch uitknippen'."
     :" Raken de fles of de doos de rand van de foto? Dan kan uitknippen toch goed gaan: kies 'Toch uitknippen' en controleer het resultaat op de donkere tegel."));}
 else if(ag.soort==="niet-uniform"){niveau="waarschuwing";var deelF=verloopWeg(kern,ag.kleur,st.tol,bes);geknipt=true;
  regels.push("Op jouw keuze uitgeknipt, hoewel de achtergrond niet egaal is — "+Math.round(deelF*100)+"% doorzichtig gemaakt. Controleer de randen op de donkere tegel; zo nodig de tolerantie bijstellen.");}
 else{var deel=witWeg(kern,ag.kleur,st.tol,bes);geknipt=true;regels.push("Achtergrond "+(ag.soort==="wit"?"wit":"egaal gekleurd")+" ("+Math.round(ag.egaal*100)+"% van de rand gelijk) — "+Math.round(deel*100)+"% van het beeld doorzichtig gemaakt.");}
 if(bes)regels.push(st.vakken.length+(st.vakken.length===1?" beschermd vak":" beschermde vakken")+": daarbinnen is niets weggehaald.");
 if(geknipt&&st.dicht){var dt=gatenDicht(kern,kd);
  if(dt>0.005)regels.push("Ingesloten gaten in het product teruggezet ("+Math.round(dt*100)+"% van het product), zodat een witte doos heel blijft. Klopt dat niet, zet dan 'Gaten dichten' uit.");}
 var k=kaderen(kern);if(!k){meld("fout","Na het uitknippen bleef er niets over. Verlaag de tolerantie.");return;}
 regels.push("Gekaderd op "+BT.KADER+" × "+BT.KADER+", fles op "+Math.round(k.hoogte*100)+"% van de hoogte.");
 if(k.schaal>1.5){niveau="waarschuwing";regels.push("Let op: de bron is klein en is "+k.schaal.toFixed(1)+"× vergroot. Dat kan onscherp ogen.");}
 st.uit=k.canvas;teken();meld(niveau,regels.join(" "));
 var fk=$("btForceer");if(fk){fk.style.display=(ag.soort==="niet-uniform"&&!st.laatStaan)?"":"none";fk.textContent=st.forceer?"Toch niet uitknippen":"Toch uitknippen";}
 knoppen();
}

/* ---------- weergave ---------- */
function tegelStijl(el){
 var t=TEGELS.filter(function(x){return x[0]===st.tegel;})[0];
 el.style.background=t[0]==="ruit"?"repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0 0/20px 20px":t[2];
}
function afst(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function bijStart(q){return st.punten.length&&afst(st.punten[0],q)<0.03;}
function oppervlak(pp){var o=0;for(var i=0,j=pp.length-1;i<pp.length;j=i++)o+=(pp[j].x+pp[i].x)*(pp[j].y-pp[i].y);return Math.abs(o/2);}
function vormUitleg(){return st.vorm==="veel"
 ?"Klik punt voor punt langs de rand, of houd de muis ingedrukt en trek een vrije lijn (die sluit vanzelf bij loslaten). Sluit punten door op het eerste punt te klikken, te dubbelklikken of op Enter te drukken. Backspace haalt het laatste punt weg, Esc begint opnieuw."
 :"Sleep met de muis een rechthoek om de doos.";}
function teken(){
 var voor=$("btVoor"),na=$("btNa");if(!voor||!na)return;
 [voor,na].forEach(tegelStijl);
 if(st.img){var s=naarCanvas(st.img),f=Math.min(1,400/Math.max(s.width,s.height));
  voor.width=Math.round(s.width*f);voor.height=Math.round(s.height*f);var vx=voor.getContext("2d");vx.drawImage(s,0,0,voor.width,voor.height);
  var W=voor.width,H=voor.height;
  st.vakken.concat(st.trek?[st.trek]:[]).forEach(function(r){var q=vakPunten(r);vx.save();vx.strokeStyle="#c9963f";vx.lineWidth=2;vx.setLineDash([6,4]);
   vx.fillStyle="rgba(201,150,63,.12)";vx.beginPath();q.forEach(function(pt,k){if(k)vx.lineTo(pt.x*W,pt.y*H);else vx.moveTo(pt.x*W,pt.y*H);});
   vx.closePath();vx.fill();vx.stroke();vx.restore();});
  if(st.punten.length){var pp=st.punten;vx.save();vx.strokeStyle="#c9963f";vx.lineWidth=2;vx.beginPath();
   pp.forEach(function(pt,k){if(k)vx.lineTo(pt.x*W,pt.y*H);else vx.moveTo(pt.x*W,pt.y*H);});
   if(st.hover){vx.setLineDash([4,4]);vx.lineTo(st.hover.x*W,st.hover.y*H);}vx.stroke();vx.setLineDash([]);
   var dicht=pp.length>=3&&st.hover&&bijStart(st.hover);
   vx.fillStyle=dicht?"#7a1f2b":"#c9963f";vx.beginPath();vx.arc(pp[0].x*W,pp[0].y*H,dicht?7:5,0,7);vx.fill();
   vx.fillStyle="#c9963f";pp.slice(1).forEach(function(pt){if(pp.length<60){vx.beginPath();vx.arc(pt.x*W,pt.y*H,2.5,0,7);vx.fill();}});vx.restore();}
 }
 if(st.uit){na.width=400;na.height=400;var nx=na.getContext("2d");nx.clearRect(0,0,400,400);nx.imageSmoothingQuality="high";nx.drawImage(st.uit,0,0,400,400);}
}
function meld(niveau,tekst){var e=$("btDiag");if(!e)return;e.className="bt-diag bt-"+niveau;e.textContent=tekst;}
function wis(){
 st.img=null;st.uit=null;st.pid=null;st.forceer=false;st.vakken=[];st.trek=null;st.punten=[];st.hover=null;var vw=$("btVakWis");if(vw)vw.style.display="none";
 ["btVoor","btNa"].forEach(function(id){var c=$(id);if(c){c.getContext("2d").clearRect(0,0,c.width,c.height);}});
 var fk=$("btForceer");if(fk)fk.style.display="none";
 knoppen();
}
function laad(src,naam,crossOrigin,pid,poging){
 /* De vorige foto gaat eerst helemaal weg: anders kan een mislukte laadpoging een oud
    resultaat onder het ID van de nieuwe fles laten opslaan. Het ID hoort pas bij de foto
    als die echt geladen is. */
 wis();
 meld("ok","Foto laden…");
 var img=new Image();if(crossOrigin)img.crossOrigin="anonymous";
 img.onload=function(){st.img=img;st.naam=veiligeNaam(naam);st.pid=pid||null;verwerk();};
 img.onerror=function(){
  if(!crossOrigin){meld("fout","Dit bestand is geen leesbare afbeelding.");return;}
  if(!poging){laad(src+(src.indexOf("?")<0?"?":"&")+"bt=1",naam,true,pid,1);return;} /* browsercache zonder CORS-kop omzeilen */
  var kaal=new Image();                                                             /* bestaat de foto wel? */
  kaal.onload=function(){meld("fout","De webwinkel geeft deze foto niet vrij voor bewerking. Open de foto in de webwinkel, sla hem op en sleep hem hierheen"+bijWie()+".");};
  kaal.onerror=function(){meld("fout","Deze fles heeft geen werkende foto in de webwinkel: de link geeft een foutmelding. Zoek of maak een eigen foto en sleep die hierheen"+bijWie()+".");};
  kaal.src=src.replace(/[?&]bt=1$/,"");
 };
 img.src=src;
}
function bijWie(){var p=st.kies&&vindProduct(st.kies);return p?"; hij wordt dan opgeslagen bij "+p.name:"";}
function bijLabel(){
 var e=$("btBij");if(!e)return;var p=st.kies&&vindProduct(st.kies);
 e.innerHTML=p?"Wordt opgeslagen bij: <b>"+esc(p.name)+"</b>":"";e.style.display=p?"block":"none";
}
function bestand(f){
 if(!f)return;
 if(!/^image\/(png|jpeg|webp)$/.test(f.type)){meld("fout","Alleen png, jpg of webp.");return;}
 if(f.size>BT.MAXMB*1048576){meld("fout","Dit bestand is groter dan "+BT.MAXMB+" MB.");return;}
 var m=/^(\d{5,})(?:-opgemaakt)?\.[a-z]+$/i.exec(f.name),pid=m&&vindProduct(m[1])?m[1]:(st.kies||null);
 var url=URL.createObjectURL(f);laad(url,f.name,false,pid);setTimeout(function(){URL.revokeObjectURL(url);},60000);
}
function download(type){
 if(!st.uit)return;
 st.uit.toBlob(function(blob){
  if(!blob){meld("fout","Opslaan mislukt in deze browser.");return;}
  var ext=blob.type==="image/webp"?"webp":"png",naam=st.pid?st.pid+"."+ext:st.naam+"-opgemaakt."+ext;
  if(st.pid&&type==="image/webp"){
   if(ext!=="webp"){meld("fout","Deze browser kan geen WebP maken. Gebruik Chrome of Edge om de foto op de site te zetten.");return;}
   naarSite(st.pid,blob);return;}
  var a=document.createElement("a"),u=URL.createObjectURL(blob);a.href=u;a.download=naam;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(u);},5000);
  if(type==="image/webp"&&ext!=="webp")meld("waarschuwing","Deze browser kan geen WebP maken; opgeslagen als PNG (ook doorzichtig)."+(st.pid?" De site gebruikt alleen WebP: probeer het in Chrome of Edge.":""));
  else if(st.pid)meld("ok","Gedownload als "+naam+" (alleen voor eigen gebruik). Op de site zetten gaat met 'Opslaan op de site'.");
 },type,0.9);
}
/* ---------- resultaat meteen op de site (deze sessie) ---------- */
function vindProduct(id){return typeof CAT!=="undefined"?CAT.filter(function(x){return String(x.id)===String(id);})[0]:null;}
function magOpslaan(){return typeof WS!=="undefined"&&WS.sb&&WS.gebruiker&&!WS.fout;}
function naarSite(pid,blob){
 if(!magOpslaan()){meld("fout","Log eerst in (bovenaan dit scherm) om foto's op de site te zetten.");return;}
 if(st.bezig)return;st.bezig=true;knoppen();
 meld("ok","Bezig met opslaan…");
 var sb=WS.sb,pad=pid+".webp";
 sb.storage.from("ws-beelden").upload(pad,blob,{upsert:true,contentType:"image/webp",cacheControl:"3600"})
 .then(function(r){if(r.error)throw r.error;
  return sb.from("ws_beelden").upsert({product_id:pid,versie:new Date().toISOString()},{onConflict:"product_id"}).select("versie").single();})
 .then(function(r){if(r.error)throw r.error;
  var versie=Date.parse(r.data.versie)||Date.now();
  if(typeof beeldLivePasToe==="function")beeldLivePasToe(pid,versie);
  if(st.klaar.indexOf(pid)<0)st.klaar.push(pid);
  var b=document.querySelector('#btAandacht .bt-hit[data-id="'+pid+'"]');if(b)b.classList.add("bt-klaar");
  var n=$("btAantal");if(n)n.textContent=aandachtLijst().length;
  klaarLijst();
  var p=vindProduct(pid);
  meld("ok","Opgeslagen. De foto staat nu op de productpagina"+(p?" van "+p.name:"")+", voor iedere bezoeker.");
 })
 .catch(function(e){
  var m=String(e&&e.message||e);
  meld("fout",/row-level|policy|403|Unauthorized/i.test(m)?"Opslaan geweigerd: dit account mag geen foto's op de site zetten.":"Opslaan mislukt. Probeer het opnieuw. ("+m+")");
 })
 .then(function(){st.bezig=false;knoppen();});
}
function knoppen(){
 var w=$("btWebp");if(!w)return;
 w.textContent=st.pid?(st.bezig?"Bezig…":"Opslaan op de site"):"Download WebP";
 w.disabled=!st.uit||st.bezig;
 var pn=$("btPng");if(pn)pn.disabled=!st.uit;
}
function klaarLijst(){
 var e=$("btKlaar");if(!e)return;
 e.style.display=st.klaar.length?"":"none";
 e.innerHTML='<b>Op de site gezet: '+st.klaar.length+'</b> '+st.klaar.map(function(id){var p=vindProduct(id);return '<span title="'+esc(id)+'">'+esc(p?p.name:id)+'</span>';}).join(" ");
}
function zoek(q){
 var box=$("btHits");if(!box)return;q=(q||"").trim().toLowerCase();
 if(q.length<2||typeof CAT==="undefined"){box.innerHTML="";return;}
 var hits=CAT.filter(function(p){return p.img&&(p.name||"").toLowerCase().indexOf(q)>-1;}).slice(0,8);
 box.innerHTML=hits.length?hits.map(function(p){return '<button type="button" class="bt-hit" data-id="'+esc(p.id)+'"><img src="'+esc(p.img)+'" alt="" loading="lazy"><span>'+esc(p.name)+'</span></button>';}).join("")
  :'<p class="bt-leeg">Geen product met foto gevonden.</p>';
}

/* ---------- aandachtslijst: wat de automatische opmaak niet aankon ---------- */
/* 'bron ontbreekt' = de winkelfoto bestaat niet meer. Controle 01-10 (steekproef 60 van 364):
   in alle gevallen bestaat het product zelf ook niet meer in de webwinkel (404). Daar valt in
   de beeldtool niets te doen; die flessen staan apart, ingeklapt, buiten de werklijst. */
function wegUitWinkel(x){return /bron ontbreekt/i.test(x.r||"");}
function aandachtAlles(){return (typeof BEELD_AANDACHT!=="undefined"&&BEELD_AANDACHT)||[];}
function aandachtLijst(){return aandachtAlles().filter(function(x){return !wegUitWinkel(x);});}
function knop(x){return '<button type="button" class="bt-hit" data-id="'+esc(x.id)+'"><span>'+esc(x.t)+'<br><small style="color:var(--muted)">'+esc(x.r)+'</small></span></button>';}
function aandachtHtml(){
 var l=aandachtLijst(),weg=aandachtAlles().filter(wegUitWinkel);
 if(typeof BEELDEN==="undefined")return '<p class="bt-leeg" style="margin-top:14px">De automatische opmaak van de catalogus heeft nog niet gedraaid. Zodra dat is gebeurd, staan hier de foto\'s die aandacht nodig hebben.</p>';
 var wegHtml=weg.length?'<details class="bt-weg"><summary>'+weg.length+' flessen staan niet meer in de webwinkel</summary>'
  +'<p class="bt-leeg">Product en foto zijn sinds de export van 13-09 uit de webwinkel verdwenen. Hier is niets op te maken; ze verdwijnen bij de volgende catalogusverversing ook van de demo. Heb je toch een eigen foto, kies de fles dan hier en sleep de foto naar het vak bovenaan.</p>'
  +'<div id="btWeg">'+weg.slice(0,40).map(knop).join("")+(weg.length>40?'<p class="bt-leeg">…en nog '+(weg.length-40)+'.</p>':'')+'</div></details>':'';
 if(!l.length)return '<p class="bt-leeg" style="margin-top:14px">Geen foto\'s op de aandachtslijst: alles wat automatisch is opgemaakt, is gelukt.</p>'+wegHtml;
 return '<div class="bt-aandacht"><div class="bt-akop">Aandacht nodig <span id="btAantal">'+l.length+'</span></div>'
  +'<p class="bt-leeg">Deze foto\'s kon de automatische opmaak niet goed uitknippen. Op de site staat daarom de winkelfoto. Kies er een, maak hem op en klik op Opslaan op de site: de foto staat dan meteen op de productpagina en gaat van deze lijst af.</p>'
  +'<div id="btAandacht">'+l.slice(0,60).map(knop).join("")
  +(l.length>60?'<p class="bt-leeg">…en nog '+(l.length-60)+'. Zoek hierboven op naam.</p>':'')+'</div></div>'+wegHtml;
}

/* ---------- scherm ---------- */
var CSS='.bt-grid{display:grid;grid-template-columns:minmax(260px,1fr) 2fr;gap:22px}@media(max-width:820px){.bt-grid{grid-template-columns:1fr}}'
+'.bt-drop{display:block;border:2px dashed var(--line);border-radius:12px;padding:26px 16px;text-align:center;cursor:pointer;background:var(--card)}.bt-drop.over{border-color:var(--amber)}'
+'.bt-drop b{display:block;font-size:14px}.bt-drop span{font-size:12px;color:var(--muted)}.bt-drop input{display:none}'
+'.bt-zoek input,.bt-inst input[type=range]{width:100%}.bt-zoek input{font:inherit;font-size:13px;padding:9px 12px;border:1px solid var(--line);border-radius:9px;margin-top:12px;background:var(--card);color:var(--text)}'
+'.bt-hit{display:flex;gap:10px;align-items:center;width:100%;text-align:left;font:inherit;font-size:12.5px;padding:6px;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--text);cursor:pointer}.bt-hit img{width:34px;height:34px;object-fit:contain}'
+'.bt-inst{margin-top:16px;font-size:12.5px}.bt-inst label{display:block;margin-top:10px}'
+'.bt-tegels{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}.bt-tegels button{font:inherit;font-size:12px;padding:6px 11px;border:1px solid var(--line);border-radius:20px;background:transparent;color:var(--text);cursor:pointer}.bt-tegels button.on{border-color:var(--amber);color:var(--amber);font-weight:600}'
+'.bt-paar{display:grid;grid-template-columns:1fr 1fr;gap:12px}.bt-paar figure{margin:0}.bt-paar figcaption{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}'
+'.bt-paar canvas{width:100%;aspect-ratio:1/1;object-fit:contain;border-radius:10px;border:1px solid var(--line);display:block}#btVoor{cursor:crosshair;touch-action:none}.bt-vorm{display:flex;gap:14px;margin-top:6px}.bt-vorm label{display:flex;gap:5px;align-items:center;font-size:13px}'
+'.bt-diag{font-size:12.5px;margin:12px 0;padding:10px 12px;border-radius:9px;background:var(--card);border:1px solid var(--line)}.bt-waarschuwing{border-color:#c9963f}.bt-fout{border-color:#8a1c26;color:#8a1c26}'
+'.bt-knoppen{display:flex;gap:8px;flex-wrap:wrap}.bt-leeg{font-size:12px;color:var(--muted);padding:6px}'
+'.bt-hit.bt-klaar{opacity:.45;text-decoration:line-through}.bt-klaar-lijst{margin-top:12px;font-size:12px;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:var(--card)}.bt-klaar-lijst span{display:inline-block;margin:3px 4px 0 0;padding:1px 7px;border-radius:9px;border:1px solid var(--line);font-size:11px}.bt-klaar-lijst small{color:var(--muted)}'
+'.bt-weg{margin-top:10px;font-size:12px;color:var(--muted)}.bt-weg summary{cursor:pointer;padding:6px}.bt-weg #btWeg{max-height:240px;overflow:auto}'
+'.bt-aandacht{margin-top:16px;border:1px solid var(--line);border-radius:10px;padding:8px;max-height:360px;overflow:auto}.bt-akop{font-size:13px;font-weight:700;padding:4px 6px}.bt-akop span{background:var(--amber);color:#fff;border-radius:10px;padding:1px 8px;font-size:11px;margin-left:6px}';

window.vBeeldtool=function(){
 return '<style>'+CSS+'</style>'
 +'<h3 style="font-size:20px;margin-bottom:6px">Beeldtool</h3>'
 +'<p style="font-size:12.5px;color:var(--muted);margin-bottom:16px">Maakt een productfoto op volgens de regels van de ontdeksite: een egale achtergrond gaat weg, de fles komt gecentreerd op 92% van de hoogte, en het resultaat is doorzichtig zodat elke pagina zijn eigen achtergrond kan kiezen. Kies je een product uit de catalogus, dan zet <b>Opslaan op de site</b> de foto direct op die productpagina.</p>'
 +(typeof WS!=="undefined"?(WS.gebruiker?wsStatusRegel(""):wsLoginBlok("foto\'s op de site te zetten")):'')
 +'<div class="bt-grid"><div>'
 +'<label class="bt-drop" id="btDrop"><input type="file" id="btFile" accept="image/png,image/jpeg,image/webp"><b>Sleep een foto hierheen</b><span>of klik om te kiezen · png, jpg of webp, tot '+BT.MAXMB+' MB</span><span id="btBij" style="display:none;margin-top:8px;color:var(--text)"></span></label>'
 +'<div class="bt-zoek"><input id="btZoek" placeholder="…of zoek een product uit de catalogus" autocomplete="off"><div id="btHits"></div></div>'
 +aandachtHtml()
 +'<div class="bt-inst"><label>Tolerantie achtergrond: <b id="btTolW">'+st.tol+'</b><input type="range" id="btTol" min="4" max="40" value="'+st.tol+'"></label>'
 +'<label><input type="checkbox" id="btLaat"'+(st.laatStaan?" checked":"")+'> Achtergrond laten staan (alleen kaderen)</label>'
 +'<label><input type="checkbox" id="btDicht"'+(st.dicht?" checked":"")+'> Gaten dichten (houdt een witte doos heel)</label>'
 +'<p class="bt-leeg" style="margin-top:10px">Doos toch aangevreten? Teken in <b>Nu</b> een vak om de doos: binnen dat vak wordt niets weggehaald.</p>'
 +'<div class="bt-vorm" role="radiogroup" aria-label="Vorm van het vak"><label><input type="radio" name="btVorm" value="rect"'+(st.vorm==="rect"?" checked":"")+'> Rechthoek</label>'
 +'<label><input type="radio" name="btVorm" value="veel"'+(st.vorm==="veel"?" checked":"")+'> Vrije vorm</label></div>'
 +'<p class="bt-leeg" id="btVormUitleg" style="margin-top:4px">'+vormUitleg()+'</p>'
 +'<button type="button" class="btn btn-s" id="btVakTerug" style="display:none;margin:6px 6px 0 0">Laatste vak weg</button>'
 +'<button type="button" class="btn btn-s" id="btVakWis" style="display:none;margin-top:6px">Vakken wissen</button></div>'
 +'</div><div>'
 +'<div class="bt-tegels">'+TEGELS.map(function(t){return '<button type="button" data-tegel="'+t[0]+'"'+(t[0]===st.tegel?' class="on"':'')+'>'+t[1]+'</button>';}).join("")+'</div>'
 +'<div class="bt-paar"><figure><figcaption>Nu</figcaption><canvas id="btVoor" width="400" height="400"></canvas></figure><figure><figcaption>Opgemaakt</figcaption><canvas id="btNa" width="400" height="400"></canvas></figure></div>'
 +'<p id="btDiag" class="bt-diag bt-ok">Kies een foto of een product om te beginnen.</p>'
 +'<div class="bt-knoppen"><button type="button" class="btn btn-s" id="btForceer" style="display:none">Toch uitknippen</button><button type="button" class="btn btn-a btn-s" id="btWebp" disabled>Opslaan op de site</button><button type="button" class="btn btn-s" id="btPng" disabled>Download PNG</button></div>'
 +'<div id="btKlaar" class="bt-klaar-lijst" style="display:none"></div>'
 +'</div></div>';
};
window.btInit=function(){
 var drop=$("btDrop"),file=$("btFile");if(!drop||!file)return;
 file.addEventListener("change",function(){bestand(file.files&&file.files[0]);file.value="";});
 ["dragenter","dragover"].forEach(function(t){drop.addEventListener(t,function(e){e.preventDefault();drop.classList.add("over");});});
 ["dragleave","drop"].forEach(function(t){drop.addEventListener(t,function(e){e.preventDefault();drop.classList.remove("over");});});
 drop.addEventListener("drop",function(e){bestand(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0]);});
 $("btZoek").addEventListener("input",function(e){st.kies=null;bijLabel();zoek(e.target.value);});
 function kies(e){
  var b=e.target.closest(".bt-hit");if(!b)return;
  var p=CAT.filter(function(x){return String(x.id)===b.getAttribute("data-id");})[0];if(!p)return;
  $("btHits").innerHTML="";$("btZoek").value=p.name;st.kies=String(p.id);bijLabel();
  /* altijd de winkelfoto als bron, nooit een eerder opgemaakt beeld */
  var T=window.BEELD_TERUG||{},bron=(p._opgemaakt&&(T[String(p.id)]||T[String(p.img).replace(/^.*\/|\.webp$/g,"")]))||p.img;
  laad(bron,String(p.id),!/^blob:/.test(bron),String(p.id));}
 $("btHits").addEventListener("click",kies);
 var al=$("btAandacht");if(al)al.addEventListener("click",kies);
 var aw=$("btWeg");if(aw)aw.addEventListener("click",kies);
 $("btTol").addEventListener("input",function(e){st.tol=+e.target.value;$("btTolW").textContent=st.tol;verwerk();});
 $("btLaat").addEventListener("change",function(e){st.laatStaan=e.target.checked;verwerk();});
 $("btDicht").addEventListener("change",function(e){st.dicht=e.target.checked;verwerk();});
 function vakKnoppen(){var n=st.vakken.length;$("btVakWis").style.display=n?"":"none";$("btVakTerug").style.display=n?"":"none";}
 $("btVakWis").addEventListener("click",function(){st.vakken=[];st.punten=[];vakKnoppen();teken();verwerk();});
 $("btVakTerug").addEventListener("click",function(){st.vakken.pop();vakKnoppen();teken();verwerk();});
 document.querySelectorAll('input[name="btVorm"]').forEach(function(r){r.addEventListener("change",function(){
  st.vorm=r.value;st.punten=[];st.hover=null;$("btVormUitleg").innerHTML=vormUitleg();teken();});});
 /* vak tekenen op de Nu-tegel; de tegel toont de foto met object-fit:contain.
    Rechthoek: slepen. Vrije vorm: klik punt voor punt (of sleep voor een vrije lijn) en sluit op het eerste punt. */
 var voor=$("btVoor"),begin=null,lasso=false; /* lasso = aantal punten bij indrukken, of false */
 function punt(e){var r=voor.getBoundingClientRect(),sc=Math.min(r.width/voor.width,r.height/voor.height),
   ox=(r.width-voor.width*sc)/2,oy=(r.height-voor.height*sc)/2;
  return {x:Math.min(1,Math.max(0,(e.clientX-r.left-ox)/sc/voor.width)),y:Math.min(1,Math.max(0,(e.clientY-r.top-oy)/sc/voor.height))};}
 voor.addEventListener("pointerdown",function(e){if(!st.img)return;var q=punt(e);
  if(st.vorm==="veel"){e.preventDefault();
   if(st.punten.length>=3&&bijStart(q)){sluitVorm();return;}
   var l=st.punten[st.punten.length-1];if(!l||afst(l,q)>0.004)st.punten.push(q);
   lasso=st.punten.length;voor.setPointerCapture(e.pointerId);teken();return;}
  begin=q;voor.setPointerCapture(e.pointerId);});
 voor.addEventListener("pointermove",function(e){var q=punt(e);
  if(st.vorm==="veel"){if(!st.punten.length)return;st.hover=q;
   if(lasso!==false){var l=st.punten[st.punten.length-1];if(afst(l,q)>0.012&&st.punten.length<400)st.punten.push(q);}teken();return;}
  if(!begin)return;
  st.trek={x0:Math.min(begin.x,q.x),y0:Math.min(begin.y,q.y),x1:Math.max(begin.x,q.x),y1:Math.max(begin.y,q.y)};teken();});
 voor.addEventListener("pointerup",function(){if(st.vorm==="veel"){var getrokken=lasso!==false&&st.punten.length-lasso>=8;lasso=false;if(getrokken)sluitVorm();return;}
  if(!begin)return;begin=null;var r=st.trek;st.trek=null;
  if(r&&(r.x1-r.x0)>0.02&&(r.y1-r.y0)>0.02){st.vakken.push(r);vakKnoppen();}teken();verwerk();});
 voor.addEventListener("pointerleave",function(){if(st.hover){st.hover=null;teken();}});
 voor.addEventListener("dblclick",function(e){if(st.vorm==="veel"){e.preventDefault();sluitVorm();}});
 if(!st.toetsen){st.toetsen=true;document.addEventListener("keydown",function(e){
  if(st.vorm!=="veel"||!st.punten.length||!$("btVoor"))return;var t=e.target&&e.target.tagName;if(t==="INPUT"||t==="TEXTAREA")return;
  if(e.key==="Enter"){e.preventDefault();sluitVorm();}
  else if(e.key==="Escape"){st.punten=[];st.hover=null;teken();}
  else if(e.key==="Backspace"){e.preventDefault();st.punten.pop();teken();}});}
 function sluitVorm(){var pp=st.punten;st.punten=[];st.hover=null;
  if(pp.length>=3&&oppervlak(pp)>0.0004){st.vakken.push({p:pp});vakKnoppen();verwerk();}teken();}
 vakKnoppen();
 document.querySelectorAll(".bt-tegels button").forEach(function(b){b.addEventListener("click",function(){
  st.tegel=b.getAttribute("data-tegel");document.querySelectorAll(".bt-tegels button").forEach(function(x){x.classList.toggle("on",x===b);});teken();});});
 $("btForceer").addEventListener("click",function(){st.forceer=!st.forceer;verwerk();});
 $("btWebp").addEventListener("click",function(){download("image/webp");});
 $("btPng").addEventListener("click",function(){download("image/png");});
 teken();klaarLijst();knoppen();
 st.klaar.forEach(function(id){var b=document.querySelector('#btAandacht .bt-hit[data-id="'+id+'"]');if(b)b.classList.add("bt-klaar");});
};
/* voor tests */
window.__beeldtool={st:st,BT:BT,verwerk:verwerk,laad:laad};
})();
