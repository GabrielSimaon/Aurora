'use strict';
importScripts('harmonic-core.js');self.onmessage=e=>{try{self.postMessage({id:e.data.id,result:Harmony.analyze(e.data.song,e.data.options)});}catch(error){self.postMessage({id:e.data.id,error:error.message});}};
