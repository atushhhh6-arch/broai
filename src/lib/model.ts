export type Frequency = 'chill' | 'balanced' | 'chaotic';
export type Role = 'user' | 'assistant';
export type MessageSource = 'chat' | 'proactive' | 'welcome';
export interface Profile { name: string; occupation: string; about: string; timezone: string; onboarded: boolean }
export interface Settings { proactive: boolean; notifications: boolean; frequency: Frequency; quietHours: boolean; quietStart: string; quietEnd: string; launchAtStartup: boolean }
export interface Goal { id: string; title: string; done: boolean; created_at: string }
export interface Conversation { id: string; title: string; created_at: string }
export interface ChatMessage { id: string; conversation_id: string; role: Role; content: string; source: MessageSource; created_at: string }
export interface AppData { profile: Profile; settings: Settings; goals: Goal[]; conversations: Conversation[]; messages: ChatMessage[]; activeConversationId: string | null; lastLocalCheckin: string | null }
export const defaultSettings: Settings = { proactive:true, notifications:true, frequency:'balanced', quietHours:true, quietStart:'23:00', quietEnd:'08:00', launchAtStartup:false };
export const emptyData: AppData = { profile:{name:'',occupation:'',about:'',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'America/New_York',onboarded:false}, settings:defaultSettings, goals:[], conversations:[], messages:[], activeConversationId:null,lastLocalCheckin:null };
const KEY='bro.desktop.data.v1';
export function readData(): AppData { try { const d=JSON.parse(localStorage.getItem(KEY)||'{}') as Partial<AppData>; return {...emptyData,...d,profile:{...emptyData.profile,...d.profile},settings:{...defaultSettings,...d.settings},goals:Array.isArray(d.goals)?d.goals:[],conversations:Array.isArray(d.conversations)?d.conversations:[],messages:Array.isArray(d.messages)?d.messages:[]}; } catch {return emptyData;} }
export function saveData(d:AppData){localStorage.setItem(KEY,JSON.stringify(d));}
export function isQuiet(s:Settings,d=new Date()){if(!s.quietHours)return false;const m=d.getHours()*60+d.getMinutes();const mins=(v:string)=>{const [h,n]=v.split(':').map(Number);return h*60+n};const a=mins(s.quietStart),b=mins(s.quietEnd);return a<=b?m>=a&&m<b:m>=a||m<b;}
export function frequencyMs(f:Frequency){return f==='chill'?8*3600000:f==='chaotic'?90*60000:4*3600000;}
export function localPreviewResponse(message:string,p:Profile,goals:Goal[]){const q=message.toLowerCase();const name=p.name.split(' ')[0]||'bro';if(/hey|hello|yo|what'?s up|sup\b/.test(q))return 'yo '+name+' 😎 what’s good? tell me what you’re up to.';if(/idea|build|project|startup|business/.test(q))return 'okay wait, let’s make this real. what problem are we solving, who’s it for, and what can we ship in one weekend?';if(/stuck|lazy|procrastinat|motivat/.test(q))return 'bro, no giant plan. let’s just do 10 minutes. what’s the tiniest next step you can finish right now?';const goal=goals.find(g=>!g.done);return goal?'i’m listening 👀 also, we still have “'+goal.title+'” on our list. wanna work on it together?':'tell me more, '+name+'. i’m all ears. what would make today a win?';}
