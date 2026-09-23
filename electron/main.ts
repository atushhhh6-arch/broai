import { app, BrowserWindow, ipcMain, Menu, Notification, shell, Tray } from 'electron';
import path from 'node:path';
let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let quitting = false;
function openWindow(){
  win=new BrowserWindow({width:1260,height:820,minWidth:820,minHeight:600,backgroundColor:'#eaf7ff',show:false,title:'BRO — Your AI homie',icon:path.join(__dirname,'../build/icon.png'),autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true,backgroundThrottling:false}});
  const url=process.env.VITE_DEV_SERVER_URL;
  if(url) void win.loadURL(url); else void win.loadFile(path.join(__dirname,'../dist/index.html'));
  win.once('ready-to-show',()=>win?.show());
  win.on('close',e=>{if(!quitting){e.preventDefault();win?.hide();}});
  win.on('closed',()=>{win=null;});
  win.webContents.setWindowOpenHandler(({url})=>{if(url.startsWith('https://'))void shell.openExternal(url);return {action:'deny'};});
}
if(!app.requestSingleInstanceLock()){app.quit();}
else{
  app.on('second-instance',()=>{win?.show();win?.focus();});
  app.whenReady().then(()=>{
    app.setAppUserModelId('com.broai.desktop');openWindow();
    tray=new Tray(path.join(__dirname,'../build/icon.png'));tray.setToolTip('BRO — Your AI homie');
    tray.setContextMenu(Menu.buildFromTemplate([{label:'Open BRO',click:()=>{if(!win)openWindow();win?.show();win?.focus();}},{type:'separator'},{label:'Quit BRO',click:()=>{quitting=true;app.quit();}}]));
    tray.on('double-click',()=>{win?.show();win?.focus();});
    ipcMain.handle('bro:notify',(_e,{title,body}:{title:string;body:string})=>{if(!Notification.isSupported())return false;new Notification({title:String(title).slice(0,80),body:String(body).slice(0,320),icon:path.join(__dirname,'../build/icon.png')}).show();return true;});
    ipcMain.handle('bro:startup',(_e,enabled:boolean)=>{app.setLoginItemSettings({openAtLogin:Boolean(enabled)});return app.getLoginItemSettings().openAtLogin;});
    ipcMain.handle('bro:startup:get',()=>app.getLoginItemSettings().openAtLogin);
    setInterval(()=>win?.webContents.send('bro:tick'),10*60*1000);
    app.on('activate',()=>{if(win){win.show();win.focus();}else openWindow();});
  });
  app.on('before-quit',()=>{quitting=true;});
  app.on('window-all-closed',()=>{});
}
