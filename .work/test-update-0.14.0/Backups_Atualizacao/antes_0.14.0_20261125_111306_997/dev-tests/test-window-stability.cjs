const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict'),{EventEmitter}=require('events');
const root=path.resolve(__dirname,'..'),windows=[],ipc=new EventEmitter(),events=[];let ready,shows=0,raises=0;
class W extends EventEmitter{
 constructor(options){super();this.bounds=options;this.visible=options.show!==false;this.minimized=false;this.messages=[];this.webContents=new EventEmitter();this.webContents.send=(...m)=>this.messages.push(m);this.webContents.setWindowOpenHandler=()=>{};windows.push(this);}
 loadFile(){}isDestroyed(){return false}isVisible(){return this.visible}isMinimized(){return this.minimized}getBounds(){return this.bounds}setBounds(b){this.bounds=b}setFullScreen(v){this.full=v}isFullScreen(){return !!this.full}
 show(){shows++;this.visible=true;events.push(()=>windows[0].emit('focus'));this.emit('show');}
 showInactive(){shows++;this.visible=true;this.emit('show');}
 hide(){this.visible=false;this.emit('hide');}focus(){events.push(()=>this.emit('focus'));}moveTop(){raises++;events.push(()=>windows[0].emit('focus'));}
 minimize(){this.minimized=true;this.emit('minimize');}restore(){this.minimized=false;this.visible=true;this.emit('restore');events.push(()=>this.emit('focus'));}
}
W.fromWebContents=sender=>windows.find(w=>w.webContents===sender);ipc.handle=()=>{};
const app={whenReady:()=>({then:f=>ready=f}),on(){},quit(){}};
const electron={app,BrowserWindow:W,ipcMain:ipc,screen:{getDisplayMatching:()=>({workArea:{x:0,y:0,width:1366,height:768}})},dialog:{}};
const context=vm.createContext({require:n=>n==='electron'?electron:require(n.startsWith('.')?path.resolve(root,n):n),__dirname:root,Buffer,process:{platform:'linux'},setTimeout:()=>0,clearTimeout(){},console});
vm.runInContext(fs.readFileSync(path.join(root,'main.cjs'),'utf8'),context);ready();const main=windows[0];
function flush(){let count=0;while(events.length){assert(++count<100,'asynchronous focus events caused a show/raise loop');events.shift()();}}
const dock=value=>ipc.emit('dock-mode',{sender:main.webContents},value);
assert(!main.visible);dock(true);flush();assert(main.full&&main.visible);assert.equal(windows.length,1);
const baseline=shows;for(let i=0;i<100;i++)main.emit('focus');flush();assert.equal(shows,baseline,'focus repeatedly showed an already visible window');assert.equal(raises,0);
// A late native notification, or leaving OS fullscreen, must not detach panels.
main.emit('leave-full-screen');flush();assert.equal(windows.length,1);assert(!main.messages.some(m=>m[0]==='dock-state'&&m[1]===false));
main.full=false;main.emit('leave-full-screen');flush();assert.equal(windows.length,1,'native fullscreen exit opened floating windows');
dock(false);flush();assert.equal(windows.length,5,'explicit detach opens the four expected panels');
const detachedShows=shows;for(let i=0;i<100;i++)main.emit('focus');flush();assert.equal(shows,detachedShows);assert.equal(raises,0);
windows[1].hide();windows[2].minimize();main.minimize();main.restore();flush();assert(!windows[1].visible,'restore reopened a manually hidden panel');assert(windows[2].minimized,'restore unminimized a panel explicitly minimized by the user');assert(windows[3].visible&&windows[4].visible);
for(let i=0;i<20;i++){dock(true);flush();main.emit('leave-full-screen');flush();dock(false);flush();}assert.equal(windows.length,5,'dock cycling created duplicate windows');
console.log('PASS queued focus events settle; 100 focus notifications do not show/raise windows; late fullscreen events preserve docking; minimize/restore preserves panel choices; 20 dock cycles create no duplicate windows');

// Child panels must send only the initial shortcut event, even when held down.
const handlers={},sent=[];const child=vm.createContext({window:{parent:{postMessage:m=>sent.push(m)},addEventListener:(name,f)=>handlers[name]=f},document:{documentElement:{classList:{add(){}}}}});
vm.runInContext(fs.readFileSync(path.join(root,'dock-child.js'),'utf8'),child);for(const key of ['d','Escape']){const before=sent.length;for(let i=0;i<20;i++)handlers.keydown({key,ctrlKey:key==='d',shiftKey:key==='d',repeat:i>0,preventDefault(){}});assert.equal(sent.length-before,1,'held shortcut repeatedly changed dock mode');}
console.log('PASS held dock and Escape shortcuts from embedded panels send only one command');
