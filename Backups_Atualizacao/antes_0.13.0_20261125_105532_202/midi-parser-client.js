'use strict';
// One outstanding MIDI per worker response keeps large libraries from blocking
// the transport with a single batch of parsed events.
let midiParserWorker=null,midiParserJob=0;
const midiParserJobs=new Map();
function parseMidiAsync(bytes,encoding){
 if(typeof Worker==='undefined')return new Promise((resolve,reject)=>setTimeout(()=>{try{resolve(MidiCore.parse(bytes,encoding));}catch(error){reject(error);}},0));
 if(!midiParserWorker){
  midiParserWorker=new Worker('midi-parser.worker.js');
  midiParserWorker.onmessage=({data})=>{const job=midiParserJobs.get(data.id);if(!job)return;midiParserJobs.delete(data.id);data.error?job.reject(Error(data.error)):job.resolve(data.song);};
  midiParserWorker.onerror=()=>{for(const job of midiParserJobs.values())job.reject(Error('Falha ao analisar MIDI.'));midiParserJobs.clear();midiParserWorker.terminate();midiParserWorker=null;};
 }
 return new Promise((resolve,reject)=>{const id=++midiParserJob;midiParserJobs.set(id,{resolve,reject});midiParserWorker.postMessage({id,bytes,encoding});});
}
