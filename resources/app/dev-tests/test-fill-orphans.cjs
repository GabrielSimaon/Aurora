'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const appDir=path.resolve(__dirname,'..');
const MidiCore=require(path.join(appDir,'midi-core.js'));
const PlaylistCore=require(path.join(appDir,'playlist-core.js'));
const TransitionCore=require(path.join(appDir,'transition-core.js'));

function createHarness(){
 let T=1000;
 const log=[],timeline=[];
 let resets=0;
 const ctx={
  performance:{now:()=>T},
  window:{desktop:{send(m){log.push(...m.map(x=>[...x]));},sendLong(){},reset(){resets++;},timeline(o){timeline.push(o.kind);}}},
  MidiCore,
  MixerCore:{DEFAULT:{volume:1,pan:null,mute:false,solo:false,program:-1},originalAt:()=>({bankMsb:0,bankLsb:0,program:0})},
  CustomEvent,EventTarget,setInterval:()=>0,clearInterval(){},console
 };
 vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(path.join(appDir,'player.js'),'utf8'),ctx,{filename:'player.js'});
 vm.runInContext(fs.readFileSync(path.join(appDir,'native-transport.js'),'utf8'),ctx,{filename:'native-transport.js'});
 const p=new ctx.window.AuroraPlayer();
 p.native=true;
 p.nativeTimelineAvailable=false;
 return {
  p,log,timeline,
  resets:()=>resets,
  now:()=>T,
  advance(ms){T+=ms;p.tick();},
  setNow(v){T=v;}
 };
}
function makeSong(events,notes,duration,channels=[0]){
 return {
  duration,bpm:120,tempoMap:[{sec:0,tempo:500000}],
  channels:channels.map(id=>({id})),
  events:events.slice().sort((a,b)=>a.sec-b.sec),
  notes
 };
}
const noteOn=(sec,note,vel=100,ch=0)=>({type:'channel',kind:9,ch,status:144|ch,data:[note,vel],sec});
const noteOff=(sec,note,ch=0)=>({type:'channel',kind:8,ch,status:128|ch,data:[note,0],sec});
const cc=(sec,ctrl,val,ch=0)=>({type:'channel',kind:11,ch,status:176|ch,data:[ctrl,val],sec});
const nextSong=()=>makeSong([noteOn(0,72)],[{ch:0,note:72,start:0,end:1,sustainEnd:1,velocity:100}],2,[0]);

// (a) Boundary: note-off 4 ms after the fill limit must still be released.
{
 const h=createHarness();
 const song=makeSong(
  [noteOn(0.1,60),noteOff(1.504,60)],
  [{ch:0,note:60,start:0.1,end:1.504,sustainEnd:1.504,velocity:100}],
  3
 );
 h.p.load(song);
 h.p.playing=true;
 h.p.last=h.now();
 for(let i=0;i<63;i++)h.advance(8);
 assert(h.p.activeNotes.size===1,'note 60 should be active before fill');
 let doneCalled=false;
 assert(h.p.startFill(()=>{
  doneCalled=true;
  h.p.load(nextSong());
  h.p.play({startAt:0,transition:true});
 },{plan:{duration:1,hits:[]}}));
 while(h.p.fill)h.advance(8);
 assert(doneCalled,'fill done callback must run');
 h.advance(50);
 const noteOnIdx=h.log.findIndex(m=>m[0]===144&&m[1]===60&&m[2]>0);
 const noteOffIdx=h.log.findIndex((m,i)=>i>noteOnIdx&&(m[0]===128||(m[0]===144&&m[2]===0))&&m[1]===60);
 assert(noteOnIdx>=0&&noteOffIdx>noteOnIdx,'boundary note 60 must receive note-off after note-on');
}

// (b) End-of-song transition without carryTails (remaining < 0.08 s) must release active voices.
{
 const h=createHarness();
 const song=makeSong(
  [noteOn(0.1,64),noteOff(2.0,64)],
  [{ch:0,note:64,start:0.1,end:2.0,sustainEnd:2.0,velocity:100}],
  2
 );
 h.p.load(song);
 h.p.playing=true;
 h.p.last=h.now();
 for(let i=0;i<25;i++)h.advance(8);
 assert(h.p.activeNotes.size===1,'note 64 should be active before transition seek');
 h.p.load(nextSong(),{},{preservePlaying:true,deferSeek:true,transition:true});
 h.p.seek(0,{transition:true});
 const noteOffSent=h.log.some(m=>(m[0]===128||(m[0]===144&&m[2]===0))&&m[1]===64);
 assert(noteOffSent,'active note 64 must receive note-off on direct transition seek');
}

// (c) Native timeline overrun: attacks ahead of UI cursor are tracked, Note Offs ahead of stopped C# clock never drop active voices early.
{
 const h=createHarness();
 h.p.nativeTimelineAvailable=true;
 const song=makeSong(
  [noteOn(0.5,67),noteOff(1.03,67),noteOn(1.05,62),noteOff(3.0,62),noteOn(1.06,65)],
  [
   {ch:0,note:67,start:0.5,end:1.03,sustainEnd:1.03,velocity:100},
   {ch:0,note:62,start:1.05,end:3.0,sustainEnd:3.0,velocity:100},
   {ch:0,note:65,start:1.06,end:2.0,sustainEnd:2.0,velocity:100}
  ],
  3.5
 );
 h.p.load(song);
 h.p.playing=true;
 h.p.position=1.0;
 h.p.index=1; // note 67 already active, noteOff at 1.03 NOT yet reached
 h.p.activeNotes.set(++h.p.voiceId,{ch:0,note:67,raw:67,velocity:100,outputVelocity:100,held:true});
 h.p.last=h.now();
 h.p.nativeTimelineRunning=true;
 // 1) Direct transition (e.g. remaining < 0.08 s): note 67 must NOT be dropped by noteOff at 1.03!
 h.p.load(nextSong(),{},{preservePlaying:true,deferSeek:true,transition:true});
 h.p.seek(0,{transition:true});
 assert(h.log.some(m=>m[0]===128&&m[1]===67),'note 67 whose Note Off was ahead of stopped native clock must still receive Note Off');
 assert(h.log.some(m=>m[0]===128&&m[1]===62),'overrun attack 62 must also receive Note Off on direct transition');

 // 2) Full fill with native overrun + tail preservation:
 const h2=createHarness();
 h2.p.nativeTimelineAvailable=true;
 h2.p.load(song);
 h2.p.playing=true;
 h2.p.position=1.0;
 h2.p.index=2;
 h2.p.last=h2.now();
 h2.p.nativeTimelineRunning=true;
 let doneCalled=false;
 assert(h2.p.startFill(()=>{
  doneCalled=true;
  h2.p.load(nextSong(),{},{preservePlaying:true,deferSeek:true,transition:true});
  h2.p.play({startAt:0,transition:true});
 },{plan:{duration:1,hits:[]}}));
 assert(h2.timeline.includes('stop'));
 while(h2.p.fill)h2.advance(8);
 assert(doneCalled);
 assert(h2.log.some(m=>m[0]===128&&m[1]===65),'non-tail overrun note 65 must be released on transition seek');
 assert(!h2.log.some(m=>m[0]===128&&m[1]===62),'carried tail note 62 must NOT be cut early');
 for(let i=0;i<140;i++)h2.advance(8);
 assert(h2.log.some(m=>m[0]===128&&m[1]===62),'carried tail note 62 must be released after tail expires');
}

// (d) Cross-playlist channel mismatch: Song 1 sustains on ch 4, Song 2 only uses ch 0 -> ch 4 must get CC64=0 & CC123=0.
{
 const h=createHarness();
 const song1=makeSong([cc(0,64,127,4),noteOn(0.1,60,100,4),noteOff(0.3,60,4)],[{ch:4,note:60,start:0.1,end:0.3,sustainEnd:0.9,velocity:100}],2,[4]);
 h.p.load(song1);
 h.p.playing=true;
 h.p.last=h.now();
 for(let i=0;i<50;i++)h.advance(8);
 h.log.length=0;
 h.p.load(nextSong(),{},{preservePlaying:true,deferSeek:true,transition:true});
 h.p.seek(0,{transition:true});
 assert(h.log.some(m=>m[0]===(176|4)&&m[1]===64&&m[2]===0),'unused channel 4 from previous playlist must receive sustain off');
 assert(h.log.some(m=>m[0]===(176|4)&&m[1]===123&&m[2]===0),'unused channel 4 from previous playlist must receive all-notes-off');
}

// (e) Re-attacking a carried tail pitch in Song 2 must release Song 1's tail first and NOT swallow Song 2's Note Off!
{
 const h=createHarness();
 const song1=makeSong([noteOn(0.1,60,100,0),noteOff(4.5,60,0)],[{ch:0,note:60,start:0.1,end:4.5,sustainEnd:4.5,velocity:100}],5,[0]);
 const song2=makeSong([noteOn(0.1,60,95,0),noteOff(0.4,60,0)],[{ch:0,note:60,start:0.1,end:0.4,sustainEnd:0.4,velocity:95}],2,[0]);
 h.p.load(song1);
 h.p.playing=true;
 h.p.last=h.now();
 for(let i=0;i<30;i++)h.advance(8);
 h.p.startFill(()=>{
  h.p.load(song2,{},{preservePlaying:true,deferSeek:true,transition:true});
  h.p.play({startAt:0,transition:true});
 },{plan:{duration:0.5,hits:[]}});
 while(h.p.fill)h.advance(8);
 assert.equal(h.p.tails.length,1,'note 60 carried into Song 2');
 h.log.length=0;
 for(let i=0;i<70;i++)h.advance(8); // ~560 ms into Song 2: hits 0.1 NoteOn and 0.4 NoteOff
 const ev60=h.log.filter(m=>(m[0]===144||m[0]===128)&&m[1]===60);
 // Expected order: [128,60,0] (tail release before re-attack), [144,60,95] (Song 2 attack), [128,60,0] (Song 2 release!)
 assert.equal(ev60.length,3,'tail must release before Song 2 re-attack, and Song 2 Note Off must not be swallowed');
 assert.equal(ev60[0][0],128);
 assert.equal(ev60[1][0],144);
 assert.equal(ev60[2][0],128);
 assert.equal(h.p.tails.length,0);
}

// (f) Unclosed note in Song 1 (end = 240 s) triggered mid-song must be capped to <= 5 s tail, never infinite!
{
 const h=createHarness();
 const song1=makeSong([noteOn(0.1,55,100,0)],[{ch:0,note:55,start:0.1,end:240,sustainEnd:240,velocity:100}],240,[0]);
 const longSong2=makeSong([noteOn(0,72)],[{ch:0,note:72,start:0,end:9,sustainEnd:9,velocity:100}],10,[0]);
 h.p.load(song1);
 h.p.playing=true;
 h.p.last=h.now();
 for(let i=0;i<30;i++)h.advance(8);
 h.p.startFill(()=>{
  h.p.load(longSong2,{},{preservePlaying:true,deferSeek:true,transition:true});
  h.p.play({startAt:0,transition:true});
 },{plan:{duration:0.5,hits:[]}});
 while(h.p.fill)h.advance(8);
 assert.equal(h.p.tails.length,1);
 h.log.length=0;
 for(let i=0;i<650;i++)h.advance(8); // 5.2 s into 10 s song -> capped tail must have expired and released!
 assert.equal(h.p.tails.length,0,'unclosed MIDI note tail must expire within 5 s');
 assert(h.log.some(m=>m[0]===128&&m[1]===55),'capped tail must send Note Off');
}

// (g) Global queue across ALL playlists + unqueueAt from another playlist + synchronous cross-playlist nextSong!
{
 const parsedA=MidiCore.parse(MidiCore.demo());
 const bytesB=MidiCore.demo();
 const parsedB=MidiCore.parse(bytesB);
 const songA1={name:'A1.mid',title:'A1',bytes:MidiCore.demo(),parsed:parsedA,prefs:{}};
 const songA2={name:'A2.mid',title:'A2',bytes:MidiCore.demo(),parsed:parsedA,prefs:{}};
 const songB1={name:'B1.mid',title:'B1',bytes:bytesB,parsed:parsedB,prefs:{}};
 const songB2Unparsed={name:'B2.mid',title:'B2',bytes:bytesB,parsed:null,prefs:{}}; // unparsed sibling in list B!

 const stubEl=()=>({
  textContent:'',innerHTML:'',value:'',checked:false,disabled:false,title:'',
  style:{setProperty(){}},dataset:{},
  classList:{add(){},remove(){},toggle(){},contains:()=>false},
  setAttribute(){},before(){},prepend(){},after(){},append(){},focus(){},close(){},showModal(){},
  addEventListener(){},querySelector:()=>stubEl(),querySelectorAll:()=>[]
 });
 const elements=new Map();
 const $=sel=>{if(!elements.has(sel))elements.set(sel,stubEl());return elements.get(sel);};
 const h=createHarness();
 const uiCtx={
  $,$$:()=>[],esc:s=>String(s),time:()=>'00:10',toast(){},icon:()=>'',icons:{},hydrate(){},
  nativeState:{devices:[]},safePrefs:p=>p||{},
  player:h.p,songs:[songA1,songA2],selected:0,repeat:false,shuffle:false,
  config:{encoding:'auto',repeatAll:false,fastTransitions:true,autoplay:true,scan:false,theme:'mint',color:'#8df0cc'},
  playbackEntry:songA1,playbackListId:'list-a',
  currentSongEntry(){return this.playbackEntry?.parsed===this.player.song?this.playbackEntry:this.songs[this.selected];},
  prefsCurrent(){},persist(){},saveSessionNow:async()=>{},
  renderSong(){},renderQueue(){},renderMixer(){},renderInspector(){},paint(){},lastLyric:'',
  selectSong(i,play=false,opts={}){const s=uiCtx.songs[i];if(!s?.parsed)return;uiCtx.selected=i;uiCtx.playbackEntry=s;uiCtx.playbackListId=uiCtx.activeListId;h.p.load(s.parsed,s.prefs,{deferSeek:play,preservePlaying:play,transition:!!opts.transition});if(play)h.p.play(opts);},
  nextSong(){},removeSong(){},addFiles:async()=>{},openSettings(){},applyConfig(){},
  MidiCore,PlaylistCore,TransitionCore,MixerCore:{original:()=>true,equal:()=>true,originalPrograms:()=>[],recommendations:()=>[]},
  parseMidiAsync:async b=>MidiCore.parse(b),
  structuredClone,WeakMap,Set,Map,Uint8Array,Number,String,Math,Object,Array,Promise, CustomEvent,
  document:{createElement:()=>stubEl(),body:stubEl(),documentElement:stubEl(),querySelector:$,querySelectorAll:()=>[]},
  window:{desktop:{panelFrame(){}},fillConfirmation:null},
  performance:{now:()=>h.now()},console
 };
 uiCtx.window=uiCtx;
 vm.createContext(uiCtx);
 uiCtx.songA1=songA1;uiCtx.songA2=songA2;uiCtx.songB1=songB1;uiCtx.songB2Unparsed=songB2Unparsed;uiCtx.assert=assert;
 vm.runInContext('let songs=[songA1,songA2],selected=0,repeat=false,shuffle=false,playbackEntry=songA1,playbackListId="list-a",lastLyric="";function currentSongEntry(){return playbackEntry?.parsed===player.song?playbackEntry:songs[selected];}function selectSong(i,play=false,opts={}){const s=songs[i];if(!s?.parsed)return;selected=i;playbackEntry=s;playbackListId=activeListId;player.load(s.parsed,s.prefs,{deferSeek:play,preservePlaying:play,transition:!!opts.transition});if(play)player.play(opts);}function nextSong(){}function removeSong(){}async function addFiles(){}',uiCtx);
 vm.runInContext(fs.readFileSync(path.join(appDir,'playlist-ui.js'),'utf8'),uiCtx,{filename:'playlist-ui.js'});
 vm.runInContext(fs.readFileSync(path.join(appDir,'performance-ui.js'),'utf8'),uiCtx,{filename:'performance-ui.js'});
 vm.runInContext(`
  activeListId='list-a';
  playlistName='Forró';
  libraryLists=[
   {id:'list-a',name:'Forró',songs:[songA1,songA2],sortMode:'custom'},
   {id:'list-b',name:'Sertanejo',songs:[songB1,songB2Unparsed],sortMode:'custom'}
  ];
  selectSong(0,true);
  queueNext(1); // Queue A2 from Forró
  switchListSync('list-b');
  queueNext(0); // Queue B1 from Sertanejo
  switchListSync('list-a');
  let snap=queueSnapshot();
  assert.deepEqual(snap.map(q=>q.title),['A2','B1'],'global queue must show songs from all playlists');
  assert.equal(snap[0].otherList,false);
  assert.equal(snap[1].otherList,true);
  assert.equal(snap[1].listName,'Sertanejo');
  assert.equal(snap[1].index,-1);

  // Removing B1 (from another playlist!) via unqueueAt(1) must work while viewing Forró:
  unqueueAt(1);
  assert.deepEqual(queueSnapshot().map(q=>q.title),['A2'],'unqueueAt must remove song from another playlist');

  // Re-queue B1 from Sertanejo, leave B2 unparsed again, switch back to Forró, and advance via nextSong:
  switchListSync('list-b');
  queueNext(0);
  songB2Unparsed.parsed=null;
  switchListSync('list-a');
  unqueueAt(0); // remove A2 so B1 (in Sertanejo, which has unparsed B2!) is next
  assert.deepEqual(queueSnapshot().map(q=>q.title),['B1']);
  nextSong(1,true,{transition:true});
  assert.equal(playbackEntry,songB1,'nextSong must synchronously switch to Playlist B and play B1 even if B2 was unparsed');
  assert.equal(activeListId,'list-b');
 `,uiCtx);
}

console.log('PASS fill boundary, direct transition seek, native overrun safety, cross-playlist channel cleanup, tail re-attack, tail cap, and global cross-playlist queue');
