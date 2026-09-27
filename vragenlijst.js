/* Vragenlijsten in de beheeromgeving: Beoordelen en Hiatenlijst.
   Opslag in Supabase (project TankeSmed-Web, tabel ws_antwoorden). Alleen accounts
   in ws_toegang kunnen lezen en schrijven; dat regelt de database zelf (RLS).
   De sleutel hieronder is de publieke 'publishable' sleutel: die mag in de browser
   staan en geeft zonder login geen toegang tot iets. Geen geheimen in dit bestand. */
var WS={
 url:"https://fbtsezpjutzhvjodexpa.supabase.co",
 sleutel:"sb_publishable_RFNsxnzhA7Pi4f1uo7LigQ_xf1z8sri",
 sb:null,gebruiker:null,naam:"",ant:{},geladen:false,fout:"",bezig:false,
 laatst:{}          /* laatst opgeslagen stand per beoordeel-id, om alleen wijzigingen te sturen */
};
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
  wsMengBeoordeling();WS.geladen=true;wsHerteken();
 }).catch(function(e){WS.fout="Laden mislukt: "+(e.message||e);wsHerteken();});
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
function wsStatusRegel(){
 if(!WS.gebruiker)return "";
 return '<p class="wsstatus">Ingelogd als <b>'+wsH(WS.naam||WS.gebruiker.email)+'</b> · antwoorden worden direct opgeslagen · <a href="javascript:wsUit()">uitloggen</a></p>';
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

/* ---------- Hiatenlijst ---------- */
var HF={prio:"Ja",status:"open",cat:"",zoek:"",toon:40,net:{}}; /* net: in deze sessie beantwoord; blijft zichtbaar tot een ander filter */
function hFilter(k,v){HF[k]=v;HF.net={};if(k!=="toon")HF.toon=40;render();}
function hAnt(id){return WS.ant["hiaten|"+id]||null;}
function hBewaar(id,oordeel){
 if(!wsKanOpslaan()){toast("Log eerst in om op te slaan.");return;}
 var it=HIATEN.items.filter(function(x){return x.id===id;})[0];if(!it)return;
 var ta=document.getElementById("ha-"+id),bi=document.getElementById("hb-"+id);
 var huidig=hAnt(id)||{};
 var rij={vraag_id:id,lijst:"hiaten",
  oordeel:oordeel===undefined?(huidig.oordeel||null):(huidig.oordeel===oordeel?null:oordeel),
  antwoord:ta?ta.value.trim().slice(0,4000):(huidig.antwoord||null),
  bron:bi?bi.value.trim().slice(0,1000):(huidig.bron||null),
  vraag_tekst:(it.o+" — "+it.v).slice(0,4000),
  waarde:{categorie:it.c,soort:it.s}};
 WS.sb.from("ws_antwoorden").upsert(rij,{onConflict:"vraag_id"}).select().then(function(r){
  if(r.error){toast("Opslaan mislukt. Probeer het opnieuw.");console.warn(r.error);return;}
  WS.ant["hiaten|"+id]=r.data&&r.data[0]?r.data[0]:rij;HF.net[id]=1;toast("Opgeslagen");render();
 });
}
function hIsBeantwoord(a){return !!(a&&(a.oordeel||(a.antwoord&&a.antwoord.length)));}
function vAdminHiaten(){
 if(typeof HIATEN==="undefined")return '<h3 style="font-size:20px">Hiatenlijst</h3><p style="color:var(--muted)">De hiatenlijst is niet geladen.</p>';
 var alle=HIATEN.items;
 var gedaan=alle.filter(function(x){return hIsBeantwoord(hAnt(x.id));}).length;
 var cats=[];alle.forEach(function(x){if(cats.indexOf(x.c)<0)cats.push(x.c);});
 var z=HF.zoek.toLowerCase();
 var lijst=alle.filter(function(x){
  if(HF.prio&&x.p!==HF.prio)return false;
  if(HF.cat&&x.c!==HF.cat)return false;
  var b=hIsBeantwoord(hAnt(x.id));
  if(HF.status==="open"&&b&&!HF.net[x.id])return false;
  if(HF.status==="gedaan"&&!b)return false;
  if(z&&(x.o+" "+x.v).toLowerCase().indexOf(z)<0)return false;
  return true;
 });
 var tel=function(p){return alle.filter(function(x){return x.p===p;}).length;};
 var kleur={"Bronconflict":"#FCE4D6","Claim/legende":"#FFF2CC","Onzeker":"#E2EFDA","Ontbreekt":"transparent"};
 var kan=wsKanOpslaan();
 var rijen=lijst.slice(0,HF.toon).map(function(x){
  var a=hAnt(x.id)||{};
  var k=function(o,l,kl){return '<button class="bbtn'+(a.oordeel===o?" aan "+(kl||""):"")+'"'+(kan?'':' disabled')+' onclick="hBewaar(\''+x.id+'\',\''+o+'\')">'+l+'</button>';};
  return '<div class="hrij'+(hIsBeantwoord(a)?" af":"")+'">'
   +'<div class="hkop"><span class="hsoort" style="background:'+kleur[x.s]+'">'+wsH(x.s)+'</span>'
   +'<span class="hcat">'+wsH(x.c)+' · <b>'+wsH(x.o)+'</b></span></div>'
   +'<div class="hvraag">'+wsH(x.v)+'</div>'
   +'<div class="hkeuze">'+k("klopt","Klopt","ja")+k("klopt niet","Klopt niet","nee")+k("weet niet","Weet ik niet")+k("overslaan","Overslaan")+'</div>'
   +'<div class="hvelden"><textarea id="ha-'+x.id+'" rows="2" maxlength="4000" placeholder="Wat weet jij hierover? (juiste waarde, correctie, aanvulling)"'+(kan?'':' disabled')+'>'+wsH(a.antwoord||"")+'</textarea>'
   +'<input id="hb-'+x.id+'" maxlength="1000" placeholder="Bron of toelichting (optioneel)" value="'+wsH(a.bron||"")+'"'+(kan?'':' disabled')+'>'
   +'<button class="btn btn-g btn-s"'+(kan?'':' disabled')+' onclick="hBewaar(\''+x.id+'\')">Bewaar tekst</button>'
   +(a.bijgewerkt_op?'<span class="bstatus">'+wsH(String(a.bijgewerkt_op).slice(0,16).replace("T"," "))+'</span>':'')+'</div></div>';
 }).join("");
 return '<h3 style="font-size:20px;margin-bottom:6px">Hiatenlijst</h3>'
 +'<p style="font-size:12.5px;color:var(--muted);margin-bottom:14px;max-width:72ch">Open punten uit de whiskykennisbank achter de site: wat nog ontbreekt, waar bronnen elkaar tegenspreken en wat alleen de producent beweert. Vul in waar je iets weet — in je eigen tempo; alles wordt bewaard en je kunt altijd verder waar je gebleven was. Een punt zonder antwoord is geen probleem. Stand van de lijst: '+wsH(HIATEN.gemaakt)+'.</p>'
 +(WS.gebruiker?wsStatusRegel():wsLoginBlok("de hiatenlijst in te vullen"))
 +(WS.gebruiker&&WS.fout?'<p class="wsfout">'+wsH(WS.fout)+'</p>':'')
 +'<div class="bvoortgang"><div style="width:'+Math.round(gedaan/alle.length*100)+'%"></div></div>'
 +'<p style="font-size:12.5px;color:var(--muted);margin:8px 0 16px"><b>'+gedaan+'</b> van '+alle.length+' punten beantwoord</p>'
 +'<div class="bfilters">'
 +[["Ja","Belangrijkst ("+tel("Ja")+")"],["Misschien","Misschien ("+tel("Misschien")+")"],["Nee","Eigen onderzoek ("+tel("Nee")+")"],["","Alles ("+alle.length+")"]]
   .map(function(f){return '<button class="bfil'+(HF.prio===f[0]?" aan":"")+'" onclick="hFilter(\'prio\',\''+f[0]+'\')">'+f[1]+'</button>';}).join("")
 +'</div><div class="bfilters">'
 +[["open","Nog open"],["gedaan","Beantwoord"],["alle","Alle"]].map(function(f){return '<button class="bfil'+(HF.status===f[0]?" aan":"")+'" onclick="hFilter(\'status\',\''+f[0]+'\')">'+f[1]+'</button>';}).join("")
 +'<select class="hsel" onchange="hFilter(\'cat\',this.value)"><option value="">Alle onderwerpen</option>'+cats.map(function(c){return '<option'+(HF.cat===c?' selected':'')+' value="'+wsH(c)+'">'+wsH(c)+'</option>';}).join("")+'</select>'
 +'<input class="hzoek" data-fk="hzoek" placeholder="Zoek…" value="'+wsH(HF.zoek)+'" oninput="HF.zoek=this.value;clearTimeout(window._hz);window._hz=setTimeout(function(){HF.toon=40;render();},300)">'
 +'</div>'
 +(rijen||'<p style="color:var(--muted);padding:20px 0">Niets in deze selectie.</p>')
 +(lijst.length>HF.toon?'<p style="padding:14px 0"><button class="btn btn-g btn-s" onclick="hFilter(\'toon\','+(HF.toon+40)+')">Toon meer ('+(lijst.length-HF.toon)+' over)</button></p>':'');
}
document.addEventListener("DOMContentLoaded",function(){try{wsStart();}catch(e){console.warn(e);}});
