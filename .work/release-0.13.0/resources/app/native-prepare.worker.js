'use strict';
self.window=self;
importScripts('midi-core.js','player.js','native-transport.js');
self.onmessage=({data})=>{
 try{const player=Object.create(AuroraPlayer.prototype);Object.assign(player,data.settings,{song:data.song,native:true,forcePreview:false});const plan=player.compileNativeTimeline(0,true);self.postMessage({id:data.id,plan},[plan.data.buffer,plan.offsets.buffer,plan.sources.buffer]);}
 catch(error){self.postMessage({id:data.id,error:error.message});}
};
