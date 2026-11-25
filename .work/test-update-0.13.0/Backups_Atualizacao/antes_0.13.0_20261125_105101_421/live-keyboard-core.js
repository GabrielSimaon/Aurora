(function(root){'use strict';
class LiveKeyboardState{
 constructor(){this.count=new Uint16Array(2048);this.velocity=new Uint8Array(2048);this.latched=new Uint8Array(2048);this.sustain=new Uint8Array(16);this.mask=65535&~512;this.maximumNote=127;}
 clear(){this.count.fill(0);this.velocity.fill(0);this.latched.fill(0);this.sustain.fill(0);}
 receive(data){if(!data||data.length<3||!Array.from(data).every(Number.isInteger))return false;const status=data[0],kind=status>>4,ch=status&15,n=data[1],value=data[2];if(status<128||status>239||n<0||n>127||value<0||value>127)return false;const key=ch*128+n;
 if(kind===9&&value>0){this.count[key]=Math.min(65535,this.count[key]+1);this.velocity[key]=value;this.latched[key]=0;return true;}
 if(kind===8||kind===9){if(this.count[key]){this.count[key]--;if(!this.count[key])this.latched[key]=this.sustain[ch];}return true;}
 if(kind!==11)return false;
 if(n===64){this.sustain[ch]=value>=64?1:0;if(!this.sustain[ch])for(let i=ch*128;i<(ch+1)*128;i++)this.latched[i]=0;return true;}
 if([120,121,123].includes(n)){for(let i=ch*128;i<(ch+1)*128;i++){if(n===123){if(this.count[i]&&this.sustain[ch])this.latched[i]=1;this.count[i]=0;}else if(n===120){this.count[i]=0;this.latched[i]=0;}else this.latched[i]=0;}if(n===121)this.sustain[ch]=0;return true;}return false;}
 notes({allChannels=false,allKeys=false}={}){const out=[];for(let ch=0;ch<16;ch++)if(allChannels||(this.mask&(1<<ch)))for(let note=0;note<128&&(allKeys||note<=this.maximumNote);note++){const i=ch*128+note;if(this.count[i]||this.latched[i])out.push({ch,note,velocity:this.velocity[i],held:!!this.count[i]});}return out;}
 weights(){const out=Array(128).fill(0);for(const n of this.notes())out[n.note]=Math.max(out[n.note],.2+n.velocity/127);return out;}
}
if(typeof module!=='undefined')module.exports=LiveKeyboardState;root.LiveKeyboardState=LiveKeyboardState;
})(typeof globalThis!=='undefined'?globalThis:this);
