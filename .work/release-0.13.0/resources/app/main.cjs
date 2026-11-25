const {app,BrowserWindow,ipcMain,dialog,shell,screen,Tray,Menu}=require('electron');
const playlistFiles=require('./playlist-files.cjs');
const {spawn}=require('node:child_process');const path=require('node:path');const fs=require('node:fs');
const primaryInstance=typeof app.requestSingleInstanceLock!=='function'||app.requestSingleInstanceLock();
if(primaryInstance){
const nativeMidiInput=new (require('./midi-input.cjs'))({script:path.join(__dirname,'midi-input.ps1')});
const cifraDog=require('./cifra-dog-launcher.cjs')({root:path.join(__dirname,'integrations','cifra-dog'),openExternal:url=>shell.openExternal(url)});
ipcMain.handle('open-cifra-dog',async event=>{if(event.sender!==win?.webContents)return {error:'Janela inválida.'};try{await cifraDog.open();return {ok:true};}catch(error){return {error:error.message};}});
const panelWindows=new Map();let lastPanelFrame;let docked=false,dockBounds=null;const dockHidden=new Set();
const layout=require('./window-layout.cjs');let theme='mint',groupBusy=false;const groupHidden=new Set(),windowTypes=new WeakMap(),compactOrigins=new WeakMap();
let layoutPath=null,layouts={};try{layoutPath=path.join(app.getPath('userData'),'window-layout-v04.json');const stored=JSON.parse(fs.readFileSync(layoutPath,'utf8'));if(stored&&typeof stored==='object'&&!Array.isArray(stored))layouts=stored;}catch{}
function areaFor(w){return screen.getDisplayMatching(w?.getBounds?.()||{x:0,y:0,width:1,height:1}).workArea||{x:0,y:0,width:1366,height:768};}
function geometry(type){const area=areaFor(win);const saved=layouts[type];return saved&&['x','y','width','height'].every(k=>Number.isFinite(saved[k]))?layout.fit(saved,area):layout.initial(type,area);}
function allWindows(){return [win,...panelWindows.values(),karaokeWindow,chordWindow,liveKeyboardWindow].filter(w=>w&&!w.isDestroyed());}
// A focus event must not show/raise windows that are already visible: Windows
// can deliver another focus event after this handler returns, creating a loop.
function showGroup(){if(closingAll||groupBusy||!win||win.isDestroyed())return;groupBusy=true;try{if(win.isMinimized())win.restore();else if(!win.isVisible())win.show();if(!docked)for(const w of groupHidden){if(w.isDestroyed()||w.isMinimized()||w.isVisible())continue;if(w.showInactive)w.showInactive();else w.show();}groupHidden.clear();}finally{groupBusy=false;}publishWindows();}
function hideGroup(){if(groupBusy)return;groupBusy=true;try{for(const w of allWindows())if(w!==win&&w.isVisible()){groupHidden.add(w);w.hide();}}finally{groupBusy=false;}}
function watchLayout(w,type){windowTypes.set(w,type);let timer;const save=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(w.isDestroyed()||w.isMinimized()||w.isFullScreen()||docked)return;layouts[type]=w.getBounds();if(layoutPath)try{fs.mkdirSync(path.dirname(layoutPath),{recursive:true});fs.writeFileSync(layoutPath,JSON.stringify(layouts));}catch{}},250);};w.on('resize',save);w.on('move',save);w.on('closed',()=>{clearTimeout(timer);groupHidden.delete(w);});}
function compactWindow(w,compact){const type=windowTypes.get(w);if(!type)return;const isCompact=compact!==false;if(!isCompact&&!compactOrigins.has(w))compactOrigins.set(w,{...w.getBounds()});const origin=isCompact?compactOrigins.get(w):null;const size=(isCompact?layout.sizes:layout.full)[type];const b=origin?layout.fit(origin,screen.getDisplayMatching(origin).workArea||areaFor(w)):layout.fit({...w.getBounds(),width:size[0],height:size[1]},areaFor(w));if(isCompact)compactOrigins.delete(w);w.setBounds?.(b);w.webContents.send('panel-layout',{compact:isCompact});}
function setDockMode(enabled,fullscreen=true){if(!enabled||!win||win.isDestroyed())return;docked=true;if(fullscreen&&!win.isFullScreen())win.setFullScreen(true);if(!win.isVisible())win.show();win.webContents.send('dock-state',true);publishWindows();}
ipcMain.on('dock-mode',(e,enabled,panelTypes)=>{if(e.sender===win?.webContents)setDockMode(enabled,true,panelTypes);});
ipcMain.on('panel-compact',(e,compact)=>compactWindow(BrowserWindow.fromWebContents(e.sender),compact));
ipcMain.on('theme-change',(_,value)=>{if(!['mint','blue','violet','light'].includes(value))return;theme=value;for(const w of allWindows())w.webContents.send('theme-state',theme);});
let shutdownRequested=false,shutdownFinished=false,shutdownTimer;
let liveKeyboardWindow;
let win,karaokeWindow,chordWindow,lastChordFrame,tray,closingAll=false,lastFrame,bridge,ready=false,timelineAvailable=true,devices=[],status='Iniciando áudio do Windows…';
function finishShutdown(){if(shutdownFinished)return;shutdownFinished=true;closingAll=true;cifraDog.close();nativeMidiInput.close();clearTimeout(shutdownTimer);const windows=allWindows();tray?.destroy();tray=null;try{bridge?.stdin.write('RESET\nQUIT\n');bridge?.stdin.end();}catch{}for(const w of windows.filter(w=>w!==win))if(!w.isDestroyed())w.destroy();if(win&&!win.isDestroyed())win.destroy();let exited=false,timer;const done=()=>{if(exited)return;exited=true;clearTimeout(timer);try{bridge?.kill();}catch{}app.quit();};if(bridge&&bridge.exitCode==null){bridge.once('exit',done);timer=setTimeout(done,200);}else done();}
function requestShutdown(){if(shutdownRequested||shutdownFinished)return;shutdownRequested=true;closingAll=true;if(win&&!win.isDestroyed()){shutdownTimer=setTimeout(finishShutdown,1200);win.webContents.send('app-shutdown');}else finishShutdown();}
ipcMain.on('app-quit',e=>{if(e.sender===win?.webContents)requestShutdown();});
ipcMain.on('app-exit-ready',e=>{if(e.sender===win?.webContents&&shutdownRequested)finishShutdown();});
const launchFiles=require('./launch-files.cjs');let pendingLaunchFiles=launchFiles.pathsFromArgs(process.argv||[]),rendererAcceptingFiles=false;
function queueLaunchFiles(args){for(const file of launchFiles.pathsFromArgs(args))if(!pendingLaunchFiles.some(p=>p.toLowerCase()===file.toLowerCase())&&pendingLaunchFiles.length<500)pendingLaunchFiles.push(file);if(rendererAcceptingFiles&&win&&!win.isDestroyed())win.webContents.send('open-files-available');}
ipcMain.handle('take-launch-files',async event=>{if(event.sender!==win?.webContents)return {files:[],errors:[],more:false};rendererAcceptingFiles=true;const paths=pendingLaunchFiles.splice(0,20),results=await Promise.allSettled(paths.map(p=>playlistFiles.readMidi(p))),files=[],errors=[];results.forEach((r,i)=>{if(r.status==='fulfilled')files.push(r.value);else errors.push(path.basename(paths[i])+': '+r.reason.message);});return {files,errors,more:pendingLaunchFiles.length>0};});
app.on('second-instance',(_,args)=>{queueLaunchFiles(args);if(win&&!win.isDestroyed()){showGroup();win.focus();}});
app.on('open-file',(event,file)=>{event.preventDefault();queueLaunchFiles([file]);if(win&&!win.isDestroyed()){showGroup();win.focus();}});
function notify(){if(win&&!win.isDestroyed())win.webContents.send('midi-status',{ready,devices,status,timelineAvailable});}
function startBridge(){
 if(process.platform!=='win32'){status='Sintetizador de prévia';notify();return;}
 bridge=spawn('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'midi-bridge.ps1')],{windowsHide:true,stdio:['pipe','pipe','pipe']});
 let buf='';bridge.stdout.on('data',b=>{buf+=b.toString();let i;while((i=buf.indexOf('\n'))>=0){const line=buf.slice(0,i).trim();buf=buf.slice(i+1);if(line.startsWith('DEVICE ')){const p=line.split(' ');devices.push({id:Number(p[1]),name:Buffer.from(p[2],'base64').toString('utf8')});}if(line==='TIMELINE_ERROR'){timelineAvailable=false;status='Audio MIDI do Windows (modo compativel)';notify();}if(line==='READY'){ready=true;status='Áudio MIDI do Windows';notify();}if(line.startsWith('ERROR ')){ready=false;status='Saída MIDI indisponível ('+line.slice(6)+'). Usando prévia.';notify();}}});
 bridge.on('error',()=>{ready=false;status='Áudio Windows indisponível. Usando prévia.';notify();});
 bridge.on('exit',()=>{ready=false;status='Saída MIDI encerrada. Usando sintetizador de prévia.';notify();});bridge.stderr.on('data',()=>{});
}
app.whenReady().then(()=>{if(process.platform==='win32')app.setAppUserModelId('br.aurora.midi');
 win=new BrowserWindow({...geometry('player'),show:false,minWidth:520,minHeight:260,backgroundColor:'#0b0d13',icon:path.join(__dirname,'assets','aurora.ico'),title:'Aurora MIDI',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',(e,url)=>{if(!url.startsWith('file://'))e.preventDefault();});
 win.on('close',e=>{if(!shutdownFinished){e.preventDefault();requestShutdown();}});win.on('closed',()=>{if(!shutdownFinished)finishShutdown();});win.loadFile('index.html');watchLayout(win,'player');win.on('minimize',hideGroup);win.on('restore',showGroup);win.on('focus',showGroup);// Native fullscreen events can arrive late during startup/restore. Only an explicit dock-mode request may detach panels.
 win.webContents.on('did-fail-load',()=>{if(!closingAll)win.show();});startBridge();if(process.platform==='win32'){tray=new Tray(path.join(__dirname,'assets','aurora.ico'));tray.setToolTip('Aurora MIDI · Player e acordes');tray.setContextMenu(Menu.buildFromTemplate([{label:'Mostrar player',click:()=>{showGroup();win.focus();}},{label:'Mostrar acordes',click:()=>openChordWindow()},{type:'separator'},{label:'Encerrar Aurora',click:requestShutdown}]));tray.on('double-click',()=>{showGroup();win.focus();});}
});
function openKaraokeWindow(){if(win&&!win.isDestroyed())win.webContents.send('dock-panel-open','karaoke');}
ipcMain.on('karaoke-open',openKaraokeWindow);
ipcMain.on('karaoke-frame',(_,frame)=>{if(!frame||typeof frame.html!=='string'||frame.html.length>500000)return;lastFrame=frame;if(karaokeWindow&&!karaokeWindow.isDestroyed())karaokeWindow.webContents.send('karaoke-frame',frame);});
ipcMain.on('karaoke-fullscreen',()=>{if(karaokeWindow&&!karaokeWindow.isDestroyed())karaokeWindow.setFullScreen(!karaokeWindow.isFullScreen());});
ipcMain.handle('midi-state',()=>({ready,devices,status,timelineAvailable}));
ipcMain.on('midi-send',(_,messages)=>{if(!ready||!Array.isArray(messages)||messages.length>10000)return;let s='';for(const m of messages)if(Array.isArray(m)&&m.length>=1&&m.length<=3&&m.every(n=>Number.isInteger(n)&&n>=0&&n<=255))s+='S '+m.join(' ')+'\n';if(s)bridge?.stdin.writable&&bridge.stdin.write(s);});
ipcMain.on('midi-long',(_,data)=>{if(ready&&Array.isArray(data)&&data.length<=1048576&&data.every(v=>Number.isInteger(v)&&v>=0&&v<=255)&&bridge?.stdin.writable)bridge.stdin.write('L '+Buffer.from(data).toString('hex')+'\n');});
// A complete timeline is handed to the native clock, outside the renderer.
ipcMain.on('midi-timeline',(event,request)=>{
 if(event.sender!==win?.webContents||!ready||!bridge?.stdin.writable||!request)return;
 if(request.kind==='stop'){bridge.stdin.write('TIMELINE stop\n');return;}
 if(!['start','replace'].includes(request.kind)||!Number.isFinite(request.speed)||request.speed<.25||request.speed>2||!Number.isFinite(request.end)||request.end<0)return;
 if(request.kind==='start'&&(!Number.isFinite(request.position)||request.position<0))return;
 if(!(request.data instanceof Uint8Array)||request.data.byteLength>64*1024*1024)return;
 const data=Buffer.from(request.data).toString('base64');
 bridge.stdin.write(request.kind==='start'?'TIMELINE start '+request.position+' '+request.speed+' '+request.end+' '+data+'\n':'TIMELINE replace '+request.speed+' '+request.end+' '+data+'\n');
});
ipcMain.on('midi-reset',()=>{if(bridge?.stdin.writable)bridge.stdin.write('RESET\n');});
ipcMain.on('midi-open',(_,id)=>{if(Number.isInteger(id)&&id>=-1&&id<devices.length&&bridge?.stdin.writable)bridge.stdin.write('OPEN '+id+'\n');});
ipcMain.handle('save-file',async(_,name,bytes)=>{if(typeof name!=='string'||(!(bytes instanceof Uint8Array)&&!Array.isArray(bytes))||bytes.length>300*1024*1024)return false;const r=await dialog.showSaveDialog(win,{defaultPath:path.basename(name)});if(r.canceled)return false;await fs.promises.writeFile(r.filePath,Buffer.from(bytes));return true;});

function openChordWindow(){if(win&&!win.isDestroyed())win.webContents.send('dock-panel-open','chords');}
ipcMain.on('chord-open',()=>openChordWindow());

function openLiveKeyboardWindow(leftOnly=false){
 if(liveKeyboardWindow&&!liveKeyboardWindow.isDestroyed()){if(leftOnly){liveKeyboardWindow.leftOnly=true;liveKeyboardWindow.webContents.send('live-keyboard-mode',{leftOnly:true});}if(liveKeyboardWindow.isMinimized())liveKeyboardWindow.restore();if(!liveKeyboardWindow.isVisible())liveKeyboardWindow.show();liveKeyboardWindow.focus();return;}
 const panel=new BrowserWindow({title:'Aurora — Teclado ao vivo',...geometry('livekeyboard'),minWidth:380,minHeight:420,parent:win,skipTaskbar:true,icon:path.join(__dirname,'assets','aurora.ico'),backgroundColor:'#101a17',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),partition:'persist:aurora-live-keyboard',contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
 liveKeyboardWindow=panel;panel.leftOnly=leftOnly;panel.webContents.once('did-finish-load',()=>{if(panel.leftOnly)panel.webContents.send('live-keyboard-mode',{leftOnly:true});});
 // This dedicated local panel receives ordinary MIDI notes. No SysEx access.
 const permission=(contents,name)=>contents===panel.webContents&&name==='midi';
 panel.webContents.session?.setPermissionCheckHandler(permission);
 panel.webContents.session?.setPermissionRequestHandler((contents,name,callback)=>callback(permission(contents,name)));
 panel.webContents.setWindowOpenHandler(()=>({action:'deny'}));panel.webContents.on('will-navigate',event=>event.preventDefault());
 panel.loadFile('live-keyboard.html',{query:leftOnly?{leftOnly:'1'}:{}});panel.on('closed',()=>{nativeMidiInput.close();liveKeyboardWindow=null;});watchWindow(panel);watchLayout(panel,'livekeyboard');
}
 ipcMain.on('live-keyboard-open',(event,leftOnly)=>{if(event.sender===win?.webContents)openLiveKeyboardWindow(leftOnly===true);});
function sendMidiInput(kind,value){if(liveKeyboardWindow&&!liveKeyboardWindow.isDestroyed())liveKeyboardWindow.webContents.send(kind,value);}
nativeMidiInput.on('state',state=>sendMidiInput('midi-input-state',state));nativeMidiInput.on('messages',frame=>sendMidiInput('midi-input-messages',frame));nativeMidiInput.on('reset',()=>sendMidiInput('midi-input-reset'));
ipcMain.handle('midi-input-state',async event=>{if(event.sender!==liveKeyboardWindow?.webContents)return {error:'Janela inválida.'};try{return await nativeMidiInput.start();}catch(error){return {...nativeMidiInput.snapshot(),error:error.message};}});
ipcMain.handle('midi-input-command',async(event,kind,id)=>{if(event.sender!==liveKeyboardWindow?.webContents)return {error:'Janela inválida.'};try{return await nativeMidiInput.command(kind,id);}catch(error){return {error:error.message};}});

ipcMain.on('chord-frame',(_,frame)=>{if(!frame||typeof frame.html!=='string'||frame.html.length>500000)return;lastChordFrame=frame;if(chordWindow&&!chordWindow.isDestroyed())chordWindow.webContents.send('chord-frame',frame);});
ipcMain.on('chord-action',(_,action)=>{if(['freeze','capo','copy','compact'].includes(action)&&win&&!win.isDestroyed())win.webContents.send('chord-action',action);});
function openPanelWindow(type){if(['mixer','piano','playlist','controls'].includes(type)&&win&&!win.isDestroyed())win.webContents.send('dock-panel-open',type);}
ipcMain.on('panel-open',(_,type)=>openPanelWindow(type));
ipcMain.on('panel-frame',(_,frame)=>{if(!frame||!Array.isArray(frame.channels)||frame.channels.length>16||!Array.isArray(frame.notes)||frame.notes.length>2048)return;lastPanelFrame=frame;for(const panel of panelWindows.values())if(!panel.isDestroyed())panel.webContents.send('panel-frame',frame);});
const panelActions=['prepare-song','mute','solo','reduce','volume','program','note-on','note-off','reset-channel','reset-mix','save-mix','load-mix','save-midi','play','pause','stop','next','prev','seek','speed','transpose','gain','master','reset-controls','sort','search','filter','play-playlist','select-song','move-up','move-down','move-song','open-midi','open-vpl','save-vpl','backup','create-list','rename-list','delete-list','switch-list','clear-list','remove-song','queue-next','unqueue-next','set-pref','mark-entry','auto-entry','choose-bg','clear-bg','restore-visual','fill','cancel-fill'];
ipcMain.on('panel-action',(_,action)=>{if(action&&panelActions.includes(action.kind)&&win&&!win.isDestroyed())win.webContents.send('panel-action',action);});
let compactLayout=true;
function publishWindows(){if(!win||win.isDestroyed())return;const visible=w=>!!w&&!w.isDestroyed()&&w.isVisible()&&!w.isMinimized();win.webContents.send('window-state',{playlist:visible(panelWindows.get('playlist')),controls:visible(panelWindows.get('controls')),mixer:visible(panelWindows.get('mixer')),piano:visible(panelWindows.get('piano')),karaoke:visible(karaokeWindow),chords:visible(chordWindow)});}
function watchWindow(w){w.webContents.once('did-finish-load',()=>{w.webContents.send('theme-state',theme);w.webContents.send('panel-layout',{compact:true});win?.webContents.send('panels-ready');});for(const name of ['show','hide','minimize','restore','closed'])w.on(name,publishWindows);publishWindows();}
ipcMain.on('window-toggle',(_,type)=>{if(['playlist','controls','mixer','piano','karaoke','chords'].includes(type)&&win&&!win.isDestroyed())win.webContents.send('dock-panel-toggle',type);});
ipcMain.on('compact-mode',()=>{});

function route(name,fn){ipcMain.handle(name,async(e,...args)=>{try{return await fn(e,...args);}catch(err){return {error:err.message};}});}
route('save-song-as',async(_,name,bytes,originalPath)=>{
 if(typeof name!=='string'||(!(bytes instanceof Uint8Array)&&!Array.isArray(bytes))||bytes.length>100*1024*1024)throw Error('MIDI inválido.');
 const canonical=async p=>{try{return await fs.promises.realpath(p);}catch{return path.resolve(p);}};
 const source=originalPath?await canonical(originalPath):null;
 while(true){const r=await dialog.showSaveDialog(win,{defaultPath:path.basename(name),filters:[{name:'MIDI e karaokê',extensions:['mid','kar']}]});if(r.canceled)return false;let target=await canonical(r.filePath),same=source&&(process.platform==='win32'?target.toLowerCase()===source.toLowerCase():target===source);
 if(source&&!same)try{let a=await fs.promises.stat(source),b=await fs.promises.stat(target);same=!!a.ino&&a.ino===b.ino&&a.dev===b.dev;}catch{}
 if(same){await dialog.showMessageBox(win,{type:'info',message:'Escolha outro nome para preservar o MIDI original.',detail:'A mix personalizada será salva como uma cópia.',buttons:['Escolher outro nome']});continue;}
 await fs.promises.writeFile(r.filePath,Buffer.from(bytes));return {path:r.filePath};}
});
route('choose-midis',async()=>{const r=await dialog.showOpenDialog(win,{properties:['openFile','multiSelections'],filters:[{name:'MIDI e karaokê',extensions:['mid','midi','kar','rmi']}]});if(r.canceled)return {files:[]};let files=[],errors=[];for(const p of r.filePaths.slice(0,500))try{files.push(await playlistFiles.readMidi(p));}catch(e){errors.push(path.basename(p)+': '+e.message);}return {files,errors};});
route('choose-folder',async()=>{const r=await dialog.showOpenDialog(win,{properties:['openDirectory']});if(r.canceled)return {files:[]};const paths=await playlistFiles.findFiles(r.filePaths[0],500);let files=[];for(const p of paths)try{files.push(await playlistFiles.readMidi(p));}catch{}return {files,folder:r.filePaths[0]};});
route('import-playlist',async()=>{const r=await dialog.showOpenDialog(win,{properties:['openFile'],filters:[{name:'Playlists VanBasco / Aurora',extensions:['vpl','aurora','json']}]});if(r.canceled)return null;let p=r.filePaths[0];if(!/\.vpl$/i.test(p))return {kind:'aurora',name:path.basename(p),bytes:new Uint8Array(await fs.promises.readFile(p))};let doc=await playlistFiles.loadVpl(p);if(doc.missing){const ask=await dialog.showMessageBox(win,{type:'question',message:doc.missing+' arquivo(s) da lista não foram encontrados.',detail:'Um VPL guarda os caminhos, sem incluir os arquivos MIDI. Você pode indicar a pasta onde as músicas estão agora.',buttons:['Localizar pasta das músicas','Manter entradas ausentes'],defaultId:0,cancelId:1});if(ask.response===0){const folder=await dialog.showOpenDialog(win,{properties:['openDirectory']});if(!folder.canceled)doc=await playlistFiles.loadVpl(p,folder.filePaths[0]);}}return {kind:'vpl',doc};});
route('relink-playlist',async(_,file)=>{if(typeof file!=='string'||!/\.vpl$/i.test(file))throw Error('Importe o VPL novamente para localizar as músicas.');const r=await dialog.showOpenDialog(win,{properties:['openDirectory']});return r.canceled?null:{kind:'vpl',doc:await playlistFiles.loadVpl(file,r.filePaths[0])};});
route('save-vpl',async(_,name,entries)=>{const r=await dialog.showSaveDialog(win,{defaultPath:path.basename(name||'Playlist')+'.vpl',filters:[{name:'Playlist VanBasco',extensions:['vpl']}]});if(r.canceled)return null;const p=/\.vpl$/i.test(r.filePath)?r.filePath:r.filePath+'.vpl';return playlistFiles.saveVpl(p,name,entries);});
ipcMain.on('always-top',(e,enabled)=>BrowserWindow.fromWebContents(e.sender)?.setAlwaysOnTop(!!enabled));
app.on('window-all-closed',()=>{if(!closingAll)requestShutdown();});app.on('before-quit',e=>{if(!shutdownFinished){e.preventDefault();requestShutdown();}});

}else{app.quit();}
