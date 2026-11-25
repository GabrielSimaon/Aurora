(function(root){'use strict';
const MELODIC=65535&~512;
class LeftHandFocus{
 constructor(prefs={}){this.enabled=!!prefs.enabled;this.split=Number.isInteger(prefs.split)?Math.max(0,Math.min(127,prefs.split)):54;this.automatic=prefs.automatic!==false;this.channelMask=Number.isInteger(prefs.channelMask)?Math.max(0,Math.min(65535,prefs.channelMask)):null;this.clearTracking();}
 clearTracking(){this.leftReceived=0;this.rightReceived=0;this.lastLeftAt=null;this.markBoundary=false;}
 prefs(){return {enabled:this.enabled,split:this.split,automatic:this.automatic,channelMask:this.channelMask};}
 get mask(){return this.channelMask??MELODIC;}
 observe(data,now){if(!this.enabled||!data||data.length<3||(data[0]>>4)!==9||!Number.isInteger(data[1])||data[1]<0||data[1]>127||!Number.isInteger(data[2])||data[2]<=0||data[2]>127)return false;
  if(this.markBoundary){this.setSplit(data[1]);this.markBoundary=false;return true;}
  if(data[1]<=this.split){if(this.mask&(1<<(data[0]&15))){this.leftReceived++;this.lastLeftAt=now;}}else if((data[0]&15)!==9)this.rightReceived++;return false;}
 setSplit(note){if(!Number.isInteger(note)||note<0||note>127)return;this.split=note;if(this.automatic)this.channelMask=null;this.clearTracking();}
 relearn(){this.automatic=true;this.channelMask=null;this.clearTracking();}
 manual(mask){this.automatic=false;this.channelMask=Math.max(0,Math.min(65535,mask));}
 calibrate(notes,detect){if(!this.enabled||!this.automatic||this.channelMask!==null)return false;const candidates=[];
  for(let ch=0;ch<16;ch++){if(ch===9)continue;const received=notes.filter(n=>n.ch===ch&&n.held&&n.note<=this.split),unique=new Set(received.map(n=>n.note%12));if(unique.size<3||unique.size>6)continue;const weights=Array(128).fill(0);for(const n of received)weights[n.note]=Math.max(weights[n.note],.2+n.velocity/127);const chord=detect(weights);if(chord&&chord.root>=0)candidates.push({ch,size:unique.size});}
  if(!candidates.length)return false;candidates.sort((a,b)=>b.size-a.size||a.ch-b.ch);this.channelMask=1<<candidates[0].ch;return true;
 }
}
if(typeof module!=='undefined')module.exports=LeftHandFocus;root.LeftHandFocus=LeftHandFocus;
})(typeof globalThis!=='undefined'?globalThis:this);
