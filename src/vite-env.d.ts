/// <reference types="vite/client" />
interface Window { bro?: { notify: (title:string,body:string)=>Promise<boolean>; setStartup:(enabled:boolean)=>Promise<boolean>; getStartup:()=>Promise<boolean>; show:()=>Promise<void>; onTick:(fn:()=>void)=>()=>void; }; }
