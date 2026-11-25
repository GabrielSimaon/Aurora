'use strict';
importScripts('midi-core.js');
self.onmessage=({data})=>{try{self.postMessage({id:data.id,song:MidiCore.parse(data.bytes,data.encoding)});}catch(error){self.postMessage({id:data.id,error:error.message});}};
