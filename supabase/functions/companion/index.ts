import { admin,chat,checkin,cors,errorMessage,json } from '../_shared/core.ts';
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  const token=request.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
  if(!token)return json({error:'Unauthorized'},401);
  const {data:{user},error}=await admin.auth.getUser(token);
  if(error||!user)return json({error:'Unauthorized'},401);
  const body=await request.json();
  if(body.action==='chat')return json({message:await chat(user.id,String(body.conversationId||''),String(body.message||''),String(body.clientMessageId||''))});
  if(body.action==='checkin')return json({message:await checkin(user.id)});
  return json({error:'Unknown action'},400);
 }catch(e){return json({error:errorMessage(e)},400);}
});
