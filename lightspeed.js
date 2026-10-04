/* Lightspeed-koppeling in de beheeromgeving: Producten en Lightspeed-sync.
   Leest uit Supabase (tabellen ws_ls_producten, ws_ls_varianten, ws_ls_sync_log).
   Alleen accounts in ws_toegang kunnen lezen (RLS). De Lightspeed-sleutel staat
   uitsluitend server-side in de Edge Function ws-ls-sync; nooit in dit bestand.
   De sync doet alleen GET-verzoeken: er wordt niets in Lightspeed gewijzigd. */
var LS={prod:null,log:null,tel:null,laden:false,fout:"",zoek:"",pagina:0,bezig:false,voortgang:"",stap:50};
function lsKlaar(){return typeof WS!=="undefined"&&WS.sb&&WS.gebruiker&&!WS.fout;}
function lsNl(n){return n==null?"—":String(n).replace(/\B(?=(\d{3})+(?!\d))/g,".");}
function lsTijd(t){if(!t)return"—";var d=new Date(t);return d.toLocaleDateString("nl-NL",{day:"numeric",month:"short"})+" "+d.toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit"});}
function lsLaad(){
 if(LS.laden||!lsKlaar())return;LS.laden=true;LS.fout="";
 var van=LS.pagina*LS.stap,q=WS.sb.from("ws_ls_producten").select("ls_id,titel,merk,zichtbaar,url,ws_ls_varianten(prijs_incl,voorraad,voorraad_bijgehouden)",{count:"exact"}).order("titel").range(van,van+LS.stap-1);
 if(LS.zoek)q=q.ilike("titel","%"+LS.zoek.replace(/[%_,()]/g,"")+"%");
 Promise.all([q,WS.sb.from("ws_ls_sync_log").select("*").order("gestart_op",{ascending:false}).limit(15)]).then(function(r){
  LS.laden=false;
  if(r[0].error||r[1].error){LS.fout="Laden mislukt.";}
  else{LS.prod=r[0].data||[];LS.tel=r[0].count;LS.log=r[1].data||[];}
  wsHerteken();
 }).catch(function(){LS.laden=false;LS.fout="Laden mislukt.";wsHerteken();});
}
function lsVernieuw(){LS.prod=null;LS.log=null;lsLaad();}
function lsZoek(v){clearTimeout(LS.zt);LS.zt=setTimeout(function(){LS.zoek=v.trim();LS.pagina=0;lsVernieuw();},350);}
function lsBlad(d){LS.pagina=Math.max(0,LS.pagina+d);lsVernieuw();}
/* De sync draait in porties van ~100 s (grens van de Edge Function). Zolang de functie
   "verder" meldt, roepen we hem opnieuw aan met dezelfde logregel. Tab sluiten = sync stopt;
   de functie markeert zo'n achtergelaten sync na 15 minuten als afgebroken. */
var LSFASE={merken:"merken",producten:"producten",varianten:"prijzen en voorraad",orders:"orders"};
function lsDraai(soort,vervolg,onderdeel){
 onderdeel=onderdeel||(vervolg&&vervolg.onderdeel)||"catalogus";
 if(!lsKlaar())return;
 if(!vervolg){if(LS.bezig)return;LS.bezig=true;LS.voortgang="Starten…";wsHerteken();}
 WS.sb.functions.invoke("ws-ls-sync",{body:vervolg?{soort:soort,onderdeel:onderdeel,log_id:vervolg.log_id,fase:vervolg.fase,pagina:vervolg.pagina}:{soort:soort,onderdeel:onderdeel}}).then(function(r){
  var d=r.data||{};
  if(!r.error&&d.status==="verder"){
   LS.voortgang="Bezig met "+(LSFASE[d.fase]||d.fase)+" · pagina "+d.pagina+" · "+lsNl(d.producten)+" producten, "+lsNl(d.varianten)+" varianten";
   wsHerteken();lsDraai(soort,d,onderdeel);return;
  }
  LS.bezig=false;LS.voortgang="";
  if(r.error||d.status!=="ok"){
   var m=d.melding;
   if(!m&&r.error&&r.error.context&&typeof r.error.context.json==="function"){
    r.error.context.json().then(function(j){toast("Sync mislukt"+(j&&j.melding?": "+j.melding:""));}).catch(function(){toast("Sync mislukt");});
   }else toast("Sync mislukt"+(m?": "+m:""));
  }
  else toast(onderdeel==="orders"?"Orders opgehaald: "+lsNl(d.orders):"Sync klaar: "+lsNl(d.producten)+" producten, "+lsNl(d.varianten)+" varianten");
  lsVernieuw();LO.rij=null;LD.d=null;if(typeof wsHerteken==="function")wsHerteken();
 }).catch(function(){LS.bezig=false;LS.voortgang="";toast("Sync onderbroken. Start opnieuw; een halve sync wordt na 15 minuten vanzelf afgesloten.");lsVernieuw();});
}
function lsNietIngelogd(){
 return typeof wsLoginBlok==="function"?wsLoginBlok("de gegevens uit Lightspeed te zien"):'<p>Log in via Vragen voor Jack.</p>';
}
function vLsProducten(){
 if(!lsKlaar())return '<h3 style="font-size:20px;margin-bottom:16px">Producten</h3>'+lsNietIngelogd();
 if(LS.prod===null&&!LS.fout){lsLaad();return '<h3 style="font-size:20px">Producten</h3><p style="color:var(--muted)">Laden…</p>';}
 var h='<h3 style="font-size:20px;margin-bottom:6px">Producten <span style="font-size:12px;color:var(--muted);font-weight:400">('+lsNl(LS.tel)+(LS.zoek?' gevonden':' uit Lightspeed')+')</span></h3>'
 +'<input value="'+wsH(LS.zoek)+'" oninput="lsZoek(this.value)" placeholder="Zoek op naam…" style="font:inherit;font-size:13px;padding:9px 12px;border:1px solid var(--line);border-radius:9px;background:var(--card);color:var(--text);width:min(360px,100%);margin:8px 0 14px">';
 if(LS.fout)return h+'<p class="wsfout">'+wsH(LS.fout)+'</p>';
 if(!LS.prod.length)return h+'<div class="sync-box"><b>Nog geen producten</b><p>'+(LS.zoek?'Niets gevonden.':'Er is nog geen sync gedraaid. Start er een onder <a href="#/admin/sync" style="color:var(--amber)">Lightspeed-sync</a>.')+'</p></div>';
 h+='<table class="atable"><tr><th>Product</th><th>Prijs</th><th>Voorraad</th><th>Zichtbaar</th></tr>'
 +LS.prod.map(function(p){
  var v=p.ws_ls_varianten||[],pr=v.map(function(x){return x.prijs_incl;}).filter(function(x){return x!=null;});
  var vr=v.filter(function(x){return x.voorraad_bijgehouden;}).reduce(function(s,x){return s+(x.voorraad||0);},0);
  var bij=v.some(function(x){return x.voorraad_bijgehouden;});
  return '<tr><td><b>'+wsH(p.titel)+'</b><br><span style="color:var(--muted)">'+wsH(p.merk||"")+'</span></td>'
  +'<td>'+(pr.length?eur(Math.min.apply(null,pr)):"—")+'</td>'
  +'<td>'+(bij?'<span class="st '+(vr>0?"ok":"warn")+'">'+(vr>0?lsNl(vr)+" op voorraad":"Uitverkocht")+'</span>':'<span style="color:var(--muted)">niet bijgehouden</span>')+'</td>'
  +'<td>'+(p.zichtbaar?"Ja":"Nee")+'</td></tr>';}).join("")+'</table>';
 var max=Math.ceil((LS.tel||0)/LS.stap);
 if(max>1)h+='<div style="display:flex;gap:10px;align-items:center;margin-top:12px">'
  +'<button class="btn btn-g btn-s" '+(LS.pagina?'':'disabled')+' onclick="lsBlad(-1)">← Vorige</button>'
  +'<span style="font-size:12.5px;color:var(--muted)">Pagina '+(LS.pagina+1)+' van '+max+'</span>'
  +'<button class="btn btn-g btn-s" '+(LS.pagina+1<max?'':'disabled')+' onclick="lsBlad(1)">Volgende →</button></div>';
 return h+'<p style="font-size:12px;color:var(--muted);margin-top:12px">Alleen-lezen spiegel van Lightspeed. Wijzigen gebeurt in Lightspeed zelf, pas na akkoord.</p>';
}
function vLsSync(){
 if(!lsKlaar())return '<h3 style="font-size:20px;margin-bottom:16px">Lightspeed-verbinding</h3>'+lsNietIngelogd();
 if(LS.log===null&&!LS.fout){lsLaad();return '<h3 style="font-size:20px">Lightspeed-verbinding</h3><p style="color:var(--muted)">Laden…</p>';}
 var log=LS.log||[],ok=log.filter(function(l){return l.status==="ok";})[0],laatst=log[0];
 var kop=!laatst?'<b>○ Nog niet gesynchroniseerd</b><p>De koppeling staat klaar. Start eerst een test (250 producten) om te zien of alles goed binnenkomt.</p>'
  :laatst.status==="fout"?'<b style="color:#a33">● Laatste sync mislukt</b><p>'+wsH(laatst.melding||"")+' · '+lsTijd(laatst.gestart_op)+'</p>'
  :'<b>● Verbonden met Lightspeed eCom</b><p>Laatste geslaagde sync: '+lsTijd(ok&&ok.klaar_op)+' · alleen lezen · sleutel veilig server-side</p>';
 return '<h3 style="font-size:20px;margin-bottom:16px">Lightspeed-verbinding</h3>'
 +'<div class="sync-box">'+kop+'</div>'
 +'<div style="display:flex;gap:10px;flex-wrap:wrap;margin:4px 0 18px">'
 +'<button class="btn btn-a btn-s" '+(LS.bezig?'disabled':'')+' onclick="lsDraai(\'test\')">'+(LS.bezig?'Bezig…':'Test-sync (250)')+'</button>'
 +'<button class="btn btn-g btn-s" '+(LS.bezig?'disabled':'')+' onclick="lsDraai(\'incrementeel\')">Alleen wijzigingen</button>'
 +'<button class="btn btn-g btn-s" '+(LS.bezig?'disabled':'')+' onclick="lsDraai(\'volledig\')">Volledige sync</button>'
 +'<button class="btn btn-g btn-s" onclick="lsVernieuw()">Vernieuwen</button></div>'
 +(LS.bezig&&LS.voortgang?'<div class="bouwband"><b>Sync loopt.</b> '+wsH(LS.voortgang)+'. Laat dit tabblad open; een volledige sync duurt enkele minuten.</div>':'')
 +(LS.fout?'<p class="wsfout">'+wsH(LS.fout)+'</p>':'')
 +(log.length?'<table class="atable"><tr><th>Gestart</th><th>Onderdeel · soort</th><th>Producten</th><th>Varianten</th><th>Status</th></tr>'
  +log.map(function(l){return '<tr><td>'+lsTijd(l.gestart_op)+'</td><td>'+(l.onderdeel==="orders"?"orders":"catalogus")+' · '+l.soort+'</td><td>'+lsNl(l.producten_bijgewerkt)+'</td><td>'+lsNl(l.varianten_bijgewerkt)+'</td>'
  +'<td><span class="st '+(l.status==="ok"?"ok":"warn")+'" title="'+wsH(l.melding||"")+'">'+(l.status==="ok"?"OK":l.status==="bezig"?"Bezig":"Fout")+'</span></td></tr>';}).join("")+'</table>':'')
 +'<p style="font-size:12px;color:var(--muted);margin-top:12px">De sync leest producten, prijzen en voorraad. Er wordt niets in Lightspeed gewijzigd. Een volledige sync loopt in porties van anderhalve minuut en gaat vanzelf door zolang dit tabblad open is.</p>';
}

/* ---------- Orders (alleen lezen) ----------
   Tabel ws_ls_orders bevat alleen orderkenmerken: geen namen, adressen, e-mail,
   telefoon of IP. Bewaartermijn 90 dagen; de sync ruimt oudere orders op. */
var LO={rij:null,tel:null,fout:"",laden:false,pagina:0,stap:50,filter:"alle"};
var LSTATUS={paid:"Betaald",not_paid:"Niet betaald",partially_paid:"Deels betaald",cancelled:"Geannuleerd",
 shipped:"Verzonden",not_shipped:"Niet verzonden",partially_shipped:"Deels verzonden",
 processing_awaiting_payment:"Wacht op betaling",processing_awaiting_shipment:"Wacht op verzending",
 processing_awaiting_pickup:"Wacht op afhalen",completed_shipped:"Afgerond · verzonden",completed_picked_up:"Afgerond · afgehaald",
 on_hold:"In de wacht"};
function lsStatus(s){if(!s)return"—";return LSTATUS[s]||String(s).replace(/_/g," ");}
function lsOrderFout(e){var m=(e&&(e.message||e.code))||"";return /ws_ls_orders|relation|does not exist|42P01|PGRST20/.test(m)?"inrichting":"laden";}
function loLaad(){
 if(LO.laden||!lsKlaar())return;LO.laden=true;LO.fout="";
 var van=LO.pagina*LO.stap,q=WS.sb.from("ws_ls_orders").select("ls_id,nummer,aangemaakt,status,betaalstatus,verzendstatus,bedrag_incl,land",{count:"exact"}).order("aangemaakt",{ascending:false}).range(van,van+LO.stap-1);
 if(LO.filter==="verzenden")q=q.or("verzendstatus.is.null,verzendstatus.neq.shipped").not("status","ilike","%cancel%");
 if(LO.filter==="betaling")q=q.or("betaalstatus.is.null,betaalstatus.neq.paid").not("status","ilike","%cancel%");
 q.then(function(r){LO.laden=false;if(r.error){LO.fout=lsOrderFout(r.error);}else{LO.rij=r.data||[];LO.tel=r.count;}wsHerteken();})
  .catch(function(){LO.laden=false;LO.fout="laden";wsHerteken();});
}
function loFilter(f){LO.filter=f;LO.pagina=0;LO.rij=null;loLaad();}
function loBlad(d){LO.pagina=Math.max(0,LO.pagina+d);LO.rij=null;loLaad();}
function lsInrichting(){
 return '<div class="sync-box"><b>Orders zijn nog niet ingericht</b><p>Voer eenmalig <code>ws_ls_orders_dashboard.sql</code> uit in de SQL Editor van Supabase. Daarna haal je hier de orders op.</p></div>';
}
function lsOrderKnoppen(){
 return '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:4px 0 16px">'
 +'<button class="btn btn-a btn-s" '+(LS.bezig?'disabled':'')+' onclick="lsDraai(\'volledig\',null,\'orders\')">'+(LS.bezig?'Bezig…':'Orders ophalen (90 dagen)')+'</button>'
 +'<button class="btn btn-g btn-s" '+(LS.bezig?'disabled':'')+' onclick="lsDraai(\'incrementeel\',null,\'orders\')">Alleen nieuwe en gewijzigde</button>'
 +'<button class="btn btn-g btn-s" '+(LS.bezig?'disabled':'')+' onclick="lsDraai(\'test\',null,\'orders\')">Test (250)</button></div>'
 +(LS.bezig&&LS.voortgang?'<div class="bouwband"><b>Ophalen loopt.</b> '+wsH(LS.voortgang)+'.</div>':'');
}
function vLsOrders(){
 var kop='<h3 style="font-size:20px;margin-bottom:6px">Orders</h3>';
 if(!lsKlaar())return kop+lsNietIngelogd();
 if(LO.rij===null&&!LO.fout){loLaad();return kop+'<p style="color:var(--muted)">Laden…</p>';}
 if(LO.fout==="inrichting")return kop+lsInrichting();
 var h=kop+'<p style="font-size:12.5px;color:var(--muted);margin-bottom:12px">Uit Lightspeed, alleen lezen. Laatste 90 dagen. Zonder klantnamen of adressen: die blijven in Lightspeed.</p>'+lsOrderKnoppen()
 +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'
 +[["alle","Alle"],["verzenden","Nog te verzenden"],["betaling","Niet betaald"]].map(function(f){return '<button class="bfil'+(LO.filter===f[0]?" aan":"")+'" onclick="loFilter(\''+f[0]+'\')">'+f[1]+'</button>';}).join("")+'</div>';
 if(LO.fout)return h+'<p class="wsfout">Laden mislukt.</p>';
 if(!LO.rij.length)return h+'<div class="sync-box"><b>Geen orders</b><p>'+(LO.filter==="alle"?'Haal de orders op met de knop hierboven.':'Geen orders in deze selectie.')+'</p></div>';
 h+='<table class="atable"><tr><th>Order</th><th>Datum</th><th>Bedrag</th><th>Betaling</th><th>Verzending</th><th>Land</th></tr>'
 +LO.rij.map(function(o){
  var bet=/paid/.test(o.betaalstatus||"")&&!/not|partial/.test(o.betaalstatus||""),verz=/^shipped$/.test(o.verzendstatus||"");
  return '<tr><td><b>'+wsH(o.nummer||String(o.ls_id))+'</b><br><span style="color:var(--muted);font-size:11.5px">'+wsH(lsStatus(o.status))+'</span></td>'
  +'<td>'+lsTijd(o.aangemaakt)+'</td><td>'+(o.bedrag_incl!=null?eur(+o.bedrag_incl):"—")+'</td>'
  +'<td><span class="st '+(bet?"ok":"warn")+'">'+wsH(lsStatus(o.betaalstatus))+'</span></td>'
  +'<td><span class="st '+(verz?"ok":"warn")+'">'+wsH(lsStatus(o.verzendstatus))+'</span></td>'
  +'<td>'+wsH((o.land||"—").toUpperCase())+'</td></tr>';}).join("")+'</table>';
 var max=Math.ceil((LO.tel||0)/LO.stap);
 if(max>1)h+='<div style="display:flex;gap:10px;align-items:center;margin-top:12px">'
  +'<button class="btn btn-g btn-s" '+(LO.pagina?'':'disabled')+' onclick="loBlad(-1)">← Vorige</button>'
  +'<span style="font-size:12.5px;color:var(--muted)">Pagina '+(LO.pagina+1)+' van '+max+' · '+lsNl(LO.tel)+' orders</span>'
  +'<button class="btn btn-g btn-s" '+(LO.pagina+1<max?'':'disabled')+' onclick="loBlad(1)">Volgende →</button></div>';
 return h;
}

/* ---------- Winkeldashboard ----------
   Alle cijfers komen uit ws_ls_dashboard() (Supabase, security invoker: alleen met toegang). */
var LD={d:null,fout:"",laden:false};
function ldLaad(){
 if(LD.laden||!lsKlaar())return;LD.laden=true;LD.fout="";
 WS.sb.rpc("ws_ls_dashboard").then(function(r){LD.laden=false;if(r.error)LD.fout=lsOrderFout(r.error);else LD.d=r.data||{};wsHerteken();})
  .catch(function(){LD.laden=false;LD.fout="laden";wsHerteken();});
}
function ldVernieuw(){LD.d=null;ldLaad();}
function ldGrafiek(rij){
 if(!rij||!rij.length)return "";
 var max=Math.max.apply(null,rij.map(function(x){return +x.omzet||0;}))||1,W=600,H=120,b=W/rij.length;
 var staven=rij.map(function(x,i){var h=Math.round((+x.omzet||0)/max*(H-18));var d=new Date(x.d);
  return '<rect x="'+(i*b+1).toFixed(1)+'" y="'+(H-h)+'" width="'+(b-2).toFixed(1)+'" height="'+h+'" rx="2" fill="var(--amber)" opacity="'+(i===rij.length-1?1:.55)+'"><title>'+d.toLocaleDateString("nl-NL",{weekday:"short",day:"numeric",month:"short"})+': '+eur(+x.omzet||0)+' · '+x.orders+' orders</title></rect>';}).join("");
 return '<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto;display:block" role="img" aria-label="Omzet per dag, laatste 30 dagen">'+staven+'</svg>'
 +'<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-top:4px"><span>30 dagen geleden</span><span>vandaag</span></div>';
}
function vLsDashboard(){
 var kop='<h3 style="font-size:20px;margin-bottom:6px">Winkeldashboard</h3>';
 if(!lsKlaar())return kop+lsNietIngelogd();
 if(LD.d===null&&!LD.fout){ldLaad();return kop+'<p style="color:var(--muted)">Laden…</p>';}
 if(LD.fout==="inrichting")return kop+lsInrichting();
 if(LD.fout)return kop+'<p class="wsfout">Laden mislukt.</p>';
 var d=LD.d,v=d.vandaag||{},g=d.gisteren||{},w=d.d7||{},m=d.d30||{},c=d.catalogus||{},s=d.sync||{};
 var geenOrders=!d.orders_totaal;
 var kpi=function(t,b,k){return '<div class="kpi"><span>'+t+'</span><b>'+b+'</b><small>'+k+'</small></div>';};
 return kop+'<p style="font-size:12.5px;color:var(--muted);margin-bottom:16px">Uit Lightspeed, alleen lezen. Bijgewerkt tot de laatste sync: catalogus '+lsTijd(s.catalogus)+' · orders '+lsTijd(s.orders)+'. <a href="javascript:ldVernieuw()" style="color:var(--amber)">Vernieuwen</a></p>'
 +(geenOrders?'<div class="sync-box"><b>Nog geen orders opgehaald</b><p>Omzet en orders verschijnen hier zodra je ze ophaalt onder <a href="#/admin/orders" style="color:var(--amber)">Orders</a>.</p></div>':
  '<div class="kpis">'+kpi("Omzet vandaag",eur(+v.omzet||0),lsNl(v.orders)+" orders · gisteren "+eur(+g.omzet||0))
  +kpi("Omzet 7 dagen",eur(+w.omzet||0),lsNl(w.orders)+" orders")
  +kpi("Omzet 30 dagen",eur(+m.omzet||0),lsNl(m.orders)+" orders")
  +kpi("Gem. orderwaarde",eur(+m.gem||0),"laatste 30 dagen")+'</div>'
  +'<div class="sync-box"><b style="font-size:15px">Omzet per dag</b><div style="margin-top:10px">'+ldGrafiek(d.per_dag)+'</div></div>'
  +'<div class="kpis">'+kpi("Nog te verzenden",lsNl(d.te_verzenden),'<a href="#/admin/orders" onclick="LO.filter=\'verzenden\';LO.rij=null" style="color:inherit">bekijk orders →</a>')
  +kpi("Niet betaald",lsNl(d.niet_betaald),'<a href="#/admin/orders" onclick="LO.filter=\'betaling\';LO.rij=null" style="color:inherit">bekijk orders →</a>')+'</div>')
 +'<h3 style="font-size:16px;margin:8px 0 10px">Catalogus</h3>'
 +'<div class="kpis">'+kpi("Producten",lsNl(c.producten),'<a href="#/admin/producten" style="color:inherit">bekijk →</a>')
 +kpi("Zichtbaar in de winkel",lsNl(c.zichtbaar),c.producten?Math.round(c.zichtbaar/c.producten*100)+"% van alles":"")
 +kpi("Uitverkocht",lsNl(c.uitverkocht),"varianten met voorraad 0")+'</div>'
 +'<p style="font-size:12px;color:var(--muted)">Omzet is inclusief btw en zonder geannuleerde orders. Niets hiervan wordt in Lightspeed gewijzigd.</p>';
}
