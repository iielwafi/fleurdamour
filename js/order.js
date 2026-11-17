(()=> {
 const KEY="fleur-cart",CUSTOM="fleur-custom-request";
 const fallback=[
  {id:"rosee",name:"Le bouquet Rosée",short:"Douceur poudrée · Satin",price:null},
  {id:"eclat",name:"Le bouquet Éclat",short:"Écru & lumière · Satin",price:null},
  {id:"amethyste",name:"Le bouquet Améthyste",short:"Nuances mauves · Satin",price:null}
 ];
 let products=[...fallback],cart=[],custom=null;
 const summary=document.querySelector("#order-summary"),form=document.querySelector("#quote-form"),status=document.querySelector("#copy-status");
 const safe=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const priceLabel=value=>value!==null&&value!==undefined&&value!==""&&Number.isFinite(Number(value))?new Intl.NumberFormat("fr-MA",{maximumFractionDigits:2}).format(Number(value))+" DH":"Prix sur demande";
 function readCart(){try{const saved=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(saved)?saved.filter(x=>x&&typeof x.id==="string"&&Number.isInteger(x.qty)&&x.qty>0).map(x=>({id:x.id,qty:Math.min(x.qty,20)})):[]}catch{return []}}
 function readCustom(){try{return JSON.parse(localStorage.getItem(CUSTOM)||"null")}catch{return null}}
 function render(){
  const rows=cart.map(item=>{
   const p=products.find(product=>product.id===item.id);
   if(!p)return "";
   const c=custom&&custom.productId===item.id?'<small class="summary-custom">Personnalisation : '+safe([custom.color,custom.flowers+" fleurs",custom.finish,custom.dedication?"Mot : "+custom.dedication:""].filter(Boolean).join(" · "))+'</small>':"";
   return '<div class="summary-item"><div><strong>'+safe(p.name)+'</strong><small>'+safe(p.short||"Création artisanale · Satin")+' · Quantité : '+item.qty+'</small><small class="summary-price">'+priceLabel(p.price)+'</small>'+c+'</div><button type="button" data-remove="'+safe(p.id)+'" aria-label="Retirer '+safe(p.name)+'">Retirer</button></div>';
  }).join("");
  summary.innerHTML=rows||'<p class="summary-empty">Votre sélection est vide. Retournez à la collection pour choisir un bouquet.</p>';
  document.querySelector("#year").textContent=new Date().getFullYear();
 }
 summary.addEventListener("click",event=>{
  const button=event.target.closest("[data-remove]");if(!button)return;
  cart=cart.filter(item=>item.id!==button.dataset.remove);
  localStorage.setItem(KEY,JSON.stringify(cart));render();
 });
 form.addEventListener("submit",async event=>{
  event.preventDefault();
  if(!cart.length){status.textContent="Ajoutez au moins un bouquet avant de préparer la demande.";return}
  if(!form.reportValidity())return;
  const data=new FormData(form);
  const lines=cart.map(item=>{
   const p=products.find(product=>product.id===item.id);if(!p)return "";
   const c=custom&&custom.productId===item.id?" — "+[custom.color,custom.flowers+" fleurs",custom.finish,custom.dedication?"Mot : "+custom.dedication:""].filter(Boolean).join(", "):"";
   return "- "+p.name+" x "+item.qty+" — "+priceLabel(p.price)+c;
  }).filter(Boolean).join("\n");
  const message=["DEMANDE DE DEVIS — FLEUR D’AMOUR","","Nom : "+data.get("name"),"Téléphone : "+data.get("phone"),"Ville : "+data.get("city"),"Date souhaitée : "+(data.get("date")||"Non précisée"),"Précisions : "+(data.get("notes")||"Aucune"),"","Bouquets sélectionnés :",lines,"","Merci de me confirmer le prix et les disponibilités."].join("\n");
  try{
   if(window.FleurStore?.configured()){
    await window.FleurStore.submitOrder({
     customer_name:String(data.get("name")).trim(),phone:String(data.get("phone")).trim(),city:String(data.get("city")).trim(),
     requested_date:data.get("date")||null,notes:String(data.get("notes")||"").trim(),
     items:cart.map(item=>{const p=products.find(product=>product.id===item.id);return {id:item.id,name:p?.name||item.id,qty:item.qty,unit_price:p?.price??null}}),
     customisation:custom||{}
    });
    status.textContent="Votre demande a bien été envoyée à Fleur d’Amour. Nous vous contacterons pour confirmer le prix et la disponibilité.";
    form.reset();cart=[];localStorage.setItem(KEY,"[]");localStorage.removeItem(CUSTOM);render();return;
   }
   await navigator.clipboard.writeText(message);
   status.textContent="Votre demande a été copiée. Collez-la dans WhatsApp ou votre e-mail pour l’envoyer.";
  }catch(error){
   status.textContent=error.message||"L’envoi a échoué. Réessayez dans quelques instants.";
  }
 });
 async function init(){
  cart=readCart();custom=readCustom();
  try{
   const remote=await window.FleurStore?.products();
   if(Array.isArray(remote))products=remote.map(product=>({...product,short:product.description||"Création artisanale · Satin"}));
  }catch(error){console.error("Impossible de charger les produits depuis la boutique",error)}
  // Keep cart IDs that exist in the current catalogue; do not hard-code only the original three bouquets.
  const available=new Set(products.map(product=>product.id));
  cart=cart.filter(item=>available.has(item.id));
  localStorage.setItem(KEY,JSON.stringify(cart));
  render();
 }
 init();
})();