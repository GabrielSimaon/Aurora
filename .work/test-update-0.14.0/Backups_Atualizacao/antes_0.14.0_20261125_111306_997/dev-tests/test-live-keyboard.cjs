const assert=require('node:assert/strict'),State=require('../live-keyboard-core.js'),Harmony=require('../harmonic-core.js');
const s=new State(),send=(ch,kind,n,v)=>s.receive([kind|ch,n,v]);
for(const n of [60,64,67])send(0,144,n,100);assert.equal(Harmony.name(Harmony.detect(s.weights())),'C');
send(9,144,38,127);assert.equal(s.notes().length,3,'drums excluded by default');s.mask=65535;assert.equal(s.notes().length,4);s.mask=1;
send(0,176,64,127);send(0,128,60,0);assert(s.notes().some(n=>n.note===60&&!n.held));send(0,176,64,0);assert(!s.notes().some(n=>n.note===60));
s.clear();send(0,144,60,100);send(0,144,60,100);send(0,144,60,0);assert.equal(s.notes().length,1,'duplicate note-on counts preserved');send(0,128,60,0);assert.equal(s.notes().length,0);
send(0,144,60,100);send(0,176,64,127);send(0,176,123,0);assert.equal(s.notes().length,1,'All Notes Off respects sustain');send(0,176,121,0);assert.equal(s.notes().length,0,'Reset Controllers releases sustain');
send(0,144,60,100);send(0,176,120,0);assert.equal(s.notes().length,0);assert.equal(s.receive([144,200,100]),false);s.mask=2;send(0,144,60,100);send(1,144,62,100);assert.deepEqual(s.notes().map(n=>n.note),[62]);s.clear();assert.equal(s.notes().length,0);
console.log('PASS live MIDI triads, channel filtering, drum exclusion, sustain, repeated notes, zero-velocity note-offs, All Notes/Sound Off, Reset Controllers, invalid input and clearing');
