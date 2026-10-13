/* ================= ACTIES EN BANNERS =================
   Opslag in Supabase: ws_acties, ws_actie_producten, ws_actie_log (zie supabase/ws_acties.sql).
   Bezoekers lezen alleen lopende acties (de database filtert op datum, Nederlandse tijd).
   Beheer (ingelogd, in ws_toegang) leest en schrijft alles; elke wijziging komt in het logboek.
   Prijzen en kortingen komen uit Lightspeed; deze site rekent niets uit en zet niets in Lightspeed.
   Controles vóór opslaan: Alcoholwet art. 2a (max. 25% korting, ook als indruk), van-prijs
   (laagste prijs van de afgelopen 30 dagen), beeldrechten, looptijd en leverbaarheid.
   Alleen de publieke sleutel van Supabase wordt gebruikt (WS uit vragenlijst.js). */
var AC={lijst:[],prod:{},geladen:false,fout:"",tabel:true,edit:null,ctrl:null,ctrlBezig:false,bewaar:false,regelCache:{}};
var AC_PLEK={balk:"Mededelingenbalk",hoofd:"Hoofdactie",tegel:"Tegel",label:"Label op product"};
var AC_MAX_KORTING=25;

var AC_IDX=null;
function acP(id){if(!AC_IDX||AC_IDX._n!==CAT.length){AC_IDX={_n:CAT.length};CAT.forEach(function(p){AC_IDX[String(p.id)]=p;});}return AC_IDX[String(id)]||null;}
function acVandaag(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Amsterdam"}).format(new Date());}
function acLoopt(a){var d=acVandaag();return !a.ingetrokken&&a.markt==="NL"&&a.van<=d&&d<=a.tot;}
function acStatus(a){var d=acVandaag();if(a.ingetrokken)return ["Ingetrokken","warn"];if(d<a.van)return ["Ingepland","bouw"];if(d>a.tot)return ["Verlopen","warn"];return ["Live","ok"];}
function acDatum(d){if(!d)return "";var m=["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"],x=d.split("-");return (+x[2])+" "+m[+x[1]-1];}
function acBeheer(){return typeof WS!=="undefined"&&WS.gebruiker&&WS.geladen&&!WS.fout;}
function acSlug(t){return String(t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60)||"actie";}

/* ---------- laden ---------- */
function acLaad(){
 if(typeof WS==="undefined"||!WS.sb)return;
 var acties,prod=[];
 WS.sb.from("ws_acties").select("*").order("van",{ascending:false}).then(function(r){
  if(r.error){AC.tabel=!/does not exist|relation|schema cache/i.test(r.error.message||"");AC.fout=AC.tabel?"Acties laden mislukt.":"";throw r.error;}
  acties=r.data||[];
  function blok(v){return WS.sb.from("ws_actie_producten").select("actie_id,product_id").range(v,v+999).then(function(q){
   if(q.error)throw q.error;prod=prod.concat(q.data||[]);if((q.data||[]).length===1000)return blok(v+1000);});}
  return blok(0);
 }).then(function(){
  AC.lijst=acties;AC.prod={};AC.regelCache={};AC.tabel=true;AC.fout="";
  prod.forEach(function(x){(AC.prod[x.actie_id]=AC.prod[x.actie_id]||new Set()).add(String(x.product_id));});
  acIngang();AC.geladen=true;if(typeof render==="function")render();
 }).catch(function(e){AC.geladen=true;console.warn("acties",e&&e.message);if(typeof render==="function")render();});
}
/* Acties als 'ingang', zodat de actiepagina dezelfde selectie- en filterweergave gebruikt. */
function acIngang(){
 INGANG.actie={n:"Acties",enk:"Actie",kop:"",cat:"actie",gsoort:"actie",gidsnaam:"",reeks:"",
  items:AC.lijst.map(function(a){return {id:a.slug,n:a.titel,ini:"%",ac:a};})};
 for(var k in INGCACHE)if(k.indexOf("_ing_actie_")===0)delete INGCACHE[k];
}
(function wacht(n){
 if(typeof WS!=="undefined"&&WS.sb){acLaad();WS.sb.auth.onAuthStateChange(function(){setTimeout(acLaad,300);});return;}
 if(n<80)setTimeout(function(){wacht(n+1);},150);
})(0);

/* ---------- welke flessen horen bij een actie ---------- */
function acRegelSet(filter){
 if(AC.regelCache[filter])return AC.regelCache[filter];
 var oud=F;urlNaarF(filter||"");var l=selectie(null);F=oud;
 var s=new Set(l.map(function(p){return String(p.id);}));AC.regelCache[filter]=s;return s;
}
function acLeden(a){
 if(a.selectie==="alles")return null;               /* hele assortiment */
 if(a.selectie==="regel")return acRegelSet(a.regel_filter||"");
 return AC.prod[a.id]||new Set();
}
function acTreffer(a,p){var s=acLeden(a);return s===null?true:s.has(String(p.id));}
function acLeverbaar(a){return CAT.filter(function(p){return p._voorraad!==false&&acTreffer(a,p);});}
function acLive(plek){return AC.lijst.filter(function(a){return acLoopt(a)&&(!plek||(a.plekken||[]).indexOf(plek)>=0);});}

/* ---------- wat de bezoeker ziet ---------- */
function actieBalk(){
 var a=acLive("balk")[0];if(!a)return "";
 return '<div class="abalk"><b>'+wsH(a.titel)+'</b>'+(a.regel?' · '+wsH(a.regel):'')
  +(a.code?' met code <code>'+wsH(a.code)+'</code>':'')
  +'<small>'+(a.voorwaarden?wsH(a.voorwaarden)+' ':'')+'Geldig t/m '+acDatum(a.tot)+'.</small>'
  +'<button aria-label="Sluiten" onclick="this.parentNode.remove()">✕</button></div>';
}
function acBeeld(a,l){
 if(a.beeld_url)return {url:a.beeld_url,bron:a.beeld_bron||""};
 var p=(l||acLeverbaar(a)).filter(function(x){return x.img;})[0];return p?{url:p.img,bron:"",product:true}:null;
}
function actieBlok(){
 var hoofd=acLive("hoofd").filter(function(a){return acLeverbaar(a).length>=3;})[0];
 var tg=acLive("tegel").filter(function(a){return a!==hoofd&&acLeverbaar(a).length>=3;}).slice(0,3);
 if(!hoofd&&!tg.length)return "";
 var h="";
 if(hoofd){var l=acLeverbaar(hoofd),b=acBeeld(hoofd,l);
  h='<a class="ahoofd" href="#/actie/'+hoofd.slug+'">'+(b&&!b.product?'<img src="'+wsH(b.url)+'" alt="">':'')
   +'<div class="ain"><div class="kicker">Actie · t/m '+acDatum(hoofd.tot)+'</div><h2>'+wsH(hoofd.titel)+'</h2>'+(hoofd.regel?'<p>'+wsH(hoofd.regel)+'</p>':'')
   +'<span class="btn btn-a">'+wsH(hoofd.knop||"Bekijk")+' ('+l.length.toLocaleString("nl-NL")+') →</span></div>'
   +(b&&!b.product&&b.bron?'<span class="acred">Foto: '+wsH(b.bron)+'</span>':'')
   +(b&&b.product?'<img class="aprod" src="'+wsH(b.url)+'" alt="">':'')+'</a>';}
 return '<section style="padding-top:26px;padding-bottom:10px"><div class="wrap"><div class="sec-head"><h2>Nu in actie</h2></div>'
 +'<div class="ablok'+(hoofd&&tg.length?'':' enkel')+'">'+h
 +(tg.length?'<div class="atiles">'+tg.map(function(a){var l=acLeverbaar(a),b=acBeeld(a,l);
   return '<a class="atile" href="#/actie/'+a.slug+'"><div class="aimg">'+(b?'<img src="'+wsH(b.url)+'" alt="">':'')+'</div><div><b>'+wsH(a.titel)+'</b>'+(a.regel?'<span>'+wsH(a.regel)+'</span>':'')+'<em>'+l.length.toLocaleString("nl-NL")+' flessen →</em></div></a>';}).join("")+'</div>':'')
 +'</div></div></section>';
}
function vActie(rt){
 var a=AC.lijst.filter(function(x){return x.slug===rt.id;})[0];
 if(!AC.geladen)return '<section><div class="wrap"><p style="color:var(--muted)">Laden…</p></div></section>';
 if(!a||(!acLoopt(a)&&!acBeheer()))return '<section><div class="wrap"><div class="streekhero" style="margin-top:12px"><h1>Deze actie is afgelopen</h1><p>Bekijk de rest van de collectie.</p></div><p style="margin-top:16px"><a class="btn btn-a" href="#/collectie">Naar de collectie →</a></p></div></section>';
 if(a.selectie==="alles"){setTimeout(function(){location.replace("#/collectie");},0);return "";}
 if(!rt.verfijnd||F.vs!=="actie:"+a.slug)F=nieuwF({vs:"actie:"+a.slug});
 var lijst=sorteer(selectie(null)),n=lijst.length,b=acBeeld(a,lijst),foto=b&&!b.product?[{url:b.url,plek:"",maker:b.bron,licentie:"",bron:"",status:""}]:[];
 var st=acStatus(a);
 return '<section><div class="wrap"><a class="back" href="#/">← Home</a>'
 +'<div class="streekhero'+(foto.length?" metbeeld":"")+'" style="margin-top:12px">'+(foto.length?beeldLagen(foto):'')
 +'<span class="statuschip">Actie · loopt t/m '+acDatum(a.tot)+(st[0]!=="Live"?' · '+st[0].toLowerCase()+' (alleen zichtbaar in beheer)':'')+'</span><h1>'+wsH(a.titel)+'</h1>'+(a.regel?'<p>'+wsH(a.regel)+'</p>':'')
 +(a.code?'<p style="margin-top:8px">Code <b>'+wsH(a.code)+'</b>'+(a.voorwaarden?' · '+wsH(a.voorwaarden):'')+'</p>':'')
 +(foto.length&&b.bron?'<p style="font-size:11px;opacity:.7;margin-top:10px">Foto: '+wsH(b.bron)+'</p>':'')+'</div>'
 +collectieBody(lijst,n,lijst.slice(0,120))+'</div></section>';
}
function acLabel(p){
 var a=acLive("label").filter(function(x){return x.selectie!=="alles"&&acTreffer(x,p);}).sort(function(x,y){return x.tot<y.tot?-1:1;})[0];
 return a?'<a class="alabel" href="#/actie/'+a.slug+'">In actie: '+wsH(a.titel)+' →</a>':'';
}

/* ---------- per stuk en in bulk toevoegen (alleen beheer) ---------- */
function acKiesOpties(){return AC.lijst.filter(function(a){return !a.ingetrokken&&a.tot>=acVandaag()&&a.selectie==="lijst";});}
function acProductKnop(p){
 if(!acBeheer()||!AC.tabel)return "";
 var o=acKiesOpties(),in_=AC.lijst.filter(function(a){return a.selectie==="lijst"&&(AC.prod[a.id]||new Set()).has(String(p.id));});
 return '<div class="abeheer"><b>Beheer · acties</b> '
  +(in_.length?'Staat in: '+in_.map(function(a){return '<span class="alabel">'+wsH(a.titel)+' <a href="#" onclick="return acUit(\''+a.id+'\',\''+p.id+'\')" title="Uit deze actie halen">✕</a></span>';}).join(" "):'In geen actie.')
  +(o.length?' <select id="acKies"><option value="">Aan actie toevoegen…</option>'+o.map(function(a){return '<option value="'+a.id+'">'+wsH(a.titel)+'</option>';}).join("")+'</select> <button class="btn btn-g btn-s" onclick="acToe(document.getElementById(\'acKies\').value,[\''+p.id+'\'])">Toevoegen</button>'
     :' <a href="#/admin/acties" style="color:var(--amber)">Maak eerst een actie met een vaste lijst</a>')+'</div>';
}
function acBulkBalk(lijst){
 if(!acBeheer()||!AC.tabel||!lijst||!lijst.length)return "";
 var o=AC.lijst.filter(function(a){return !a.ingetrokken&&a.tot>=acVandaag()&&a.selectie!=="alles";});
 if(!o.length)return '<div class="abeheer"><b>Beheer · acties</b> Deze '+lijst.length.toLocaleString("nl-NL")+' resultaten in een actie zetten? <a href="#/admin/acties" style="color:var(--amber)">Maak eerst een actie</a>.</div>';
 window._acBulk=lijst.map(function(p){return String(p.id);});
 var filt=fNaarUrl().replace(/^\?/,"");
 return '<div class="abeheer"><b>Beheer · acties</b> Alle '+lijst.length.toLocaleString("nl-NL")+' resultaten → <select id="acBulk">'+o.map(function(a){return '<option value="'+a.id+'">'+wsH(a.titel)+(a.selectie==="regel"?' (regel)':'')+'</option>';}).join("")+'</select> '
  +'<button class="btn btn-g btn-s" onclick="acToe(document.getElementById(\'acBulk\').value,window._acBulk)" title="Vaste lijst: deze flessen, nu">Toevoegen aan lijst</button> '
  +'<button class="btn btn-g btn-s" onclick="acAlsRegel(document.getElementById(\'acBulk\').value,\''+wsH(filt).replace(/'/g,"\\'")+'\')" title="Regel: groeit mee met nieuwe flessen die aan dit filter voldoen">Gebruik dit filter als regel</button></div>';
}
function acToe(id,ids){
 var a=AC.lijst.filter(function(x){return x.id===id;})[0];if(!a||!ids||!ids.length){toast("Kies een actie.");return;}
 if(a.selectie!=="lijst"){toast("Deze actie gebruikt een regel. Zet hem in het beheer eerst op 'vaste lijst'.");return;}
 var nieuw=ids.filter(function(x){return !(AC.prod[id]||new Set()).has(String(x));});
 if(!nieuw.length){toast("Staat er al in.");return;}
 var rijen=nieuw.map(function(x){return {actie_id:id,product_id:String(x)};}),blokken=[];
 for(var i=0;i<rijen.length;i+=500)blokken.push(rijen.slice(i,i+500));
 blokken.reduce(function(p,b){return p.then(function(){return WS.sb.from("ws_actie_producten").insert(b).then(function(r){if(r.error)throw r.error;});});},Promise.resolve())
 .then(function(){toast(nieuw.length+" fles(sen) toegevoegd aan "+a.titel);acLaad();})
 .catch(function(e){toast("Toevoegen mislukt: "+(e.message||e));});
}
function acUit(id,pid){
 WS.sb.from("ws_actie_producten").delete().eq("actie_id",id).eq("product_id",String(pid)).then(function(r){
  if(r.error){toast("Mislukt: "+r.error.message);return;}toast("Uit de actie gehaald");acLaad();});
 return false;
}
function acAlsRegel(id,filt){
 WS.sb.from("ws_acties").update({selectie:"regel",regel_filter:filt}).eq("id",id).then(function(r){
  if(r.error){toast("Mislukt: "+r.error.message);return;}toast("Filter opgeslagen als regel");acLaad();});
}

/* ---------- beheer ---------- */
function acNieuw(){
 var d=acVandaag(),t=new Date(Date.now()+14*86400000);
 AC.edit={id:null,slug:"",titel:"",regel:"",knop:"Bekijk",code:"",code_pct:null,code_niet_op_aanbiedingen:true,voorwaarden:"",
  van:d,tot:new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Amsterdam"}).format(t),plekken:["tegel"],selectie:"lijst",regel_filter:"",
  beeld_url:"",beeld_bron:"",beeld_rechten:"",markt:"NL",ingetrokken:false,_ids:[]};
 AC.ctrl=null;render();
}
function acBewerk(id){
 var a=AC.lijst.filter(function(x){return x.id===id;})[0];if(!a)return;
 AC.edit=JSON.parse(JSON.stringify(a));AC.edit._ids=Array.from(AC.prod[a.id]||[]);AC.ctrl=null;render();
}
function acKopie(id){
 acBewerk(id);var e=AC.edit;e.id=null;e.slug="";e.titel=e.titel+" (kopie)";e.van="";e.tot="";e.code="";e.code_pct=null;e.beeld_rechten="";e.ingetrokken=false;render();
}
function acVeld(k,v){
 var e=AC.edit;if(!e)return;
 if(k==="plek"){var i=e.plekken.indexOf(v);if(i>=0)e.plekken.splice(i,1);else e.plekken.push(v);}
 else if(k==="code_pct")e.code_pct=v===""?null:Math.max(0,Math.min(100,+v));
 else if(k==="code_niet_op_aanbiedingen")e[k]=!!v;
 else e[k]=v;
 if(k==="titel"&&!e.id)e.slug=acSlug(v);
 AC.ctrl=null;
 if(["selectie","plek","beeld_url","van","tot"].indexOf(k)>=0)render();
}
function acPlak(tekst){
 var e=AC.edit,regels=String(tekst||"").split(/\n|;|,(?=\s*\d{6,})/).map(function(s){return s.trim();}).filter(Boolean),gevonden=[],niet=[];
 regels.forEach(function(r){
  var p=/^\d{5,15}$/.test(r)?acP(r):null;
  if(!p){var q=r.toLowerCase();p=CAT.filter(function(x){return x.name.toLowerCase()===q;})[0]||CAT.filter(function(x){return x.name.toLowerCase().indexOf(q)>=0;})[0];}
  if(p){if(e._ids.indexOf(String(p.id))<0)e._ids.push(String(p.id));gevonden.push(p.name);}else niet.push(r);
 });
 AC.plakUitslag=gevonden.length+" gevonden"+(niet.length?", niet gevonden: "+niet.slice(0,8).join(" · ")+(niet.length>8?" …":""):"");
 AC.ctrl=null;render();
}
function acUitLijst(pid){var e=AC.edit;e._ids=e._ids.filter(function(x){return x!==String(pid);});AC.ctrl=null;render();}
function acLedenEdit(e){
 if(e.selectie==="alles")return null;
 if(e.selectie==="regel")return acRegelSet(e.regel_filter||"");
 return new Set(e._ids);
}

/* Controles. Prijzen komen uit de Lightspeed-spiegel (ws_ls_varianten) en de prijshistorie. */
function acControleer(){
 var e=AC.edit;if(!e||AC.ctrlBezig)return;
 AC.ctrlBezig=true;render();
 var leden=acLedenEdit(e),ids=leden?Array.from(leden):null,uit={blok:[],let:[],ok:[],info:[]};
 if(!e.titel||e.titel.length<2)uit.blok.push("Geef de actie een naam.");
 if(!e.van||!e.tot)uit.blok.push("Vul de looptijd in.");else if(e.tot<e.van)uit.blok.push("De einddatum ligt vóór de begindatum.");
 if(!e.plekken.length)uit.let.push("Geen plek gekozen: de actie is alleen via de link te zien.");
 if(e.beeld_url&&!/^https:\/\//.test(e.beeld_url))uit.blok.push("Beeldadres moet met https:// beginnen.");
 if(e.beeld_url&&(!e.beeld_bron||!e.beeld_rechten))uit.blok.push("Vul bij het eigen beeld de bron én de rechten in (bv. 'eigen foto Whiskysite' of 'toestemming Ardnahoe, mail 12-10').");
 if(e.code&&(e.code_pct==null))uit.blok.push("Vul het kortingspercentage van de code in; dat is nodig voor de 25%-controle.");
 if(e.code_pct!=null&&e.code_pct>AC_MAX_KORTING)uit.blok.push("Een code van "+e.code_pct+"% is meer dan de 25% die de Alcoholwet toestaat.");
 if(e.code&&!e.voorwaarden)uit.let.push("Zet de voorwaarden van de code erbij (bv. 'Niet op aanbiedingen en restanten.').");
 var lev=ids?ids.map(byId).filter(function(p){return p&&p._voorraad!==false;}):null;
 if(lev&&(e.plekken.indexOf("hoofd")>=0||e.plekken.indexOf("tegel")>=0)&&lev.length<3)uit.let.push("Minder dan 3 leverbare flessen: hoofdactie en tegel blijven dan vanzelf uit.");
 if(lev)uit.info.push(lev.length.toLocaleString("nl-NL")+" van "+ids.length.toLocaleString("nl-NL")+" flessen leverbaar.");
 /* overlap met andere lopende of geplande acties */
 if(ids&&ids.length){var set=new Set(ids);AC.lijst.forEach(function(a){
  if(a.id===e.id||a.ingetrokken||a.tot<e.van||a.van>e.tot||a.selectie==="alles")return;
  var n=0,s=acLeden(a);s.forEach(function(x){if(set.has(x))n++;});
  if(n)uit.let.push("Overlap: "+n+" fles(sen) staan ook in “"+a.titel+"” ("+acDatum(a.van)+" – "+acDatum(a.tot)+").");});}
 /* lopende codes die stapelen */
 var codes=AC.lijst.filter(function(a){return a.id!==e.id&&a.code&&!a.ingetrokken&&!(a.tot<e.van||a.van>e.tot);});
 var pr=function(){
  if(!e.code&&!codes.length&&!ids)return Promise.resolve();
  var q=WS.sb.from("ws_ls_varianten").select("ls_id,product_ls_id,prijs_incl,prijs_oud_incl");
  if(ids){if(!ids.length)return Promise.resolve();if(ids.length>1500){uit.info.push("Prijscontrole over de eerste 1.500 flessen.");}q=q.in("product_ls_id",ids.slice(0,1500).map(Number));}
  else q=q.gt("prijs_oud_incl",0);
  return q.limit(5000).then(function(r){
   if(r.error){uit.let.push("Prijzen uit Lightspeed niet te lezen ("+r.error.message+").");return;}
   var vs=r.data||[],codePct=e.code_pct||0,anderPct=codes.reduce(function(m,a){return Math.max(m,a.code_pct||0);},0);
   var te=[],pc=0;
   vs.forEach(function(v){
    var p=+v.prijs_incl,o=+v.prijs_oud_incl,k=(o>p&&o>0)?(1-p/o)*100:0;
    if(k>0)pc++;
    var stapel=function(c,nietSale){return (k>0&&nietSale)?k:(1-(1-k/100)*(1-c/100))*100;};
    var tot=Math.max(stapel(codePct,e.code_niet_op_aanbiedingen),codes.reduce(function(m,a){return Math.max(m,stapel(a.code_pct||0,a.code_niet_op_aanbiedingen));},0));
    if(tot>AC_MAX_KORTING+0.005)te.push({v:v,k:k,t:tot});
   });
   if(pc)uit.info.push(pc+" fles(sen) hebben in Lightspeed een doorgestreepte prijs.");
   te.sort(function(a,b){return b.t-a.t;});
   te.slice(0,8).forEach(function(x){var p=acP(String(x.v.product_ls_id));
    uit.blok.push((p?p.name:"Product "+x.v.product_ls_id)+": "+(x.k?x.k.toFixed(1)+"% korting in Lightspeed":"geen korting in Lightspeed")+(x.t>x.k+0.01?", samen met een code "+x.t.toFixed(1)+"%":"")+". Maximaal 25% (Alcoholwet art. 2a).");});
   if(te.length>8)uit.blok.push("… en nog "+(te.length-8)+" fles(sen) boven 25%.");
   if(!te.length&&vs.length)uit.ok.push("Geen fles komt boven 25% korting"+(codePct||anderPct?", ook niet met de code(s) erbij":"")+".");
   var oudIds=vs.filter(function(v){return +v.prijs_oud_incl>+v.prijs_incl;}).map(function(v){return v.ls_id;}).slice(0,800);
   if(!oudIds.length)return;
   var sinds=new Date(Date.now()-30*86400000).toISOString().slice(0,10);
   return WS.sb.from("ws_ls_prijshistorie").select("variant_ls_id,datum,prijs_incl").in("variant_ls_id",oudIds).gte("datum",sinds).limit(20000).then(function(h){
    if(h.error)return;var min={},eerste=null;
    (h.data||[]).forEach(function(x){if(!eerste||x.datum<eerste)eerste=x.datum;var p=+x.prijs_incl;if(min[x.variant_ls_id]==null||p<min[x.variant_ls_id])min[x.variant_ls_id]=p;});
    var fout=vs.filter(function(v){return min[v.ls_id]!=null&&+v.prijs_oud_incl>min[v.ls_id]+0.001;});
    fout.slice(0,5).forEach(function(v){var p=acP(String(v.product_ls_id));uit.let.push((p?p.name:"Product "+v.product_ls_id)+": doorgestreepte prijs "+eur(+v.prijs_oud_incl)+" is niet de laagste van de afgelopen 30 dagen ("+eur(min[v.ls_id])+"). Toon die van-prijs niet.");});
    if(eerste&&eerste>sinds)uit.info.push("Prijshistorie loopt sinds "+acDatum(eerste)+"; de 30-dagenregel is pas volledig te toetsen vanaf "+acDatum(new Date(new Date(eerste).getTime()+30*86400000).toISOString().slice(0,10))+".");
   });
  });
 };
 pr().catch(function(){}).then(function(){AC.ctrl=uit;AC.ctrlBezig=false;render();});
}
function acOpslaan(){
 var e=AC.edit;if(!e||!AC.ctrl||AC.ctrl.blok.length||AC.bewaar)return;
 AC.bewaar=true;render();
 var rij={slug:e.slug||acSlug(e.titel),titel:e.titel.trim(),regel:(e.regel||"").trim()||null,knop:(e.knop||"").trim()||null,
  code:(e.code||"").trim()||null,code_pct:e.code?e.code_pct:null,code_niet_op_aanbiedingen:!!e.code_niet_op_aanbiedingen,voorwaarden:(e.voorwaarden||"").trim()||null,
  van:e.van,tot:e.tot,plekken:e.plekken,selectie:e.selectie,regel_filter:e.selectie==="regel"?(e.regel_filter||""):null,
  beeld_url:(e.beeld_url||"").trim()||null,beeld_bron:(e.beeld_bron||"").trim()||null,beeld_rechten:(e.beeld_rechten||"").trim()||null,markt:"NL",ingetrokken:!!e.ingetrokken};
 var q=e.id?WS.sb.from("ws_acties").update(rij).eq("id",e.id).select("id").single():WS.sb.from("ws_acties").insert(rij).select("id").single();
 q.then(function(r){
  if(r.error)throw r.error;var id=r.data.id;
  if(e.selectie!=="lijst")return id;
  var oud=AC.prod[id]||new Set(),nieuw=new Set(e._ids),weg=Array.from(oud).filter(function(x){return !nieuw.has(x);}),bij=e._ids.filter(function(x){return !oud.has(x);});
  var p=Promise.resolve();
  for(var i=0;i<weg.length;i+=200)(function(b){p=p.then(function(){return WS.sb.from("ws_actie_producten").delete().eq("actie_id",id).in("product_id",b).then(function(x){if(x.error)throw x.error;});});})(weg.slice(i,i+200));
  for(var j=0;j<bij.length;j+=500)(function(b){p=p.then(function(){return WS.sb.from("ws_actie_producten").insert(b.map(function(x){return {actie_id:id,product_id:x};})).then(function(x){if(x.error)throw x.error;});});})(bij.slice(j,j+500));
  return p.then(function(){return id;});
 }).then(function(){AC.bewaar=false;AC.edit=null;AC.ctrl=null;toast("Actie opgeslagen");acLaad();})
 .catch(function(err){AC.bewaar=false;toast(/duplicate|unique/i.test(err.message||"")?"Er is al een actie met dit webadres; pas de naam aan.":"Opslaan mislukt: "+(err.message||err));render();});
}
function acIntrek(id,aan){
 if(aan&&!confirm("Actie intrekken? Hij verdwijnt meteen van de site. Je kunt hem later weer terugzetten."))return;
 WS.sb.from("ws_acties").update({ingetrokken:aan}).eq("id",id).then(function(r){if(r.error){toast("Mislukt: "+r.error.message);return;}toast(aan?"Actie ingetrokken":"Actie teruggezet");acLaad();});
}
function acVoorbeelden(){
 var d=acVandaag(),plus=function(n){return new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Amsterdam"}).format(new Date(Date.now()+n*86400000));};
 var rij=[
  {slug:"proef-eerst",titel:"Proef eerst",regel:"Samples onder € 10",knop:"Bekijk de samples",van:d,tot:plus(60),plekken:["tegel"],selectie:"regel",regel_filter:"inhoud=Sample%20(6cl)&max=10&cat=samples"},
  {slug:"ardnahoe",titel:"Ardnahoe op Islay",regel:"Alle flessen en samples van Ardnahoe, met de gewone filters erbij.",knop:"Bekijk de Ardnahoe-flessen",van:d,tot:plus(14),plekken:["hoofd","label"],selectie:"regel",regel_filter:"dist=Ardnahoe"},
  {slug:"nieuw-binnen",titel:"Nieuw binnen",regel:"Deze week binnengekomen",knop:"Bekijk",van:d,tot:plus(60),plekken:["tegel"],selectie:"regel",regel_filter:"nieuw=1"}
 ];
 WS.sb.from("ws_acties").insert(rij).then(function(r){if(r.error){toast(/duplicate|unique/i.test(r.error.message)?"De voorbeeldacties staan er al.":"Mislukt: "+r.error.message);return;}toast("Drie voorbeeldacties aangemaakt");acLaad();});
}
function acFotoOpties(){
 var o=[];if(typeof GIDS==="undefined")return o;
 ["streek","land","bottelaar","verzamel"].forEach(function(s){Object.keys(GIDS[s]||{}).forEach(function(id){var f=gidsFoto(s,id);if(f&&f.url)o.push({url:f.url,lbl:(GIDS[s][id].t||id).slice(0,60),bron:(f.maker?f.maker+" · ":"")+(f.licentie||"")+" · "+(f.bron||"Wikimedia Commons"),rechten:f.licentie||""});});});
 return o;
}
function vAdminActies(){
 var h='<h3 style="font-size:20px;margin-bottom:6px">Acties en banners</h3>';
 if(!acBeheer())return h+(typeof wsLoginBlok==="function"?wsLoginBlok("acties te maken en te beheren"):"");
 if(!AC.geladen)return h+'<p style="color:var(--muted)">Laden…</p>';
 if(!AC.tabel)return h+'<div class="awaar geel"><b>Database nog niet ingericht.</b> Voer <code>supabase/ws_acties.sql</code> uit in de SQL Editor van Supabase en laad deze pagina opnieuw.</div>';
 if(AC.edit)return h+acForm();
 var d=acVandaag(),rij=AC.lijst.slice().sort(function(a,b){return (b.tot>=d)-(a.tot>=d)||(a.van<b.van?-1:1);});
 var s=new Date(d),e=new Date(s.getTime()+90*86400000),pos=function(x){return Math.max(0,Math.min(100,(new Date(x)-s)/(e-s)*100));};
 var zicht=rij.filter(function(a){return !a.ingetrokken&&a.tot>=d;});
 return h+'<p style="font-size:12.5px;color:var(--muted);margin-bottom:12px">Acties gaan op hun datum vanzelf aan en uit (Nederlandse tijd). Prijzen en kortingen stel je in Lightspeed in; hier kies je welke flessen erbij horen, waar de actie op de site staat en met welke tekst en foto.</p>'
 +'<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap"><button class="btn btn-a btn-s" onclick="acNieuw()">+ Nieuwe actie</button>'+(AC.lijst.length?'':'<button class="btn btn-g btn-s" onclick="acVoorbeelden()">Drie voorbeeldacties aanmaken</button>')+'</div>'
 +(zicht.length?'<div style="font-size:11px;color:var(--muted);display:flex;justify-content:space-between"><span>vandaag</span><span>+90 dagen</span></div><div class="atijd" style="height:'+(10+zicht.length*15)+'px">'+zicht.map(function(a,i){var l=pos(a.van),r=pos(a.tot);return '<i style="left:'+l+'%;width:'+Math.max(3,r-l)+'%;top:'+(4+i*15)+'px;background:'+(a.van>d?"#c9963f":"#a2463a")+'" title="'+wsH(a.titel)+'">'+wsH(a.titel)+'</i>';}).join("")+'</div>':'')
 +(rij.length?'<table class="atable"><tr><th>Actie</th><th>Plek</th><th>Looptijd</th><th>Flessen</th><th>Status</th><th></th></tr>'
  +rij.map(function(a){var st=acStatus(a),l=a.selectie==="alles"?null:acLeverbaar(a);
   return '<tr><td><b><a href="#/actie/'+a.slug+'" style="color:inherit">'+wsH(a.titel)+'</a></b>'+(a.code?'<br><span style="color:var(--muted)">code '+wsH(a.code)+' · '+(a.code_pct||0)+'%</span>':'')+'</td>'
   +'<td>'+(a.plekken||[]).map(function(p){return AC_PLEK[p]||p;}).join(", ")+'</td><td>'+acDatum(a.van)+' – '+acDatum(a.tot)+'</td>'
   +'<td>'+(l?l.length.toLocaleString("nl-NL")+(a.selectie==="regel"?' <span style="color:var(--muted)">(regel)</span>':''):'hele assortiment')+'</td>'
   +'<td><span class="st '+st[1]+'">'+st[0]+'</span></td>'
   +'<td style="white-space:nowrap"><button class="btn btn-g btn-s" onclick="acBewerk(\''+a.id+'\')">Bewerken</button> <button class="btn btn-g btn-s" onclick="acKopie(\''+a.id+'\')">Kopie</button> '
   +(a.ingetrokken?'<button class="btn btn-g btn-s" onclick="acIntrek(\''+a.id+'\',false)">Terugzetten</button>':'<button class="btn btn-g btn-s" onclick="acIntrek(\''+a.id+'\',true)">Intrekken</button>')+'</td></tr>';}).join("")+'</table>'
  :'<div class="sync-box"><b>Nog geen acties</b><p>Maak een nieuwe actie, of begin met drie voorbeeldacties om te zien hoe het werkt.</p></div>')
 +'<p style="font-size:12px;color:var(--muted);margin-top:14px">Flessen per stuk toevoegen kan op de productpagina; in bulk vanuit de collectie (filter kiezen, dan “alle resultaten toevoegen”). Elke wijziging wordt bewaard in een logboek.</p>';
}
function acForm(){
 var e=AC.edit,leden=acLedenEdit(e),n=leden?leden.size:null,c=AC.ctrl;
 var fotos=acFotoOpties(),veld=function(lbl,html){return '<div class="aveld"><label>'+lbl+'</label>'+html+'</div>';};
 var inp=function(k,ph,extra){return '<input value="'+wsH(e[k]==null?"":e[k])+'" placeholder="'+wsH(ph||"")+'" oninput="acVeld(\''+k+'\',this.value)" '+(extra||"")+'>';};
 var lijstHtml="";
 if(e.selectie==="lijst"){
  var ps=e._ids.map(byId).filter(Boolean);
  lijstHtml=veld("Flessen in de lijst ("+ps.length+")",
   '<textarea rows="3" id="acPlakVeld" placeholder="Plak productnamen of Lightspeed-nummers, één per regel"></textarea>'
   +'<div style="display:flex;gap:8px;align-items:center;margin-top:6px"><button class="btn btn-g btn-s" onclick="acPlak(document.getElementById(\'acPlakVeld\').value)">Toevoegen</button><span style="font-size:12px;color:var(--muted)">'+wsH(AC.plakUitslag||"Of voeg toe vanuit de collectie en de productpagina.")+'</span></div>'
   +(ps.length?'<div class="aplijst">'+ps.slice(0,60).map(function(p){return '<div><span>'+wsH(p.name)+'</span>'+(p._voorraad===false?'<em>niet leverbaar</em>':'')+'<button onclick="acUitLijst(\''+p.id+'\')" title="Uit de lijst">✕</button></div>';}).join("")+(ps.length>60?'<div><span style="color:var(--muted)">… en nog '+(ps.length-60)+'</span></div>':'')+'</div>':''));
 }else if(e.selectie==="regel"){
  lijstHtml=veld("Regel"+(n!=null?" ("+n.toLocaleString("nl-NL")+" flessen nu)":""),
   inp("regel_filter","bv. dist=Ardnahoe of land=Japan&max=80")
   +'<p style="font-size:11.5px;color:var(--muted);margin-top:4px">Makkelijker: kies in de <a href="#/collectie" style="color:var(--amber)">collectie</a> de filters en klik daar “Gebruik dit filter als regel”. Nieuwe flessen die aan de regel voldoen, komen er vanzelf bij.</p>');
 }else lijstHtml='<p style="font-size:12.5px;color:var(--muted)">De actie geldt voor het hele assortiment, bv. een kortingscode in de mededelingenbalk. Er is geen actiepagina; de balk verwijst naar de collectie.</p>';
 var ctrlHtml=!c?'<div class="awaar geel">Nog niet gecontroleerd. Klik <b>Controleren</b> voordat je opslaat.</div>'
  :c.blok.map(function(t){return '<div class="awaar rood"><b>Geblokkeerd.</b> '+wsH(t)+'</div>';}).join("")
  +c.let.map(function(t){return '<div class="awaar geel"><b>Let op.</b> '+wsH(t)+'</div>';}).join("")
  +(c.blok.length?'':'<div class="awaar groen"><b>In orde.</b> '+wsH(c.ok.concat(c.info).join(" ")||"Geen bezwaren gevonden.")+'</div>')
  +(c.blok.length&&c.info.length?'<p style="font-size:12px;color:var(--muted)">'+wsH(c.info.join(" "))+'</p>':'');
 var vb=leden?Array.from(leden).map(byId).filter(function(p){return p&&p._voorraad!==false;}):[];
 var b=e.beeld_url?{url:e.beeld_url}:null;
 return '<div style="display:flex;justify-content:space-between;align-items:center;margin:4px 0 14px"><h3 style="font-size:17px">'+(e.id?"Actie bewerken":"Nieuwe actie")+'</h3><button class="btn btn-g btn-s" onclick="AC.edit=null;AC.ctrl=null;render()">← Terug naar overzicht</button></div>'
 +'<div class="aform"><div>'
 +veld("Naam (titel op de site)",inp("titel","bv. Lagavulin-weken","maxlength=80"))
 +veld("Webadres",'<input value="'+wsH(e.slug)+'" oninput="acVeld(\'slug\',this.value.toLowerCase().replace(/[^a-z0-9-]/g,\'\'))" maxlength=60 '+(e.id?'disabled':'')+'><span style="font-size:11px;color:var(--muted)">#/actie/'+wsH(e.slug||"…")+'</span>')
 +veld("Regel onder de titel",inp("regel","korte zin, max. 200 tekens","maxlength=200"))
 +veld("Knoptekst",inp("knop","bv. Bekijk de Lagavulins","maxlength=40"))
 +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+veld("Van",'<input type="date" value="'+wsH(e.van)+'" onchange="acVeld(\'van\',this.value)">')+veld("Tot en met",'<input type="date" value="'+wsH(e.tot)+'" onchange="acVeld(\'tot\',this.value)">')+'</div>'
 +veld("Plekken op de site",'<div class="aslots">'+Object.keys(AC_PLEK).map(function(k){return '<label><input type="checkbox" '+(e.plekken.indexOf(k)>=0?"checked":"")+' onchange="acVeld(\'plek\',\''+k+'\')"> '+AC_PLEK[k]+'</label>';}).join("")+'</div>')
 +veld("Flessen",'<select onchange="acVeld(\'selectie\',this.value)"><option value="lijst"'+(e.selectie==="lijst"?" selected":"")+'>Vaste lijst (per stuk, geplakt of uit de collectie)</option><option value="regel"'+(e.selectie==="regel"?" selected":"")+'>Regel (groeit mee, bv. alle Ardnahoe)</option><option value="alles"'+(e.selectie==="alles"?" selected":"")+'>Hele assortiment (bv. kortingscode)</option></select>')
 +lijstHtml
 +'<div class="aveld"><label>Kortingscode (optioneel, alleen tonen; de code zelf stel je in Lightspeed in)</label><div style="display:grid;grid-template-columns:2fr 1fr;gap:8px">'+inp("code","bv. WS2026","maxlength=30")+'<input type="number" min="0" max="100" step="0.5" placeholder="%" value="'+(e.code_pct==null?"":e.code_pct)+'" oninput="acVeld(\'code_pct\',this.value)"></div>'
 +'<label style="display:flex;gap:6px;align-items:center;font-weight:400;margin-top:6px"><input type="checkbox" '+(e.code_niet_op_aanbiedingen?"checked":"")+' onchange="acVeld(\'code_niet_op_aanbiedingen\',this.checked)"> Code geldt niet voor flessen die al in de aanbieding zijn</label>'
 +inp("voorwaarden","Voorwaarden, bv. Niet op aanbiedingen en restanten.","maxlength=200 style=\"margin-top:6px\"")+'</div>'
 +veld("Foto",'<select onchange="var o=this.selectedOptions[0];acVeld(\'beeld_bron\',o.dataset.bron||\'\');acVeld(\'beeld_rechten\',o.dataset.rechten||\'\');acVeld(\'beeld_url\',this.value)"><option value="">Productfoto van een fles uit de actie</option>'
   +fotos.map(function(f){return '<option value="'+wsH(f.url)+'" data-bron="'+wsH(f.bron)+'" data-rechten="'+wsH(f.rechten)+'"'+(e.beeld_url===f.url?" selected":"")+'>Gidsfoto · '+wsH(f.lbl)+'</option>';}).join("")+'<option value="https://"'+(e.beeld_url&&!fotos.some(function(f){return f.url===e.beeld_url;})?" selected":"")+'>Eigen foto (https-adres)…</option></select>'
   +(e.beeld_url&&!fotos.some(function(f){return f.url===e.beeld_url;})?inp("beeld_url","https://…","style=\"margin-top:6px\"")+inp("beeld_bron","Bron, bv. eigen foto Whiskysite","style=\"margin-top:6px\"")+inp("beeld_rechten","Rechten, bv. toestemming Ardnahoe per mail 12-10","style=\"margin-top:6px\""):''))
 +'</div><div>'
 +'<div class="aveld"><label>Controle vóór opslaan</label></div>'+ctrlHtml
 +'<div style="display:flex;gap:8px;margin:10px 0 18px;flex-wrap:wrap"><button class="btn btn-g btn-s" onclick="acControleer()" '+(AC.ctrlBezig?"disabled":"")+'>'+(AC.ctrlBezig?"Controleren…":"Controleren")+'</button>'
 +'<button class="btn btn-a btn-s" onclick="acOpslaan()" '+(!c||c.blok.length||AC.bewaar?'disabled style="opacity:.45;cursor:not-allowed"':'')+'>'+(AC.bewaar?"Opslaan…":(e.van>acVandaag()?"Inplannen":"Opslaan en live zetten"))+'</button></div>'
 +'<div class="aveld"><label>Zo ziet de bezoeker '+(e.plekken.indexOf("hoofd")>=0?"de hoofdactie":e.plekken.indexOf("tegel")>=0?"de tegel":e.plekken.indexOf("balk")>=0?"de balk":"de actie")+'</label></div>'
 +'<div class="avoorbeeld">'+(e.plekken.indexOf("balk")>=0&&!(e.plekken.indexOf("hoofd")>=0||e.plekken.indexOf("tegel")>=0)
   ?'<div class="abalk" style="border-radius:8px"><b>'+wsH(e.titel||"Titel")+'</b>'+(e.regel?' · '+wsH(e.regel):'')+(e.code?' met code <code>'+wsH(e.code)+'</code>':'')+'<small>'+wsH(e.voorwaarden||"")+' Geldig t/m '+acDatum(e.tot)+'.</small></div>'
   :e.plekken.indexOf("tegel")>=0&&e.plekken.indexOf("hoofd")<0
   ?'<div class="atile" style="pointer-events:none"><div class="aimg">'+(vb[0]&&vb[0].img?'<img src="'+wsH(vb[0].img)+'" alt="">':'')+'</div><div><b>'+wsH(e.titel||"Titel")+'</b><span>'+wsH(e.regel||"")+'</span><em>'+vb.length+' flessen →</em></div></div>'
   :'<div class="ahoofd" style="min-height:190px">'+(b?'<img src="'+wsH(b.url)+'" alt="">':(vb[0]&&vb[0].img?'<img class="aprod" src="'+wsH(vb[0].img)+'" alt="">':''))+'<div class="ain" style="padding:18px"><div class="kicker">Actie · t/m '+acDatum(e.tot)+'</div><h2 style="font-size:22px">'+wsH(e.titel||"Titel")+'</h2><p style="font-size:13px">'+wsH(e.regel||"")+'</p><span class="btn btn-a btn-s">'+wsH(e.knop||"Bekijk")+(leden?' ('+vb.length+')':'')+' →</span></div></div>')
 +'</div></div></div>';
}
