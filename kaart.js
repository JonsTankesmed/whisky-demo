/* ================= KAART — wereld → land → distilleerderij =================
   Drie niveaus met één kaartmotor:
   - wereld      kaart-wereld.js (KWERELD, Natural Earth, Equal Earth-projectie)
   - schotland   streekgrenzen.js (KGRENZEN): de vijf wettelijke whiskygebieden, reg. 10 SWR 2009
   - land        kaart-land/<land>.js (KLANDKAART), Lambert-projectie rond het land
   Distilleerderijen: kaart-distilleerderijen.js (KDIST, KDIST_OPEN) uit de kluisexport
   _Export/distilleerderij-locaties.json (Wikidata, CC0). Alleen bevestigde locaties staan op de
   kaart; merken zonder gekoppelde distilleerderij staan in het paneel onder 'nog zonder locatie'.
   Alle data wordt pas geladen als iemand de kaart opent.

   Interactie: hover = oplichten; klik = inzoomen + paneel; slepen = verschuiven;
   +/− en ctrl+scroll (of knijpen op een trackpad) = zoomen. */

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
var KM_LANDNAAM={Amerika:"Verenigde Staten"};
var KM_PAPIER="#fbf8f2",KM_ZEE="#efe9dd",KM_KOPER="#9a5b2b";
/* Versie van de kaartdata: ophogen na elke nieuwe build, anders tonen browsers de oude bestanden. */
var KM_VERSIE="20261013b";
var KM={niveau:"wereld",land:"",vb:null,vak:null,km:null,sel:"",dist:"",hov:"",anim:0,sleep:null,tipEl:null};

/* ---------- hulpjes ---------- */
function kmE(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");}
function kmSlug(s){return s.normalize("NFKD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
function kmMeng(a,b,t){
 var p=function(h){h=h.replace("#","");return[0,2,4].map(function(i){return parseInt(h.substr(i,2),16);});};
 var x=p(a),y=p(b);
 return "#"+x.map(function(v,i){return Math.round(v+(y[i]-v)*t).toString(16).padStart(2,"0");}).join("");
}
function kmTint(r,stand){ /* Schotse gebieden — stand: 0 rust · 1 hover · 2 gekozen · 3 gedimd */
 if(stand===3)return "#faf7f0";
 return kmMeng(KKLEUR[r],KM_PAPIER,[.8,.68,.66][stand]);
}
function kmLandKey(c){return (typeof KLANDSLEUTEL!=="undefined"&&KLANDSLEUTEL[c])||c;}
function kmLandNaam(k){return KM_LANDNAAM[k]||k;}
function kmVoorselectie(k){ /* id van de voorselectiepagina (#/selectie/land/<id>) voor dit land */
 if(typeof INGANG==="undefined"||!INGANG.land)return "";
 var namen=kmCatLanden(k);
 for(var i=0;i<INGANG.land.items.length;i++){
  var it=INGANG.land.items[i];
  if(it.w.some(function(w){return namen.indexOf(w)>=0;}))return it.id;
 }
 return "";
}
function kmCatLanden(k){ /* catalogusnamen die bij een kaartsleutel horen */
 var u=[k];if(typeof KLANDSLEUTEL!=="undefined")for(var c in KLANDSLEUTEL)if(KLANDSLEUTEL[c]===k)u.push(c);return u;
}
var KM_TEL=null;
function kmTel(){ /* flessen per distilleerderijnaam en per land, één keer geteld */
 if(KM_TEL)return KM_TEL;
 var n={},l={};
 (typeof CAT!=="undefined"?CAT:[]).forEach(function(p){
  if(p.dist)n[p.dist]=(n[p.dist]||0)+1;
  if(p.country&&p.country!=="Onbekend"){var k=kmLandKey(p.country);l[k]=(l[k]||0)+1;}
 });
 return KM_TEL={naam:n,land:l};
}
function kmDistMap(){
 if(KM.dmap)return KM.dmap;KM.dmap={};
 (typeof KDIST!=="undefined"?KDIST:[]).forEach(function(d){KM.dmap[d.id]=d;});return KM.dmap;
}
function kmFl(d){var t=kmTel().naam;return d.namen.reduce(function(s,n){return s+(t[n]||0);},0);}
function kmR(f){return Math.min(7.5,3.4+Math.sqrt(f||1)*.5);}
function kmFlTekst(f){return f+" "+(f===1?"fles":"flessen");}

/* ---------- data laden (pas als de kaart opengaat) ---------- */
var KM_LAAD={};
function kmLaad(src){
 if(KM_LAAD[src])return KM_LAAD[src]==="ok";
 KM_LAAD[src]="bezig";
 var s=document.createElement("script");s.src=src+"?v="+KM_VERSIE;
 s.onload=function(){KM_LAAD[src]="ok";KM.dmap=null;if(/^#\/kaart/.test(location.hash||""))render();};
 s.onerror=function(){KM_LAAD[src]="fout";if(/^#\/kaart/.test(location.hash||""))render();};
 document.head.appendChild(s);return false;
}
function kmBronnen(){
 var b=["kaart-distilleerderijen.js"];
 if(KM.niveau==="wereld")b.push("kaart-wereld.js");
 else if(KM.niveau==="schotland")b.push("streekgrenzen.js");
 else b.push("kaart-land/"+kmSlug(KM.land)+".js");
 return b;
}

/* ---------- pagina ---------- */
function kmPagina(){
 var bron=kmBronnen(),klaar=bron.map(kmLaad).every(Boolean),fout=bron.some(function(s){return KM_LAAD[s]==="fout";});
 var sub={wereld:"Whisky uit de hele wereld. Beweeg over de kaart en kies een land.",
  schotland:"Schotland kent vijf wettelijke whiskygebieden. Beweeg over de kaart, kies een gebied of klik op een distilleerderij.",
  land:"Elke stip is een distilleerderij met een bevestigde locatie. Klik erop voor de flessen."}[KM.niveau];
 var kop='<section><div class="wrap"><div class="sec-head"><h2>Waar komt je whisky vandaan?</h2></div><p class="sec-sub">'+sub+'</p>';
 if(fout)return kop+'<div class="km km-leeg"><p>De kaart kon niet worden geladen. Probeer het later opnieuw.</p></div></div></section>';
 if(!klaar)return kop+'<div class="km km-leeg"><div class="km-laad"></div><p>Kaart laden…</p></div></div></section>';
 var svg=KM.niveau==="wereld"?kmSvgWereld():KM.niveau==="schotland"?kmSvgSchot():kmSvgLand();
 return kop+'<div class="km" id="km">'
  +'<div class="km-kaart km-k-'+KM.niveau+'" id="km-kaart">'+svg
  +'<div class="km-kruim" id="km-kruim">'+kmKruim()+'</div>'
  +'<div class="km-ctl"><button data-act="zoom" data-v="1.6" aria-label="Inzoomen">+</button>'
  +'<button data-act="zoom" data-v="0.625" aria-label="Uitzoomen">−</button>'
  +'<button data-act="heel" aria-label="Hele kaart" title="Hele kaart">'
  +'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button></div>'
  +(KM.niveau!=="wereld"?'<div class="km-schaal" id="km-schaal"><i></i><span></span></div><div class="km-noord" aria-hidden="true">N<i></i></div>':'')
  +'<div class="km-tip" id="km-tip"></div>'
  +'</div><aside class="km-paneel" id="km-paneel">'+kmPaneel()+'</aside></div>'
  +'<p class="km-bron">'+kmBronTekst()+'</p></div></section>';
}
function kmBronTekst(){
 var t="Kaartdata: Natural Earth (publiek domein). Locaties van distilleerderijen: Wikidata (CC0); alleen bevestigde locaties staan op de kaart.";
 if(KM.niveau==="schotland")t="Whiskygebieden volgens de Scotch Whisky Regulations 2009, reg. 10. Kust en wardgrenzen: ONS (Open Government Licence) — Contains OS data © Crown copyright and database right. Locaties: Wikidata (CC0). Shetland is ingezet; St Kilda valt buiten de kaart.";
 if(KM.niveau==="land"&&KM.land==="Amerika")t+=" Alaska en Hawaï vallen buiten de kaart.";
 return t;
}
function kmKruim(){
 var u='<button data-act="wereld">Wereld</button>';
 if(KM.niveau==="wereld")return u+'<span>›</span><b>Alle landen</b>';
 var land=KM.niveau==="schotland"?"Schotland":kmLandNaam(KM.land);
 u+='<span>›</span>'+(KM.sel||KM.dist?'<button data-act="heel">'+kmE(land)+'</button>':'<b>'+kmE(land)+'</b>');
 if(KM.niveau==="schotland"&&KM.sel)u+='<span>›</span><b>'+KMG[KM.sel].naam+'</b>';
 return u;
}

/* ---------- SVG per niveau ---------- */
function kmSvgOpen(v,cls,aria,defs,bg){
 return '<svg class="km-svg '+cls+'" id="km-svg" viewBox="'+v.join(" ")+'" preserveAspectRatio="xMidYMid meet" role="img" aria-label="'+aria+'">'
  +'<defs>'+(defs||"")+'</defs>'
  +'<rect x="'+(v[0]-v[2]*3)+'" y="'+(v[1]-v[3]*3)+'" width="'+(v[2]*7)+'" height="'+(v[3]*7)+'" fill="'+(bg||KM_ZEE)+'"></rect>';
}
function kmRingen(id){
 return '<use href="#'+id+'" class="km-ring km-r1"></use><use href="#'+id+'" class="km-ring km-r2"></use>'
  +'<use href="#'+id+'" class="km-ring km-r3"></use><use href="#'+id+'" class="km-ring km-r4"></use>'
  +'<use href="#'+id+'" class="km-ring km-kust"></use>';
}
function kmStippen(lijst){ /* lijst: [{id,x,y,kleur,r}] */
 var d=kmDistMap();
 var st=lijst.slice().sort(function(a,b){return kmFl(d[b.id])-kmFl(d[a.id]);});
 return '<g class="km-dots">'+st.map(function(p){
   return '<circle class="km-dot" data-id="'+p.id+'" data-r="'+(p.r||"")+'" cx="'+p.x+'" cy="'+p.y+'" r="5" fill="'+p.kleur+'"'
    +' tabindex="0" role="button" aria-label="'+kmE(d[p.id].naam)+'"></circle>';
  }).join("")+'</g><g class="km-namen">'+st.map(function(p){
   return '<text class="km-naam" data-id="'+p.id+'" data-r="'+(p.r||"")+'" x="'+p.x+'" y="'+p.y+'">'+kmE(d[p.id].naam)+'</text>';
  }).join("")+'</g>';
}
function kmLandTint(f,stand){
 if(!f)return "#fbf9f4";
 var t=f>=1000?.5:f>=100?.64:f>=20?.76:.85;
 if(stand===1)t-=.14;
 return kmMeng(KM_KOPER,KM_PAPIER,t);
}
function kmSvgWereld(){
 var W=KWERELD,tel=kmTel().land;
 var landen=W.landen.map(function(l){
  var f=l.land?tel[l.land]||0:0;
  return '<path class="km-wl'+(f?' km-gb':'')+'" d="'+l.d+'" fill="'+kmLandTint(f,0)+'"'
   +(f?' data-r="'+kmE(l.land)+'"':'')+'></path>';
 }).join("");
 return kmSvgOpen(W.vak,"km-wereld","Wereldkaart met de landen waar onze whisky vandaan komt","","#fbf9f4")
  +'<path class="km-bol" d="'+W.rand+'"></path><path class="km-grat" d="'+W.grat+'"></path>'
  +'<g class="km-gebieden">'+landen+'</g><path class="km-rand" d="'+W.rand+'"></path></svg>';
}
function kmSvgSchot(){
 var G=KGRENZEN,v=G.vak,ins=G.inzet;
 var orde=["Highland","Lowland","Island","Islay","Campbeltown","Speyside"];
 var vlakken=orde.map(function(r){
  return '<path class="km-gb" data-r="'+r+'" d="'+G[KM_PAD[r]]+'"'+(r==="Island"?' fill="url(#km-arc)"':' fill="'+kmTint(r,0)+'"')+'></path>';
 }).join("");
 var vormen=orde.map(function(r){return '<path d="'+G[KM_PAD[r]]+'"></path>';}).join("");
 var labels=KM_VOLGORDE.map(function(r){var p=G.labels[r];
  return p?'<text class="km-lab" data-r="'+r+'" x="'+p[0]+'" y="'+p[1]+'" text-anchor="middle">'+KMG[r].naam+'</text>':'';}).join("");
 var dm=kmDistMap(),pt=[];
 for(var id in G.punten)if(dm[id])pt.push({id:id,x:G.punten[id][0],y:G.punten[id][1],r:G.punten[id][2],kleur:KKLEUR[G.punten[id][2]]});
 var defs='<pattern id="km-arc" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">'
  +'<rect width="8" height="8" fill="'+kmTint("Island",0)+'"></rect>'
  +'<line x1="0" y1="0" x2="0" y2="8" stroke="'+KKLEUR.Island+'" stroke-opacity=".28" stroke-width="2.4"></line></pattern>'
  +'<g id="km-vorm">'+vormen+'</g>';
 return kmSvgOpen(v,"km-schot","Kaart van Schotland met de vijf wettelijke whiskygebieden en de distilleerderijen",defs)
  +'<path class="km-ctx" d="'+G.context+'"></path>'+kmRingen("km-vorm")
  +'<rect class="km-inzet" x="'+ins[0]+'" y="'+ins[1]+'" width="'+ins[2]+'" height="'+ins[3]+'" rx="10"></rect>'
  +'<text class="km-inzetlab" x="'+(ins[0]+ins[2]-14)+'" y="'+(ins[1]+ins[3]-14)+'" text-anchor="end">Shetland</text>'
  +'<g class="km-gebieden">'+vlakken+'</g><path class="km-lijn" d="'+G.lijn+'"></path>'
  +'<g class="km-labs">'+labels+'</g>'+kmStippen(pt)+'</svg>';
}
function kmSvgLand(){
 var L=KLANDKAART[KM.land],pt=[],dm=kmDistMap();
 for(var id in L.punten)if(dm[id])pt.push({id:id,x:L.punten[id][0],y:L.punten[id][1],kleur:"#8a1c26"});
 return kmSvgOpen(L.vak,"km-land","Kaart van "+kmE(kmLandNaam(KM.land))+" met de distilleerderijen",'<path id="km-vorm" d="'+L.land+'"></path>')
  +(L.buren?'<path class="km-buur" d="'+L.buren+'"></path>':'')+kmRingen("km-vorm")
  +'<path class="km-landvlak" d="'+L.land+'"></path>'
  +(L.lijnen?'<path class="km-staat" d="'+L.lijnen+'"></path>':'')
  +kmStippen(pt)+'</svg>';
}

/* ---------- panelen ---------- */
function kmPaneel(){
 if(KM.dist)return kmPaneelDist();
 if(KM.niveau==="wereld")return kmPaneelWereld();
 if(KM.niveau==="schotland")return KM.sel?kmPaneelGebied():kmPaneelSchot();
 return kmPaneelLand();
}
function kmLijst(ids,kleur){
 var d=kmDistMap();
 ids.sort(function(a,b){return kmFl(d[b])-kmFl(d[a])||d[a].naam.localeCompare(d[b].naam);});
 return ids.length?'<div class="km-lijst">'+ids.map(function(id){
   return '<button data-act="dist" data-v="'+id+'"><i style="background:'+kleur+'"></i>'+kmE(d[id].naam)+'<u>'+kmFl(d[id])+'</u></button>';
  }).join("")+'</div>':'';
}
function kmPaneelWereld(){
 var tel=kmTel().land,dm=kmDistMap(),pl={};
 for(var id in dm)pl[dm[id].land]=(pl[dm[id].land]||0)+1;
 var landen=Object.keys(tel).sort(function(a,b){return tel[b]-tel[a];});
 var tot=landen.reduce(function(s,k){return s+tel[k];},0);
 return '<div class="km-pk">Wereld</div><h3>Whisky uit '+landen.length+' landen</h3>'
  +'<p class="km-tekst">Kies een land voor de distilleerderijen. Schotland heeft een eigen kaart met de vijf wettelijke whiskygebieden.</p>'
  +'<div class="km-stats"><div><b>'+tot.toLocaleString("nl-NL")+'</b><span>flessen</span></div><div><b>'+Object.keys(dm).length+'</b><span>distilleerderijen op de kaart</span></div></div>'
  +'<div class="km-legenda km-landen">'+landen.map(function(k){
    return '<button data-act="land" data-v="'+kmE(k)+'" data-r="'+kmE(k)+'"><i style="background:'+kmLandTint(tel[k],0)+';border-color:'+kmMeng(KM_KOPER,KM_PAPIER,.35)+'"></i>'
     +'<span><b>'+kmE(kmLandNaam(k))+'</b><small>'+(pl[k]?pl[k]+' op de kaart':'nog geen locaties')+'</small></span><u>'+tel[k].toLocaleString("nl-NL")+'</u></button>';
   }).join("")+'</div>';
}
function kmPaneelSchot(){
 var P=KGRENZEN.punten,dm=kmDistMap(),n={};
 for(var id in P)if(dm[id])n[P[id][2]]=(n[P[id][2]]||0)+1;
 return '<div class="km-pk">Schotland</div><h3>Vijf wettelijke whiskygebieden</h3>'
  +'<p class="km-tekst">De Scotch Whisky Regulations 2009 leggen drie regio’s en twee localities vast. '
  +'Zo’n naam mag alleen op het etiket als de whisky er is gedistilleerd. Kies een gebied om in te zoomen.</p>'
  +'<div class="km-legenda">'+KM_VOLGORDE.map(function(r){
    return '<button data-act="gebied" data-v="'+r+'" data-r="'+r+'">'
     +'<i class="'+(r==="Island"?"arc":"")+'" style="background:'+kmTint(r,1)+';border-color:'+KKLEUR[r]+'"></i>'
     +'<span><b>'+KMG[r].naam+'</b><small>'+KMG[r].soort+'</small></span><u>'+(n[r]||0)+'</u></button>';
   }).join("")+'</div>'
  +'<div class="km-uitleg"><svg width="26" height="6"><line x1="0" y1="3" x2="26" y2="3" stroke="#7d6c55" stroke-width="1.4" stroke-dasharray="5 3"/></svg>'
  +'Highland-lijn, de wettelijke grens tussen Highland en Lowland</div>'
  +kmOpenLijst("Schotland");
}
function kmPaneelGebied(){
 var r=KM.sel,g=KMG[r],P=KGRENZEN.punten,dm=kmDistMap(),ids=[];
 for(var id in P)if(P[id][2]===r&&dm[id])ids.push(id);
 var fl=ids.reduce(function(s,id){return s+kmFl(dm[id]);},0);
 return '<button class="km-terug" data-act="heel">← Heel Schotland</button>'
  +'<div class="km-pk" style="color:'+KKLEUR[r]+'">'+g.soort+(g.art?' · '+g.art:'')+'</div>'
  +'<h3>'+g.naam+'</h3><p class="km-tekst">'+g.tekst+'</p>'
  +'<div class="km-stats"><div><b>'+ids.length+'</b><span>distilleerderijen</span></div><div><b>'+fl+'</b><span>flessen</span></div></div>'
  +kmLijst(ids,KKLEUR[r])
  +'<a class="km-cta" href="#/selectie/streek/'+(r==="Island"?"islands":r.toLowerCase())+'">Naar de streekpagina →</a>';
}
function kmPaneelLand(){
 var k=KM.land,L=KLANDKAART[k],dm=kmDistMap(),ids=Object.keys(L.punten).filter(function(id){return dm[id];});
 var tel=kmTel().land[k]||0;
 return '<button class="km-terug" data-act="wereld">← Wereld</button>'
  +'<div class="km-pk">Land</div><h3>'+kmE(kmLandNaam(k))+'</h3>'
  +'<div class="km-stats"><div><b>'+tel.toLocaleString("nl-NL")+'</b><span>flessen</span></div><div><b>'+ids.length+'</b><span>op de kaart</span></div></div>'
  +(ids.length?kmLijst(ids,"#8a1c26"):'<p class="km-tekst">Van dit land staat nog geen distilleerderij met een bevestigde locatie op de kaart.</p>')
  +kmOpenLijst(k)
  +(kmVoorselectie(k)
    ?'<a class="km-cta" href="#/selectie/land/'+kmVoorselectie(k)+'">Naar de selectie '+kmE(kmLandNaam(k))+' →</a>'
     +'<button class="km-link" data-act="landflessen" data-v="'+kmE(k)+'">Of bekijk alle '+tel.toLocaleString("nl-NL")+' flessen in de collectie</button>'
    :'<button class="km-cta" data-act="landflessen" data-v="'+kmE(k)+'">Alle flessen uit '+kmE(kmLandNaam(k))+' →</button>');
}
function kmOpenLijst(k){
 var o=(typeof KDIST_OPEN!=="undefined"&&KDIST_OPEN[k])||[];
 if(!o.length)return "";
 return '<details class="km-open"><summary>Nog zonder locatie <u>'+o.length+'</u></summary>'
  +'<p>Merken en namen uit de collectie waarvan de distilleerderij nog niet is vastgesteld.</p>'
  +'<ul>'+o.map(function(x){return '<li><button data-act="naam" data-v="'+kmE(x[0])+'">'+kmE(x[0])+'</button><u>'+x[1]+'</u></li>';}).join("")+'</ul></details>';
}
function kmPaneelDist(){
 var d=kmDistMap()[KM.dist];if(!d){KM.dist="";return kmPaneel();}
 var schot=KM.niveau==="schotland"&&KGRENZEN.punten[d.id];
 var waar=schot?KMG[KGRENZEN.punten[d.id][2]].naam:kmLandNaam(d.land);
 var kleur=schot?KKLEUR[KGRENZEN.punten[d.id][2]]:"#8a1c26";
 var fl=kmFl(d);
 return '<button class="km-terug" data-act="'+(KM.sel?"gebied":"heel")+'" data-v="'+(KM.sel||"")+'">← '+kmE(KM.sel?KMG[KM.sel].naam:waar)+'</button>'
  +'<div class="km-pk" style="color:'+kleur+'">Distilleerderij · '+kmE(waar)+'</div>'
  +'<h3>'+kmE(d.naam)+'</h3>'
  +(d.bij?'<p class="km-tekst">Gemaakt bij '+kmE(d.bij)+'.</p>':'')
  +(d.namen.length>1?'<p class="km-tekst">In de collectie ook als: '+d.namen.slice(1).map(kmE).join(", ")+'.</p>':'')
  +'<div class="km-stats"><div><b>'+fl+'</b><span>'+(fl===1?"fles":"flessen")+' in de collectie</span></div></div>'
  +'<button class="km-cta" data-act="distflessen" data-v="'+d.id+'">Bekijk de flessen →</button>'
  +'<a class="km-wd" href="https://www.wikidata.org/wiki/'+d.id+'" target="_blank" rel="noopener">Locatie: Wikidata '+d.id+'</a>';
}

/* ---------- beeld (viewBox) ---------- */
function kmSvg(){return document.getElementById("km-svg");}
function kmZet(vb){
 var s=kmSvg();if(!s)return;
 KM.vb=vb;s.setAttribute("viewBox",vb.map(function(x){return x.toFixed(1);}).join(" "));kmSchaal();
 if(KM.tipEl)kmTipPlek();
}
function kmK(){var s=kmSvg();if(!s||!KM.vb)return 1;return Math.max(KM.vb[2]/(s.clientWidth||1),KM.vb[3]/(s.clientHeight||1));}
function kmSchaal(){
 var s=kmSvg();if(!s)return;
 var k=kmK(),dm=kmDistMap();
 s.style.setProperty("--k",k);
 s.querySelectorAll(".km-dot").forEach(function(c){
  var r=kmR(kmFl(dm[c.dataset.id]))*(c.classList.contains("hl")?1.35:1);
  c.setAttribute("r",(r*k).toFixed(2));
 });
 var p=s.querySelector("#km-arc");if(p){p.setAttribute("width",7*k);p.setAttribute("height",7*k);
  p.querySelector("rect").setAttribute("width",7*k);p.querySelector("rect").setAttribute("height",7*k);
  var l=p.querySelector("line");l.setAttribute("y2",7*k);l.setAttribute("stroke-width",2*k);}
 var sb=document.getElementById("km-schaal");
 if(sb&&KM.km){
  var km=90*k/KM.km,stap=[1,2,5,10,20,25,50,100,200,250,500,1000].filter(function(x){return x<=km;}).pop()||1;
  sb.querySelector("i").style.width=(stap*KM.km/k).toFixed(0)+"px";sb.querySelector("span").textContent=stap+" km";
 }
}
function kmGrenzen(vb){
 var v=KM.vak,minW=v[2]/(KM.niveau==="wereld"?10:16);
 var w=Math.min(v[2]*1.05,Math.max(minW,vb[2])),h=w*vb[3]/vb[2];
 var cx=vb[0]+vb[2]/2,cy=vb[1]+vb[3]/2;
 cx=Math.min(v[0]+v[2],Math.max(v[0],cx));cy=Math.min(v[1]+v[3],Math.max(v[1],cy));
 return [cx-w/2,cy-h/2,w,h];
}
function kmPas(vb){
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
function kmVolledig(){return kmPas(KM.vak.slice());}
function kmBox(r){
 var p=document.querySelector('.km-gebieden [data-r="'+r+'"]');if(!p)return null;
 var b=p.getBBox();
 if(KM.niveau==="schotland"&&r==="Island"){var ins=KGRENZEN.inzet,v=KGRENZEN.vak;return [v[0]+20,b.y,ins[0]-v[0]-20,b.height];}
 return [b.x,b.y,b.width,b.height];
}

/* ---------- toestand ---------- */
function kmKlassen(){
 var s=kmSvg();if(!s)return;
 if(KM.niveau==="wereld"){
  var tel=kmTel().land;
  s.querySelectorAll(".km-gb").forEach(function(p){
   var h=p.dataset.r===KM.hov;p.setAttribute("fill",kmLandTint(tel[p.dataset.r],h?1:0));p.classList.toggle("hov",h);
  });
 }
 if(KM.niveau==="schotland"){
  s.classList.toggle("km-sel",!!KM.sel);
  s.querySelectorAll(".km-gebieden .km-gb").forEach(function(p){
   var r=p.dataset.r,stand=KM.sel?(r===KM.sel?2:(r===KM.hov?1:3)):(r===KM.hov?1:0);
   if(r!=="Island")p.setAttribute("fill",kmTint(r,stand));else p.style.opacity=stand===3?.45:1;
   p.classList.toggle("aan",r===KM.sel);
  });
  s.querySelectorAll(".km-lab").forEach(function(t){t.classList.toggle("weg",!!KM.sel);t.classList.toggle("hov",t.dataset.r===KM.hov);});
 }
 s.querySelectorAll(".km-dot").forEach(function(c){
  c.classList.toggle("dim",KM.niveau==="schotland"&&!!KM.sel&&c.dataset.r!==KM.sel);
  c.classList.toggle("hl",c.dataset.id===KM.dist);
 });
 document.querySelectorAll(".km-legenda button").forEach(function(b){b.classList.toggle("hov",b.dataset.r===KM.hov);});
 var kr=document.getElementById("km-kruim");if(kr)kr.innerHTML=kmKruim();
 kmSchaal();
}
function kmPaneelZet(){var p=document.getElementById("km-paneel");if(p){p.innerHTML=kmPaneel();p.scrollTop=0;}}
function kmHover(r){if(KM.hov===r)return;KM.hov=r;kmKlassen();}
function kmNaarNiveau(niveau,land){
 KM.niveau=niveau;KM.land=land||"";KM.sel="";KM.dist="";KM.hov="";KM.vb=null;
 KNIVEAU=niveau==="wereld"?"wereld":"schotland";KSTREEK="";
 render();var k=document.getElementById("km")||document.querySelector(".km");
 if(k&&k.getBoundingClientRect().top<0)k.scrollIntoView({block:"start"});
}
function kmKiesGebied(r){
 KM.sel=r;KM.dist="";KM.hov="";KSTREEK=r;
 kmKlassen();kmPaneelZet();kmTip();
 if(!r){kmNaar(kmVolledig());return;}
 var b=kmBox(r);if(!b)return;
 var m=Math.max(b[2],b[3])*.12+40;
 kmNaar(kmGrenzen(kmPas([b[0]-m,b[1]-m,b[2]+2*m,b[3]+2*m])));
}
function kmHeel(){
 if(KM.niveau==="schotland"){kmKiesGebied("");return;}
 KM.dist="";kmKlassen();kmPaneelZet();kmTip();kmNaar(kmVolledig());
}
function kmDist(id){
 var c=document.querySelector('.km-dot[data-id="'+id+'"]');if(!c)return;
 var x=+c.getAttribute("cx"),y=+c.getAttribute("cy"),opnieuw=false;
 if(KM.niveau==="schotland"&&KM.sel!==c.dataset.r){KM.sel=c.dataset.r;KSTREEK=KM.sel;opnieuw=true;}
 KM.dist=id;kmKlassen();kmPaneelZet();
 var vb=KM.vb,w=Math.min(vb[2],KM.vak[2]/(KM.niveau==="schotland"?(opnieuw?4:3.2):1.8));
 if(opnieuw||w<vb[2]||x<vb[0]||x>vb[0]+vb[2]||y<vb[1]||y>vb[1]+vb[3]){
  var h=w*vb[3]/vb[2];kmNaar(kmGrenzen([x-w/2,y-h/2,w,h]));
 }
}
function kmLicht(id){
 var s=kmSvg();if(!s)return;
 s.querySelectorAll(".km-dot").forEach(function(c){c.classList.toggle("hl",c.dataset.id===id||c.dataset.id===KM.dist);});
 kmSchaal();
 var c=id&&s.querySelector('.km-dot[data-id="'+id+'"]');if(c)kmTip(c);else kmTip();
}

/* ---------- tooltip ---------- */
function kmTip(c,html,mx,my){
 var t=document.getElementById("km-tip");if(!t)return;
 if(!c&&!html){t.classList.remove("aan");KM.tipEl=null;return;}
 if(c){
  var d=kmDistMap()[c.dataset.id],f=kmFl(d),schot=KM.niveau==="schotland";
  var waar=schot?KMG[c.dataset.r].naam:kmLandNaam(d.land),kleur=schot?KKLEUR[c.dataset.r]:"#8a1c26";
  t.innerHTML='<b>'+kmE(d.naam)+'</b><span><i style="background:'+kleur+'"></i>'+kmE(waar)+' · '+kmFlTekst(f)+'</span>';
  KM.tipEl=c;kmTipPlek();
 }else{
  KM.tipEl=null;t.innerHTML=html;
  var rw=document.getElementById("km-kaart").getBoundingClientRect();
  t.style.left=(mx-rw.left)+"px";t.style.top=(my-rw.top-6)+"px";
 }
 t.classList.add("aan");
}
function kmTipPlek(){
 var t=document.getElementById("km-tip"),c=KM.tipEl,w=document.getElementById("km-kaart");
 if(!t||!c||!w||!c.isConnected)return;
 var rk=c.getBoundingClientRect(),rw=w.getBoundingClientRect();
 t.style.left=(rk.left+rk.width/2-rw.left)+"px";t.style.top=(rk.top-rw.top)+"px";
}

/* ---------- namen zonder overlap ---------- */
function kmNamen(){
 var s=kmSvg();if(!s||KM.niveau==="wereld")return;
 var zicht=KM.niveau==="land"||!!KM.sel,boxen=[],dm=kmDistMap(),k=kmK();
 var tt=[].slice.call(s.querySelectorAll(".km-naam"));
 tt.sort(function(a,b){return (b.dataset.id===KM.dist)-(a.dataset.id===KM.dist)||kmFl(dm[b.dataset.id])-kmFl(dm[a.dataset.id]);});
 tt.forEach(function(t){
  var aan=zicht&&(KM.niveau==="land"||t.dataset.r===KM.sel);
  t.classList.toggle("aan",aan);if(!aan)return;
  var c=s.querySelector('.km-dot[data-id="'+t.dataset.id+'"]'),r=+c.getAttribute("r");
  t.setAttribute("x",(+c.getAttribute("cx")+r+4*k).toFixed(1));
  t.setAttribute("y",(+c.getAttribute("cy")+3.6*k).toFixed(1));
  var b=t.getBoundingClientRect();
  if(boxen.some(function(o){return b.left<o.right+3&&b.right>o.left-3&&b.top<o.bottom+1&&b.bottom>o.top-1;}))t.classList.remove("aan");
  else boxen.push(b);
 });
}

/* ---------- acties (één klikafhandeling voor kaart en paneel) ---------- */
function kmActie(a,v){
 if(a==="wereld")kmNaarNiveau("wereld");
 else if(a==="land"){if(v==="Schotland")kmNaarNiveau("schotland");else kmNaarNiveau("land",v);}
 else if(a==="gebied")kmKiesGebied(v);
 else if(a==="heel")kmHeel();
 else if(a==="dist")kmDist(v);
 else if(a==="zoom")kmZoom(+v);
 else if(a==="distflessen"){var d=kmDistMap()[v];if(d)snel({dist:d.namen});}
 else if(a==="landflessen")snel({land:kmCatLanden(v)});
 else if(a==="naam")snel({dist:[v]});
}

/* ---------- opstarten na render ---------- */
function kmInit(){
 var s=kmSvg(),root=document.getElementById("km");if(!s||!root)return;
 KM.vak=KM.niveau==="wereld"?KWERELD.vak:KM.niveau==="schotland"?KGRENZEN.vak:KLANDKAART[KM.land].vak;
 KM.km=KM.niveau==="schotland"?10:KM.niveau==="land"?KLANDKAART[KM.land].km:null;
 var start=KM.niveau==="schotland"&&KSTREEK&&KMG[KSTREEK]?KSTREEK:"";
 KM.sel="";KM.dist="";KM.hov="";
 kmZet(kmVolledig());kmKlassen();kmNamen();
 if(start)setTimeout(function(){kmKiesGebied(start);},60);
 root.addEventListener("click",function(e){
  var b=e.target.closest("[data-act]");
  if(b&&root.contains(b)){e.preventDefault();kmActie(b.dataset.act,b.dataset.v);}
 });
 var pan=document.getElementById("km-paneel");
 pan.addEventListener("mouseover",function(e){
  var b=e.target.closest("button[data-act]");if(!b)return;
  if(b.dataset.act==="dist")kmLicht(b.dataset.v);
  else if((b.dataset.act==="gebied"||b.dataset.act==="land")&&b.dataset.r)kmHover(b.dataset.r);
 });
 pan.addEventListener("mouseout",function(e){
  var b=e.target.closest("button[data-act]");if(!b)return;
  if(b.dataset.act==="dist")kmLicht("");else if(b.dataset.r)kmHover("");
 });
 var gb=s.querySelector(".km-gebieden");
 if(gb){
  gb.addEventListener("mouseover",function(e){var p=e.target.closest(".km-gb");if(p)kmHover(p.dataset.r);});
  gb.addEventListener("mousemove",function(e){
   var p=e.target.closest(".km-gb");
   if(KM.niveau==="wereld"&&p&&!(KM.sleep&&KM.sleep.bewogen)){
    var f=kmTel().land[p.dataset.r]||0;
    kmTip(null,'<b>'+kmE(kmLandNaam(p.dataset.r))+'</b><span>'+f.toLocaleString("nl-NL")+' flessen</span>',e.clientX,e.clientY);
   }else if(KM.niveau==="wereld"&&!p)kmTip();
  });
  gb.addEventListener("mouseleave",function(){kmHover("");if(KM.niveau==="wereld")kmTip();});
  gb.addEventListener("click",function(e){
   if(KM.sleep&&KM.sleep.bewogen)return;
   var p=e.target.closest(".km-gb");if(!p)return;
   if(KM.niveau==="wereld")kmActie("land",p.dataset.r);
   else if(KM.niveau==="schotland"&&p.dataset.r!==KM.sel)kmKiesGebied(p.dataset.r);
  });
 }
 var dots=s.querySelector(".km-dots");
 if(dots){
  dots.addEventListener("mouseover",function(e){var c=e.target.closest(".km-dot");if(c){kmTip(c);c.classList.add("hl");kmSchaal();}});
  dots.addEventListener("mouseout",function(e){var c=e.target.closest(".km-dot");if(c){kmTip();if(c.dataset.id!==KM.dist)c.classList.remove("hl");kmSchaal();}});
  dots.addEventListener("click",function(e){var c=e.target.closest(".km-dot");if(c&&!(KM.sleep&&KM.sleep.bewogen))kmDist(c.dataset.id);});
  dots.addEventListener("keydown",function(e){var c=e.target.closest(".km-dot");if(c&&(e.key==="Enter"||e.key===" ")){e.preventDefault();kmDist(c.dataset.id);}});
 }
 s.addEventListener("pointerdown",function(e){
  if(e.button!==0)return;KM.sleep={x:e.clientX,y:e.clientY,vb:KM.vb.slice(),bewogen:false,id:e.pointerId};
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
 s.addEventListener("wheel",function(e){
  if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();
  kmZoom(Math.exp(-e.deltaY*.0035),e.clientX,e.clientY);clearTimeout(KM.wt);KM.wt=setTimeout(kmNamen,180);
 },{passive:false});
 s.addEventListener("dblclick",function(e){e.preventDefault();kmZoom(1.8,e.clientX,e.clientY);setTimeout(kmNamen,400);});
 if(!KM.ro&&window.ResizeObserver)KM.ro=new ResizeObserver(function(){if(kmSvg()&&KM.vb){kmSchaal();kmNamen();}});
 if(KM.ro){KM.ro.disconnect();KM.ro.observe(s);}
}
if(typeof render==="function"&&/^#\/kaart/.test(location.hash||""))render();
