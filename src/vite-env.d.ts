/// <reference types="vite/client" />
interface Window { broDesktop?: { notify:(title:string,body:string)=>Promise<boolean>; setLaunchAtStartup:(enabled:boolean)=>Promise<boolean>; getLaunchAtStartup:()=>Promise<boolean>; onTick:(cb:()=>void)=>()=>void; }; }
