/* Lightspeed-koppeling in de beheeromgeving: Producten en Lightspeed-sync.
   Leest uit Supabase (tabellen ws_ls_producten, ws_ls_varianten, ws_ls_sync_log).
   Alleen accounts in ws_toegang kunnen lezen (RLS). De Lightspeed-sleutel staat
   uitsluitend server-side in de Edge Function ws-ls-sync; nooit in dit bestand.
   De sync doet alleen GET-verzoeken: er wordt niets in Lightspeed gewijzigd. */
var LS={prod:null,log:null,tel:null,laden:false,fout:"",zoek:"",pagina:0,bezig:false,stap:50};
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
function lsDraai(soort){
 if(LS.bezig||!lsKlaar())return;LS.bezig=true;wsHerteken();
 WS.sb.functions.invoke("ws-ls-sync",{body:{soort:soort}}).then(function(r){
  LS.bezig=false;
  var d=r.data||{};
  if(r.error||d.status!=="ok")toast("Sync mislukt"+(d.melding?": "+d.melding:""));
  else toast("Sync klaar: "+lsNl(d.producten)+" producten, "+lsNl(d.varianten)+" varianten");
  lsVernieuw();
 }).catch(function(){LS.bezig=false;toast("Sync mislukt");lsVernieuw();});
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
 +(LS.fout?'<p class="wsfout">'+wsH(LS.fout)+'</p>':'')
 +(log.length?'<table class="atable"><tr><th>Gestart</th><th>Soort</th><th>Producten</th><th>Varianten</th><th>Status</th></tr>'
  +log.map(function(l){return '<tr><td>'+lsTijd(l.gestart_op)+'</td><td>'+l.soort+'</td><td>'+lsNl(l.producten_bijgewerkt)+'</td><td>'+lsNl(l.varianten_bijgewerkt)+'</td>'
  +'<td><span class="st '+(l.status==="ok"?"ok":"warn")+'" title="'+wsH(l.melding||"")+'">'+(l.status==="ok"?"OK":l.status==="bezig"?"Bezig":"Fout")+'</span></td></tr>';}).join("")+'</table>':'')
 +'<p style="font-size:12px;color:var(--muted);margin-top:12px">De sync leest producten, prijzen en voorraad. Er wordt niets in Lightspeed gewijzigd.</p>';
}
