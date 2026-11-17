(()=>{'use strict';
const $=s=>document.querySelector(s);
const read=(k,d=[])=>{try{const v=JSON.parse(localStorage.getItem(k));return Array.isArray(v)?v:d}catch{return d}};
const money=n=>new Intl.NumberFormat('fr-MA',{maximumFractionDigits:0}).format(n)+' DH';
const dateLabel=s=>{const d=new Date(s);return Number.isNaN(+d)?'—':d.toLocaleDateString('fr-MA',{day:'2-digit',month:'short'})};
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statuses=[['new','Nouvelle'],['contacted','Contactée'],['confirmed','Confirmée'],['preparing','Préparation'],['shipped','Expédiée'],['completed','Terminée'],['cancelled','Annulée']];
const palette=['#563746','#b8757c','#d9a69b','#c9b49c','#8d9a82','#9c7c92','#d6c6b6'];
function drawRevenue(sales,orders){
 const canvas=$('#sales-chart');if(!canvas)return;
 const metric=$('#chart-metric')?.value||'revenue',now=new Date(),months=[];
 for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({key:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),label:d.toLocaleDateString('fr-MA',{month:'short'}),value:0})}
 const map=new Map(months.map(m=>[m.key,m]));
 if(metric==='orders'){orders.filter(o=>o.status!=='cancelled').forEach(o=>{const k=String(o.created_at||'').slice(0,7);if(map.has(k))map.get(k).value++})}
 else sales.forEach(s=>{const k=String(s.date||'').slice(0,7);if(map.has(k))map.get(k).value+=Number(s.amount)||0});
 const data=months.map(m=>m.value),w=Math.max(300,canvas.clientWidth||300),h=165,ratio=window.devicePixelRatio||1;
 canvas.width=w*ratio;canvas.height=h*ratio;const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);
 const L=38,R=8,T=13,B=25,CW=w-L-R,CH=h-T-B,max=Math.max(1,...data),step=max/4;
 ctx.font='9px DM Sans,Arial';ctx.textAlign='right';ctx.lineWidth=1;
 for(let i=0;i<=4;i++){const y=T+CH-i*CH/4;ctx.strokeStyle='#eee4dc';ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(w-R,y);ctx.stroke();ctx.fillStyle='#9b8981';const v=max*i/4;ctx.fillText(metric==='orders'?String(Math.round(v)):v>=1000?'DH '+(v/1000).toFixed(1)+'k':String(Math.round(v)),L-7,y+3)}
 const pts=data.map((v,i)=>({x:L+i*CW/(data.length-1),y:T+CH-v/max*CH}));
 if(data.some(v=>v>0)){
  const grad=ctx.createLinearGradient(0,T,0,h-B);grad.addColorStop(0,'rgba(184,117,124,.28)');grad.addColorStop(1,'rgba(184,117,124,.015)');
  ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.lineTo(pts.at(-1).x,h-B);ctx.lineTo(pts[0].x,h-B);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
  ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle='#a96570';ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.stroke();
  pts.forEach((p,i)=>{if(data[i]>0){ctx.beginPath();ctx.arc(p.x,p.y,3.5,0,Math.PI*2);ctx.fillStyle='#573846';ctx.fill();ctx.strokeStyle='#fffdf9';ctx.lineWidth=1.5;ctx.stroke()}});
 }
 ctx.textAlign='center';ctx.fillStyle='#8e7e78';months.forEach((m,i)=>ctx.fillText(m.label,pts[i].x,h-7));
 const total=data.reduce((a,b)=>a+b,0);$('#chart-total').textContent=metric==='orders'?total+' commandes':money(total);
 $('#chart-empty').hidden=data.some(v=>v>0);
}
function drawDonut(orders){
 const c=$('#orders-donut');if(!c)return;const ctx=c.getContext('2d'),dpr=window.devicePixelRatio||1,size=145;c.width=size*dpr;c.height=size*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
 const counts=statuses.map(([key,label])=>({key,label,value:orders.filter(o=>o.status===key).length})).filter(x=>x.value>0);
 const total=orders.length;$('#donut-total').textContent=total;
 if(!total){ctx.beginPath();ctx.arc(72.5,72.5,52,0,Math.PI*2);ctx.strokeStyle='#eee4dc';ctx.lineWidth=19;ctx.stroke();$('#orders-legend').innerHTML='<p class="empty-mini">Aucune commande reçue.</p>';return}
 let angle=-Math.PI/2;const sum=counts.reduce((n,x)=>n+x.value,0);
 counts.forEach((item,i)=>{const next=angle+item.value/sum*Math.PI*2;ctx.beginPath();ctx.arc(72.5,72.5,52,angle,next);ctx.strokeStyle=palette[statuses.findIndex(x=>x[0]===item.key)];ctx.lineWidth=19;ctx.lineCap='butt';ctx.stroke();angle=next});
 $('#orders-legend').innerHTML=counts.slice(0,4).map(x=>'<div><i style="background:'+palette[statuses.findIndex(s=>s[0]===x.key)]+'"></i><span>'+x.label+'</span><b>'+x.value+'</b></div>').join('');
}
function render(){
 const sales=read('fleur-admin-sales'),orders=read('fleur-admin-orders'),products=read('fleur-admin-products'),offers=read('fleur-admin-offers');
 const revenue=sales.reduce((n,s)=>n+(Number(s.amount)||0),0),pending=orders.filter(o=>['new','contacted','confirmed','preparing'].includes(o.status)).length;
 $('#metric-revenue').textContent=money(revenue);$('#metric-revenue-note').textContent=sales.length+' vente(s) enregistrée(s)';
 $('#metric-orders').textContent=orders.length;$('#metric-orders-note').textContent=orders.filter(o=>o.status!=='cancelled').length+' commande(s) non annulée(s)';
 $('#metric-pending').textContent=pending;$('#metric-products').textContent=products.filter(p=>p.visible).length;
 $('#metric-products-note').textContent=products.length+' création(s) au catalogue';
 const ring=$('#pending-ring');if(ring){ring.style.borderColor=pending?'#dcb2a9':'#dce5d8';ring.querySelector('span').textContent=orders.length?Math.round(pending/orders.length*100)+'%':'—'}
 drawRevenue(sales,orders);drawDonut(orders);
 const activity=[
 ...orders.map(o=>({kind:'order',date:o.created_at,label:o.customer_name||'Nouvelle cliente',detail:(o.city||'Ville à confirmer')+' · '+(o.status||'new'),time:new Date(o.created_at||Date.now()).getTime()})),
 ...sales.map(s=>({kind:'sale',date:s.date,label:products.find(p=>p.id===s.product)?.name||'Vente enregistrée',detail:money(Number(s.amount)||0),time:new Date((s.date||'')+'T12:00:00').getTime()}))
 ].sort((a,b)=>b.time-a.time).slice(0,5);
 $('#dashboard-activity').innerHTML=activity.length?activity.map(a=>'<div class="activity-item"><span class="activity-symbol">'+(a.kind==='order'?'⌑':'↗')+'</span><div class="activity-copy"><b>'+safe(a.label)+'</b><small>'+safe(a.detail)+'</small></div><span class="activity-time">'+dateLabel(a.date)+'</span></div>').join(''):'<p class="empty-mini">Aucune activité enregistrée pour le moment.</p>';
 const pRows=statuses.filter(([key])=>key!=='cancelled').map(([key,label],i)=>({label,value:orders.filter(o=>o.status===key).length,color:palette[i]}));
 const max=Math.max(1,...pRows.map(x=>x.value));
 $('#order-pipeline').innerHTML=orders.length?pRows.filter(x=>x.value).map(x=>'<div class="pipeline-row"><span>'+x.label+'</span><div class="pipeline-track"><i style="width:'+(x.value/max*100)+'%;background:'+x.color+'"></i></div><b>'+x.value+'</b></div>').join(''):'<p class="empty-mini">Les étapes apparaîtront avec vos commandes.</p>';
 const totals=new Map();sales.forEach(s=>{const id=s.product||'unknown';totals.set(id,(totals.get(id)||0)+1)});
 orders.forEach(o=>(o.items||[]).forEach(item=>{const id=item.id||item.product_id||item.name||'unknown';totals.set(id,(totals.get(id)||0)+Number(item.qty||1))}));
 const best=[...totals.entries()].map(([id,count])=>({name:products.find(p=>p.id===id)?.name||String((orders.flatMap(o=>o.items||[]).find(x=>(x.id||x.product_id||x.name)===id)||{}).name||id),count})).sort((a,b)=>b.count-a.count).slice(0,4),topMax=Math.max(1,...best.map(x=>x.count));
 $('#top-products').innerHTML=best.length?best.map(p=>'<div class="top-product"><span class="top-product-name">'+safe(p.name)+'</span><b class="top-product-count">'+p.count+'</b><span class="top-product-bar"><i style="width:'+(p.count/topMax*100)+'%"></i></span></div>').join(''):'<p class="empty-mini">Aucune vente enregistrée.</p>';
}
document.addEventListener('DOMContentLoaded',()=>{render();$('#chart-metric')?.addEventListener('change',render);window.addEventListener('fleur-orders-updated',render);window.addEventListener('fleur-sales-updated',render);window.addEventListener('storage',render);window.addEventListener('resize',()=>drawRevenue(read('fleur-admin-sales'),read('fleur-admin-orders')));setInterval(render,30000)});
})();