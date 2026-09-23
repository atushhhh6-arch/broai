import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
const url=Deno.env.get('SUPABASE_URL')!;
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
export const admin=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
export const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-cron-secret','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'};
export function json(value:unknown,status=200){return new Response(JSON.stringify(value),{status,headers:cors});}
export function errorMessage(e:unknown){return e instanceof Error?e.message:'Unexpected error';}
function intervalMinutes(f:string){return f==='chill'?480:f==='chaotic'?90:240;}
function inQuietHours(profile:Record<string,unknown>){
 if(!profile.quiet_hours)return false;
 let hhmm='';
 try{const parts=new Intl.DateTimeFormat('en-GB',{timeZone:String(profile.timezone||'America/New_York'),hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());hhmm=(parts.find(x=>x.type==='hour')?.value||'12')+':'+(parts.find(x=>x.type==='minute')?.value||'00');}
 catch{return true;} // When timezone is invalid, fail closed and do not notify.
 const mins=(s:string)=>{const [h,m]=s.split(':').map(Number);return h*60+m;};
 const now=mins(hhmm),start=mins(String(profile.quiet_start||'23:00')),end=mins(String(profile.quiet_end||'08:00'));
 return start<=end?now>=start&&now<end:now>=start||now<end;
}
async function askAI(input:{role:string;content:string}[],max_output_tokens=350){
 const apiKey=Deno.env.get('OPENAI_API_KEY');if(!apiKey)throw new Error('OPENAI_API_KEY is not set in Supabase secrets');
 const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},body:JSON.stringify({model:Deno.env.get('OPENAI_MODEL')||'gpt-4.1-mini',input,max_output_tokens})});
 const output=await response.json();
 if(!response.ok)throw new Error('AI request failed ('+response.status+'): '+String(output?.error?.message||'unknown').slice(0,160));
 const extracted=output.output_text||output.output?.flatMap((item:{content?:{type:string;text?:string}[]})=>item.content||[]).filter((part:{type:string})=>part.type==='output_text').map((part:{text?:string})=>part.text||'').join('\n');
 if(!extracted||!String(extracted).trim())throw new Error('AI returned an empty response');
 return String(extracted).trim();
}
const style="You are BRO, an AI desktop companion. Be transparent that you are AI, never claim to be human. Speak in natural, warm, witty US English like a thoughtful friend. Casual lowercase is fine, but no forced slang or 'bro' every sentence. Usually answer in 1-4 sentences; ask relevant follow-ups, remember the stated goals and propose tiny concrete next steps. Do not invent information about this person, claim you have watched their screen, guilt them, shame them or push them to engage. Respect boundaries and avoid dependence-promoting statements. You only know the supplied user profile, goals and message history.";
async function getContext(userId:string){
 const [p,g]=await Promise.all([admin.from('profiles').select('*').eq('id',userId).single(),admin.from('goals').select('title,done').eq('user_id',userId).order('created_at',{ascending:false}).limit(30)]);
 if(p.error)throw p.error;if(g.error)throw g.error;
 return {profile:p.data as Record<string,unknown>,goals:g.data||[]};
}
function contextText(p:Record<string,unknown>,goals:{title:string;done:boolean}[]){return "Name: "+String(p.name||'friend')+"; occupation: "+String(p.occupation||'unspecified')+"; about: "+String(p.about||'unspecified')+"; timezone: "+String(p.timezone||'unspecified')+"; goals: "+JSON.stringify(goals);}
export async function chat(userId:string,conversationId:string,content:string,clientMessageId:string){
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if(!uuid.test(conversationId)||!uuid.test(clientMessageId))throw new Error('Invalid conversation or message ID');
 if(!content.trim()||content.length>3000)throw new Error('Message must be 1–3000 characters');
 const {data:conversation,error:convErr}=await admin.from('conversations').select('id').eq('id',conversationId).eq('user_id',userId).maybeSingle();
 if(convErr)throw convErr;if(!conversation)throw new Error('Conversation not found');
 const since=new Date(Date.now()-60000).toISOString();
 const {count}=await admin.from('messages').select('id',{count:'exact',head:true}).eq('user_id',userId).eq('role','user').gte('created_at',since);
 if((count||0)>=20)throw new Error('Too many messages right now. Try again shortly.');
 const {error:insertErr}=await admin.from('messages').insert({id:clientMessageId,user_id:userId,conversation_id:conversationId,role:'user',content:content.trim()});
 if(insertErr)throw insertErr;
 const {profile,goals}=await getContext(userId);
 const {data:recent,error:historyErr}=await admin.from('messages').select('role,content').eq('conversation_id',conversationId).eq('user_id',userId).order('created_at',{ascending:false}).limit(22);
 if(historyErr)throw historyErr;
 const reply=await askAI([{role:'developer',content:style+'\n'+contextText(profile,goals)},...(recent||[]).reverse().map(m=>({role:m.role,content:m.content}))]);
 const {data:saved,error:saveErr}=await admin.from('messages').insert({user_id:userId,conversation_id:conversationId,role:'assistant',content:reply,source:'chat'}).select('id,conversation_id,role,content,source,created_at').single();
 if(saveErr)throw saveErr;return saved;
}
export async function checkin(userId:string){
 const {profile,goals}=await getContext(userId);
 if(!profile.onboarded||!profile.proactive||!profile.notifications||inQuietHours(profile))return null;
 const minutes=intervalMinutes(String(profile.frequency));
 const last=profile.last_checkin_at?new Date(String(profile.last_checkin_at)).getTime():0;
 if(Date.now()-last<minutes*60000)return null;
 const {data:claimed,error:claimErr}=await admin.rpc('claim_bro_checkin',{p_user_id:userId,p_minutes:minutes});if(claimErr)throw claimErr;if(!claimed)return null;
 const {data:conversations,error:convErr}=await admin.from('conversations').select('id').eq('user_id',userId).order('created_at',{ascending:false}).limit(1);if(convErr)throw convErr;
 let conversationId=conversations?.[0]?.id;
 if(!conversationId){const {data:created,error}=await admin.from('conversations').insert({user_id:userId,title:'BRO checked in'}).select('id').single();if(error)throw error;conversationId=created.id;}
 const {data:recent}=await admin.from('messages').select('role,content,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(12);
 const reply=await askAI([{role:'developer',content:style+'\n'+contextText(profile,goals)+'\nYou are deciding whether to start a conversation. Output one short, natural, relevant check-in (max 230 characters) based only on known context. No guilt or obligation to respond; if there is no useful reason, respond exactly SKIP.'},{role:'user',content:'Recent conversation context: '+JSON.stringify((recent||[]).reverse())}],120);
 if(reply.toUpperCase()==='SKIP')return null;
 const {data:saved,error}=await admin.from('messages').insert({user_id:userId,conversation_id:conversationId,role:'assistant',content:reply.slice(0,230),source:'proactive'}).select('id,conversation_id,role,content,source,created_at').single();
 if(error)throw error;return saved;
}
