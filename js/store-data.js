/* Shared browser-safe Supabase client. RLS is the security boundary; never use service_role here. */
(()=>{
 const configured=()=>window.supabase&&window.FLEUR_SUPABASE_URL&&window.FLEUR_SUPABASE_ANON_KEY&&!window.FLEUR_SUPABASE_URL.includes('YOUR_PROJECT')&&!window.FLEUR_SUPABASE_ANON_KEY.includes('YOUR_');
 let clientPromise;
 window.FleurStore={
  configured,
  client(){if(!configured())return null;if(!clientPromise)clientPromise=Promise.resolve(window.supabase.createClient(window.FLEUR_SUPABASE_URL,window.FLEUR_SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}));return clientPromise},
  async products(){const c=await this.client();if(!c)return null;const {data,error}=await c.from('products').select('id,name,category,price,stock,color,description,visible').eq('visible',true).order('created_at');if(error)throw error;return data||[]},
  async submitOrder(order){const c=await this.client();if(!c)throw new Error('La boutique n’est pas encore connectée.');const {data,error}=await c.from('orders').insert(order).select('id').single();if(error)throw error;return data},
  async activeOffers(){const c=await this.client();if(!c)return [];const today=new Date().toISOString().slice(0,10);const {data,error}=await c.from('offers').select('*').eq('active',true).lte('starts_on',today).gte('ends_on',today);if(error)throw error;return data||[]}
 };
})();
