/* ================= KAART SCHOTLAND — wettelijke whiskygebieden =================
   Data: streekgrenzen.js (KGRENZEN), gebouwd door tools/streekgrenzen_bouwer.py uit
   open data (ONS, Wikidata). Coördinaten: British National Grid in eenheden van 100 m.
   De gebiedsteksten zijn alleen feiten uit reg. 10 van de Scotch Whisky Regulations 2009
   (kluis: 15 Bronnen/Scotch Whisky Regulations 2009) — geen smaak- of stijlclaims.

   Interactie: hover = gebied oplichten; klik = inzoomen + paneel; stip = tooltip,
   klik = distilleerderij in het paneel; slepen = verschuiven; +/− en ctrl+scroll
   (of knijpen op een trackpad) = zoomen. */

var KMG={
 Highland:{naam:"Highland",soort:"Beschermde regio",art:"reg. 10(6)(a)",
  tekst:"Alles ten noorden van de Highland-lijn, die de wet van de Clyde bij Greenock naar de Firth of Tay trekt. Wettelijk liggen ook Speyside, Islay en de eilanden in Highland."},
 Speyside:{naam:"Speyside",soort:"Beschermde regio",art:"reg. 10(6)(c)",
  tekst:"Het district Moray plus de ward Badenoch and Strathspey. Speyside ligt binnen Highland: een Speyside-distilleerderij mag ook ‘Highland’ op het etiket zetten."},
 Lowland:{naam:"Lowland",soort:"Beschermde regio",art:"reg. 10(6)(b)",
  tekst:"Alles ten zuiden van de Highland-lijn: van Greenock via Cardross, de Campsie Fells, Stirling en Milnathort naar de Firth of Tay."},
 Islay:{naam:"Islay",soort:"Beschermde locality",art:"reg. 10(5)(b)",
  tekst:"Het eiland Islay in Argyll."},
 Campbeltown:{naam:"Campbeltown",soort:"Beschermde locality",art:"reg. 10(5)(a)",
  tekst:"De ward South Kintyre: het zuiden van het schiereiland Kintyre, met de stad Campbeltown. Het gebied is dus groter dan de stad."},
 Island:{naam:"Islands",soort:"Traditionele indeling",art:"",
  tekst:"Geen wettelijk gebied, wel een gangbare naam voor de eilanden buiten Islay, zoals Orkney, Skye, Mull, Jura en Arran. Wettelijk vallen ze onder Highland."}
};
var KM_VOLGORDE=["Highland","Speyside","Lowland","Islay","Campbeltown","Island"];
var KM_PAD={Highland:"highland",Lowland:"lowland",Speyside:"speyside",Campbeltown:"campbeltown",Islay:"islay",Island:"islands"};
var KM={vb:null,sel:"",dist:"",hov:"",anim:0,sleep:null};

function kmMeng(a,b,t){ /* kleur a naar b, t = aandeel b */
 var p=function(h){h=h.replace("#","");return[0,2,4].map(function(i){return parseInt(h.substr(i,2),16);});};
 var x=p(a),y=p(b);
 return "#"+x.map(function(v,i){return Math.round(v+(y[i]-v)*t).toString(16).padStart(2,"0");}).join("");
}
var KM_PAPIER="#fbf8f2",KM_ZEE="#efe9dd";
function kmTint(r,stand){
 /* stand: 0 rust · 1 hover · 2 gekozen · 3 gedimd */
 if(stand===3)return "#faf7f0";
 return kmMeng(KKLEUR[r],KM_PAPIER,[.8,.68,.66][stand]);
}
function kmPunten(){
 var P=KGRENZEN.punten||{};
 return Object.keys(P).map(function(n){
  return {naam:n,x:P[n][0],y:P[n][1],streek:kStreekVan(n),flessen:kFlessen(n)};
 }).filter(function(d){return STREKEN.indexOf(d.streek)>=0;});
}
function kmR(d){return Math.min(7.5,3.6+Math.sqrt(d.flessen||1)*.55);}

function kmView(){
 var G=KGRENZEN,v=G.vak,ins=G.inzet,punten=kmPunten();
 /* tekenvolgorde: Highland-vasteland en Lowland onder, dan de eilanden, Islay,
    Campbeltown (in Highland) en Speyside (in Highland) erbovenop */
 var orde=["Highland","Lowland","Island","Islay","Campbeltown","Speyside"];
 var vlakken=orde.map(function(r){
  return '<path class="km-gb" data-r="'+r+'" d="'+G[KM_PAD[r]]+'"'
   +(r==="Island"?' fill="url(#km-arc)"':' fill="'+kmTint(r,0)+'"')+'></path>';
 }).join("");
 /* zelfde vormen zonder vulling, voor de waterlijnen en de kustlijn (via <use>) */
 var vormen=orde.map(function(r){return '<path d="'+G[KM_PAD[r]]+'"></path>';}).join("");
 var labels=KM_VOLGORDE.map(function(r){
  var p=G.labels[r];if(!p)return "";
  return '<text class="km-lab" data-r="'+r+'" x="'+p[0]+'" y="'+p[1]+'" text-anchor="middle">'+KMG[r].naam+'</text>';
 }).join("");
 var stippen=punten.slice().sort(function(a,b){return b.flessen-a.flessen;}).map(function(d){
  return '<circle class="km-dot" data-n="'+d.naam+'" data-r="'+d.streek+'" cx="'+d.x+'" cy="'+d.y+'" r="5"'
   +' fill="'+(KKLEUR[d.streek]||"#7d7265")+'" tabindex="0" role="button" aria-label="'+d.naam+', '+KMG[d.streek].naam+'"></circle>';
 }).join("");
 var namen=punten.map(function(d){
  return '<text class="km-naam" data-n="'+d.naam+'" data-r="'+d.streek+'" x="'+d.x+'" y="'+d.y+'">'+d.naam+'</text>';
 }).join("");
 var svg='<svg class="km-svg" id="km-svg" viewBox="'+v.join(" ")+'" preserveAspectRatio="xMidYMid meet" role="img"'
  +' aria-label="Kaart van Schotland met de vijf wettelijke whiskygebieden en de distilleerderijen die we voeren">'
  +'<defs><pattern id="km-arc" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">'
  +'<rect width="8" height="8" fill="'+kmTint("Island",0)+'"></rect>'
  +'<line x1="0" y1="0" x2="0" y2="8" stroke="'+KKLEUR.Island+'" stroke-opacity=".28" stroke-width="2.4"></line></pattern>'
  +'<g id="km-land">'+vormen+'</g></defs>'
  +'<rect x="'+(v[0]-4000)+'" y="'+(v[1]-4000)+'" width="'+(v[2]+8000)+'" height="'+(v[3]+8000)+'" fill="'+KM_ZEE+'" class="km-zee"></rect>'
  +'<path class="km-ctx" d="'+G.context+'"></path>'
  +'<use href="#km-land" class="km-ring km-r1"></use><use href="#km-land" class="km-ring km-r2"></use>'
  +'<use href="#km-land" class="km-ring km-r3"></use><use href="#km-land" class="km-ring km-r4"></use>'
  +'<use href="#km-land" class="km-ring km-kust"></use>'
  +'<rect class="km-inzet" x="'+ins[0]+'" y="'+ins[1]+'" width="'+ins[2]+'" height="'+ins[3]+'" rx="10"></rect>'
  +'<text class="km-inzetlab" x="'+(ins[0]+ins[2]-14)+'" y="'+(ins[1]+ins[3]-14)+'" text-anchor="end">Shetland</text>'
  +'<g class="km-gebieden">'+vlakken+'</g>'
  +'<path class="km-lijn" d="'+G.lijn+'"></path>'
  +'<g class="km-labs">'+labels+'</g><g class="km-dots">'+stippen+'</g><g class="km-namen">'+namen+'</g>'
  +'</svg>';
 return '<div class="km" id="km">'
  +'<div class="km-kaart" id="km-kaart">'+svg
  +'<div class="km-kruim"><button onclick="KNIVEAU=\'wereld\';kmReset(true);render()">Wereld</button><span>›</span>'
  +'<button onclick="kmKies(\'\')">Schotland</button><span id="km-kr"></span></div>'
  +'<div class="km-ctl"><button onclick="kmZoom(1.6)" aria-label="Inzoomen">+</button>'
  +'<button onclick="kmZoom(1/1.6)" aria-label="Uitzoomen">−</button>'
  +'<button onclick="kmKies(\'\')" aria-label="Heel Schotland" title="Heel Schotland">'
  +'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button></div>'
  +'<div class="km-schaal" id="km-schaal"><i></i><span></span></div>'
  +'<div class="km-noord" aria-hidden="true">N<i></i></div>'
  +'<div class="km-tip" id="km-tip"></div>'
  +'</div>'
  +'<aside class="km-paneel" id="km-paneel">'+kmPaneel()+'</aside>'
  +'</div>'
  +'<p class="km-bron">Whiskygebieden volgens de Scotch Whisky Regulations 2009, reg. 10. '
  +'Kust en wardgrenzen: ONS (Open Government Licence) — Contains OS data © Crown copyright and database right. '
  +'Locaties: Wikidata (CC0). Shetland is ingezet; St Kilda valt buiten de kaart.</p>';
}

/* ---------- paneel ---------- */
function kmPaneel(){
 var punten=kmPunten();
 if(KM.dist){
  var d=punten.filter(function(x){return x.naam===KM.dist;})[0];
  if(d){
   var g=KMG[d.streek];
   return '<button class="km-terug" onclick="kmKies(\''+esc(d.streek)+'\')">← '+g.naam+'</button>'
    +'<div class="km-pk" style="color:'+KKLEUR[d.streek]+'">Distilleerderij · '+g.naam+'</div>'
    +'<h3>'+d.naam+'</h3>'
    +'<div class="km-stats"><div><b>'+d.flessen+'</b><span>'+(d.flessen===1?"fles":"flessen")+' in de collectie</span></div></div>'
    +'<button class="km-cta" onclick="snel({dist:[\''+esc(d.naam)+'\']})">Bekijk de flessen →</button>';
  }
 }
 if(KM.sel){
  var r=KM.sel,g2=KMG[r];
  var lijst=punten.filter(function(x){return x.streek===r;}).sort(function(a,b){return b.flessen-a.flessen||a.naam.localeCompare(b.naam);});
  var fl=lijst.reduce(function(s,x){return s+x.flessen;},0);
  return '<button class="km-terug" onclick="kmKies(\'\')">← Heel Schotland</button>'
   +'<div class="km-pk" style="color:'+KKLEUR[r]+'">'+g2.soort+(g2.art?' · '+g2.art:'')+'</div>'
   +'<h3>'+g2.naam+'</h3><p class="km-tekst">'+g2.tekst+'</p>'
   +'<div class="km-stats"><div><b>'+lijst.length+'</b><span>distilleerderijen</span></div><div><b>'+fl+'</b><span>flessen</span></div></div>'
   +(lijst.length?'<div class="km-lijst">'+lijst.map(function(x){
      return '<button data-n="'+x.naam+'" onmouseenter="kmLicht(\''+esc(x.naam)+'\')" onmouseleave="kmLicht(\'\')"'
       +' onclick="kmDist(\''+esc(x.naam)+'\')"><i style="background:'+KKLEUR[r]+'"></i>'+x.naam+'<u>'+x.flessen+'</u></button>';
     }).join("")+'</div>':'')
   +'<a class="km-cta" href="#/selectie/streek/'+(r==="Island"?"islands":r.toLowerCase())+'">Naar de streekpagina →</a>';
 }
 return '<div class="km-pk">Schotland</div><h3>Vijf wettelijke whiskygebieden</h3>'
  +'<p class="km-tekst">De Scotch Whisky Regulations 2009 leggen drie regio’s en twee localities vast. '
  +'Zo’n naam mag alleen op het etiket als de whisky er is gedistilleerd. Kies een gebied om in te zoomen.</p>'
  +'<div class="km-legenda">'+KM_VOLGORDE.map(function(r){
    var n=punten.filter(function(x){return x.streek===r;}).length;
    return '<button data-r="'+r+'" onmouseenter="kmHover(\''+r+'\')" onmouseleave="kmHover(\'\')" onclick="kmKies(\''+r+'\')">'
     +'<i class="'+(r==="Island"?"arc":"")+'" style="background:'+kmTint(r,1)+';border-color:'+KKLEUR[r]+'"></i>'
     +'<span><b>'+KMG[r].naam+'</b><small>'+KMG[r].soort+'</small></span><u>'+n+'</u></button>';
   }).join("")+'</div>'
  +'<div class="km-uitleg"><svg width="26" height="6"><line x1="0" y1="3" x2="26" y2="3" stroke="#7d6c55" stroke-width="1.4" stroke-dasharray="5 3"/></svg>'
  +'Highland-lijn, de wettelijke grens tussen Highland en Lowland</div>';
}

/* ---------- beeld (viewBox) ---------- */
function kmSvg(){return document.getElementById("km-svg");}
function kmZet(vb){
 var s=kmSvg();if(!s)return;
 KM.vb=vb;s.setAttribute("viewBox",vb.map(function(x){return x.toFixed(1);}).join(" "));kmSchaal();
 if(KM.tipEl)kmTipPlek();
}
function kmK(){ /* kaarteenheden per schermpixel */
 var s=kmSvg();if(!s||!KM.vb)return 1;
 return Math.max(KM.vb[2]/(s.clientWidth||1),KM.vb[3]/(s.clientHeight||1));
}
function kmSchaal(){
 var s=kmSvg();if(!s)return;
 var k=kmK();
 s.style.setProperty("--k",k);
 s.querySelectorAll(".km-dot").forEach(function(c){
  var d={flessen:kFlessen(c.dataset.n)};var r=kmR(d)*(c.classList.contains("hl")?1.35:1);
  c.setAttribute("r",(r*k).toFixed(2));
 });
 var p=s.querySelector("#km-arc");if(p){p.setAttribute("width",7*k);p.setAttribute("height",7*k);
  p.querySelector("rect").setAttribute("width",7*k);p.querySelector("rect").setAttribute("height",7*k);
  var l=p.querySelector("line");l.setAttribute("y2",7*k);l.setAttribute("stroke-width",2*k);}
 /* schaalbalk: ronde afstand van ongeveer 90 px */
 var km=90*k/10,stap=[5,10,20,25,50,100,200].filter(function(x){return x<=km;}).pop()||5;
 var sb=document.getElementById("km-schaal");
 if(sb){sb.querySelector("i").style.width=(stap*10/k).toFixed(0)+"px";sb.querySelector("span").textContent=stap+" km";}
}
function kmGrenzen(vb){
 var v=KGRENZEN.vak,minW=v[2]/14;
 var w=Math.min(v[2]*1.05,Math.max(minW,vb[2])),h=w*vb[3]/vb[2];
 var cx=vb[0]+vb[2]/2,cy=vb[1]+vb[3]/2;
 cx=Math.min(v[0]+v[2],Math.max(v[0],cx));cy=Math.min(v[1]+v[3],Math.max(v[1],cy));
 return [cx-w/2,cy-h/2,w,h];
}
function kmPas(vb){ /* viewBox met de verhouding van het scherm, zodat zoomen voorspelbaar is */
 var s=kmSvg();if(!s)return vb;
 var a=(s.clientWidth||1)/(s.clientHeight||1),cx=vb[0]+vb[2]/2,cy=vb[1]+vb[3]/2,w=vb[2],h=vb[3];
 if(w/h<a)w=h*a;else h=w/a;
 return [cx-w/2,cy-h/2,w,h];
}
function kmNaar(doel,ms){
 var van=(KM.vb||doel).slice(),t0=performance.now();ms=ms===undefined?650:ms;
 cancelAnimationFrame(KM.anim);
 if(!ms){kmZet(doel);kmNamen();return;}
 function stap(t){
  var x=Math.min(1,(t-t0)/ms),e=x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
  kmZet(van.map(function(v,i){return v+(doel[i]-v)*e;}));
  if(x<1)KM.anim=requestAnimationFrame(stap);else kmNamen();
 }
 KM.anim=requestAnimationFrame(stap);
}
function kmZoom(f,px,py){
 var vb=KM.vb;if(!vb)return;
 var s=kmSvg(),rc=s.getBoundingClientRect();
 var fx=px===undefined?.5:(px-rc.left)/rc.width,fy=py===undefined?.5:(py-rc.top)/rc.height;
 var w=vb[2]/f,h=vb[3]/f;
 kmNaar(kmGrenzen([vb[0]+(vb[2]-w)*fx,vb[1]+(vb[3]-h)*fy,w,h]),px===undefined?350:0);
}
function kmVolledig(){return kmPas(KGRENZEN.vak.slice());}
function kmBox(r){
 var p=document.querySelector('.km-gebieden [data-r="'+r+'"]');if(!p)return null;
 var b=p.getBBox();
 if(r==="Island"){ /* zonder de Shetland-inzet */
  var ins=KGRENZEN.inzet;var v=KGRENZEN.vak;
  return [v[0]+20,b.y,ins[0]-v[0]-20,b.height];
 }
 return [b.x,b.y,b.width,b.height];
}

/* ---------- toestand ---------- */
function kmKlassen(){
 var s=kmSvg();if(!s)return;
 s.classList.toggle("km-sel",!!KM.sel);
 s.querySelectorAll(".km-gebieden .km-gb").forEach(function(p){
  var r=p.dataset.r,stand=KM.sel?(r===KM.sel?2:(r===KM.hov?1:3)):(r===KM.hov?1:0);
  if(r!=="Island")p.setAttribute("fill",kmTint(r,stand));
  else p.style.opacity=stand===3?.45:1;
  p.classList.toggle("aan",r===KM.sel);p.classList.toggle("hov",r===KM.hov);
 });
 s.querySelectorAll(".km-lab").forEach(function(t){
  t.classList.toggle("weg",!!KM.sel);t.classList.toggle("hov",t.dataset.r===KM.hov);
 });
 s.querySelectorAll(".km-dot").forEach(function(c){
  c.classList.toggle("dim",!!KM.sel&&c.dataset.r!==KM.sel);
  c.classList.toggle("hl",c.dataset.n===KM.dist);
 });
 document.querySelectorAll(".km-legenda button").forEach(function(b){b.classList.toggle("hov",b.dataset.r===KM.hov);});
 var kr=document.getElementById("km-kr");
 if(kr)kr.innerHTML=KM.sel?'<span>›</span><b>'+KMG[KM.sel].naam+'</b>':'';
 kmSchaal();
}
function kmPaneelZet(){var p=document.getElementById("km-paneel");if(p){p.innerHTML=kmPaneel();p.scrollTop=0;}}
function kmHover(r){KM.hov=r;kmKlassen();}
function kmKies(r){
 KM.sel=r;KM.dist="";KM.hov="";KSTREEK=r;
 kmKlassen();kmPaneelZet();kmTip();
 if(!r){kmNaar(kmVolledig());return;}
 var b=kmBox(r);if(!b)return;
 var m=Math.max(b[2],b[3])*.12+40;
 kmNaar(kmGrenzen(kmPas([b[0]-m,b[1]-m,b[2]+2*m,b[3]+2*m])));
}
function kmDist(n){
 var d=kmPunten().filter(function(x){return x.naam===n;})[0];if(!d)return;
 var opnieuw=KM.sel!==d.streek;
 KM.sel=d.streek;KSTREEK=d.streek;KM.dist=n;kmKlassen();kmPaneelZet();
 var vb=KM.vb,k=kmK(),w=Math.min(vb[2],KGRENZEN.vak[2]/(opnieuw?4:3.2));
 if(opnieuw||w<vb[2]||d.x<vb[0]||d.x>vb[0]+vb[2]||d.y<vb[1]||d.y>vb[1]+vb[3]){
  var h=w*vb[3]/vb[2];kmNaar(kmGrenzen([d.x-w/2,d.y-h/2,w,h]));
 }
}
function kmLicht(n){
 var s=kmSvg();if(!s)return;
 s.querySelectorAll(".km-dot").forEach(function(c){c.classList.toggle("hl",c.dataset.n===n||c.dataset.n===KM.dist);});
 kmSchaal();
 if(n){var c=s.querySelector('.km-dot[data-n="'+n.replace(/"/g,"")+'"]');if(c)kmTip(c);}else kmTip();
}
function kmReset(stil){KM.sel="";KM.dist="";KM.hov="";KM.vb=null;if(!stil)KSTREEK="";}

/* ---------- tooltip ---------- */
function kmTip(c){
 var t=document.getElementById("km-tip");if(!t)return;
 if(!c){t.classList.remove("aan");KM.tipEl=null;return;}
 var n=c.dataset.n,r=c.dataset.r,f=kFlessen(n);
 t.innerHTML='<b>'+n+'</b><span><i style="background:'+KKLEUR[r]+'"></i>'+KMG[r].naam+' · '+f+' '+(f===1?'fles':'flessen')+'</span>';
 KM.tipEl=c;kmTipPlek();t.classList.add("aan");
}
function kmTipPlek(){ /* tooltip volgt de stip, ook tijdens zoomen */
 var t=document.getElementById("km-tip"),c=KM.tipEl,w=document.getElementById("km-kaart");
 if(!t||!c||!w||!c.isConnected)return;
 var rk=c.getBoundingClientRect(),rw=w.getBoundingClientRect();
 t.style.left=(rk.left+rk.width/2-rw.left)+"px";t.style.top=(rk.top-rw.top)+"px";
}

/* ---------- namen zonder overlap ---------- */
function kmNamen(){
 var s=kmSvg();if(!s)return;
 var zicht=!!KM.sel;
 var boxen=[];
 var tt=[].slice.call(s.querySelectorAll(".km-naam"));
 tt.sort(function(a,b){return (b.dataset.n===KM.dist)-(a.dataset.n===KM.dist)||kFlessen(b.dataset.n)-kFlessen(a.dataset.n);});
 tt.forEach(function(t){
  var aan=zicht&&t.dataset.r===KM.sel;
  t.classList.toggle("aan",aan);
  if(!aan)return;
  var c=s.querySelector('.km-dot[data-n="'+t.dataset.n.replace(/"/g,"")+'"]');
  var k=kmK(),r=(+c.getAttribute("r"));
  t.setAttribute("x",(+c.getAttribute("cx")+r+4*k).toFixed(1));
  t.setAttribute("y",(+c.getAttribute("cy")+3.6*k).toFixed(1));
  var b=t.getBoundingClientRect();
  var bots=boxen.some(function(o){return b.left<o.right+3&&b.right>o.left-3&&b.top<o.bottom+1&&b.bottom>o.top-1;});
  if(bots)t.classList.remove("aan");else boxen.push(b);
 });
}

/* ---------- opstarten na render ---------- */
function kmInit(){
 var s=kmSvg();if(!s)return;
 var start=KSTREEK&&KMG[KSTREEK]?KSTREEK:"";
 KM.sel="";KM.dist="";KM.hov="";
 kmZet(kmVolledig());kmKlassen();kmNamen();
 if(start)setTimeout(function(){kmKies(start);},60);
 var gb=s.querySelector(".km-gebieden"),dots=s.querySelector(".km-dots");
 gb.addEventListener("mouseover",function(e){var p=e.target.closest(".km-gb");if(p&&KM.hov!==p.dataset.r)kmHover(p.dataset.r);});
 gb.addEventListener("mouseleave",function(){kmHover("");});
 gb.addEventListener("click",function(e){if(KM.sleep&&KM.sleep.bewogen)return;var p=e.target.closest(".km-gb");if(p&&p.dataset.r!==KM.sel)kmKies(p.dataset.r);});
 dots.addEventListener("mouseover",function(e){var c=e.target.closest(".km-dot");if(c){kmTip(c);c.classList.add("hl");kmSchaal();}});
 dots.addEventListener("mouseout",function(e){var c=e.target.closest(".km-dot");if(c){kmTip();if(c.dataset.n!==KM.dist)c.classList.remove("hl");kmSchaal();}});
 dots.addEventListener("click",function(e){var c=e.target.closest(".km-dot");if(c&&!(KM.sleep&&KM.sleep.bewogen))kmDist(c.dataset.n);});
 dots.addEventListener("keydown",function(e){var c=e.target.closest(".km-dot");if(c&&(e.key==="Enter"||e.key===" ")){e.preventDefault();kmDist(c.dataset.n);}});
 /* slepen */
 s.addEventListener("pointerdown",function(e){
  if(e.button!==0)return;
  KM.sleep={x:e.clientX,y:e.clientY,vb:KM.vb.slice(),bewogen:false,id:e.pointerId};
 });
 s.addEventListener("pointermove",function(e){
  var d=KM.sleep;if(!d||d.id!==e.pointerId)return;
  var dx=e.clientX-d.x,dy=e.clientY-d.y;
  if(!d.bewogen&&Math.abs(dx)+Math.abs(dy)<5)return;
  if(!d.bewogen){d.bewogen=true;s.setPointerCapture(e.pointerId);s.classList.add("sleept");kmTip();}
  var k=kmK();cancelAnimationFrame(KM.anim);
  kmZet(kmGrenzen([d.vb[0]-dx*k,d.vb[1]-dy*k,d.vb[2],d.vb[3]]));
 });
 function los(){var d=KM.sleep;if(!d)return;s.classList.remove("sleept");if(d.bewogen)kmNamen();setTimeout(function(){KM.sleep=null;},0);}
 s.addEventListener("pointerup",los);s.addEventListener("pointercancel",los);
 /* ctrl+scroll en knijpen op een trackpad; gewoon scrollen blijft de pagina scrollen */
 s.addEventListener("wheel",function(e){
  if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();
  kmZoom(Math.exp(-e.deltaY*.0035),e.clientX,e.clientY);clearTimeout(KM.wt);KM.wt=setTimeout(kmNamen,180);
 },{passive:false});
 s.addEventListener("dblclick",function(e){e.preventDefault();kmZoom(1.8,e.clientX,e.clientY);setTimeout(kmNamen,400);});
 if(!KM.ro&&window.ResizeObserver){
  KM.ro=new ResizeObserver(function(){if(kmSvg()&&KM.vb){kmSchaal();kmNamen();}});
 }
 if(KM.ro){KM.ro.disconnect();KM.ro.observe(s);}
}
if(typeof render==="function"&&/^#\/kaart/.test(location.hash||""))render();
