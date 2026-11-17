(()=>{
 const $=s=>document.querySelector(s), keys={p:'fleur-admin-products',s:'fleur-admin-sales',o:'fleur-admin-offers'};
 const configReady=()=>window.FleurStore?.configured();
 function showGate(message='Connectez-vous avec votre compte administrateur.'){
  document.body.classList.add('admin-locked');
  const gate=document.createElement('section');gate.className='auth-gate';gate.innerHTML=`<form class="auth-card" id="admin-login"><div class="auth-mark">✿</div><p class="eyebrow">FLEUR D’AMOUR · ESPACE PRIVÉ</p><h1>Bienvenue <em>à l’atelier.</em></h1><p class="auth-copy">${message}</p><label>Adresse e-mail<input name="email" type="email" autocomplete="username" required></label><label>Mot de passe<input name="password" type="password" autocomplete="current-password" required minlength="8"></label><p class="auth-error" id="auth-error" role="alert"></p><button class="primary-button" type="submit">Se connecter ↗</button><a href="index.html">Retour à la boutique</a></form></section>`;document.body.append(gate);
  $('#admin-login').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,b=f.querySelector('button');b.disabled=true;b.textContent='Connexion…';$('#auth-error').textContent='';try{const c=await window.FleurStore.client();const {error}=await c.auth.signInWithPassword({email:f.elements.email.value.trim(),password:f.elements.password.value});if(error)throw error;location.reload()}catch(err){$('#auth-error').textContent=err.message||'Connexion impossible.';b.disabled=false;b.textContent='Se connecter ↗'}});
 }
 async function start(){
  if(!configReady()){showGate('La connexion à la base de données doit d’abord être configurée.');$('#admin-login').querySelector('button').disabled=true;$('#auth-error').textContent='Configurez js/supabase-config.js et exécutez la migration SQL.';return}
  const c=await window.FleurStore.client();const {data:{session},error}=await c.auth.getSession();if(error||!session){showGate();return}
  const {data:{user}}=await c.auth.getUser();if(user?.app_metadata?.role!=='admin'){await c.auth.signOut();showGate('Ce compte ne possède pas les droits administrateur.');return}
  try{
   const [p,s,o]=await Promise.all([c.from('products').select('*').order('created_at'),c.from('sales').select('*').order('sold_on',{ascending:false}),c.from('offers').select('*').order('created_at',{ascending:false})]);
   for(const r of [p,s,o])if(r.error)throw r.error;
   localStorage.setItem(keys.p,JSON.stringify(p.data.map(x=>({id:x.id,name:x.name,category:x.category,price:x.price,stock:x.stock,color:x.color,description:x.description,visible:x.visible}))));
   localStorage.setItem(keys.s,JSON.stringify(s.data.map(x=>({id:x.id,product:x.product_id,amount:Number(x.amount),date:x.sold_on,reference:x.reference}))));
   localStorage.setItem(keys.o,JSON.stringify(o.data.map(x=>({id:x.id,name:x.name,discount:x.discount,product:x.applies_to_all?'all':x.product_id,start:x.starts_on,end:x.ends_on,active:x.active}))));
   if(!sessionStorage.getItem('fleur-admin-hydrated')){sessionStorage.setItem('fleur-admin-hydrated','1');location.reload();return}
   const original=localStorage.setItem.bind(localStorage);let pending;
   localStorage.setItem=(key,value)=>{original(key,value);if(Object.values(keys).includes(key)){clearTimeout(pending);pending=setTimeout(()=>sync(c),250)}};
   async function sync(client){
    try{
     const products=JSON.parse(localStorage.getItem(keys.p)||'[]'),sales=JSON.parse(localStorage.getItem(keys.s)||'[]'),offers=JSON.parse(localStorage.getItem(keys.o)||'[]');
     const {data:current,error:readErr}=await client.from('products').select('id');if(readErr)throw readErr;
     const wanted=new Set(products.map(x=>x.id));
     for(const old of current)if(!wanted.has(old.id)){const {error}=await client.from('products').delete().eq('id',old.id);if(error)throw error}
     if(products.length){const {error}=await client.from('products').upsert(products.map(x=>({id:x.id,name:x.name,category:x.category,price:x.price,stock:x.stock,color:x.color,description:x.description,visible:x.visible,updated_at:new Date().toISOString()})));if(error)throw error}
     const {data:oldSales,error:se}=await client.from('sales').select('id');if(se)throw se;const saleIds=new Set(sales.map(x=>x.id));for(const old of oldSales)if(!saleIds.has(old.id)){const {error}=await client.from('sales').delete().eq('id',old.id);if(error)throw error}
     if(sales.length){const {error}=await client.from('sales').upsert(sales.map(x=>({id:x.id,product_id:products.some(p=>p.id===x.product)?x.product:null,amount:x.amount,sold_on:x.date,reference:x.reference||''})));if(error)throw error}
     const {data:oldOffers,error:oe}=await client.from('offers').select('id');if(oe)throw oe;const offerIds=new Set(offers.map(x=>x.id));for(const old of oldOffers)if(!offerIds.has(old.id)){const {error}=await client.from('offers').delete().eq('id',old.id);if(error)throw error}
     if(offers.length){const {error}=await client.from('offers').upsert(offers.map(x=>({id:x.id,name:x.name,discount:x.discount,product_id:x.product==='all'?null:x.product,applies_to_all:x.product==='all',starts_on:x.start,ends_on:x.end,active:x.active})));if(error)throw error}
     status('Synchronisé avec la base de données');
    }catch(err){status('Erreur de synchronisation : '+(err.message||'réessayez'));console.error(err)}
   }
   function status(message){let el=$('#sync-status');if(!el){el=document.createElement('span');el.id='sync-status';el.className='sync-status';$('.top-actions').prepend(el)}el.textContent=message}
   document.body.classList.remove('admin-locked');
   const pill=$('.preview-status');if(pill){pill.innerHTML='<i></i> Base de données sécurisée';pill.classList.add('connected')}
   const logout=document.createElement('button');logout.className='logout-button';logout.textContent='Déconnexion';logout.addEventListener('click',async()=>{await c.auth.signOut();location.reload()});$('.top-actions').append(logout);
   // Orders are intentionally kept separate from manually recorded sales.
   const nav=$('.side-nav');const item=document.createElement('a');item.href='#orders';item.dataset.section='orders';item.innerHTML='<span>▤</span> Commandes';nav.insertBefore(item,nav.querySelector('[data-section="sales"]'));
   const main=$('.admin-main');const section=document.createElement('section');section.className='admin-section';section.id='orders-section';section.dataset.panel='orders';section.innerHTML='<div class="section-intro"><div><p class="eyebrow">RELATION CLIENT</p><h2>Les commandes <em>de la maison.</em></h2><p>Demandes reçues depuis la boutique, centralisées ici.</p></div><button class="secondary-button" id="refresh-orders">Actualiser ↻</button></div><div class="table-wrap"><table><thead><tr><th>DATE</th><th>CLIENT</th><th>TÉLÉPHONE</th><th>VILLE</th><th>SÉLECTION</th><th>STATUT</th></tr></thead><tbody id="order-rows"></tbody></table></div><p class="empty-state" id="orders-empty">Aucune commande pour le moment.</p>';
   main.append(section);
   async function loadOrders(){const body=$('#order-rows');body.innerHTML='<tr><td colspan="6">Chargement…</td></tr>';const {data,error}=await c.from('orders').select('*').order('created_at',{ascending:false});if(error){body.innerHTML='<tr><td colspan="6">'+error.message+'</td></tr>';return}localStorage.setItem('fleur-admin-orders',JSON.stringify(data));window.dispatchEvent(new Event('fleur-orders-updated'));$('#orders-empty').hidden=!!data.length;body.innerHTML=data.map(o=>`<tr><td>${new Date(o.created_at).toLocaleDateString('fr-MA')}</td><td>${escapeHtml(o.customer_name)}</td><td>${escapeHtml(o.phone)}</td><td>${escapeHtml(o.city)}</td><td>${escapeHtml((o.items||[]).map(x=>`${x.name||x.id} × ${x.qty}`).join(', '))}</td><td><select data-order-status="${o.id}" aria-label="Statut de la commande"><option value="new" ${o.status==='new'?'selected':''}>Nouvelle</option><option value="contacted" ${o.status==='contacted'?'selected':''}>Contactée</option><option value="confirmed" ${o.status==='confirmed'?'selected':''}>Confirmée</option><option value="preparing" ${o.status==='preparing'?'selected':''}>En préparation</option><option value="shipped" ${o.status==='shipped'?'selected':''}>Expédiée</option><option value="completed" ${o.status==='completed'?'selected':''}>Terminée</option><option value="cancelled" ${o.status==='cancelled'?'selected':''}>Annulée</option></select></td></tr>`).join('')}
   function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
   $('#refresh-orders').addEventListener('click',loadOrders);$('#order-rows').addEventListener('change',async e=>{const sel=e.target.closest('[data-order-status]');if(!sel)return;sel.disabled=true;const {error}=await c.from('orders').update({status:sel.value}).eq('id',sel.dataset.orderStatus);sel.disabled=false;if(error){alert('Impossible de modifier le statut : '+error.message);return}if(sel.value==='completed'){const {data:salesData,error:salesError}=await c.from('sales').select('*').order('sold_on',{ascending:false});if(salesError){alert('Statut modifié, mais actualisation des ventes impossible : '+salesError.message);return}localStorage.setItem(keys.s,JSON.stringify(salesData.map(x=>({id:x.id,product:x.product_id,amount:Number(x.amount),date:x.sold_on,reference:x.reference}))));window.dispatchEvent(new Event('fleur-sales-updated'))}});
   document.addEventListener('click',e=>{const a=e.target.closest('[data-section="orders"]');if(a){e.preventDefault();document.querySelectorAll('.admin-section').forEach(x=>x.classList.toggle('active',x.dataset.panel==='orders'));document.querySelectorAll('[data-section]').forEach(x=>x.classList.toggle('active',x===a));$('#page-heading').textContent='Gestion des commandes';history.replaceState(null,'','#orders')}});await loadOrders();
  }catch(err){console.error(err);await c.auth.signOut();showGate('Impossible de charger les données. Vérifiez la migration et les politiques de sécurité. '+(err.message||''))}
 }
 document.addEventListener('DOMContentLoaded',start);
})();
