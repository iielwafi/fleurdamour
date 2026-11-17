(()=> {
 const KEY="fleur-cart",CUSTOM="fleur-custom-request";
 const fallback=[{id:"rosee",name:"Le bouquet Rosée",short:"Douceur poudrée · Satin",price:null,color:"#ead2d0"},{id:"eclat",name:"Le bouquet Éclat",short:"Écru & lumière · Satin",price:null,color:"#e9e0d2"},{id:"amethyste",name:"Le bouquet Améthyste",short:"Nuances mauves · Satin",price:null,color:"#ddd0d8"}];
 let products=[...fallback],cart=[],custom=null;
 const $=selector=>document.querySelector(selector),summary=$("#order-summary"),form=$("#quote-form"),status=$("#copy-status");
 const safe=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const numeric=value=>value!==null&&value!==undefined&&value!==""&&Number.isFinite(Number(value))?Number(value):null;
 const money=value=>new Intl.NumberFormat("fr-MA",{minimumFractionDigits:2,maximumFractionDigits:2}).format(value)+" DH";
 function readCart(){try{const data=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(data)?data.filter(x=>x&&typeof x.id==="string"&&Number.isInteger(x.qty)&&x.qty>0).map(x=>({id:x.id,qty:Math.min(x.qty,20)})):[]}catch{return []}}
 function readCustom(){try{return JSON.parse(localStorage.getItem(CUSTOM)||"null")}catch{return null}}
 function render(){
  let subtotal=0,allPriced=cart.length>0;
  const rows=cart.map(item=>{
   const p=products.find(product=>product.id===item.id);if(!p)return "";
   const price=numeric(p.price),line=price===null?null:price*item.qty;
   if(line===null)allPriced=false;else subtotal+=line;
   const c=custom&&custom.productId===item.id?'<small class="summary-custom">Personnalisation : '+safe([custom.color,custom.flowers+" fleurs",custom.finish,custom.dedication?"Mot : "+custom.dedication:""].filter(Boolean).join(" · "))+'</small>':"";
   return '<article class="summary-item"><div class="summary-product"><div class="summary-thumb" style="--product-color:'+safe(p.color||"#ead2d0")+'">✿</div><div class="summary-copy"><strong>'+safe(p.name)+'</strong><small>'+safe(p.short||p.description||"Création artisanale · Satin")+'</small>'+c+'</div></div><div class="summary-math"><span class="summary-unit">'+(price===null?"Prix à confirmer":money(price)+" / unité")+'</span><span class="summary-line-total">'+(line===null?"À confirmer":money(line))+'</span><div class="summary-actions"><span class="summary-qty">Qté : '+item.qty+'</span><button type="button" data-remove="'+safe(p.id)+'">Retirer</button></div></div></article>';
  }).join("");
  summary.innerHTML=rows||'<p class="summary-empty">Votre sélection est vide. Retournez à la collection pour choisir un bouquet.</p>';
  $("#order-subtotal").textContent=allPriced?money(subtotal):"À confirmer";
  $("#order-shipping").textContent="À confirmer";
  $("#order-total").textContent=allPriced?money(subtotal)+"*":"À confirmer";
  $("#order-total-note").textContent=allPriced?"* Hors frais de livraison, à confirmer selon votre ville. Aucun paiement en ligne n’est demandé.":"Un ou plusieurs bouquets sont sur demande. Notre atelier confirmera le montant final et la livraison.";
  $("#year").textContent=new Date().getFullYear();
 }
 summary.addEventListener("click",event=>{const button=event.target.closest("[data-remove]");if(!button)return;cart=cart.filter(item=>item.id!==button.dataset.remove);localStorage.setItem(KEY,JSON.stringify(cart));render()});
 form.addEventListener("submit",async event=>{
  event.preventDefault();if(!cart.length){status.textContent="Ajoutez au moins un bouquet avant d’envoyer votre demande.";return}if(!form.reportValidity())return;
  const data=new FormData(form),lines=cart.map(item=>{const p=products.find(product=>product.id===item.id);if(!p)return "";const price=numeric(p.price);return "- "+p.name+" | "+item.qty+" × "+(price===null?"Prix à confirmer":money(price))+" = "+(price===null?"À confirmer":money(price*item.qty))}).filter(Boolean).join("\n");
  const priced=cart.every(item=>numeric(products.find(p=>p.id===item.id)?.price)!==null),subtotal=cart.reduce((sum,item)=>sum+(numeric(products.find(p=>p.id===item.id)?.price)||0)*item.qty,0);
  const message=["DEMANDE DE COMMANDE — FLEUR D’AMOUR","","Nom : "+data.get("name"),"Téléphone : "+data.get("phone"),"Ville : "+data.get("city"),"Date souhaitée : "+(data.get("date")||"Non précisée"),"Précisions : "+(data.get("notes")||"Aucune"),"","DÉTAILS",lines,"","Sous-total : "+(priced?money(subtotal):"À confirmer"),"Livraison : À confirmer","Total : "+(priced?money(subtotal)+" hors livraison":"À confirmer"),"","Merci de confirmer ma commande."].join("\n");
  try{
   if(window.FleurStore?.configured()){
    await window.FleurStore.submitOrder({customer_name:String(data.get("name")).trim(),phone:String(data.get("phone")).trim(),city:String(data.get("city")).trim(),requested_date:data.get("date")||null,notes:String(data.get("notes")||"").trim(),items:cart.map(item=>{const p=products.find(product=>product.id===item.id);return {id:item.id,name:p?.name||item.id,qty:item.qty,unit_price:numeric(p?.price)}}),customisation:custom||{}});
    status.textContent="Votre demande a bien été envoyée à Fleur d’Amour. Notre atelier vous contactera pour confirmer le montant et la livraison.";
    form.reset();cart=[];localStorage.setItem(KEY,"[]");localStorage.removeItem(CUSTOM);render();return;
   }
   await navigator.clipboard.writeText(message);status.textContent="Votre demande a été copiée. Collez-la dans WhatsApp ou votre e-mail pour l’envoyer.";
  }catch(error){status.textContent=error.message||"L’envoi a échoué. Réessayez dans quelques instants."}
 });
 async function init(){
  cart=readCart();custom=readCustom();
  try{const remote=await window.FleurStore?.products();if(Array.isArray(remote))products=remote.map(p=>({...p,short:p.description||"Création artisanale · Satin"}))}catch(error){console.error("Chargement des produits indisponible",error)}
  const ids=new Set(products.map(p=>p.id));cart=cart.filter(item=>ids.has(item.id));localStorage.setItem(KEY,JSON.stringify(cart));render();
 }
 init();
})();