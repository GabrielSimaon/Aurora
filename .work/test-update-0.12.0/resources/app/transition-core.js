'use strict';
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.TransitionCore=factory();})(typeof window!=='undefined'?window:globalThis,()=>{
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function bpmAt(song,sec=0,speed=1){const tempo=[...(song?.tempoMap||[])].reverse().find(t=>t.sec<=sec)?.tempo;return clamp((tempo>0?60000000/tempo:song?.bpm||120)*(Number.isFinite(speed)&&speed>0?speed:1),10,480);}
 function beatsAt(song,sec){const meter=(song.events||[]).filter(e=>e.type==='meta'&&e.meta===88&&e.sec<=sec&&e.data.length>=2).at(-1);return meter?clamp(meter.data[0]*4/2**meter.data[1],.25,32):4;}
 const entryCache=new WeakMap();
 function findEntry(song,prefs={}){if(Number.isFinite(prefs.transitionEntry)&&prefs.transitionEntry>=0&&prefs.transitionEntry<song.duration-.01)return {sec:clamp(prefs.transitionEntry,0,song.duration),confidence:'manual',reason:'Entrada marcada pelo usuário'};
 const channels=prefs.channels||{},solo=Object.values(channels).some(c=>c.solo),enabled=ch=>!channels[ch]?.mute&&(!solo||channels[ch]?.solo),mask=Array.from({length:16},(_,i)=>enabled(i)?1:0).join('');let cached=entryCache.get(song);if(cached?.has(mask))return cached.get(mask);if(!cached){cached=new Map();entryCache.set(song,cached);}
 const notes=(song.notes||[]).filter(n=>n.velocity>0&&enabled(n.ch)).slice().sort((a,b)=>a.start-b.start),first=notes[0]?.start||0,melodic=notes.filter(n=>n.ch!==9),fallback=melodic[0]?.start??first,limit=Math.min(song.duration,Math.max(first+8,Math.min(90,song.duration*.65))),candidates=[];let last=-Infinity;
 for(const n of notes){if(n.start>limit)break;if(n.start-last>=.025){candidates.push(n.start);last=n.start;}}
 let result={sec:fallback,confidence:'low',reason:melodic.length?'Sem acompanhamento bem definido; primeira entrada melódica':'Faixa de percussão'};
 const lower=sec=>{let lo=0,hi=notes.length;while(lo<hi){const m=(lo+hi)>>1;if(notes[m].start<sec)lo=m+1;else hi=m;}return lo;},range=(a,b)=>notes.slice(lower(a),lower(b));const expectsGroove=notes.filter(n=>n.start<=limit&&n.ch===9&&[35,36,38,40,42,44,46].includes(n.note)).length>=6,totalMelodic=new Set(melodic.filter(n=>n.start<=limit).map(n=>n.ch)).size;
 const active=new Map();let cursor=0;for(const t of candidates){const beat=60/bpmAt(song,t),tol=clamp(beat*.12,.035,.09),window=Math.max(.5,beat*2);while(cursor<notes.length&&notes[cursor].start<=t+tol){const n=notes[cursor++],key=n.ch+':'+n.note,old=active.get(key);active.set(key,old&&(old.sustainEnd??old.end)>(n.sustainEnd??n.end)?{...n,sustainEnd:old.sustainEnd??old.end}:n);}for(const [key,n]of active)if((n.sustainEnd??n.end)<=t-.01)active.delete(key);const opening=[...active.values()].filter(n=>n.start<=t+tol),now=opening.filter(n=>n.ch!==9),future=range(t,t+window),roles=new Set(now.map(n=>n.ch)),byChannel=new Map();for(const n of now){if(!byChannel.has(n.ch))byChannel.set(n.ch,new Set());byChannel.get(n.ch).add(n.note%12);}
 const chord=[...byChannel.values()].some(p=>p.size>=3),bass=now.some(n=>(n.program>=32&&n.program<40)||n.note<=52),groove=future.filter(n=>n.ch===9&&[35,36,38,40,42,44,46].includes(n.note)),drumNow=opening.some(n=>n.ch===9&&[35,36,38,40,42,44,46].includes(n.note)),phrased=future.filter(n=>n.ch!==9),sustained=now.some(n=>(n.sustainEnd??n.end)>=t+beat*.7)||phrased.some(n=>n.start>=t+beat*.4);
 if(totalMelodic===0&&drumNow&&groove.length>=3){result={sec:t,confidence:'medium',reason:'Entrada do ritmo de bateria'};break;}
 const qualified=chord||roles.size>=2||roles.size>=1&&drumNow&&groove.length>=3;const score=roles.size*2+(chord?3:0)+(bass?1:0)+(groove.length>=3?2:0);
 const accompaniment=(roles.size>=Math.min(2,totalMelodic)||chord&&totalMelodic===1)&&(!expectsGroove||drumNow&&groove.length>=3||roles.size>=3&&now.some(n=>n.program>=32&&n.program<40));
 if(qualified&&accompaniment&&sustained&&score>=5){result={sec:t,confidence:chord||roles.size>=2?'high':'medium',reason:chord?'Entrada de acordes e acompanhamento':'Entrada conjunta do acompanhamento'};break;}}
 cached.set(mask,result);return result;}
 // Each pattern is one bar. Floor toms (41/43) carry the low accents; snare is secondary.
 const bank=[
 {id:'floor-space',name:'Surdos espaçados',group:'slow',hits:[[0,36,96],[.25,45,92],[.5,43,105],[.75,41,116],[.875,41,109]]},
 {id:'low-response',name:'Resposta de tons graves',group:'slow',hits:[[0,43,102],[.25,38,70],[.5,47,95],[.625,45,100],[.75,43,111],[.875,41,117]]},
 {id:'soft-descent',name:'Descida espaçada',group:'slow',hits:[[0,36,96],[.25,50,91],[.5,48,97],[.625,45,103],[.75,43,109],[.875,41,117]]},
 {id:'tom-descent',name:'Descida de tons',group:'medium',hits:[[0,36,98],[.25,50,97],[.375,48,99],[.5,47,104],[.625,45,107],[.75,43,114],[.875,41,121]]},
 {id:'floor-double',name:'Surdos dobrados',group:'medium',hits:[[0,36,98],[.25,45,94],[.375,45,102],[.5,43,108],[.625,43,103],[.75,41,117],[.875,41,123]]},
 {id:'tom-answer',name:'Tons em resposta',group:'medium',hits:[[0,47,98],[.125,48,94],[.25,38,72],[.5,45,109],[.625,43,112],[.75,41,119],[.875,36,110]]},
 {id:'low-stair',name:'Escada grave',group:'medium',hits:[[0,36,96],[.25,48,98],[.375,47,101],[.5,45,106],[.6875,43,113],[.8125,41,120],[.9375,41,114]]},
 {id:'fast-floor',name:'Tons rápidos com surdo',group:'fast',hits:[[0,36,100],[.25,50,98],[.375,48,100],[.5,47,104],[.625,45,110],[.75,43,115],[.875,41,122]]},
 {id:'fast-low',name:'Graves alternados',group:'fast',hits:[[0,43,105],[.25,47,97],[.375,45,105],[.5,43,112],[.625,41,118],[.75,43,113],[.875,41,123]]},
 {id:'fast-response',name:'Resposta rápida de tons',group:'fast',hits:[[0,36,100],[.25,38,72],[.5,50,100],[.625,47,108],[.75,45,113],[.875,41,123]]},
 {id:'bridge-floor',name:'Ponte de surdos',group:'bridge',hits:[[0,36,102],[.25,45,99],[.5,43,111],[.75,41,120],[.875,36,110]]},
 {id:'bridge-toms',name:'Ponte com descida',group:'bridge',hits:[[0,50,97],[.25,48,102],[.5,45,110],[.75,43,116],[.875,41,123]]},
 {id:'bridge-low',name:'Ponte grave',group:'bridge',hits:[[0,43,105],[.25,36,100],[.5,47,101],[.625,45,109],[.75,43,115],[.875,41,123]]}
 ];
 function tempoSegments(song){
  const raw=(song?.tempoMap||[]).filter(t=>Number.isFinite(t?.sec)&&t.tempo>0);
  if(!raw.length)return [{sec:0,tempo:60000000/(song?.bpm||120)}];
  const dedup=[];
  for(const t of raw){
   if(dedup.length&&Math.abs(dedup[dedup.length-1].sec-t.sec)<1e-9)dedup[dedup.length-1]=t;
   else dedup.push(t);
  }
  if(dedup[0].sec>0)dedup.unshift({sec:0,tempo:dedup[0].tempo});
  return dedup;
 }
 function beatAt(song,sec=0){
  const target=Math.max(0,sec),segs=tempoSegments(song);
  let beats=0;
  for(let i=0;i<segs.length;i++){
   const t0=segs[i].sec,t1=i+1<segs.length?Math.min(target,segs[i+1].sec):target;
   if(target<=t0)break;
   beats+=(t1-t0)*1000000/segs[i].tempo;
  }
  return beats;
 }
 function secAtBeat(song,targetBeat=0){
  if(targetBeat<=0)return 0;
  const segs=tempoSegments(song);
  let beat=0;
  for(let i=0;i<segs.length;i++){
   const t0=segs[i].sec,bpmSec=segs[i].tempo/1000000;
   if(i+1<segs.length){
    const segBeats=(segs[i+1].sec-t0)/bpmSec;
    if(beat+segBeats>=targetBeat)return t0+(targetBeat-beat)*bpmSec;
    beat+=segBeats;
   }else{
    return t0+(targetBeat-beat)*bpmSec;
   }
  }
  return 0;
 }
 function nextBeatSec(song,sec=0,speed=1){
  const cur=beatAt(song,sec),frac=cur-Math.floor(cur);
  if(frac<0.06||frac>0.94)return sec;
  const s=Number.isFinite(speed)&&speed>0?speed:1;
  let next=Math.ceil(cur),target=secAtBeat(song,next);
  if((target-sec)/s>0.6){next=Math.ceil(cur*2)/2;target=secAtBeat(song,next);}
  return Math.min(song?.duration||target,target);
 }
 function scheduledStart(song,endSec){
  const end=Math.max(0,Math.min(song?.duration||0,endSec??song?.duration??0));
  const beats=beatsAt(song,Math.max(0,end-0.001)),endBeat=beatAt(song,end);
  if(endBeat<=beats+0.05)return 0;
  const rawBeat=endBeat-beats;
  let b=Math.floor(rawBeat+0.06);
  if(secAtBeat(song,b+beats)>end+0.01)b=Math.floor(rawBeat);
  return Math.max(0,secAtBeat(song,Math.max(0,b)));
 }
 function plan(source,target,options={}){const sourcePosition=options.position||0,entry=findEntry(target,options.targetPrefs||{}),fromBpm=bpmAt(source,sourcePosition,options.speed||1),toBpm=bpmAt(target,entry.sec,options.targetPrefs?.speed||1),beats=beatsAt(source,sourcePosition);const related=[.5,1,2].map(f=>({factor:f,bpm:toBpm*f,distance:Math.abs(Math.log(toBpm*f/fromBpm))})).sort((a,b)=>a.distance-b.distance)[0];const endBpm=related.bpm,delta=endBpm-fromBpm,average=(fromBpm+endBpm)/2,group=Math.abs(delta)/fromBpm>.18?'bridge':average<96?'slow':average<=140?'medium':'fast',history=options.history||[],pool=bank.filter(p=>p.group===group),available=pool.filter(p=>!history.slice(-2).includes(p.id)),pattern=(available.length?available:pool).slice().sort((a,b)=>history.lastIndexOf(a.id)-history.lastIndexOf(b.id))[0];
 const duration=beats*60/fromBpm,at=phase=>phase*duration,hits=pattern.hits.map(([phase,note,velocity])=>({at:at(phase),note,velocity}));return {id:pattern.id,name:pattern.name,fromBpm,toBpm,endBpm,targetFactor:related.factor,beats,duration,hits,entry};}
 return {bank,bpmAt,beatsAt,beatAt,secAtBeat,nextBeatSec,scheduledStart,findEntry,plan};
});
