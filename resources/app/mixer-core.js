(function(root){'use strict';
const DEFAULT={volume:1,pan:null,mute:false,solo:false,program:-1};
const kits=[{program:0,name:'Standard · padrão GM'},{program:8,name:'Room · ambiente'},{program:16,name:'Power · mais ataque'},{program:24,name:'Electronic'},{program:25,name:'TR-808'},{program:32,name:'Jazz'},{program:40,name:'Brush · vassourinhas'},{program:48,name:'Orchestra'}];
function originalAt(song,ch,position=0){const result={program:0,bankMsb:0,bankLsb:0,volume:100,pan:64};for(const e of song?.events||[]){if(e.sec>position)break;if(e.type!=='channel'||e.ch!==ch)continue;if(e.kind===12)result.program=e.data[0];if(e.kind===11){if(e.data[0]===0)result.bankMsb=e.data[1];if(e.data[0]===32)result.bankLsb=e.data[1];if(e.data[0]===7)result.volume=e.data[1];if(e.data[0]===10)result.pan=e.data[1];}}return result;}
function originalPrograms(song,ch){const out=new Set((song?.events||[]).filter(e=>e.type==='channel'&&e.ch===ch&&e.kind===12).map(e=>e.data[0]));if(!out.size)out.add(0);return Array.from(out);}
function recommendations(channel){const p=channel?.program||0;if(channel?.id===9)return [{program:0,reason:'Kit padrão, maior compatibilidade'},{program:8,reason:'Bateria com sensação de ambiente'},{program:16,reason:'Kit com mais ataque'}].filter(r=>r.program!==p);let options;
 if(p<8)options=[[1,'Piano com mais definição'],[4,'Piano elétrico, base mais suave'],[5,'Outra cor de piano elétrico'],[0,'Piano acústico tradicional']];
 else if(p<16)options=[[11,'Vibrafone para uma base suave'],[12,'Marimba com ataque de madeira'],[8,'Celesta para detalhes delicados'],[10,'Caixa de música para melodias']];
 else if(p>=20&&p<=23)options=[[21,'Sanfona General MIDI'],[23,'Bandoneon, outra cor de fole'],[20,'Órgão de palhetas sustentado'],[22,'Harmônica, para linhas de melodia']];
 else if(p<24)options=[[16,'Órgão de barras'],[17,'Órgão com ataque percussivo'],[18,'Órgão rock'],[19,'Órgão de igreja sustentado']];
 else if(p<32)options=[[24,'Violão nylon, ataque suave'],[25,'Violão aço, mais brilho'],[27,'Guitarra limpa, maior definição'],[28,'Guitarra abafada, base curta']];
 else if(p<40)options=[[33,'Baixo finger, base redonda'],[34,'Baixo com palheta, mais ataque'],[35,'Fretless, fraseado suave'],[38,'Baixo sintetizado, outra textura']];
 else if(p<56)options=[[48,'Conjunto de cordas'],[49,'Cordas com entrada suave'],[50,'Cordas sintetizadas'],[52,'Coro para base sustentada']];
 else if(p<64)options=[[56,'Trompete, linha mais aberta'],[59,'Trompete com surdina'],[61,'Conjunto de metais'],[62,'Metais sintetizados']];
 else if(p<72)options=[[65,'Sax alto'],[66,'Sax tenor'],[71,'Clarinete'],[68,'Oboé']];
 else if(p<80)options=[[73,'Flauta transversal'],[74,'Flauta doce'],[75,'Flauta de Pã'],[79,'Ocarina']];
 else if(p<88)options=[[80,'Lead quadrado'],[81,'Lead dente de serra'],[85,'Lead vocal'],[87,'Lead de baixo']];
 else if(p<104)options=[[89,'Pad quente'],[90,'Pad de sintetizador'],[91,'Pad de coro'],[98,'Textura de cristais']];
 else options=[[105,'Banjo para ataque definido'],[104,'Sitar para outra cor'],[21,'Sanfona para uma nova interpretação'],[0,'Piano acústico para comparar']];
 return options.filter(o=>o[0]!==p).slice(0,3).map(([program,reason])=>({program,reason}));}
function cleanChannel(c={}){const number=(v,a,b,d)=>Number.isFinite(v)?Math.max(a,Math.min(b,v)):d;return {volume:number(c.volume,0,1,1),pan:c.pan==null?null:Math.round(number(c.pan,0,127,64)),mute:!!c.mute,solo:!!c.solo,program:Math.round(number(c.program,-1,127,-1))};}
function snapshot(channels,gain=1){const result={channels:{},gain:Number.isFinite(gain)?Math.max(0,Math.min(255/128,gain)):1};for(const ch of Object.keys(channels||{}).map(Number).filter(n=>Number.isInteger(n)&&n>=0&&n<16).sort((a,b)=>a-b))result.channels[ch]=cleanChannel(channels[ch]);return result;}
function original(channels,gain=1){if(Math.abs(gain-1)>1e-8)return false;return Object.values(channels||{}).every(c=>{c=cleanChannel(c);return c.program<0&&Math.abs(c.volume-1)<1e-8&&c.pan==null&&!c.mute&&!c.solo;});}
function equal(a,b){return JSON.stringify(snapshot(a?.channels,a?.gain))===JSON.stringify(snapshot(b?.channels,b?.gain));}
const api={DEFAULT,kits,originalAt,originalPrograms,recommendations,cleanChannel,snapshot,original,equal};if(typeof module!=='undefined')module.exports=api;root.MixerCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
