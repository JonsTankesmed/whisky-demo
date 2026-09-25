/* Beeldtool — productfoto's opmaken in de beheeromgeving.
   Zelfde regels als de beeldpijplijn (DevWhiskysite 26/28), nu in de browser:
   1. bijsnijden op wat zichtbaar is (de CDN vult foto's aan met doorzichtige randen);
   2. achtergrond bepalen aan de rand van dat zichtbare deel: al transparant, wit,
      egaal gekleurd of niet-egaal;
   3. alleen een EGALE achtergrond weghalen, en alleen wat vanaf de rand bereikbaar is —
      wit binnen een etiket blijft staan;
   4. kaderen: 800 x 800, fles op 92% van de hoogte (hooguit 94% breed), gecentreerd;
   5. bewaren met doorzichtige achtergrond (WebP, anders PNG).
   Geen generatieve AI en geen model (besluit F-c). Er wordt niets geüpload: de foto
   verlaat de browser niet. */
(function(){
"use strict";
var BT={KADER:800,DOELHOOGTE:0.92,MAXBREEDTE:0.94,TOL:14,UNIFORM:0.97,WIT:244,RAND:3,MAXBRON:2400,MAXMB:20};
var TEGELS=[["grijs","Grijs","#ece8e3"],["wit","Wit","#ffffff"],["creme","Crème","#f7f3ee"],["donker","Donker","#241b16"],["ruit","Ruit",""]];
var st={img:null,naam:"foto",tol:BT.TOL,laatStaan:false,forceer:false,tegel:"grijs",uit:null};

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
function witWeg(c,k,tol){
 var w=c.width,h=c.height,x=c.getContext("2d",{willReadFrequently:true}),d=x.getImageData(0,0,w,h),a=d.data,n=w*h;
 var gelijk=new Uint8Array(n),weg=new Uint8Array(n),stapel=new Int32Array(n),sp=0,i,j,p,px,py;
 function afst(j){return Math.max(Math.abs(a[j]-k[0]),Math.abs(a[j+1]-k[1]),Math.abs(a[j+2]-k[2]));}
 for(i=0;i<n;i++){j=i*4;if(a[j+3]<=16||afst(j)<=tol)gelijk[i]=1;}
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
function verloopWeg(c,k,tol){
 var w=c.width,h=c.height,x=c.getContext("2d",{willReadFrequently:true}),d=x.getImageData(0,0,w,h),a=d.data,n=w*h;
 var stap=Math.max(3,Math.round(tol/3)),plafond=tol*4,weg=new Uint8Array(n),stapel=new Int32Array(n),sp=0,p,px,py;
 function ver(i,j){i*=4;j*=4;return Math.max(Math.abs(a[i]-a[j]),Math.abs(a[i+1]-a[j+1]),Math.abs(a[i+2]-a[j+2]));}
 function bg(i){i*=4;return a[i+3]<=16||Math.max(Math.abs(a[i]-k[0]),Math.abs(a[i+1]-k[1]),Math.abs(a[i+2]-k[2]))<=plafond;}
 function zaai(i){if(!weg[i]&&bg(i)){weg[i]=1;stapel[sp++]=i;}}
 function groei(q,i){if(!weg[i]&&bg(i)&&(a[i*4+3]<=16||ver(q,i)<=stap)){weg[i]=1;stapel[sp++]=i;}}
 for(px=0;px<w;px++){zaai(px);zaai((h-1)*w+px);}
 for(py=0;py<h;py++){zaai(py*w);zaai(py*w+w-1);}
 while(sp){p=stapel[--sp];px=p%w;py=(p-px)/w;
  if(px>0)groei(p,p-1);if(px<w-1)groei(p,p+1);if(py>0)groei(p,p-w);if(py<h-1)groei(p,p+w);}
 var tel=0;for(var i=0;i<n;i++)if(weg[i]){a[i*4+3]=0;tel++;}
 x.putImageData(d,0,0);return tel/n;
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
 if(ag.soort==="transparant")regels.push("Achtergrond is al doorzichtig — niets weggehaald.");
 else if(st.laatStaan)regels.push("Achtergrond bewust laten staan ("+ag.soort+").");
 else if(ag.soort==="niet-uniform"&&!st.forceer){niveau="waarschuwing";
  regels.push("Achtergrond is niet egaal ("+Math.round(ag.egaal*100)+"% van de rand is gelijk). Die wordt niet automatisch weggehaald: raden hoort niet bij de regels."
   +(ag.egaal>=0.75?" Gaat het om een licht verloop of een schaduw, kies dan zelf voor uitknippen.":" Kies liever een foto met een egale achtergrond."));}
 else if(ag.soort==="niet-uniform"){niveau="waarschuwing";var deelF=verloopWeg(kern,ag.kleur,st.tol);
  regels.push("Op jouw keuze uitgeknipt, hoewel de achtergrond niet egaal is — "+Math.round(deelF*100)+"% doorzichtig gemaakt. Controleer de randen op de donkere tegel; zo nodig de tolerantie bijstellen.");}
 else{var deel=witWeg(kern,ag.kleur,st.tol);regels.push("Achtergrond "+(ag.soort==="wit"?"wit":"egaal gekleurd")+" ("+Math.round(ag.egaal*100)+"% van de rand gelijk) — "+Math.round(deel*100)+"% van het beeld doorzichtig gemaakt.");}
 var k=kaderen(kern);if(!k){meld("fout","Na het uitknippen bleef er niets over. Verlaag de tolerantie.");return;}
 regels.push("Gekaderd op "+BT.KADER+" × "+BT.KADER+", fles op "+Math.round(k.hoogte*100)+"% van de hoogte.");
 if(k.schaal>1.5){niveau="waarschuwing";regels.push("Let op: de bron is klein en is "+k.schaal.toFixed(1)+"× vergroot. Dat kan onscherp ogen.");}
 st.uit=k.canvas;teken();meld(niveau,regels.join(" "));
 var fk=$("btForceer");if(fk){fk.style.display=(ag.soort==="niet-uniform"&&!st.laatStaan&&ag.egaal>=0.75)?"":"none";fk.textContent=st.forceer?"Toch niet uitknippen":"Toch uitknippen";}
 ["btWebp","btPng"].forEach(function(id){var b=$(id);if(b)b.disabled=false;});
}

/* ---------- weergave ---------- */
function tegelStijl(el){
 var t=TEGELS.filter(function(x){return x[0]===st.tegel;})[0];
 el.style.background=t[0]==="ruit"?"repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0 0/20px 20px":t[2];
}
function teken(){
 var voor=$("btVoor"),na=$("btNa");if(!voor||!na)return;
 [voor,na].forEach(tegelStijl);
 if(st.img){var s=naarCanvas(st.img),f=Math.min(1,400/Math.max(s.width,s.height));
  voor.width=Math.round(s.width*f);voor.height=Math.round(s.height*f);voor.getContext("2d").drawImage(s,0,0,voor.width,voor.height);}
 if(st.uit){na.width=400;na.height=400;var nx=na.getContext("2d");nx.clearRect(0,0,400,400);nx.imageSmoothingQuality="high";nx.drawImage(st.uit,0,0,400,400);}
}
function meld(niveau,tekst){var e=$("btDiag");if(!e)return;e.className="bt-diag bt-"+niveau;e.textContent=tekst;}
function laad(src,naam,crossOrigin){
 st.uit=null;["btWebp","btPng"].forEach(function(id){var b=$(id);if(b)b.disabled=true;});
 meld("ok","Foto laden…");
 var img=new Image();if(crossOrigin)img.crossOrigin="anonymous";
 img.onload=function(){st.img=img;st.naam=veiligeNaam(naam);st.forceer=false;verwerk();};
 img.onerror=function(){meld("fout",crossOrigin?"Deze foto kon niet worden opgehaald voor bewerking (de winkel-CDN staat het niet toe). Open de foto, sla hem op en sleep hem hierheen.":"Dit bestand is geen leesbare afbeelding.");};
 img.src=src;
}
function bestand(f){
 if(!f)return;
 if(!/^image\/(png|jpeg|webp)$/.test(f.type)){meld("fout","Alleen png, jpg of webp.");return;}
 if(f.size>BT.MAXMB*1048576){meld("fout","Dit bestand is groter dan "+BT.MAXMB+" MB.");return;}
 var url=URL.createObjectURL(f);laad(url,f.name,false);setTimeout(function(){URL.revokeObjectURL(url);},60000);
}
function download(type){
 if(!st.uit)return;
 st.uit.toBlob(function(blob){
  if(!blob){meld("fout","Opslaan mislukt in deze browser.");return;}
  var ext=blob.type==="image/webp"?"webp":"png";
  if(type==="image/webp"&&ext!=="webp")meld("waarschuwing","Deze browser kan geen WebP maken; opgeslagen als PNG (ook doorzichtig).");
  var a=document.createElement("a"),u=URL.createObjectURL(blob);a.href=u;a.download=st.naam+"-opgemaakt."+ext;
  document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u);},5000);
 },type,0.9);
}
function zoek(q){
 var box=$("btHits");if(!box)return;q=(q||"").trim().toLowerCase();
 if(q.length<2||typeof CAT==="undefined"){box.innerHTML="";return;}
 var hits=CAT.filter(function(p){return p.img&&(p.name||"").toLowerCase().indexOf(q)>-1;}).slice(0,8);
 box.innerHTML=hits.length?hits.map(function(p){return '<button type="button" class="bt-hit" data-id="'+esc(p.id)+'"><img src="'+esc(p.img)+'" alt="" loading="lazy"><span>'+esc(p.name)+'</span></button>';}).join("")
  :'<p class="bt-leeg">Geen product met foto gevonden.</p>';
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
+'.bt-paar canvas{width:100%;aspect-ratio:1/1;object-fit:contain;border-radius:10px;border:1px solid var(--line);display:block}'
+'.bt-diag{font-size:12.5px;margin:12px 0;padding:10px 12px;border-radius:9px;background:var(--card);border:1px solid var(--line)}.bt-waarschuwing{border-color:#c9963f}.bt-fout{border-color:#8a1c26;color:#8a1c26}'
+'.bt-knoppen{display:flex;gap:8px;flex-wrap:wrap}.bt-leeg{font-size:12px;color:var(--muted);padding:6px}';

window.vBeeldtool=function(){
 return '<style>'+CSS+'</style>'
 +'<h3 style="font-size:20px;margin-bottom:6px">Beeldtool</h3>'
 +'<p style="font-size:12.5px;color:var(--muted);margin-bottom:16px">Maakt een productfoto op volgens de regels van de ontdeksite: een egale achtergrond gaat weg, de fles komt gecentreerd op 92% van de hoogte, en het resultaat is doorzichtig zodat elke pagina zijn eigen achtergrond kan kiezen. <b>Alles gebeurt in je eigen browser — er wordt niets geüpload.</b></p>'
 +'<div class="bt-grid"><div>'
 +'<label class="bt-drop" id="btDrop"><input type="file" id="btFile" accept="image/png,image/jpeg,image/webp"><b>Sleep een foto hierheen</b><span>of klik om te kiezen · png, jpg of webp, tot '+BT.MAXMB+' MB</span></label>'
 +'<div class="bt-zoek"><input id="btZoek" placeholder="…of zoek een product uit de catalogus" autocomplete="off"><div id="btHits"></div></div>'
 +'<div class="bt-inst"><label>Tolerantie achtergrond: <b id="btTolW">'+st.tol+'</b><input type="range" id="btTol" min="4" max="40" value="'+st.tol+'"></label>'
 +'<label><input type="checkbox" id="btLaat"'+(st.laatStaan?" checked":"")+'> Achtergrond laten staan (alleen kaderen)</label></div>'
 +'</div><div>'
 +'<div class="bt-tegels">'+TEGELS.map(function(t){return '<button type="button" data-tegel="'+t[0]+'"'+(t[0]===st.tegel?' class="on"':'')+'>'+t[1]+'</button>';}).join("")+'</div>'
 +'<div class="bt-paar"><figure><figcaption>Nu</figcaption><canvas id="btVoor" width="400" height="400"></canvas></figure><figure><figcaption>Opgemaakt</figcaption><canvas id="btNa" width="400" height="400"></canvas></figure></div>'
 +'<p id="btDiag" class="bt-diag bt-ok">Kies een foto of een product om te beginnen.</p>'
 +'<div class="bt-knoppen"><button type="button" class="btn btn-s" id="btForceer" style="display:none">Toch uitknippen</button><button type="button" class="btn btn-a btn-s" id="btWebp" disabled>Download WebP</button><button type="button" class="btn btn-s" id="btPng" disabled>Download PNG</button></div>'
 +'</div></div>';
};
window.btInit=function(){
 var drop=$("btDrop"),file=$("btFile");if(!drop||!file)return;
 file.addEventListener("change",function(){bestand(file.files&&file.files[0]);file.value="";});
 ["dragenter","dragover"].forEach(function(t){drop.addEventListener(t,function(e){e.preventDefault();drop.classList.add("over");});});
 ["dragleave","drop"].forEach(function(t){drop.addEventListener(t,function(e){e.preventDefault();drop.classList.remove("over");});});
 drop.addEventListener("drop",function(e){bestand(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0]);});
 $("btZoek").addEventListener("input",function(e){zoek(e.target.value);});
 $("btHits").addEventListener("click",function(e){
  var b=e.target.closest(".bt-hit");if(!b)return;
  var p=CAT.filter(function(x){return String(x.id)===b.getAttribute("data-id");})[0];if(!p)return;
  $("btHits").innerHTML="";$("btZoek").value=p.name;laad(p.img,String(p.id),true);});
 $("btTol").addEventListener("input",function(e){st.tol=+e.target.value;$("btTolW").textContent=st.tol;verwerk();});
 $("btLaat").addEventListener("change",function(e){st.laatStaan=e.target.checked;verwerk();});
 document.querySelectorAll(".bt-tegels button").forEach(function(b){b.addEventListener("click",function(){
  st.tegel=b.getAttribute("data-tegel");document.querySelectorAll(".bt-tegels button").forEach(function(x){x.classList.toggle("on",x===b);});teken();});});
 $("btForceer").addEventListener("click",function(){st.forceer=!st.forceer;verwerk();});
 $("btWebp").addEventListener("click",function(){download("image/webp");});
 $("btPng").addEventListener("click",function(){download("image/png");});
 teken();
};
/* voor tests */
window.__beeldtool={st:st,BT:BT,verwerk:verwerk,laad:laad};
})();
