'use strict';
// Expose the Windows input bridge through the same small interface as Web MIDI.
// Only input ports exist here: there is no MIDI output or automatic echo.
async function createNativeMidiAccess(){
 if(!window.desktop?.getMidiInputState)return null;
 const access={backend:'winmm',inputs:new Map(),onstatechange:null,onreset:null,refresh:async()=>apply(await window.desktop.midiInputCommand('LIST')),dispose(){for(const unsubscribe of subscriptions)unsubscribe?.();}},subscriptions=[];
 function apply(state){if(state?.error&&!state.ready&&state.supported!==undefined)throw Error(state.error);if(state?.error&&state.supported===undefined)throw Error(state.error);if(!state)return;
  const ids=new Set();for(const item of state.devices||[]){ids.add(item.id);let port=access.inputs.get(item.id);if(!port){port={id:item.id,name:item.name,state:'connected',connection:'closed',onmidimessage:null,async open(){this.connection='pending';try{apply(await window.desktop.midiInputCommand('OPEN',this.id));return this;}catch(error){this.connection='closed';throw error;}},async close(){if(this.connection!=='closed')apply(await window.desktop.midiInputCommand('CLOSE'));return this;}};access.inputs.set(item.id,port);}port.name=item.name;port.state=state.ready?'connected':'disconnected';port.connection=state.activeId===item.id?'open':'closed';}
  for(const [id,port]of access.inputs)if(!ids.has(id)){port.state='disconnected';port.connection='closed';access.inputs.delete(id);}
  access.onstatechange?.({});return state;
 }
 subscriptions.push(window.desktop.onMidiInputState?.(state=>{try{apply(state);}catch{for(const port of access.inputs.values()){port.state='disconnected';port.connection='closed';}access.onreset?.();access.onstatechange?.({});}}));
 subscriptions.push(window.desktop.onMidiInputMessages?.(frame=>{const port=access.inputs.get(frame?.id);if(port?.state!=='connected'||port.connection!=='open')return;for(const data of frame.messages||[])port.onmidimessage?.({data:Uint8Array.from(data)});}));
 subscriptions.push(window.desktop.onMidiInputReset?.(()=>access.onreset?.()));
 try{const state=await window.desktop.getMidiInputState();if(!state.supported){access.dispose();return null;}apply(state);return access;}catch(error){access.dispose();throw error;}
}
