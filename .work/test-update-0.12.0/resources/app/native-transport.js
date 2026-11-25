'use strict';
// Compile the complete device timeline once per song/mix. No UI callbacks are
// needed to deliver its notes, controllers, or SysEx at their original times.
(function(){
 const proto=AuroraPlayer.prototype;
 proto.compileNativeTimeline=function(fromIndex=0){
  const shadow=Object.create(proto);Object.assign(shadow,{song:this.song,channels:this.channels,volume:this.volume,gainFactor:this.gainFactor,transpose:this.transpose,native:true,forcePreview:false});shadow.resetRuntime();
  const entries=[],pending=new Set();
  const add=(sec,data,index,long=false)=>{if(index>=fromIndex&&data.length)entries.push({sec,data,long});};
  for(let i=0;i<this.song.events.length;i++){
   const e=this.song.events[i];
   if(e.type==='sysex'){
    if(MidiCore.isResetSysex(e)){shadow.resetRuntime();pending.clear();for(const c of this.song.channels)pending.add(c.id);}
    add(e.sec,e.status===240?[240,...e.data]:Array.from(e.data),i,true);continue;
   }
   if(e.type!=='channel')continue;shadow.updateRuntime(e);
   if(e.kind===9&&e.data[1]>0&&pending.has(e.ch)){pending.delete(e.ch);for(const msg of shadow.channelMessages(e.ch))add(e.sec,msg,i);}
   const msg=shadow.transform(e);if(msg)add(e.sec,msg,i);
  }
  const bytes=new Uint8Array(4+entries.reduce((n,e)=>n+12+e.data.length,0)),view=new DataView(bytes.buffer);view.setInt32(0,entries.length,true);let at=4;
  for(const e of entries){view.setFloat64(at,e.sec,true);view.setInt32(at+8,e.long?-e.data.length:e.data.length,true);bytes.set(e.data,at+12);at+=12+e.data.length;}
  return bytes;
 };
 proto.startNativeTimeline=function(){
  if(this.nativeTimelineAvailable===false||this.preparingNative||this.nativeTimelineRunning||!this.playing||!this.song||!this.native||this.forcePreview||this.fill||this.tails.length||!window.desktop?.timeline)return;
  const data=this.compileNativeTimeline(this.index);this.nativeTimelineRunning=true;
  window.desktop.timeline({kind:'start',data,position:this.position,speed:this.speed,end:Math.min(this.song.duration,this.endAt??this.song.duration,this.loop&&this.loopB>this.loopA?this.loopB:Infinity)});
  this.last=performance.now();
 };
 proto.updateNativeTimeline=function(){
  if(!this.nativeTimelineRunning)return;
  window.desktop.timeline({kind:'replace',data:this.compileNativeTimeline(),speed:this.speed,end:Math.min(this.song.duration,this.endAt??this.song.duration,this.loop&&this.loopB>this.loopA?this.loopB:Infinity)});
 };
 proto.stopNativeTimeline=function(){if(!this.nativeTimelineRunning)return;this.nativeTimelineRunning=false;window.desktop?.timeline?.({kind:'stop'});};
 const play=proto.play;proto.play=async function(options){this.preparingNative=true;try{await play.call(this,options);}finally{this.preparingNative=false;}this.startNativeTimeline();};
 const silence=proto.silence;proto.silence=function(){this.stopNativeTimeline();return silence.call(this);};
 const seek=proto.seek;proto.seek=function(sec,options){this.stopNativeTimeline();const result=seek.call(this,sec,options);this.startNativeTimeline();return result;};
 const load=proto.load;proto.load=function(...args){this.stopNativeTimeline();return load.apply(this,args);};
 const fill=proto.startFill;proto.startFill=function(...args){this.stopNativeTimeline();return fill.apply(this,args);};
 const tick=proto.tick;proto.tick=function(){const result=tick.call(this);this.startNativeTimeline();return result;};
 for(const name of ['refresh','setProgram','setVolume','setSpeed','setTranspose']){const original=proto[name];proto[name]=function(...args){const result=original.apply(this,args);this.updateNativeTimeline();return result;};}
})();
