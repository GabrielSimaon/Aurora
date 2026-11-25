const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
let now=0;const commands=[],messages=[];
class CE extends Event {constructor(name,init){super(name,init);this.detail=init?.detail;}}
const context=vm.createContext({EventTarget,CustomEvent:CE,performance:{now:()=>now},setInterval:()=>0,console,Uint8Array,DataView,window:{desktop:{reset(){},send:m=>messages.push(...m),sendLong(){},timeline:m=>commands.push(m)}},MidiCore:require('../midi-core.js')});
for(const file of ['player.js','native-transport.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
const decode=bytes=>{const data=Buffer.from(bytes),events=[];let offset=4;for(let i=0;i<data.readInt32LE(0);i++){const sec=data.readDoubleLE(offset),encodedLength=data.readInt32LE(offset+8),length=Math.abs(encodedLength);events.push({sec,long:encodedLength<0,data:Array.from(data.subarray(offset+12,offset+12+length))});offset+=12+length;}assert.equal(offset,data.length);return events;};
(async()=>{
 const p=new context.window.AuroraPlayer();p.native=true;
 const song={duration:10,bpm:120,channels:[{id:0},{id:9}],notes:[{ch:0,note:60,start:.1,end:8,sustainEnd:8,velocity:100}],events:[{sec:0,type:'channel',kind:12,ch:0,status:192,data:[4]},{sec:.1,type:'channel',kind:9,ch:0,status:144,data:[60,100]},{sec:.2,type:'channel',kind:9,ch:9,status:153,data:[36,100]},{sec:8,type:'channel',kind:8,ch:0,status:128,data:[60,0]}]};
 p.load(song);await p.play();assert(p.nativeTimelineRunning);assert.equal(commands.at(-1).kind,'start');assert(decode(commands.at(-1).data).some(e=>e.sec===8&&e.data[0]===128),'native queue includes the final note release');
 const sent=messages.length;now=2500;p.tick();assert.equal(p.position,2.5,'a busy UI must catch up to the independent clock');assert.equal(messages.length,sent,'renderer must never replay queued notes after a stall');
 p.setTranspose(2);assert.equal(commands.at(-1).kind,'replace');const events=decode(commands.at(-1).data);assert(events.some(e=>e.data[0]===144&&e.data[1]===62));assert(events.some(e=>e.data[0]===153&&e.data[1]===36),'transposing must preserve the drum map');
 p.setSpeed(1.25);assert.equal(commands.at(-1).speed,1.25);p.seek(4);assert.equal(commands.at(-1).kind,'start');assert.equal(commands.at(-1).position,4);assert(decode(commands.at(-1).data).every(e=>e.sec>=4),'seek must omit already restored attacks');
 p.pause();assert.equal(commands.at(-1).kind,'stop');assert(!p.nativeTimelineRunning);now=3500;p.tick();assert(!p.nativeTimelineRunning,'paused transport must not restart');
 // Future GM resets must restore custom programs before the first following note.
 const sysex={...song,events:[{sec:1,type:'sysex',status:240,data:[126,127,9,1,247]},{sec:2,type:'channel',kind:9,ch:0,status:144,data:[60,100]}]};p.load(sysex,{channels:{0:{program:24}}});const resetPlan=decode(p.compileNativeTimeline());const patch=resetPlan.findIndex(e=>e.sec===2&&e.data[0]===192&&e.data[1]===24),attack=resetPlan.findIndex(e=>e.sec===2&&e.data[0]===144);assert(patch>=0&&patch<attack);
 console.log('PASS native transport compilation, complete release queue, no duplicate notes after a 2.5-second UI stall, tempo/transpose, seek, pause and GM-reset patches');
})().catch(error=>{console.error(error);process.exitCode=1;});
