import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('broDesktop', {
  notify: (title:string,body:string)=>ipcRenderer.invoke('bro:notify',{title,body}),
  setLaunchAtStartup: (enabled:boolean)=>ipcRenderer.invoke('bro:startup',enabled),
  getLaunchAtStartup: ()=>ipcRenderer.invoke('bro:startup:get'),
  onTick: (cb:()=>void)=>{ const listener=()=>cb(); ipcRenderer.on('bro:tick',listener); return ()=>ipcRenderer.removeListener('bro:tick',listener); }
});
