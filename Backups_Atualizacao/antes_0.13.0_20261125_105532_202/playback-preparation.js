'use strict';
(function(){
 if(typeof Worker==='undefined')return;
 let worker=null,id=0,pending=null,queue=[],timer,cache=[],bytes=0;
 function settings(song,prefs={},volume=config.volume){const channels={};for(const c of song.channels)channels[c.id]=prefs.channels?.[c.id]||{volume:1,pan:null,mute:false,solo:false,program:-1};return {channels,volume,gainFactor:prefs.gain??1,transpose:prefs.transpose||0};}
 function key(value){return JSON.stringify([value.volume,value.gainFactor,value.transpose,Array.from({length:16},(_,ch)=>{const c=value.channels[ch]||{};return [c.volume??1,c.pan??null,!!c.mute,!!c.solo,c.program??-1];})]);}
 function find(song,signature){return cache.find(entry=>entry.song===song&&entry.key===signature);}
 function pump(){if(pending||!queue.length)return;const job=queue.shift();pending=job;try{
  if(!worker){worker=new Worker('native-prepare.worker.js');worker.onmessage=({data})=>{const current=pending;if(!current||data.id!==current.id)return;pending=null;if(data.plan){const size=data.plan.data.byteLength+data.plan.offsets.byteLength+data.plan.sources.byteLength;if(size<=16*1024*1024){while(cache.length&&(cache.length>=8||bytes+size>16*1024*1024)){const removed=cache.shift();bytes-=removed.size;}cache.push({...current,plan:data.plan,size});bytes+=size;}}current.resolve(!!data.plan);pump();};worker.onerror=event=>{event.preventDefault?.();worker.terminate();worker=null;const active=pending;pending=null;active?.resolve(false);for(const item of queue)item.resolve(false);queue=[];};}
  worker.postMessage({id:job.id,song:{events:job.song.events,channels:job.song.channels},settings:job.settings});
 }catch{pending=null;job.resolve(false);pump();}}
 function prepare(entry){if(!entry?.parsed)return Promise.resolve(false);const value=settings(entry.parsed,entry.prefs),signature=key(value);if(find(entry.parsed,signature))return Promise.resolve(true);const existing=[pending,...queue].find(job=>job?.song===entry.parsed&&job.key===signature);if(existing)return existing.promise;
  if(queue.length>=3){const discarded=queue.pop();discarded.resolve(false);}let resolve;const promise=new Promise(done=>resolve=done);queue.push({id:++id,song:entry.parsed,key:signature,settings:value,promise,resolve});pump();return promise;
 }
 AuroraPlayer.prototype.preparedNativeTimeline=function(fromIndex){const entry=find(this.song,key(this));if(!entry)return null;const {data,offsets,sources}=entry.plan;let lo=0,hi=sources.length;while(lo<hi){const mid=(lo+hi)>>>1;if(sources[mid]<fromIndex)lo=mid+1;else hi=mid;}const offset=offsets[lo]??data.length,output=new Uint8Array(4+data.length-offset);new DataView(output.buffer).setInt32(0,sources.length-lo,true);output.set(data.subarray(offset),4);return output;};
 async function warm(){const entries=[currentSongEntry(),songs[selected+1],songs[selected+2],songs[0]];for(const entry of new Set(entries)){if(entry)await prepare(entry);}}
 function schedule(){clearTimeout(timer);timer=setTimeout(warm,120);}
 player.addEventListener('state',schedule);window.addEventListener('aurora-ready',schedule,{once:true});window.preparedMidi={prepare,schedule};
 if(window.auroraSessionReady)schedule();
})();
