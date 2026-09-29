/* Productfoto's uit de beeldtool, live voor iedere bezoeker.
   De beeldtool zet een opgemaakte foto in Supabase (opslag 'ws-beelden', <product-ID>.webp)
   en noteert hem in de tabel ws_beelden. Deze pagina vraagt die lijst één keer op bij het
   laden en zet de foto op het betreffende product (en op samples van die fles).
   Geen push nodig. Lukt het ophalen niet, dan blijft het beeld uit de repo of de winkel staan.
   Alleen de publieke 'publishable' sleutel: lezen is openbaar, schrijven vraagt een login
   met toegang (RLS in de database). Geen geheimen in dit bestand. */
var BEELD_LIVE={
 url:"https://fbtsezpjutzhvjodexpa.supabase.co",
 sleutel:"sb_publishable_RFNsxnzhA7Pi4f1uo7LigQ_xf1z8sri",
 bucket:"ws-beelden",
 geladen:{}   /* product-ID -> versie (ms), wat al is toegepast */
};
function beeldLiveUrl(pid,versie){
 return BEELD_LIVE.url+"/storage/v1/object/public/"+BEELD_LIVE.bucket+"/"+encodeURIComponent(pid)+".webp?v="+versie;
}
/* Zet één foto op de site. Geeft true als er een product is bijgewerkt. */
function beeldLivePasToe(pid,versie,urlOverride){
 pid=String(pid);if(!/^\d+$/.test(pid))return false;
 var url=urlOverride||beeldLiveUrl(pid,versie),raak=false;
 BEELD_LIVE.geladen[pid]=versie;
 if(typeof BEELDEN!=="undefined")BEELDEN[pid]=1;
 if(typeof BEELD_AANDACHT!=="undefined"&&BEELD_AANDACHT)
  for(var i=BEELD_AANDACHT.length-1;i>=0;i--)if(String(BEELD_AANDACHT[i].id)===pid)BEELD_AANDACHT.splice(i,1);
 if(typeof CAT==="undefined")return false;
 var T=window.BEELD_TERUG||(window.BEELD_TERUG={});
 CAT.forEach(function(p){
  var eigen=String(p.id)===pid,sample=p._toonSample&&String(p._ouder)===pid;
  if(!eigen&&!sample)return;
  if(!T[pid]&&!p._opgemaakt&&eigen)T[pid]=p.img;   /* winkelfoto bewaren als bron voor de beeldtool */
  p.img=url;p._opgemaakt=true;raak=true;
 });
 return raak;
}
(function(){
 if(typeof fetch!=="function"||typeof Promise==="undefined")return;
 /* Meteen ophalen, maar pas toepassen als de catalogus (CAT) is opgebouwd. */
 var klaar=new Promise(function(ok){
  if(document.readyState!=="loading")ok();else document.addEventListener("DOMContentLoaded",ok);
 });
 var lijst=fetch(BEELD_LIVE.url+"/rest/v1/ws_beelden?select=product_id,versie",
  {headers:{apikey:BEELD_LIVE.sleutel,Authorization:"Bearer "+BEELD_LIVE.sleutel}})
 .then(function(r){return r.ok?r.json():[];});
 Promise.all([lijst,klaar]).then(function(u){return u[0];})
 .then(function(rijen){
  if(!rijen||!rijen.length)return;
  var raak=false;
  rijen.forEach(function(x){if(beeldLivePasToe(x.product_id,Date.parse(x.versie)||0))raak=true;});
  /* Opnieuw tekenen, behalve midden in de beeldtool (daar blijft het werk staan). */
  if(raak&&typeof render==="function"&&!/beeldtool/.test(location.hash))render();
 })
 .catch(function(){ /* stil: het bestaande beeld blijft staan */ });
})();
