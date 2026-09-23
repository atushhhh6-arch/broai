import { admin,checkin,cors,errorMessage,json } from '../_shared/core.ts';
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 const secret=Deno.env.get('PROACTIVE_CRON_SECRET');
 if(!secret||request.headers.get('x-cron-secret')!==secret)return json({error:'Unauthorized'},401);
 try{
  const {data:profiles,error}=await admin.from('profiles').select('id').eq('onboarded',true).eq('proactive',true).eq('notifications',true).limit(1000);
  if(error)throw error;
  let sent=0,skipped=0,failed=0;
  for(const p of profiles||[]){try{(await checkin(p.id))?sent++:skipped++;}catch(e){failed++;console.error('checkin failed',p.id,errorMessage(e));}}
  return json({checked:profiles?.length||0,sent,skipped,failed});
 }catch(e){return json({error:errorMessage(e)},500);}
});
