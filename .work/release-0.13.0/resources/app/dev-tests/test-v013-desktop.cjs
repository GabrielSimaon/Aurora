const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const root=path.resolve(__dirname,'..'),windows=[],ipc=new EventEmitter();let ready;
class Window extends EventEmitter{
 constructor(options){super();this.options=options;this.messages=[];this.webContents=new EventEmitter();this.webContents.send=(...args)=>this.messages.push(args);this.webContents.setWindowOpenHandler=()=>{};this.visible=false;windows.push(this);}
 loadFile(file){this.file=file;}isDestroyed(){return false;}isVisible(){return this.visible;}isMinimized(){return false;}getBounds(){return {x:0,y:0,width:1200,height:800};}show(){this.visible=true;}focus(){}setFullScreen(value){this.full=value;}isFullScreen(){return !!this.full;}
}
Window.fromWebContents=sender=>windows.find(w=>w.webContents===sender);ipc.handle=()=>{};
const electron={app:{whenReady:()=>({then:fn=>ready=fn}),on(){},quit(){}},BrowserWindow:Window,ipcMain:ipc,screen:{getDisplayMatching:()=>({workArea:{x:0,y:0,width:1366,height:768}})}};
vm.runInContext(fs.readFileSync(path.join(root,'main.cjs'),'utf8'),vm.createContext({require:name=>name==='electron'?electron:require(name.startsWith('.')?path.resolve(root,name):name),__dirname:root,Buffer,Uint8Array,process:{platform:'linux'},setTimeout:()=>0,clearTimeout(){},console}));ready();
const main=windows[0];ipc.emit('dock-mode',{sender:main.webContents},true);assert(main.full);
for(const type of ['playlist','controls','mixer','piano','karaoke','chords'])ipc.emit('window-toggle',{sender:main.webContents},type);
for(const type of ['mixer','controls','playlist','piano'])ipc.emit('panel-open',{sender:main.webContents},type);
ipc.emit('karaoke-open',{sender:main.webContents});ipc.emit('chord-open',{sender:main.webContents});
ipc.emit('dock-mode',{sender:main.webContents},false);ipc.emit('compact-mode',{sender:main.webContents},false);
assert.equal(windows.length,1,'panel commands must never construct floating windows');assert(main.full,'legacy detach and studio requests cannot leave the dock');
assert.equal(main.messages.filter(([name])=>name==='dock-panel-toggle').length,6);assert.equal(main.messages.filter(([name])=>name==='dock-panel-open').length,6);
console.log('PASS desktop keeps one workspace: all panel commands route to embedded views, and legacy detach/studio IPC cannot create windows or leave dock mode');
