const {EventEmitter}=require('node:events');
const {spawn:defaultSpawn}=require('node:child_process');
class NativeMidiInput extends EventEmitter{
 constructor({script,platform=process.platform,spawn=defaultSpawn}){super();Object.assign(this,{script,platform,spawn});this.child=null;this.starting=null;this.ready=false;this.devices=[];this.activeId=null;this.error=null;this.pending=new Map();this.serial=0;this.messages=[];this.batchTimer=null;}
 snapshot(){return {supported:this.platform==='win32',ready:this.ready,devices:this.devices.map(d=>({...d})),activeId:this.activeId,error:this.error};}
 publish(){this.emit('state',this.snapshot());}
 start(){if(this.platform!=='win32'||this.ready)return Promise.resolve(this.snapshot());if(this.starting)return this.starting;
  this.starting=new Promise((resolve,reject)=>{let child;try{child=this.spawn('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',this.script],{windowsHide:true,stdio:['pipe','pipe','pipe']});}catch(error){reject(error);return;}this.child=child;let buffer='',list=[];
   const startup=setTimeout(()=>{if(this.child!==child)return;this.fail(Error('A entrada MIDI do Windows não iniciou. Tente Atualizar.'));child.kill();},12000);startup.unref?.();
   const ready=()=>{clearTimeout(startup);this.ready=true;this.error=null;resolve(this.snapshot());};
   this.finishStartup=error=>{clearTimeout(startup);reject(error);};
   child.stdout.on('data',chunk=>{if(this.child!==child)return;buffer+=chunk.toString();let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end).trim();buffer=buffer.slice(end+1);const [kind,token,value,name]=line.split(' ');
    if(kind==='LISTBEGIN')list=[];
    else if(kind==='INPUT'&&/^\d+$/.test(token))list.push({id:'winmm:'+token,name:Buffer.from(value||'','base64').toString('utf8')});
    else if(kind==='LISTEND'){this.devices=list.slice();if(!this.ready)ready();this.publish();this.complete(token);}
    else if(kind==='ACTIVE'){this.activeId='winmm:'+value;this.error=null;this.publish();this.complete(token);}
    else if(kind==='CLOSED'){this.activeId=null;this.messages=[];this.publish();this.emit('reset');this.complete(token);}
    else if(kind==='ERROR'){this.activeId=null;this.messages=[];const code=Number(value);this.error=code===4?'O teclado está em uso. Feche o outro programa MIDI e tente novamente.':'Não foi possível abrir a entrada MIDI ('+code+'): '+Buffer.from(name||'','base64').toString('utf8');this.publish();this.emit('reset');this.complete(token,Error(this.error));}
    else if(kind==='RESET'){this.messages=[];this.emit('reset');}
    else if(kind==='MIDI'&&this.activeId){const packed=Number(token);if(!Number.isInteger(packed)||packed<0||packed>0xffffffff)continue;const status=packed&255,kind=status>>4;this.messages.push(status>=248?[status]:[12,13].includes(kind)?[status,(packed>>>8)&127]:[status,(packed>>>8)&127,(packed>>>16)&127]);if(!this.batchTimer)this.batchTimer=setTimeout(()=>{this.batchTimer=null;const messages=this.messages.splice(0);if(messages.length&&this.activeId)this.emit('messages',{id:this.activeId,messages});},8);if(this.messages.length>8192){this.messages=[];this.emit('reset');}}
   }});
   child.on('error',error=>{if(this.child===child)this.fail(error);});child.on('exit',()=>{if(this.child===child)this.fail(Error('A entrada MIDI do Windows foi encerrada. Clique em Atualizar.'));});child.stderr.on('data',()=>{});child.stdin.on('error',error=>{if(this.child===child)this.fail(error);});
  }).catch(error=>{this.starting=null;throw error;});return this.starting;
 }
 complete(token,error){const item=this.pending.get(token);if(!item)return;clearTimeout(item.timer);this.pending.delete(token);error?item.reject(error):item.resolve(this.snapshot());}
 fail(error){this.error=error.message;this.ready=false;this.activeId=null;this.messages=[];const child=this.child;this.child=null;this.starting=null;this.finishStartup?.(error);for(const token of this.pending.keys())this.complete(token,error);this.publish();this.emit('reset');try{child?.kill();}catch{}}
 async command(kind,id){await this.start();if(!this.ready)throw Error('Entrada MIDI indisponível.');if(!['LIST','OPEN','CLOSE'].includes(kind))throw Error('Comando MIDI inválido.');if(kind==='OPEN'&&!/^winmm:\d+$/.test(id||''))throw Error('Entrada MIDI inválida.');return new Promise((resolve,reject)=>{const token=String(++this.serial),timer=setTimeout(()=>{this.complete(token,Error('O teclado não respondeu. Clique em Atualizar.'));},5000);this.pending.set(token,{resolve,reject,timer});this.child.stdin.write(kind+' '+token+(kind==='OPEN'?' '+id.slice(6):'')+'\n');});}
 close(){const child=this.child;this.child=null;this.starting=null;this.ready=false;this.activeId=null;this.devices=[];this.messages=[];clearTimeout(this.batchTimer);this.batchTimer=null;this.finishStartup?.(Error('Entrada MIDI encerrada.'));for(const token of this.pending.keys())this.complete(token,Error('Entrada MIDI encerrada.'));try{if(child){child.stdin.end('QUIT\n');const timer=setTimeout(()=>{if(child.exitCode==null)child.kill();},500);timer.unref?.();}}catch{} }
}
module.exports=NativeMidiInput;
