/* ================= STAPPENPLAN NAAR DE TESTSITE =================
   Uitlegblad voor Jack in het beheer: wat we gaan doen, waarom, en wie wat doet.
   De tekst staat hieronder (SP_BLAD en SP_STAPPEN). Afvinken wordt bewaard in Supabase,
   tabel ws_stappen (zie supabase/ws_stappen.sql). Alleen accounts in ws_toegang kunnen
   lezen en schrijven; dat regelt de database zelf (RLS). Bestaat de tabel nog niet, dan
   is het blad alleen-lezen. Alleen de publieke sleutel wordt gebruikt (WS uit vragenlijst.js).
   Geen geheimen en geen handelscijfers in dit bestand. */
var SP={stand:{},geladen:false,bezig:false,tabel:true,fout:"",bewaar:"",tab:"overzicht"};
var SP_VERSIE="14 november 2026";

var SP_BLAD={
 kort:"De demo wordt een echte testsite. Die komt op een eigen, afgesloten plek op jouw naam: alleen wie jij toelaat, kan erbij. Daar testen we samen de hele site. Pas als jij tevreden bent, praten we over livegang.",
 verandert:[
  ["De site","Een demo met een toegangscode. Dat past bij een demo, niet bij een testsite met je hele catalogus.","Een afgesloten testsite. Je logt in met je e-mailadres en krijgt een code in je mail.","Jouw catalogus en teksten horen niet open op internet te staan zolang we testen."],
  ["De opslag","Jouw antwoorden staan in een opslag die TankeSmed ook voor andere dingen gebruikt.","Een eigen opslag met de naam Whiskysite, op jouw naam, op servers in de Europese Unie.","Alles van Whiskysite staat dan bij elkaar en is van jou. Er hoeft later niets te worden overgedragen."],
  ["De sleutel van Lightspeed","Eén sleutel die kan lezen én schrijven.","Twee sleutels: één om te lezen, één om te schrijven. Schrijven staat uit tot jij per regel akkoord geeft.","Zo kan er niets per ongeluk in je winkel veranderen."],
  ["De juridische teksten","De teksten van je webwinkel, zoals ze nu zijn.","Een voorzet van ons voor vier teksten. Jij laat ze nakijken.","De nieuwe site doet een paar dingen die nog niet in je teksten staan. Zodra we met echte bezoekers testen, moet dat erin staan."]
 ],
 blijft:[
  "Je webwinkel blijft gewoon draaien. Daar verandert niets aan.",
  "In Lightspeed passen wij niets aan zonder jouw akkoord per regel.",
  "Vragen aan jou blijven via dit beheer lopen. Je krijgt geen losse lijsten of bijlagen.",
  "Je hoeft niet alle flessen beoordeeld te hebben voordat we gaan testen. Flessen die je nog niet zag, tonen de tekst uit je winkel."
 ],
 partijen:[
  ["Cloudflare","Laat de testsite zien en regelt het inloggen met een code per e-mail.","Op jouw naam. Ziet het e-mailadres van wie inlogt."],
  ["Supabase","Bewaart jouw antwoorden, de acties en de foto's.","Op jouw naam. Servers in de Europese Unie."],
  ["Jons TankeSmed","Bouwt en beheert de site in jouw accounts.","Kan erbij zolang jij dat wilt."],
  ["Lightspeed","Blijft je winkel en je kassa.","Hier verandert niets."]
 ],
 later:"Het adres van de testsite is tijdelijk en eindigt niet op whiskysite.nl. Het echte adres (bijvoorbeeld ontdek.whiskysite.nl) regelen we bij livegang. Daarvoor is dan één instelling nodig bij wie je domein beheert."
};

/* w = wie (jack / wij / samen), d = doorlopend (niet af te vinken), l = link in het beheer,
   hoe = korte stappen voor Jack. ic = pictogram in het overzicht. */
var SP_STAPPEN=[
 {k:"Accounts op jouw naam",ic:"sleutel",t:"De testsite komt op jouw naam te staan, niet op die van TankeSmed. Daarvoor maak jij twee accounts aan en laat je John toe als beheerder. Dit is de eerste stap: zonder deze accounts kunnen wij niets klaarzetten.",items:[
  {id:"j-acc-supabase",w:"jack",t:"Account aanmaken bij Supabase",wat:"Supabase is de opslag: daar staan straks jouw antwoorden, de acties en de foto's.",waarom:"Staat het op jouw naam, dan is het van jou. Er hoeft later niets te worden overgedragen.",hoe:["Ga naar supabase.com en kies Start your project.","Meld je aan met het e-mailadres van de winkel.","Maak een organisatie met de naam Whiskysite.","Zet tweestapsverificatie aan (Account, Security)."]},
  {id:"j-acc-cloudflare",w:"jack",t:"Account aanmaken bij Cloudflare",wat:"Cloudflare laat de testsite zien en regelt de deur: inloggen met een code per e-mail.",waarom:"Ook dit is dan van jou. Jij bepaalt wie erin mag.",hoe:["Ga naar cloudflare.com en kies Sign up.","Meld je aan met het e-mailadres van de winkel.","Een domein toevoegen hoeft niet. Sla die stap over.","Zet tweestapsverificatie aan (My Profile, Authentication)."]},
  {id:"j-acc-uitnodigen",w:"jack",t:"John toelaten als beheerder",wat:"In beide accounts nodig je John uit, zodat hij alles voor je kan inrichten.",waarom:"Jij blijft eigenaar. John kan erbij zolang jij dat wilt, en je kunt het weer intrekken.",hoe:["Supabase: Organization, Team, Invite. Rol: Owner of Administrator.","Cloudflare: Manage Account, Members, Invite. Rol: Administrator.","Gebruik het adres info@tankesmed.com."]},
  {id:"s-acc-abonnement",w:"samen",t:"De opslag op het betaalde abonnement zetten",wat:"Het betaalde abonnement van Supabase maakt elke dag een reservekopie en zet de opslag niet stil als hij even niet gebruikt wordt.",waarom:"In deze opslag staat al jouw werk van de afgelopen weken. Daar hoort een reservekopie onder. John loopt dit met je door."}
 ]},
 {k:"Nu, hier in het beheer",ic:"vink",t:"Dit kun je vandaag al doen. Het loopt naast de rest.",items:[
  {id:"j-gidsen",w:"jack",t:"De 39 gidsen beoordelen",wat:"Per gids de tekst nalopen. Bij twaalf bottelaars staat ook een voorstel voor een logo.",waarom:"De gidsen zijn de inhoud van de site. We hebben alle open punten uitgezocht en de teksten daarna aangepast. Daarom vragen we ook Campbeltown en Highland opnieuw.",l:["gidsen","Naar Gidsen beoordelen"]},
  {id:"j-vragen",w:"jack",t:"Zeven nieuwe vragen beantwoorden",wat:"Ze gaan over de juridische teksten, de bannervakken, de foto's en logo's, het land bij twee merken en het testen.",waarom:"Met jouw antwoorden kunnen wij de volgende stappen zetten zonder te gokken.",l:["hiaten","Naar Vragen voor Jack"]},
  {id:"j-herkomst",w:"jack",t:"De laatste twee herkomstvragen",wat:"Bij twee stokerijen spreekt de winkel zichzelf tegen over het land.",waarom:"Dan is de lijst Herkomst helemaal rond.",l:["beoordeel","Naar Beoordelen"]},
  {id:"j-flessen",w:"jack",d:true,t:"Productteksten beoordelen",wat:"Ga door in je eigen tempo. De belangrijkste flessen staan vooraan.",waarom:"Elke fles die je beoordeelt, klopt straks op de site. Dit hoeft niet af te zijn vóór het testen.",l:["beoordeel","Naar Beoordelen"]}
 ]},
 {k:"Afspraken op papier",ic:"papier",t:"Dit is nodig voordat er anderen dan jij en John op de testsite komen.",items:[
  {id:"j-uittreksel",w:"jack",t:"Uittreksel van de Kamer van Koophandel sturen",wat:"Een recent uittreksel van De Druiventuin. Daarop staan de rechtsvorm en wie mag tekenen.",waarom:"Die gegevens komen in de overeenkomst en in de teksten op de site. We willen ze niet overtypen uit een bericht."},
  {id:"w-voorzet",w:"wij",t:"Voorzet voor de juridische teksten opleveren",wat:"Vier stukken: een overeenkomst over jouw gegevens, een aanvulling op de privacyverklaring, de retourregels met formulier en een tekst over cookies.",waarom:"Wij zijn geen jurist. We maken de voorzet, zodat jouw adviseur niet op nul begint."},
  {id:"j-nakijken",w:"jack",t:"De teksten laten nakijken",wat:"Je eigen jurist of adviseur, of een dienst voor webwinkels. In de zeven vragen kies je wie.",waarom:"Het zijn jouw teksten en jouw winkel. Een jurist moet zeggen of ze kloppen."},
  {id:"s-tekenen",w:"samen",t:"De overeenkomst over jouw gegevens tekenen",wat:"Hierin staat wat TankeSmed met gegevens van Whiskysite mag doen, hoe ze beveiligd zijn en wat er gebeurt als we stoppen.",waarom:"De wet vraagt dit zodra iemand anders bij jouw gegevens kan. Het beschermt jou."}
 ]},
 {k:"De testsite klaarzetten",ic:"bouw",t:"Dit doen wij, in jouw accounts. Je hoeft alleen de twee punten met jouw naam te doen.",items:[
  {id:"w-opslag",w:"wij",t:"De opslag Whiskysite inrichten",wat:"In jouw Supabase-account, op servers in de Europese Unie.",waarom:"Alles van Whiskysite staat dan bij elkaar, los van de rest."},
  {id:"w-verhuizen",w:"wij",t:"Jouw antwoorden en beelden verhuizen",wat:"Alles wat je tot nu toe hebt ingevuld gaat mee. Je raakt niets kwijt.",waarom:"De testsite moet verder gaan waar de demo ophoudt."},
  {id:"w-testsite",w:"wij",t:"De testsite achter een login zetten",wat:"In jouw Cloudflare-account. Een afgesloten adres; zoekmachines kunnen er niet bij.",waarom:"Jouw catalogus en teksten horen niet open op internet te staan zolang we testen."},
  {id:"j-testers",w:"jack",t:"E-mailadressen van de testers doorgeven",wat:"Van iedereen die mee mag kijken. Dat kan in de vraag over het testen.",waarom:"Alleen die adressen krijgen een inlogcode."},
  {id:"s-sleutel",w:"samen",t:"De sleutels van Lightspeed opnieuw instellen",wat:"We bellen en doen dit samen achter het scherm: een nieuwe sleutel om te lezen, een aparte om te schrijven, en de oude gaat weg.",waarom:"Zo kan er niets per ongeluk in je winkel veranderen. Een sleutel sturen we nooit per mail."},
  {id:"w-acties",w:"wij",t:"Jouw keuzes over acties en turf inbouwen",wat:"Acties zichtbaar voor iedereen, vaste vakken voor banners met de afmetingen erbij, en een turffilter met licht, middel en zwaar.",waarom:"Dat heb je zo gekozen in je antwoorden."}
 ]},
 {k:"Samen testen",ic:"proef",t:"Samen de hele site doorlopen. Jij beslist of hij goed genoeg is.",items:[
  {id:"w-testlijst",w:"wij",t:"Een testlijst maken",wat:"Een lijst van wat we samen nalopen: zoeken, filteren, een fles bekijken, bestellen, mobiel.",waarom:"Zo weten we allebei wanneer de site goed genoeg is."},
  {id:"j-boekhouder",w:"jack",t:"Je boekhouder één vraag stellen",wat:"Wat doet één testbestelling van € 0,01 met een creditnota met je factuurnummers en btw?",waarom:"We willen het afrekenen één keer echt proberen, zonder dat je administratie er last van heeft."},
  {id:"s-testbestelling",w:"samen",t:"Eén testbestelling doen",wat:"Met een verborgen testproduct van € 0,01. Pas na jouw akkoord en het antwoord van je boekhouder.",waarom:"Alleen zo zien we of bestellen van begin tot eind werkt."},
  {id:"j-logos",w:"jack",t:"Twee logo's aanleveren",wat:"Van twee bottelaars vinden we geen bruikbaar logo, onder andere Adelphi. John belt je hierover.",waarom:"Een logo gebruiken we alleen als het van de eigenaar komt, met toestemming."},
  {id:"s-akkoord",w:"samen",t:"Jouw oordeel: klaar voor livegang of niet",wat:"We lopen de testlijst na. Jij beslist.",waarom:"De site gaat pas naar buiten als jij dat wilt."}
 ]}
];

var SP_WIE={jack:["Jij","ok"],wij:["TankeSmed","warn"],samen:["Samen","warn"]};

function spKan(){return typeof WS!=="undefined"&&!!(WS.sb&&WS.gebruiker&&WS.geladen&&!WS.fout);}
function spAlle(){var a=[];SP_STAPPEN.forEach(function(g){g.items.forEach(function(s){a.push(s);});});return a;}
function spDatum(iso){try{return new Intl.DateTimeFormat("nl-NL",{day:"numeric",month:"short",timeZone:"Europe/Amsterdam"}).format(new Date(iso));}catch(e){return "";}}

function spLaad(){
 if(!spKan()||SP.bezig)return;
 SP.bezig=true;
 WS.sb.from("ws_stappen").select("stap_id,gedaan,door_naam,op").then(function(r){
  SP.bezig=false;
  if(r.error){
   SP.tabel=!/does not exist|relation|schema cache|not find/i.test(r.error.message||"");
   SP.fout=SP.tabel?"De stand van de stappen kon niet worden geladen.":"";
   SP.geladen=true;wsHerteken();return;
  }
  SP.stand={};(r.data||[]).forEach(function(x){SP.stand[x.stap_id]=x;});
  SP.tabel=true;SP.fout="";SP.geladen=true;wsHerteken();
 });
}
function spVink(id,aan){
 /* alleen bekende stappen; de database controleert het id en het account nog een keer */
 var bekend=spAlle().some(function(s){return s.id===id&&!s.d;});
 if(!bekend||!spKan()||!SP.tabel||SP.bewaar)return false;
 SP.bewaar=id;wsHerteken();
 WS.sb.from("ws_stappen").upsert({stap_id:id,gedaan:!!aan},{onConflict:"stap_id"}).select("stap_id,gedaan,door_naam,op").then(function(r){
  SP.bewaar="";
  if(r.error){SP.fout="Opslaan is niet gelukt. Probeer het opnieuw.";}
  else{SP.fout="";(r.data||[]).forEach(function(x){SP.stand[x.stap_id]=x;});}
  wsHerteken();
 });
 return false;
}

function spAf(s){return !!(SP.stand[s.id]||{}).gedaan;}
function spTel(lijst){var t=lijst.filter(function(s){return !s.d;});return [t.filter(spAf).length,t.length];}
function spTab(t){SP.tab=t;wsHerteken();return false;}

function spStap(s){
 var st=SP.stand[s.id]||{},af=!!st.gedaan,wie=SP_WIE[s.w]||SP_WIE.wij,kan=spKan()&&SP.tabel&&!s.d;
 var vak=s.d?'<span class="st warn" style="white-space:nowrap" title="Loopt door, niet af te vinken">loopt</span>'
  :'<input type="checkbox" aria-label="'+wsH(s.t)+' afvinken" style="width:18px;height:18px;accent-color:var(--green);cursor:'+(kan?"pointer":"not-allowed")+'"'
   +(af?" checked":"")+(kan&&SP.bewaar!==s.id?"":" disabled")+' onchange="spVink(\''+s.id+'\',this.checked)">';
 return '<tr'+(af?' style="opacity:.62"':'')+'><td style="width:56px;vertical-align:top;padding-top:12px">'+vak+'</td>'
  +'<td style="vertical-align:top"><b style="font-size:13.5px'+(af?';text-decoration:line-through':'')+'">'+wsH(s.t)+'</b> <span class="st '+wie[1]+'">'+wie[0]+'</span>'
  +'<div style="margin-top:4px">'+wsH(s.wat)+'</div>'
  +'<div style="margin-top:3px;color:var(--muted)"><i>Waarom:</i> '+wsH(s.waarom)+'</div>'
  +(s.hoe?'<ol style="margin:6px 0 0 18px;line-height:1.6">'+s.hoe.map(function(x){return '<li>'+wsH(x)+'</li>';}).join("")+'</ol>':'')
  +(s.l?'<div style="margin-top:5px"><a href="#/admin/'+s.l[0]+'" style="color:var(--amber);font-weight:600">'+wsH(s.l[1])+' →</a></div>':'')
  +(af&&st.op?'<div style="margin-top:4px;font-size:11.5px;color:var(--muted)">Afgevinkt'+(st.door_naam?' door '+wsH(st.door_naam):'')+' op '+spDatum(st.op)+'</div>':'')
  +'</td></tr>';
}

/* ---------- pictogrammen (eigen tekenwerk, lijnstijl) ---------- */
var SP_IC={
 sleutel:'<circle cx="8" cy="12" r="4"/><path d="M12 12h9M17 12v3M20 12v2"/>',
 vink:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12l3 3 5-6"/>',
 papier:'<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
 bouw:'<path d="M4 20h16M6 20V9l6-5 6 5v11M10 20v-6h4v6"/>',
 proef:'<path d="M8 3h8l-1 8a3 3 0 0 1-6 0zM12 14v6M9 21h6"/>',
 vlag:'<path d="M6 21V4M6 5h11l-2 3 2 3H6"/>',
 mens:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/>',
 deur:'<path d="M6 21V4h12v17M4 21h16"/><circle cx="14.5" cy="13" r="1"/>',
 kluis:'<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M12 9v1M12 14v1M9 12h1M14 12h1"/>',
 winkel:'<path d="M4 9l1-5h14l1 5M5 9v11h14V9M4 9h16M9 20v-6h6v6"/>'
};
function spIc(n,k){return '<svg viewBox="0 0 24 24" width="'+(k||22)+'" height="'+(k||22)+'" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(SP_IC[n]||"")+'</svg>';}

var SP_CSS='<style>'
 +'.sp-tabs{display:flex;gap:6px;margin:0 0 18px;border-bottom:1px solid var(--line)}'
 +'.sp-tabs a{padding:9px 16px;font-size:13px;font-weight:600;color:var(--muted);border-bottom:2px solid transparent;margin-bottom:-1px}'
 +'.sp-tabs a.act{color:var(--amber);border-bottom-color:var(--amber)}'
 +'.sp-kop{font-family:var(--serif,Georgia,serif);font-size:15px;font-weight:700;margin:26px 0 12px;display:flex;align-items:center;gap:10px}'
 +'.sp-kop:after{content:"";flex:1;height:1px;background:var(--line)}'
 +'.sp-route{display:grid;grid-template-columns:repeat(6,1fr);gap:0;position:relative}'
 +'.sp-halte{text-align:center;padding:0 6px;position:relative}'
 +'.sp-halte:before{content:"";position:absolute;top:25px;left:-50%;width:100%;height:3px;background:var(--line);z-index:0}'
 +'.sp-halte:first-child:before{display:none}'
 +'.sp-halte.af:before,.sp-halte.nu:before{background:var(--green)}'
 +'.sp-bol{width:52px;height:52px;border-radius:50%;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;background:var(--card);border:2px solid var(--line);color:var(--muted);position:relative;z-index:1}'
 +'.sp-halte.af .sp-bol{background:var(--green);border-color:var(--green);color:#fff}'
 +'.sp-halte.nu .sp-bol{border-color:var(--amber);color:var(--amber);box-shadow:0 0 0 5px rgba(138,28,38,.09)}'
 +'.sp-halte b{display:block;font-size:12.5px;line-height:1.3}.sp-halte span{display:block;font-size:11.5px;color:var(--muted);margin-top:2px}'
 +'.sp-halte em{display:inline-block;font-style:normal;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--amber);margin-top:4px}'
 +'.sp-drie{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}'
 +'.sp-wissel{border:1px solid var(--line);border-radius:14px;background:var(--bg2);overflow:hidden}'
 +'.sp-wissel h5{margin:0;padding:12px 16px 0;font-size:13.5px}'
 +'.sp-wissel .van{padding:8px 16px 12px;font-size:12.5px;color:var(--muted)}'
 +'.sp-wissel .naar{padding:12px 16px 14px;font-size:12.5px;background:var(--card);border-top:1px dashed var(--line);position:relative}'
 +'.sp-wissel .naar:before{content:"↓";position:absolute;top:-12px;left:16px;width:22px;height:22px;border-radius:50%;background:var(--green);color:#fff;font-size:13px;line-height:22px;text-align:center}'
 +'.sp-wissel small{display:block;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:3px}'
 +'.sp-wissel .van small{color:var(--muted)}.sp-wissel .naar small{color:var(--green);padding-top:4px}'
 +'.sp-keten{display:grid;grid-template-columns:1fr 34px 1.25fr 34px 1.25fr;align-items:stretch}'
 +'.sp-blok{border:1px solid var(--line);border-radius:14px;padding:14px 14px 12px;background:var(--card);text-align:center}'
 +'.sp-blok .ic{width:44px;height:44px;border-radius:12px;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;background:var(--bg2);color:var(--amber)}'
 +'.sp-blok b{display:block;font-size:13.5px}.sp-blok i{display:block;font-style:normal;font-size:11px;color:var(--muted);margin-bottom:5px}.sp-blok p{font-size:12px;color:var(--muted);margin:0;line-height:1.45}'
 +'.sp-blok .tag{display:inline-block;margin-top:8px;font-size:10.5px;font-weight:700;padding:2px 9px;border-radius:9px;background:rgba(63,143,79,.14);color:var(--green)}'
 +'.sp-blok.rustig{background:var(--bg2);border-style:dashed}.sp-blok.rustig .tag{background:rgba(0,0,0,.06);color:var(--muted)}'
 +'.sp-pijl{display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:20px}'
 +'.sp-onder{display:grid;grid-template-columns:1fr 34px 1.25fr 34px 1.25fr;margin-top:8px}'
 +'.sp-onder .lijn{grid-column:5;text-align:center;color:var(--muted);font-size:11.5px;line-height:1.3;padding:2px 0 6px}'
 +'.sp-onder .sp-blok{grid-column:5}'
 +'.sp-teller{display:flex;align-items:center;gap:14px;border:1px solid var(--line);border-radius:14px;padding:14px 16px;background:var(--bg2)}'
 +'.sp-teller .rond{flex:0 0 58px;height:58px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;color:var(--text)}'
 +'.sp-teller b{font-size:13.5px}.sp-teller p{margin:2px 0 0;font-size:12px;color:var(--muted)}'
 +'.sp-eerst{border:1px solid var(--line);border-left:4px solid var(--amber);border-radius:12px;padding:14px 16px;background:var(--card)}'
 +'.sp-eerst ol{margin:8px 0 0 18px;font-size:13px;line-height:1.75}.sp-eerst li a{color:var(--amber);font-weight:600}'
 +'.sp-blijft{display:grid;grid-template-columns:repeat(2,1fr);gap:8px 18px;font-size:12.5px}'
 +'.sp-blijft div{display:flex;gap:8px;align-items:flex-start}.sp-blijft div:before{content:"✓";color:var(--green);font-weight:700}'
 +'@media(max-width:860px){.sp-route{grid-template-columns:repeat(3,1fr);row-gap:18px}.sp-halte:nth-child(4):before{display:none}.sp-drie,.sp-blijft{grid-template-columns:1fr}'
 +'.sp-keten,.sp-onder{grid-template-columns:1fr}.sp-pijl{transform:rotate(90deg);padding:4px 0}.sp-onder .lijn,.sp-onder .sp-blok{grid-column:1}}'
 +'</style>';

function spRond(af,tot){var p=tot?Math.round(af/tot*100):0;
 return '<div class="rond" style="background:conic-gradient(var(--green) '+p+'%,var(--line) 0)"><span style="width:44px;height:44px;border-radius:50%;background:var(--bg2);display:flex;align-items:center;justify-content:center">'+af+'/'+tot+'</span></div>';}

function spOverzicht(){
 var toon=spKan()&&SP.tabel;
 /* de route: vijf haltes plus livegang; 'nu' is de eerste halte die niet af is */
 var nuGezet=false;
 var haltes=SP_STAPPEN.map(function(g,i){
  var t=spTel(g.items),af=toon&&t[1]>0&&t[0]===t[1],nu=!af&&!nuGezet;if(nu)nuGezet=true;
  var jij=g.items.filter(function(s){return s.w==="jack"&&!s.d;}).length;
  return '<div class="sp-halte '+(af?"af":nu?"nu":"")+'"><div class="sp-bol">'+(af?spIc("vink",24):spIc(g.ic,24))+'</div><b>'+(i+1)+' · '+wsH(g.k)+'</b>'
   +'<span>'+(toon?t[0]+' van '+t[1]+' klaar':t[1]+' stappen')+(jij?' · '+jij+' voor jou':'')+'</span>'+(nu?'<em>Hier zijn we</em>':'')+'</div>';
 }).join("")+'<div class="sp-halte"><div class="sp-bol">'+spIc("vlag",24)+'</div><b>Livegang</b><span>Pas na jouw akkoord</span></div>';
 var jack=spAlle().filter(function(s){return s.w==="jack";}),wij=spAlle().filter(function(s){return s.w==="wij";}),sam=spAlle().filter(function(s){return s.w==="samen";});
 var tj=spTel(jack),tw=spTel(wij),ts=spTel(sam);
 var eerst=jack.filter(function(s){return !s.d&&!spAf(s);}).slice(0,3);
 var h='<div class="sync-box" style="margin-bottom:6px"><b style="font-family:var(--serif,Georgia,serif);font-size:17px">Van demo naar testsite</b>'
  +'<p style="font-size:13.5px;color:var(--text);margin-top:6px">'+wsH(SP_BLAD.kort)+'</p></div>';
 h+='<div class="sp-kop">De route</div><div class="sp-route">'+haltes+'</div>';
 h+='<div class="sp-kop">Wie doet wat</div><div class="sp-drie">'
  +[["Jij",tj,"Accounts, gidsen, vragen en een paar dingen regelen."],["TankeSmed",tw,"Inrichten, verhuizen, bouwen en de voorzet voor de teksten."],["Samen",ts,"Abonnement, tekenen, sleutels, testbestelling en het eindoordeel."]].map(function(x){
   return '<div class="sp-teller">'+(toon?spRond(x[1][0],x[1][1]):'<div class="rond" style="background:var(--line)"><span style="width:44px;height:44px;border-radius:50%;background:var(--bg2);display:flex;align-items:center;justify-content:center">'+x[1][1]+'</span></div>')
    +'<div><b>'+x[0]+'</b><p>'+x[2]+'</p></div></div>';}).join("")+'</div>';
 if(eerst.length)h+='<div class="sp-kop">Als eerste voor jou</div><div class="sp-eerst"><b style="font-size:13.5px">Begin hier</b><ol>'
  +eerst.map(function(s){return '<li>'+wsH(s.t)+(s.l?' · <a href="#/admin/'+s.l[0]+'">'+wsH(s.l[1])+' →</a>':'')+'</li>';}).join("")
  +'</ol><p style="margin:8px 0 0;font-size:12.5px"><a href="#" onclick="return spTab(\'stappen\')" style="color:var(--amber);font-weight:600">Alle stappen met uitleg en afvinken →</a></p></div>';
 h+='<div class="sp-kop">Wat verandert er</div><div class="sp-drie">'
  +SP_BLAD.verandert.slice(0,3).map(function(v){return '<div class="sp-wissel"><h5>'+wsH(v[0])+'</h5><div class="van"><small>Nu</small>'+wsH(v[1])+'</div><div class="naar"><small>Straks</small>'+wsH(v[2])+'</div></div>';}).join("")+'</div>';
 h+='<div class="sp-kop">Zo werkt de testsite</div>'
  +'<div class="sp-keten">'
  +'<div class="sp-blok"><div class="ic">'+spIc("mens")+'</div><b>Jij en de testers</b><i>wie jij toelaat</i><p>Openen het adres van de testsite.</p></div>'
  +'<div class="sp-pijl">→</div>'
  +'<div class="sp-blok"><div class="ic">'+spIc("deur")+'</div><b>Cloudflare</b><i>de deur en de etalage</i><p>Vraagt je e-mailadres en stuurt een inlogcode. Laat daarna de site zien.</p><span class="tag">Op jouw naam</span></div>'
  +'<div class="sp-pijl">→</div>'
  +'<div class="sp-blok"><div class="ic">'+spIc("kluis")+'</div><b>Supabase</b><i>de opslag in de EU</i><p>Bewaart je antwoorden, de acties en de foto\'s. Elke dag een reservekopie.</p><span class="tag">Op jouw naam</span></div>'
  +'</div><div class="sp-onder"><div class="lijn">↕<br>leest prijzen en voorraad<br>schrijven alleen na jouw akkoord per regel</div>'
  +'<div class="sp-blok rustig"><div class="ic">'+spIc("winkel")+'</div><b>Lightspeed</b><i>je winkel en je kassa</i><p>Blijft zoals hij is. Bestellen en betalen gaat hier.</p><span class="tag">Verandert niet</span></div></div>'
  +'<p style="font-size:12.5px;color:var(--muted);margin-top:10px">Jons TankeSmed bouwt en beheert de site in jouw accounts. '+wsH(SP_BLAD.later)+'</p>';
 h+='<div class="sp-kop">Wat blijft zoals het is</div><div class="sp-blijft">'+SP_BLAD.blijft.map(function(b){return '<div>'+wsH(b)+'</div>';}).join("")+'</div>';
 return h;
}

function spLijst(){
 var h='<p style="font-size:12.5px;color:var(--muted);margin-bottom:6px"><span class="st ok">Jij</span> is voor jou · <span class="st warn">TankeSmed</span> doen wij · <span class="st warn">Samen</span> doen we met z\'n tweeën. Wat klaar is, vink je af.</p>';
 SP_STAPPEN.forEach(function(g,i){
  var t=spTel(g.items);
  h+='<h4 style="font-size:14.5px;margin:20px 0 2px;display:flex;align-items:center;gap:8px"><span style="color:var(--amber);display:flex">'+spIc(g.ic,20)+'</span>'+(i+1)+' · '+wsH(g.k)
   +(spKan()&&SP.tabel?' <span style="font-size:11.5px;font-weight:500;color:var(--muted)">'+t[0]+' van '+t[1]+' klaar</span>':'')+'</h4>'
   +'<p style="font-size:12.5px;color:var(--muted);margin-bottom:4px">'+wsH(g.t)+'</p><table class="atable">'+g.items.map(spStap).join("")+'</table>';
 });
 return h;
}

function spUitleg(){
 return '<h3 style="font-size:16px;margin:4px 0 10px">Wat verandert er, en waarom</h3>'
  +'<table class="atable"><tr><th>Onderdeel</th><th>Nu</th><th>Straks</th><th>Waarom</th></tr>'
  +SP_BLAD.verandert.map(function(v){return '<tr><td style="vertical-align:top"><b>'+wsH(v[0])+'</b></td><td style="vertical-align:top;color:var(--muted)">'+wsH(v[1])+'</td><td style="vertical-align:top">'+wsH(v[2])+'</td><td style="vertical-align:top;color:var(--muted)">'+wsH(v[3])+'</td></tr>';}).join("")+'</table>'
  +'<h3 style="font-size:16px;margin:24px 0 10px">Wie helpt daarbij</h3>'
  +'<table class="atable"><tr><th>Partij</th><th>Wat ze doen</th><th>Goed om te weten</th></tr>'
  +SP_BLAD.partijen.map(function(p){return '<tr><td><b>'+wsH(p[0])+'</b></td><td>'+wsH(p[1])+'</td><td style="color:var(--muted)">'+wsH(p[2])+'</td></tr>';}).join("")+'</table>'
  +'<h3 style="font-size:16px;margin:24px 0 10px">Waarom accounts op jouw naam</h3>'
  +'<ul style="margin:0 0 0 18px;font-size:13px;line-height:1.7"><li>De opslag en de testsite zijn dan vanaf de eerste dag van jou.</li><li>Jij bepaalt wie erbij kan. John is beheerder zolang jij dat wilt.</li><li>Er hoeft later niets te worden overgedragen.</li><li>Een account bij GitHub (waar de code staat) is nu niet nodig. Dat komt pas bij de overdracht van de code.</li></ul>'
  +'<p style="font-size:12.5px;color:var(--muted);margin-top:14px">'+wsH(SP_BLAD.later)+'</p>';
}

function vAdminStappen(){
 if(spKan()&&!SP.geladen)spLaad();
 var tabs=[["overzicht","Overzicht"],["stappen","Stappen en afvinken"],["uitleg","Uitleg"]];
 if(!tabs.some(function(t){return t[0]===SP.tab;}))SP.tab="overzicht";
 var h=SP_CSS+'<h3 style="font-size:20px;margin-bottom:6px">Naar de testsite</h3>'
  +'<p style="font-size:12.5px;color:var(--muted);margin-bottom:14px">Bijgewerkt op '+SP_VERSIE+'. Dit blad lopen John en jij samen na.</p>';
 if(typeof WS==="undefined"||!WS.gebruiker)h+=(typeof wsLoginBlok==="function"?wsLoginBlok("stappen af te vinken"):"");
 else h+=(typeof wsStatusRegel==="function"?wsStatusRegel():"");
 if(!SP.tabel)h+='<div class="sync-box"><b>Afvinken staat nog uit</b><p>De opslag voor dit blad is nog niet aangezet. Lezen kan al wel.</p></div>';
 if(SP.fout)h+='<p class="wsfout">'+wsH(SP.fout)+'</p>';
 h+='<div class="sp-tabs">'+tabs.map(function(t){return '<a href="#" class="'+(SP.tab===t[0]?"act":"")+'" onclick="return spTab(\''+t[0]+'\')">'+t[1]+'</a>';}).join("")+'</div>';
 h+=SP.tab==="stappen"?spLijst():SP.tab==="uitleg"?spUitleg():spOverzicht();
 return h;
}
