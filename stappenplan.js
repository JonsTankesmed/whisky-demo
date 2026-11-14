/* ================= STAPPENPLAN NAAR DE TESTSITE =================
   Uitlegblad voor Jack in het beheer: wat we gaan doen, waarom, en wie wat doet.
   De tekst staat hieronder (SP_BLAD en SP_STAPPEN). Afvinken wordt bewaard in Supabase,
   tabel ws_stappen (zie supabase/ws_stappen.sql). Alleen accounts in ws_toegang kunnen
   lezen en schrijven; dat regelt de database zelf (RLS). Bestaat de tabel nog niet, dan
   is het blad alleen-lezen. Alleen de publieke sleutel wordt gebruikt (WS uit vragenlijst.js).
   Geen geheimen en geen handelscijfers in dit bestand. */
var SP={stand:{},geladen:false,bezig:false,tabel:true,fout:"",bewaar:""};
var SP_VERSIE="14 november 2026";

var SP_BLAD={
 kort:"De demo wordt een echte testsite. Die komt op een eigen, afgesloten plek: alleen wie wij toelaten, kan erbij. Daar testen we samen de hele site. Pas als jij tevreden bent, praten we over livegang.",
 verandert:[
  ["De site","Een demo met een toegangscode. Dat past bij een demo, niet bij een testsite met je hele catalogus.","Een afgesloten testsite. Je logt in met je e-mailadres en krijgt een code in je mail.","Jouw catalogus en teksten horen niet open op internet te staan zolang we testen."],
  ["De opslag","Jouw antwoorden staan in een opslag die TankeSmed ook voor andere dingen gebruikt.","Een eigen opslag met de naam Whiskysite, op servers in de Europese Unie. Die gaat later op jouw naam.","Alles van Whiskysite staat dan bij elkaar en los van de rest. Overdragen aan jou is daarna één stap."],
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
  ["Cloudflare","Laat de testsite zien en regelt het inloggen met een code per e-mail.","Ziet het e-mailadres van wie inlogt."],
  ["Supabase","Bewaart jouw antwoorden, de acties en de foto's.","Servers in de Europese Unie."],
  ["Lightspeed","Blijft je winkel en je kassa.","Hier verandert niets."]
 ],
 later:"Het adres van de testsite is tijdelijk en eindigt niet op whiskysite.nl. Het echte adres (bijvoorbeeld ontdek.whiskysite.nl) regelen we bij livegang. Daarvoor is dan één instelling nodig bij wie je domein beheert."
};

/* w = wie (jack / wij / samen), d = doorlopend (niet af te vinken), l = link in het beheer */
var SP_STAPPEN=[
 {k:"Nu",t:"Dit kun je vandaag al doen, hier in het beheer.",items:[
  {id:"j-gidsen",w:"jack",t:"De 39 gidsen beoordelen",wat:"Per gids de tekst nalopen. Bij twaalf bottelaars staat ook een voorstel voor een logo.",waarom:"De gidsen zijn de inhoud van de site. We hebben alle open punten uitgezocht en de teksten daarna aangepast. Daarom vragen we ook Campbeltown en Highland opnieuw.",l:["gidsen","Naar Gidsen beoordelen"]},
  {id:"j-vragen",w:"jack",t:"Zeven nieuwe vragen beantwoorden",wat:"Ze gaan over de juridische teksten, de bannervakken, de foto's en logo's, het land bij twee merken en het testen.",waarom:"Met jouw antwoorden kunnen wij de volgende stappen zetten zonder te gokken.",l:["hiaten","Naar Vragen voor Jack"]},
  {id:"j-herkomst",w:"jack",t:"De laatste twee herkomstvragen",wat:"Bij twee stokerijen spreekt de winkel zichzelf tegen over het land.",waarom:"Dan is de lijst Herkomst helemaal rond.",l:["beoordeel","Naar Beoordelen"]},
  {id:"j-flessen",w:"jack",d:true,t:"Productteksten beoordelen",wat:"Ga door in je eigen tempo. De belangrijkste flessen staan vooraan.",waarom:"Elke fles die je beoordeelt, klopt straks op de site. Dit hoeft niet af te zijn vóór het testen.",l:["beoordeel","Naar Beoordelen"]}
 ]},
 {k:"Voor de afspraken op papier",t:"Dit is nodig voordat er anderen dan jij en John op de testsite komen.",items:[
  {id:"j-uittreksel",w:"jack",t:"Uittreksel van de Kamer van Koophandel sturen",wat:"Een recent uittreksel van De Druiventuin. Daarop staan de rechtsvorm en wie mag tekenen.",waarom:"Die gegevens komen in de overeenkomst en in de teksten op de site. We willen ze niet overtypen uit een bericht."},
  {id:"w-voorzet",w:"wij",t:"Voorzet voor de juridische teksten opleveren",wat:"Vier stukken: een overeenkomst over jouw gegevens, een aanvulling op de privacyverklaring, de retourregels met formulier en een tekst over cookies.",waarom:"Wij zijn geen jurist. We maken de voorzet, zodat jouw adviseur niet op nul begint."},
  {id:"j-nakijken",w:"jack",t:"De teksten laten nakijken",wat:"Je eigen jurist of adviseur, of een dienst voor webwinkels. In de zeven vragen kies je wie.",waarom:"Het zijn jouw teksten en jouw winkel. Een jurist moet zeggen of ze kloppen."},
  {id:"s-tekenen",w:"samen",t:"De overeenkomst over jouw gegevens tekenen",wat:"Hierin staat wat TankeSmed met gegevens van Whiskysite mag doen, hoe ze beveiligd zijn en wat er gebeurt als we stoppen.",waarom:"De wet vraagt dit zodra iemand anders jouw gegevens bewaart. Het beschermt jou."}
 ]},
 {k:"De testsite klaarzetten",t:"Dit doen wij. Je hoeft alleen de twee punten met jouw naam te doen.",items:[
  {id:"w-opslag",w:"wij",t:"De eigen opslag Whiskysite aanmaken",wat:"Een nieuwe, betaalde opslag in de Europese Unie, met elke dag een reservekopie.",waarom:"Zie hierboven bij De opslag."},
  {id:"w-verhuizen",w:"wij",t:"Jouw antwoorden en beelden verhuizen",wat:"Alles wat je tot nu toe hebt ingevuld gaat mee. Je raakt niets kwijt.",waarom:"De testsite moet verder gaan waar de demo ophoudt."},
  {id:"w-testsite",w:"wij",t:"De testsite achter een login zetten",wat:"Een afgesloten adres. Zoekmachines kunnen er niet bij.",waarom:"Zie hierboven bij De site."},
  {id:"j-testers",w:"jack",t:"E-mailadressen van de testers doorgeven",wat:"Van iedereen die mee mag kijken. Dat kan in de vraag over het testen.",waarom:"Alleen die adressen krijgen een inlogcode."},
  {id:"s-sleutel",w:"samen",t:"De sleutels van Lightspeed opnieuw instellen",wat:"We bellen en doen dit samen achter het scherm: een nieuwe sleutel om te lezen, een aparte om te schrijven, en de oude gaat weg.",waarom:"Zie hierboven bij De sleutel. Een sleutel sturen we nooit per mail."},
  {id:"w-acties",w:"wij",t:"Jouw keuzes over acties en turf inbouwen",wat:"Acties zichtbaar voor iedereen, vaste vakken voor banners met de afmetingen erbij, en een turffilter met licht, middel en zwaar.",waarom:"Dat heb je zo gekozen in je antwoorden."}
 ]},
 {k:"Testen",t:"Samen de hele site doorlopen.",items:[
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
function spZet(id,aan){
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

function spStap(s){
 var st=SP.stand[s.id]||{},af=!!st.gedaan,wie=SP_WIE[s.w]||SP_WIE.wij,kan=spKan()&&SP.tabel&&!s.d;
 var vak=s.d?'<span class="st warn" style="white-space:nowrap" title="Loopt door, niet af te vinken">loopt</span>'
  :'<input type="checkbox" aria-label="'+wsH(s.t)+' afvinken" style="width:18px;height:18px;accent-color:var(--green);cursor:'+(kan?"pointer":"not-allowed")+'"'
   +(af?" checked":"")+(kan&&SP.bewaar!==s.id?"":" disabled")+' onchange="spZet(\''+s.id+'\',this.checked)">';
 return '<tr'+(af?' style="opacity:.62"':'')+'><td style="width:56px;vertical-align:top;padding-top:12px">'+vak+'</td>'
  +'<td style="vertical-align:top"><b style="font-size:13.5px'+(af?';text-decoration:line-through':'')+'">'+wsH(s.t)+'</b> <span class="st '+wie[1]+'">'+wie[0]+'</span>'
  +'<div style="margin-top:4px">'+wsH(s.wat)+'</div>'
  +'<div style="margin-top:3px;color:var(--muted)"><i>Waarom:</i> '+wsH(s.waarom)+'</div>'
  +(s.l?'<div style="margin-top:5px"><a href="#/admin/'+s.l[0]+'" style="color:var(--amber);font-weight:600">'+wsH(s.l[1])+' →</a></div>':'')
  +(af&&st.op?'<div style="margin-top:4px;font-size:11.5px;color:var(--muted)">Afgevinkt'+(st.door_naam?' door '+wsH(st.door_naam):'')+' op '+spDatum(st.op)+'</div>':'')
  +'</td></tr>';
}

function vAdminStappen(){
 if(spKan()&&!SP.geladen)spLaad();
 var alle=spAlle().filter(function(s){return !s.d;});
 var af=alle.filter(function(s){return (SP.stand[s.id]||{}).gedaan;}).length;
 var jack=alle.filter(function(s){return s.w==="jack";}),jackAf=jack.filter(function(s){return (SP.stand[s.id]||{}).gedaan;}).length;
 var h='<h3 style="font-size:20px;margin-bottom:6px">Naar de testsite: wat we gaan doen en waarom</h3>'
  +'<p style="font-size:12.5px;color:var(--muted);margin-bottom:16px">Bijgewerkt op '+SP_VERSIE+'. Dit blad lopen John en jij samen na. Wat klaar is, vink je af.</p>';
 if(typeof WS==="undefined"||!WS.gebruiker)h+=(typeof wsLoginBlok==="function"?wsLoginBlok("stappen af te vinken"):"");
 else h+=(typeof wsStatusRegel==="function"?wsStatusRegel():"");
 if(!SP.tabel)h+='<div class="sync-box"><b>Afvinken staat nog uit</b><p>De opslag voor dit blad is nog niet aangezet. Lezen kan al wel.</p></div>';
 if(SP.fout)h+='<p class="wsfout">'+wsH(SP.fout)+'</p>';
 h+='<div class="sync-box"><b>In het kort</b><p style="font-size:13.5px;color:var(--text)">'+wsH(SP_BLAD.kort)+'</p></div>';
 if(spKan()&&SP.tabel)h+='<div class="kpis"><div class="kpi"><span>Jouw acties</span><b>'+jackAf+' van '+jack.length+'</b><small>afgevinkt</small></div>'
  +'<div class="kpi"><span>Alle stappen</span><b>'+af+' van '+alle.length+'</b><small>afgevinkt</small></div></div>';
 h+='<h3 style="font-size:16px;margin:22px 0 10px">Wat verandert er</h3>'
  +'<table class="atable"><tr><th>Onderdeel</th><th>Nu</th><th>Straks</th><th>Waarom</th></tr>'
  +SP_BLAD.verandert.map(function(v){return '<tr><td style="vertical-align:top"><b>'+wsH(v[0])+'</b></td><td style="vertical-align:top;color:var(--muted)">'+wsH(v[1])+'</td><td style="vertical-align:top">'+wsH(v[2])+'</td><td style="vertical-align:top;color:var(--muted)">'+wsH(v[3])+'</td></tr>';}).join("")+'</table>';
 h+='<h3 style="font-size:16px;margin:24px 0 10px">Wat blijft zoals het is</h3><ul style="margin:0 0 0 18px;font-size:13px;line-height:1.7">'
  +SP_BLAD.blijft.map(function(b){return '<li>'+wsH(b)+'</li>';}).join("")+'</ul>';
 h+='<h3 style="font-size:16px;margin:24px 0 10px">Wie helpt daarbij</h3>'
  +'<table class="atable"><tr><th>Partij</th><th>Wat ze doen</th><th>Goed om te weten</th></tr>'
  +SP_BLAD.partijen.map(function(p){return '<tr><td><b>'+wsH(p[0])+'</b></td><td>'+wsH(p[1])+'</td><td style="color:var(--muted)">'+wsH(p[2])+'</td></tr>';}).join("")+'</table>'
  +'<p style="font-size:12.5px;color:var(--muted);margin-top:8px">'+wsH(SP_BLAD.later)+'</p>';
 h+='<h3 style="font-size:16px;margin:26px 0 4px">De stappen</h3>'
  +'<p style="font-size:12.5px;color:var(--muted);margin-bottom:6px"><span class="st ok">Jij</span> is voor jou · <span class="st warn">TankeSmed</span> doen wij · <span class="st warn">Samen</span> doen we met z\'n tweeën.</p>';
 SP_STAPPEN.forEach(function(g,i){
  h+='<h4 style="font-size:14px;margin:18px 0 2px">'+(i+1)+' · '+wsH(g.k)+'</h4><p style="font-size:12.5px;color:var(--muted);margin-bottom:4px">'+wsH(g.t)+'</p>'
   +'<table class="atable">'+g.items.map(spStap).join("")+'</table>';
 });
 return h;
}
