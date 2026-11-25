(function(root){'use strict';
class MidiInputDiagnostics{
 constructor(){this.clear();}
 clear(){this.startedAt=null;this.recentMessages=[];this.noteOns=0;this.channelCounts=Array(16).fill(0);this.noteEvents=[];this.lastMessageAt=null;this.lastNoteAt=null;this.transport=null;this.clocks=0;}
 mark(label,now){if(this.startedAt===null)this.startedAt=now;this.recentMessages.push({type:'marker',label,ms:Math.round(now-this.startedAt)});if(this.recentMessages.length>2048)this.recentMessages.shift();}
 receive(data,now){if(!data?.length||!Number.isInteger(data[0]))return false;const status=data[0];if(status<128||status>255)return false;this.lastMessageAt=now;if(this.startedAt===null)this.startedAt=now;if(status!==248&&status!==254){this.recentMessages.push({type:'midi',ms:Math.round(now-this.startedAt),data:Array.from(data).slice(0,3)});if(this.recentMessages.length>2048)this.recentMessages.shift();}
  if(status===248)this.clocks++;if([250,251,252].includes(status))this.transport=status===252?'stopped':'started';
  if((status>>4)===9&&data.length>=3&&Number.isInteger(data[1])&&data[1]>=0&&data[1]<=127&&Number.isInteger(data[2])&&data[2]>0&&data[2]<=127){const channel=status&15;this.noteOns++;this.channelCounts[channel]++;this.lastNoteAt=now;this.noteEvents.push({channel,at:now});this.noteEvents=this.noteEvents.filter(event=>now-event.at<=2000).slice(-4096);}return true;
 }
 snapshot(now,mask){const recent=this.noteEvents.filter(event=>now-event.at<=2000),receivedChannels=this.channelCounts.flatMap((count,ch)=>count?[ch+1]:[]);return {noteOns:this.noteOns,receivedChannels,blockedRecent:recent.some(event=>!(mask&(1<<event.channel))),hasRecentNotes:recent.length>0,transport:this.transport,clocks:this.clocks,messageAge:this.lastMessageAt==null?null:Math.max(0,now-this.lastMessageAt),noteAge:this.lastNoteAt==null?null:Math.max(0,now-this.lastNoteAt)};}
}
if(typeof module!=='undefined')module.exports=MidiInputDiagnostics;root.MidiInputDiagnostics=MidiInputDiagnostics;
})(typeof globalThis!=='undefined'?globalThis:this);
