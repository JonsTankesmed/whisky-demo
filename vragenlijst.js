/* Vragenlijsten in de beheeromgeving: Beoordelen en Hiatenlijst.
   Opslag in Supabase (project TankeSmed-Web, tabel ws_antwoorden). Alleen accounts
   in ws_toegang kunnen lezen en schrijven; dat regelt de database zelf (RLS).
   De sleutel hieronder is de publieke 'publishable' sleutel: die mag in de browser
   staan en geeft zonder login geen toegang tot iets. Geen geheimen in dit bestand. */
var WS={
 url:"https://fbtsezpjutzhvjodexpa.supabase.co",
 sleutel:"sb_publishable_RFNsxnzhA7Pi4f1uo7LigQ_xf1z8sri",
 sb:null,gebruiker:null,naam:"",ant:{},verw:{},geladen:false,fout:"",bezig:false,
 laatst:{}          /* laatst opgeslagen stand per beoordeel-id, om alleen wijzigingen te sturen */
};
/* Turf- en vatvragen gebruikten het kale product-id als sleutel; bij 19 flessen hebben
   beide dezelfde, zodat het ene besluit het andere overschreef. Daarom krijgen ze hier een
   eigen sleutel ("turf:…" / "vat:…"). Oude lokale besluiten onder het kale id gaan mee naar
   de nieuwe sleutel(s); bij een dubbel id naar beide, precies zoals het scherm ze toonde. */
(function(){
 if(typeof BEOORDELING==="undefined")return;
 var naar={};
 BEOORDELING.items.forEach(function(x){
  if((x.k==="turf"||x.k==="vat")&&x.id.indexOf(":")<0){var n=x.k+":"+x.id;(naar[x.id]=naar[x.id]||[]).push(n);x.pid=x.pid||x.id;x.id=n;}
 });
 try{
  var b=JSON.parse(localStorage.getItem("wsbeoordeling")||"{}"),gewijzigd=false;
  Object.keys(b).forEach(function(k){if(naar[k]){naar[k].forEach(function(n){if(!b[n])b[n]=b[k];});delete b[k];gewijzigd=true;}});
  if(gewijzigd)localStorage.setItem("wsbeoordeling",JSON.stringify(b));
 }catch(e){}
})();
function wsH(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}

function wsStart(){
 if(WS.sb||typeof supabase==="undefined")return;
 WS.sb=supabase.createClient(WS.url,WS.sleutel,{auth:{persistSession:true,autoRefreshToken:true,storageKey:"ws-vragenlijst"}});
 WS.sb.auth.getSession().then(function(r){wsNaLogin(r.data&&r.data.session);});
 WS.sb.auth.onAuthStateChange(function(ev,sessie){if(ev==="SIGNED_OUT"){WS.gebruiker=null;WS.ant={};WS.geladen=false;wsHerteken();}});
}
function wsNaLogin(sessie){
 WS.gebruiker=sessie?sessie.user:null;
 if(!WS.gebruiker){wsHerteken();return;}
 WS.sb.from("ws_toegang").select("naam,rol").eq("user_id",WS.gebruiker.id).maybeSingle().then(function(t){
  if(!t.data){WS.fout="Dit account heeft (nog) geen toegang tot de vragenlijsten.";wsHerteken();return;}
  WS.naam=t.data.naam;WS.fout="";wsLaad();
 });
}
function wsLaad(){
 /* Supabase geeft standaard maximaal 1.000 rijen per verzoek; daarom in blokken. */
 var alle=[],stap=1000;
 function blok(v){
  return WS.sb.from("ws_antwoorden").select("vraag_id,lijst,oordeel,antwoord,bron,waarde,bijgewerkt_op").order("vraag_id").range(v,v+stap-1).then(function(r){
   if(r.error)throw r.error;
   alle=alle.concat(r.data||[]);
   if((r.data||[]).length===stap)return blok(v+stap);
  });
 }
 blok(0).then(function(){
  WS.ant={};alle.forEach(function(a){WS.ant[a.lijst+"|"+a.vraag_id]=a;});
  return wsLaadVerwerkt();
 }).then(function(){
  WS.geladen=true;wsMengBeoordeling();wsHerteken();
 }).catch(function(e){WS.fout="Laden mislukt: "+(e.message||e);wsHerteken();});
}
/* Terugkoppeling uit de kennisbank: per antwoord 'gezien' of 'verwerkt' (tabel ws_verwerkt,
   alleen lezen). Mislukt dit, dan werkt de rest gewoon door. */
function wsLaadVerwerkt(){
 var stap=1000,v={};
 function blok(van){
  return WS.sb.from("ws_verwerkt").select("vraag_id,versie,status,notitie,verwerkt_op").range(van,van+stap-1).then(function(r){
   if(r.error)throw r.error;(r.data||[]).forEach(function(x){v[x.vraag_id]=x;});
   if((r.data||[]).length===stap)return blok(van+stap);
  });
 }
 return blok(0).then(function(){WS.verw=v;}).catch(function(e){console.warn("ws_verwerkt",e);WS.verw={};});
}
/* Status van één antwoord: null (geen antwoord), 'nieuw', 'gezien' of 'verwerkt'. */
function wsVerwStatus(lijst,id){
 var a=WS.ant[lijst+"|"+id];if(!a)return null;
 var v=WS.verw[id];
 if(!v||(a.bijgewerkt_op&&new Date(a.bijgewerkt_op)>new Date(v.versie)))return {s:"nieuw"};
 return {s:v.status,n:v.notitie,op:v.verwerkt_op};
}
function wsTelVerwerkt(lijst){
 var t={nieuw:0,gezien:0,verwerkt:0,totaal:0};
 Object.keys(WS.ant).forEach(function(k){var a=WS.ant[k];if(a.lijst!==lijst)return;t.totaal++;var s=wsVerwStatus(lijst,a.vraag_id);if(s){t[s.s==="vraag terug"?"gezien":s.s]++;}});
 return t;
}
function wsVerwLabel(st){
 if(!st)return "";
 var d=st.op?String(st.op).slice(8,10)+"-"+String(st.op).slice(5,7):"";
 if(st.s==="nieuw")return '<span class="wsv nieuw" title="Opgeslagen; de kennisbank haalt het bij de volgende ronde op (09:51, 13:51 of 17:51)">Opgeslagen · nog niet opgehaald</span>';
 if(st.s==="gezien")return '<span class="wsv gezien" title="'+wsH(st.n||"")+'">Ontvangen '+d+' · wordt verwerkt</span>';
 if(st.s==="vraag terug")return '<span class="wsv terug">Wij hebben een vervolgvraag: '+wsH(st.n||"")+'</span>';
 return '<span class="wsv verwerkt">Verwerkt '+d+(st.n?' · '+wsH(st.n):'')+'</span>';
}
function wsHerteken(){if(typeof route==="function"&&route().r==="admin"&&typeof render==="function")render();}
function wsLogin(){
 var e=document.getElementById("wsmail").value.trim(),p=document.getElementById("wsww").value;
 if(!e||!p){toast("Vul e-mail en wachtwoord in.");return;}
 WS.bezig=true;wsHerteken();
 WS.sb.auth.signInWithPassword({email:e,password:p}).then(function(r){
  WS.bezig=false;
  if(r.error){WS.fout="Inloggen mislukt. Controleer e-mail en wachtwoord.";wsHerteken();return;}
  wsNaLogin(r.data.session);
 });
}
function wsUit(){if(WS.sb)WS.sb.auth.signOut();}
function wsLoginBlok(doel){
 if(!WS.sb)return '<div class="sync-box"><b>Opslaan niet beschikbaar</b><p>De verbinding met de opslag kon niet worden geladen. Ververs de pagina.</p></div>';
 return '<div class="wslogin"><b>Log in om '+doel+'</b>'
  +'<p>Je antwoorden worden dan veilig bewaard, op elk apparaat. Zonder login kun je meekijken maar niets opslaan.</p>'
  +(WS.fout?'<p class="wsfout">'+wsH(WS.fout)+'</p>':'')
  +'<div class="wsvelden"><input id="wsmail" type="email" autocomplete="username" placeholder="E-mailadres">'
  +'<input id="wsww" type="password" autocomplete="current-password" placeholder="Wachtwoord" onkeydown="if(event.key===\'Enter\')wsLogin()">'
  +'<button class="btn btn-a btn-s" onclick="wsLogin()"'+(WS.bezig?' disabled':'')+'>'+(WS.bezig?'Bezig…':'Inloggen')+'</button></div></div>';
}
function wsStatusRegel(lijst){
 if(!WS.gebruiker)return "";
 return '<p class="wsstatus">Ingelogd als <b>'+wsH(WS.naam||WS.gebruiker.email)+'</b> · antwoorden worden direct opgeslagen · <a href="javascript:wsUit()">uitloggen</a></p>'
  +(lijst?wsVerwOverzicht(lijst):'');
}
function wsVerwOverzicht(lijst){
 var t=wsTelVerwerkt(lijst);if(!t.totaal)return "";
 return '<p class="wsstatus" style="margin-top:-6px">In de kennisbank: <b>'+t.verwerkt+'</b> verwerkt · <b>'+t.gezien+'</b> ontvangen en in behandeling · <b>'+t.nieuw+'</b> nog niet opgehaald (ophalen om 09:51, 13:51 en 17:51)</p>';
}
function wsKanOpslaan(){return !!(WS.gebruiker&&WS.geladen&&!WS.fout);}

/* ---------- Beoordelen: de bestaande besluiten (BSLT) gaan mee naar de opslag ---------- */
function wsOordeelVan(e){
 if(!e||e.w==null)return null;
 var w=e.w;
 if(w==="ja")return "akkoord";
 if(w==="nee")return "afgekeurd";
 if(w==="onbekend")return "weet niet";
 return "bijgesteld";
}
function wsMengBeoordeling(){
 if(typeof BSLT==="undefined")return;
 var lokaalAlleen=[];
 /* Wat op de server staat is leidend; lokaal werk dat er nog niet staat, gaat alsnog mee. */
 Object.keys(BSLT).forEach(function(id){if(!WS.ant["beoordelen|"+id])lokaalAlleen.push(id);});
 Object.keys(WS.ant).forEach(function(k){
  var a=WS.ant[k];if(a.lijst!=="beoordelen")return;
  if(a.waarde&&a.waarde.w!=null)BSLT[a.vraag_id]=a.waarde; else delete BSLT[a.vraag_id];
 });
 WS.laatst={};Object.keys(BSLT).forEach(function(id){WS.laatst[id]=JSON.stringify(BSLT[id]);});
 lokaalAlleen.forEach(function(id){delete WS.laatst[id];});
 try{localStorage.setItem("wsbeoordeling",JSON.stringify(BSLT));}catch(e){}
 if(lokaalAlleen.length)wsSyncBeoordeling();
}
var wsSyncTimer=null;
function wsSyncBeoordeling(){
 if(!wsKanOpslaan()||typeof BSLT==="undefined")return;
 clearTimeout(wsSyncTimer);
 wsSyncTimer=setTimeout(function(){
  var rijen=[],ids={};
  Object.keys(BSLT).forEach(function(id){ids[id]=1;});
  Object.keys(WS.laatst).forEach(function(id){ids[id]=1;});
  Object.keys(ids).forEach(function(id){
   var nu=BSLT[id]?JSON.stringify(BSLT[id]):null;
   if(nu===(WS.laatst[id]||null))return;
   var it=(typeof BEOORDELING!=="undefined")?BEOORDELING.items.filter(function(x){return x.id===id;})[0]:null;
   rijen.push({vraag_id:id,lijst:"beoordelen",oordeel:wsOordeelVan(BSLT[id]),
    vraag_tekst:it?((it.k||"")+": "+(it.titel||it.pid||"")).slice(0,4000):null,
    waarde:BSLT[id]||null});
  });
  if(!rijen.length)return;
  var blokken=[];for(var i=0;i<rijen.length;i+=500)blokken.push(rijen.slice(i,i+500));
  blokken.reduce(function(p,b){return p.then(function(){return WS.sb.from("ws_antwoorden").upsert(b,{onConflict:"vraag_id"}).then(function(r){if(r.error)throw r.error;});});},Promise.resolve())
  .then(function(){rijen.forEach(function(r){if(r.waarde)WS.laatst[r.vraag_id]=JSON.stringify(r.waarde);else delete WS.laatst[r.vraag_id];});toast("Opgeslagen ("+rijen.length+")");})
  .catch(function(e){toast("Opslaan mislukt — je werk staat nog in deze browser. Probeer het zo opnieuw.");console.warn(e);});
 },600);
}

/* ---------- Vragen voor Jack (voorheen: Hiatenlijst) ----------
   HIATEN komt uit hiaten.js en wordt gemaakt uit 'Vragen voor Jack.json' in de kennisbank.
   Per vraag: id, c (thema), t (titel), v (de vraag), k (wat we weten), opties (keuzes of null = open vraag).
   Een gekozen optie staat in waarde.keuze; 'Weet ik niet' en 'Overslaan' in oordeel. */
var HF={status:"open",cat:"",net:{}}; /* net: in deze sessie beantwoord; blijft zichtbaar tot een ander filter */
function hFilter(k,v){HF[k]=v;HF.net={};render();}
function hAnt(id){return WS.ant["hiaten|"+id]||null;}
function hKeuze(a){return a&&a.waarde&&a.waarde.keuze?a.waarde.keuze:null;}
function hBewaar(id,oordeel,keuzeNr){
 if(!wsKanOpslaan()){toast("Log eerst in om op te slaan.");return;}
 var it=HIATEN.items.filter(function(x){return x.id===id;})[0];if(!it)return;
 var ta=document.getElementById("ha-"+id),bi=document.getElementById("hb-"+id);
 var huidig=hAnt(id)||{},keuze=hKeuze(huidig),o=huidig.oordeel||null;
 if(keuzeNr!==undefined){var nk=(it.opties||[])[keuzeNr];keuze=(keuze===nk)?null:nk;if(keuze)o=null;}
 else if(oordeel!==undefined){o=(o===oordeel)?null:oordeel;if(o)keuze=null;}
 var rij={vraag_id:id,lijst:"hiaten",oordeel:o,
  antwoord:ta?ta.value.trim().slice(0,4000):(huidig.antwoord||null),
  bron:bi?bi.value.trim().slice(0,1000):(huidig.bron||null),
  vraag_tekst:(it.t+" — "+it.v).slice(0,4000),
  waarde:{thema:it.c,keuze:keuze}};
 WS.sb.from("ws_antwoorden").upsert(rij,{onConflict:"vraag_id"}).select().then(function(r){
  if(r.error){toast("Opslaan mislukt. Probeer het opnieuw.");console.warn(r.error);return;}
  WS.ant["hiaten|"+id]=r.data&&r.data[0]?r.data[0]:rij;HF.net[id]=1;toast("Opgeslagen");render();
 });
}
function hIsBeantwoord(a){return !!(a&&(a.oordeel||hKeuze(a)||(a.antwoord&&a.antwoord.length)));}
function vAdminHiaten(){
 if(typeof HIATEN==="undefined")return '<h3 style="font-size:20px">Vragen voor Jack</h3><p style="color:var(--muted)">De vragen zijn niet geladen.</p>';
 var alle=HIATEN.items;
 var gedaan=alle.filter(function(x){return hIsBeantwoord(hAnt(x.id));}).length;
 var cats=[];alle.forEach(function(x){if(cats.indexOf(x.c)<0)cats.push(x.c);});
 var lijst=alle.filter(function(x){
  if(HF.cat&&x.c!==HF.cat)return false;
  var b=hIsBeantwoord(hAnt(x.id));
  if(HF.status==="open"&&b&&!HF.net[x.id])return false;
  if(HF.status==="gedaan"&&!b)return false;
  return true;
 });
 var kan=wsKanOpslaan(),dis=kan?'':' disabled',vorige="",nr=0;
 var rijen=lijst.map(function(x){
  var a=hAnt(x.id)||{},kz=hKeuze(a);nr=alle.indexOf(x)+1;
  var kop=(x.c!==vorige)?'<h4 class="hthema">'+wsH(x.c)+'</h4>':"";vorige=x.c;
  var knop=function(aan,l,js,kl){return '<button class="bbtn'+(aan?" aan "+(kl||"ja"):"")+'"'+dis+' onclick="'+js+'">'+wsH(l)+'</button>';};
  var opties=(x.opties||[]).filter(function(o){return o!=="Weet ik niet";});
  var knoppen=opties.map(function(o,i){return knop(kz===o,o,"hBewaar('"+x.id+"',undefined,"+(x.opties.indexOf(o))+")");}).join("")
   +knop(a.oordeel==="weet niet","Weet ik niet","hBewaar('"+x.id+"','weet niet')","")
   +knop(a.oordeel==="overslaan","Sla over","hBewaar('"+x.id+"','overslaan')","");
  return kop+'<div class="hrij'+(hIsBeantwoord(a)?" af":"")+'">'
   +'<div class="hkop"><span class="hnr">'+nr+'</span><b>'+wsH(x.t)+'</b></div>'
   +'<div class="hvraag">'+wsH(x.v)+'</div>'
   +(x.k&&x.k.length?'<ul class="hweet"><li class="hwkop">Wat we nu weten:</li>'+x.k.map(function(s){return '<li>'+wsH(s)+'</li>';}).join("")+'</ul>':'')
   +(x.vb&&x.vb.length?'<div style="display:grid;gap:10px;margin:0 0 12px;max-width:90ch">'+x.vb.map(function(v){return '<div style="border:1px solid var(--line);border-radius:8px;padding:10px 14px'+(v.nu?';background:rgba(0,0,0,.04)':'')+'">'+'<div style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px">'+wsH(v.l)+'</div>'+String(v.x||'').split('\n').map(function(r){return r?'<p style="font-size:14px;line-height:1.55;margin:0 0 6px">'+wsH(r)+'</p>':'';}).join('')+'</div>';}).join('')+'</div>':'')
   +'<div class="hkeuze">'+knoppen+'</div>'
   +'<div class="hvelden"><textarea id="ha-'+x.id+'" rows="2" maxlength="4000" placeholder="'+(x.opties?'Toelichting (optioneel)':'Jouw antwoord')+'"'+dis+'>'+wsH(a.antwoord||"")+'</textarea>'
   +'<input id="hb-'+x.id+'" maxlength="1000" placeholder="Bron of link (optioneel)" value="'+wsH(a.bron||"")+'"'+dis+'>'
   +'<button class="btn btn-g btn-s"'+dis+' onclick="hBewaar(\''+x.id+'\')">Bewaar tekst</button>'
   +(a.bijgewerkt_op?'<span class="bstatus">'+wsH(String(a.bijgewerkt_op).slice(0,16).replace("T"," "))+'</span>':'')+'</div>'
   +wsVerwLabel(wsVerwStatus("hiaten",x.id))+'</div>';
 }).join("");
 return '<h3 style="font-size:20px;margin-bottom:6px">Vragen voor Jack</h3>'
 +'<p style="font-size:12.5px;color:var(--muted);margin-bottom:14px;max-width:72ch">'+wsH(HIATEN.toelichting||"")+' Kies een antwoord of typ het in; alles wordt direct bewaard en je kunt later verder. Stand: '+wsH(HIATEN.gemaakt)+'.</p>'
 +(WS.gebruiker?wsStatusRegel("hiaten"):wsLoginBlok("de vragen in te vullen"))
 +(WS.gebruiker&&WS.fout?'<p class="wsfout">'+wsH(WS.fout)+'</p>':'')
 +'<div class="bvoortgang"><div style="width:'+Math.round(gedaan/alle.length*100)+'%"></div></div>'
 +'<p style="font-size:12.5px;color:var(--muted);margin:8px 0 16px"><b>'+gedaan+'</b> van '+alle.length+' vragen beantwoord</p>'
 +'<div class="bfilters">'
 +[["open","Nog open"],["gedaan","Beantwoord"],["alle","Alle"]].map(function(f){return '<button class="bfil'+(HF.status===f[0]?" aan":"")+'" onclick="hFilter(\'status\',\''+f[0]+'\')">'+f[1]+'</button>';}).join("")
 +'<select class="hsel" onchange="hFilter(\'cat\',this.value)"><option value="">Alle thema\'s</option>'+cats.map(function(c){return '<option'+(HF.cat===c?' selected':'')+' value="'+wsH(c)+'">'+wsH(c)+'</option>';}).join("")+'</select>'
 +'</div>'
 +(rijen||'<p style="color:var(--muted);padding:20px 0">'+(HF.status==="open"&&gedaan===alle.length?'Alle vragen zijn beantwoord. Dank je!':'Niets in deze selectie.')+'</p>');
}
document.addEventListener("DOMContentLoaded",function(){try{wsStart();}catch(e){console.warn(e);}});
