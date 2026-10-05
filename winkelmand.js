/* Winkelmand van de ontdeksite.
   Besluit 05-10-2026: mandje hier, betalen bij Lightspeed. Afrekenen zet de flessen in de
   echte winkelwagen van whiskysite.nl via /nl/cart/add/{variant}/?quantity=N — precies wat een
   klant zelf doet op de productpagina. Betalen, leeftijdscontrole, verzending en btw blijven
   volledig in Lightspeed. Er wordt niets in Lightspeed gewijzigd.
   Het variant-id komt uit de openbare functie ws-mand (alleen lezen, geen handelsgegevens).
   Het mandje zelf staat alleen in deze browser (localStorage), zonder persoonsgegevens. */
var WM_SHOP="https://www.whiskysite.nl/nl/";
var WM_FUNCTIE="https://fbtsezpjutzhvjodexpa.supabase.co/functions/v1/ws-mand";
var WM_SLEUTEL="sb_publishable_RFNsxnzhA7Pi4f1uo7LigQ_xf1z8sri"; /* publieke sleutel, geen geheim */
var WM={items:[],live:{},bezig:false,stap:""};
(function(){try{var x=JSON.parse(localStorage.getItem("wsmand")||"[]");if(Array.isArray(x))WM.items=x.filter(function(i){return i&&i.id&&i.n>0;}).slice(0,40);}catch(e){}})();
function wmBewaar(){try{localStorage.setItem("wsmand",JSON.stringify(WM.items));}catch(e){}wmTel();}
function wmTel(){var n=WM.items.reduce(function(s,i){return s+i.n;},0);var b=document.getElementById("cartN");if(b)b.textContent=n;if(typeof cart!=="undefined")cart=n;}
function wmProd(id){id=String(id);return (typeof CAT!=="undefined"&&CAT.find(function(p){return String(p.id)===id;}))||(typeof P!=="undefined"&&P.find(function(p){return String(p.id)===id;}))||null;}
/* Echte catalogusflessen: de sampleflacon hangt via _ouder aan zijn hoofdfles.
   Wordt vanuit index.html aangeroepen zodra CAT bestaat, vóór de eerste render. */
function wmKoppel(){
 if(typeof CAT==="undefined")return;
 var per={};CAT.forEach(function(p){per[String(p.id)]=p;});
 CAT.forEach(function(s){
  if(!s._sample||!s._ouder)return;var h=per[String(s._ouder)];
  if(h&&!h.sampleId&&h.sample==null){h.sampleId=String(s.id);h.sample=s.price;}
 });
}
function wmToe(id,n){
 var p=wmProd(id);
 if(!p||!/^\d+$/.test(String(p.id))){toast("Deze fles is een voorbeeld en niet te bestellen");return;}
 if(p.rare){toast("Deze fles is op aanvraag — neem contact op met de winkel");return;}
 var it=WM.items.find(function(i){return i.id===String(p.id);});
 if(it)it.n=Math.min(it.n+(n||1),24);
 else{if(WM.items.length>=40){toast("Je mandje is vol (40 verschillende flessen)");return;}
  WM.items.push({id:String(p.id),naam:p.name,prijs:p.price,img:p.img,url:p.url||"",n:n||1});}
 wmBewaar();
 toast(p.name+" in je mandje");
}
function wmSample(id){var p=wmProd(id);if(p&&p.sampleId)wmToe(p.sampleId);else toast("Voor deze fles is geen sample beschikbaar");}
function wmAantal(id,d){var it=WM.items.find(function(i){return i.id===id;});if(!it)return;it.n=Math.max(0,Math.min(24,it.n+d));
 if(!it.n)WM.items=WM.items.filter(function(i){return i!==it;});wmBewaar();render();}
function wmWeg(id){WM.items=WM.items.filter(function(i){return i.id!==id;});wmBewaar();render();}
function wmPrijs(it){var l=WM.live[it.id];return (l&&l.prijs!=null)?+l.prijs:+it.prijs||0;}
function wmControle(){
 var ids=WM.items.map(function(i){return i.id;}).filter(function(id){return !WM.live[id];});
 if(!ids.length)return Promise.resolve();
 return fetch(WM_FUNCTIE,{method:"POST",headers:{"Content-Type":"application/json","apikey":WM_SLEUTEL},body:JSON.stringify({ids:ids})})
  .then(function(r){return r.ok?r.json():{producten:{}};})
  .then(function(d){var pr=(d&&d.producten)||{};ids.forEach(function(id){WM.live[id]=pr[id]||{onbekend:true};});})
  .catch(function(){});
}
function wmWacht(ms){return new Promise(function(r){setTimeout(r,ms);});}
/* Afrekenen: één venster (direct bij de klik geopend, anders blokkeert de browser het) dat de
   flessen een voor een in de winkelwagen zet en eindigt op de winkelwagen van whiskysite.nl. */
function wmAfrekenen(){
 if(WM.bezig||!WM.items.length)return;
 var w=window.open("about:blank","whiskysite_winkelwagen");
 if(!w){toast("Je browser blokkeerde het venster. Sta pop-ups toe voor deze site en probeer opnieuw.");return;}
 try{w.document.write('<p style="font:16px system-ui;padding:24px">Je flessen gaan naar de winkelwagen van Whiskysite.nl…</p>');}catch(e){}
 WM.bezig=true;WM.stap="Flessen opzoeken…";render();
 wmControle().then(function(){
  var klaar=WM.items.filter(function(i){var l=WM.live[i.id];return l&&l.variant;});
  var los=WM.items.filter(function(i){var l=WM.live[i.id];return !(l&&l.variant);});
  var keten=Promise.resolve();
  klaar.forEach(function(it,k){keten=keten.then(function(){
   WM.stap="Naar de winkelwagen: "+(k+1)+" van "+klaar.length;render();
   w.location.href=WM_SHOP+"cart/add/"+WM.live[it.id].variant+"/?quantity="+it.n;
   return wmWacht(2200);});});
  return keten.then(function(){
   w.location.href=WM_SHOP+"cart/";
   WM.bezig=false;WM.stap="";
   /* Wat al in de winkelwagen van whiskysite.nl staat, gaat uit dit mandje (anders dubbel bij opnieuw afrekenen). */
   WM.items=los;WM.los=los.map(function(i){return i.id;});wmBewaar();
   render();
   toast(klaar.length?"Je winkelwagen op Whiskysite.nl staat open in een nieuw venster":"Geen van de flessen kon automatisch mee — zie de lijst");
  });
 }).catch(function(){WM.bezig=false;WM.stap="";render();toast("Afrekenen lukte niet. Probeer het opnieuw.");});
}
function vMand(){
 var e=function(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});};
 var kop='<section><div class="wrap" style="max-width:920px"><div class="kicker">Je mandje</div><h1 style="font-family:var(--serif);font-size:clamp(28px,4vw,40px);margin:6px 0 18px">Winkelwagen</h1>';
 if(!WM.items.length)return kop+'<div class="sync-box"><b>Je mandje is leeg</b><p>Vind een fles op smaak via <a href="#/ontdek" style="color:var(--amber)">Help mij kiezen</a> of blader door de <a href="#/collectie" style="color:var(--amber)">collectie</a>.</p></div></div></section>';
 if(!WM.bezig&&WM.items.some(function(i){return !WM.live[i.id];}))wmControle().then(function(){if(route().r==="winkelwagen")render();});
 var tot=WM.items.reduce(function(s,i){return s+wmPrijs(i)*i.n;},0),los=WM.los||[];
 return kop
 +(los.length?'<div class="bouwband"><b>Deze flessen konden niet automatisch mee.</b> Voeg ze zelf toe via de link bij de fles. De andere flessen staan al in je winkelwagen op Whiskysite.nl.</div>':'')
 +'<div style="display:grid;gap:12px">'+WM.items.map(function(i){
  var l=WM.live[i.id]||{},p=wmPrijs(i),anders=l.prijs!=null&&Math.abs(l.prijs-i.prijs)>0.005;
  return '<div style="display:grid;grid-template-columns:64px 1fr auto;gap:14px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 14px">'
  +'<img src="'+e(i.img)+'" alt="" style="width:64px;height:64px;object-fit:contain;background:#fff;border-radius:10px">'
  +'<div><a href="#/product/'+e(i.id)+'" style="font-weight:600;color:var(--text)">'+e(i.naam)+'</a>'
  +'<div style="font-size:12.5px;color:var(--muted);margin-top:3px">'+eur(p)+' per stuk'+(anders?' · <span style="color:var(--amber)">prijs bijgewerkt (was '+eur(+i.prijs)+')</span>':'')
  +(l.te_koop===false?' · <span style="color:#a33">nu niet op voorraad</span>':'')
  +(l.onbekend?' · <a href="'+e(i.url?WM_SHOP+i.url+".html":WM_SHOP)+'" target="_blank" rel="noopener" style="color:var(--amber)">zelf toevoegen op Whiskysite.nl →</a>':'')+'</div>'
  +'<div style="display:flex;align-items:center;gap:8px;margin-top:8px">'
  +'<button class="bfil" onclick="wmAantal(\''+i.id+'\',-1)" aria-label="Eén minder">−</button><b style="min-width:18px;text-align:center">'+i.n+'</b>'
  +'<button class="bfil" onclick="wmAantal(\''+i.id+'\',1)" aria-label="Eén meer">+</button>'
  +'<button onclick="wmWeg(\''+i.id+'\')" style="background:none;border:0;color:var(--muted);font:inherit;font-size:12px;cursor:pointer;text-decoration:underline;margin-left:6px">verwijderen</button></div></div>'
  +'<b style="font-family:var(--serif);font-size:17px">'+eur(p*i.n)+'</b></div>';}).join("")+'</div>'
 +'<div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-top:20px;padding-top:16px;border-top:1px solid var(--line)">'
 +'<div><div style="font-size:12.5px;color:var(--muted)">Subtotaal, inclusief btw</div><div style="font-family:var(--serif);font-size:26px">'+eur(tot)+'</div>'
 +'<div style="font-size:12px;color:var(--muted);max-width:46ch">Verzendkosten en de definitieve prijs zie je bij het afrekenen op Whiskysite.nl. Daar betaal je ook, en controleren we je leeftijd.</div></div>'
 +'<button class="btn btn-a" '+(WM.bezig?'disabled':'')+' onclick="wmAfrekenen()">'+(WM.bezig?e(WM.stap||"Bezig…"):'Afrekenen bij Whiskysite.nl →')+'</button></div>'
 +'<p style="font-size:11.5px;color:var(--muted);margin-top:18px">Geen 18, geen alcohol. Je mandje wordt alleen in deze browser bewaard.</p>'
 +'</div></section>';
}
